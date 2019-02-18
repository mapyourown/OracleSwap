pragma solidity ^0.4.24;

import "./Book.sol";
import "./MultiOracle.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract SwapMarket {
    
    using SafeMath for uint;
    
    MultiOracle public oracle;
    
    uint public ASSET_ID;

    uint public MIN_RM; // in ETH
    uint8 public OPEN_FEE; // in %
    uint8 public CANCEL_FEE; // in %
    uint16 public MAX_ORDER_LIMIT;
    address public admin;

    bool noTakerWithdraw;
    
    struct lpRates{
        int16 currentLong; // in hundreths of a percent, 40 = 0.0040 weekly
        int16 currentShort; // hundreths of a percent
    }

    lpRates public defaultRates;
    
    //lp specific info
    mapping(address => address) public books;
    mapping (address => lpRates) public rates;
    mapping(address => uint) public openMargins;
    mapping(address => uint) public balances;
    
    uint public burnFees;
    uint public collectedFees;
    bool public isPaused;

    event OpenMargin(address _lp, address _book, uint totalOpen);
    event OrderTaken(address _lp, address indexed taker, bytes32 id);
    event FirstPrice(address _lp, uint8 _startDay);
    event Burn(address _lp, bytes32 _id, address sender);
    
    modifier onlyAdmin() {
        require (msg.sender == admin);
        _;
    }

    modifier pausable() {
        require (!isPaused);
        _;
    }
    
    constructor (address _admin, address priceOracle, uint assetID)
        public
    {
        admin = _admin;
        lpRates memory adminRates;
        // todo can't change
        adminRates.currentLong = 10;
        adminRates.currentShort = 4;

        defaultRates = adminRates;

        OPEN_FEE = 2; // 2%
        CANCEL_FEE = 3; // 3 %
        MAX_ORDER_LIMIT = 20;
        
        oracle = MultiOracle(priceOracle);
        ASSET_ID = assetID;

        isPaused = false;

        MIN_RM = 10 ether;

        noTakerWithdraw = false;
        
    }   

    // Tools for being Liquidity provider
    function increaseOpenMargin() 
        public
        payable
    {
        if (books[msg.sender] == 0x0) // make a new book
            books[msg.sender] = new Book(msg.sender, this);
        openMargins[msg.sender] = openMargins[msg.sender].add(msg.value);
        emit OpenMargin(msg.sender, books[msg.sender], openMargins[msg.sender]);
    }

    function reduceOpenMargin(uint amount) 
        public
    {
        require (openMargins[msg.sender] >= amount);
        openMargins[msg.sender] = openMargins[msg.sender].sub(amount);
        balances[msg.sender] = balances[msg.sender].add(amount);
        
    }

    function getBookData(address lp)
        public
        view
        returns (address book, uint lpMargin, uint totalLong, uint totalShort, uint lpRM, uint numContracts)
    {
        book = books[lp];
        if (book != 0x0) {
            Book b = Book(book);
            lpMargin = b.lpMargin();
            totalLong = b.totalLongMargin();
            totalShort = b.totalShortMargin();
            lpRM = b.requiredMargin();
            numContracts = b.numContracts();
        }
    }

    function getSubcontractData(address lp, bytes32 id)
        public
        view
        returns (
            uint takerMargin,
            uint reqMargin,
            int16 marginRate,
            uint8 initialDay,
            bool side, 
            bool isCancelled, 
            bool isBurned)
    {
        address book = books[lp];
        if (book != 0x0) {
            Book b = Book(book);
            (takerMargin, reqMargin, marginRate, initialDay,
                side, isCancelled, isBurned) = b.getSubcontract(id);
        }
    }
    
    function take(address lp, uint amount, bool takerSide)
        public
        payable
        pausable
    {
        require(msg.value == amount * (1 ether)); // allow only whole number amounts
        require(msg.value >= MIN_RM);
        Book book = Book(books[lp]);
        uint lpLong = book.totalLongMargin();
        uint lpShort = book.totalShortMargin();
        uint feeAmount = (msg.value * OPEN_FEE)/100;
        require(openMargins[lp] >= feeAmount);

        uint freeMargin = 0;
        if (takerSide) // taker is long, lp is short
        {
            if (lpLong > lpShort)
                freeMargin = lpLong - lpShort;
        }
        else // taker is short, lp is long
        {
            if (lpShort > lpLong)
                freeMargin = lpShort - lpLong;
        }

        require(msg.value + feeAmount <= openMargins[lp] + freeMargin);
        uint remainder = openMargins[lp].sub((msg.value - freeMargin) + feeAmount);
        openMargins[lp] = remainder;
        collectedFees = collectedFees.add(feeAmount);
        int16 rate;
        if (takerSide)
        {
            if (rates[lp].currentShort == 0 && rates[lp].currentLong == 0)
                rate = defaultRates.currentLong;
            else
                rate = rates[lp].currentLong;
        }
        else
        {
            if (rates[lp].currentShort == 0 && rates[lp].currentLong == 0)
                rate = defaultRates.currentShort;
            else
                rate = rates[lp].currentShort;
        }
        bytes32 newId = book.take.value(msg.value + (msg.value - freeMargin))(msg.sender, msg.value, takerSide, rate);
        emit OrderTaken(lp, msg.sender, newId);
    }

    function firstPrice(address lp, bool isFinalDay)
        public
        onlyAdmin
    {
        require(books[lp] != 0x0);
        Book b = Book(books[lp]);
        uint8 currentDay;
        ( , , ,currentDay) = oracle.assets(ASSET_ID);
        // want to start with the next day to be entered, which will be 0 on settlement days
        uint8 startDay = currentDay + 1;
        if (isFinalDay)
            startDay = 0;
        b.firstPrice(startDay);
        emit FirstPrice(lp, startDay);
    }

    /*function computeReturns()
        public
        onlyAdmin
    {
        // pnl is caclulated as follows:
        // PNL = USDNotional_t-1 * return / ETH_t
        // USDNotional = RM / MarginRate * ETH_t-1
        // return = A_t/A_t-1 - 1
        // so PNL = (RM / MarginRate) * return * (ETH_t-1/ETH_t)
        // for 1 ETH pnl = return/marginRate * (ETH_t-1/ETH_t)

        int[8] memory blank;
        dailyReturns = blank;
        uint numDays = 8;

        uint assetPrice;
        int16 assetBasis;
        (assetPrice, assetBasis) = oracle.getCurrentPrice(ASSET_ID);
        uint[8] memory assetPastWeek;
        uint[8] memory lrPastWeek;
        (lrPastWeek, assetPastWeek) = oracle.getPastPrices(ASSET_ID);

        uint ethPrice;
        (ethPrice, ) = oracle.getCurrentPrice(0);
        uint[8] memory ethPastweek;
        (, ethPastweek) = oracle.getPastPrices(0);

        // compute RM * LR * 1/Eth_t;


        for (uint8 i = 0; i < numDays; i++)
        {
            if (assetPastWeek[i] == 0)
                continue;

            // compute asset appreciation A_1/A_0 - 1
            int assetReturn = ( int(assetPrice.mul(1 ether)) / int(assetPastWeek[i])) - (1 ether);
            int leveraged = assetReturn * int(lrPastWeek[i]) / 1e6; 
            int basisFee = ((1 ether) * lrPastWeek[i] *  assetBasis) / 1e4;
            int pnl = ((leveraged - basisFee) * int(ethPastweek[i])) / int(ethPrice); // convert back to ETH

            dailyReturns[i] = pnl;
        }
        weeklyReturn = dailyReturns[0];
        longProfited = (assetPrice > oracle.lastWeekPrices(0, ASSET_ID));
    }*/

    // returns in terms of the maker
    function computeReturns()
        internal
        view
        returns(uint[8] leverages, int[8] longReturns, bool longProfit)
    {


        // Want: LR * ETH/ETH for every day
        // Want: A_1/A_0 - 1 - basis for every day.
        uint assetPrice  = oracle.getCurrentPrice(ASSET_ID);
        uint[8] memory assetPastWeek;
        uint[8] memory lrPastWeek;
        (lrPastWeek, assetPastWeek) = oracle.getPastPrices(ASSET_ID);

        uint ethPrice = oracle.getCurrentPrice(0);
        uint[8] memory ethPastWeek;
        (, ethPastWeek) = oracle.getPastPrices(0);

        for (uint8 i = 0; i < 8; i++)
        {
            if (assetPastWeek[i] == 0)
                continue;
            leverages[i] = lrPastWeek[i] * (ethPastWeek[i] * 1e6 ) / ethPrice; // add 6 more decimals
            longReturns[i] = int(assetPrice * (1 ether)/ assetPastWeek[i]) - (1 ether / 1e4);
            
        }
        longProfit = (assetPrice > oracle.lastWeekPrices(0, ASSET_ID));
    }
    
    function settle(address lp)
        public
        onlyAdmin
    {
        require(books[lp] != 0x0);
        Book b = Book(books[lp]);

        int[8] memory longReturns;
        uint[8] memory leverages;
        bool longProfited;

        (leverages, longReturns, longProfited) = computeReturns();
        
        b.settle(leverages, longReturns, longProfited);
        
    }
    
    function setRate(int16 longRate, int16 shortRate)
        public
    {
        // 100 means 1%
        // LPs cannot be negative overall.
        require(0 < longRate + shortRate); 
        require(longRate < 200 &&  shortRate < 200); 
        require(longRate > -200 && shortRate > -200);
        lpRates storage mRates = rates[msg.sender];
        mRates.currentLong = longRate;
        mRates.currentShort = shortRate;
    }

    function setMinimum(uint min)
        public
    {
        Book b = Book(books[msg.sender]);
        b.setMinimum(min * (1 ether));
    }

    function playerBurn(address lp, bytes32 id)
        public
        payable
    {
        Book b = Book(books[lp]);
        uint fee = b.burn(id, msg.sender, msg.value);
        burnFees = burnFees.add(fee);
        balances[msg.sender] = balances[msg.sender].add(msg.value - fee);
        emit Burn(lp, id, msg.sender);

    }
    
    function playerCancel(address lp, bytes32 id)
        public
        payable
    {
        Book b = Book(books[lp]);
        uint lastSettleTime;
        (, , lastSettleTime, ) = oracle.assets(ASSET_ID);
        b.cancel.value(msg.value)(lastSettleTime, id, msg.sender, OPEN_FEE, CANCEL_FEE);
    }

    function takerFund(address lp, bytes32 id)
        public
        payable
    {
        require(books[lp] != 0x0);
        Book b = Book(books[lp]);
        b.fundTakerMargin.value(msg.value)(id);
    }

    function lpFund(address lp)
        public
        payable
    {
        require(books[lp] != 0x0);
        Book b = Book(books[lp]);
        b.fundlpMargin.value(msg.value)();
    }
    
    function takerWithdrawal(uint amount, address lp, bytes32 id)
        public
    {
        require(books[lp] != 0x0);
        require(!noTakerWithdraw);
        Book b = Book(books[lp]);
        b.takerWithdrawal(id, amount, msg.sender);
    }

    function takerWithdrawalLock(bool lockValue)
        public
        onlyAdmin
    {
        noTakerWithdraw = lockValue;
    }
    
    function lpMarginWithdrawal(uint amount)
        public
    {
        require(books[msg.sender] != 0x0);
        
        Book b = Book(books[msg.sender]);
        b.lpMarginWithdrawal(amount);
    }

    function withdrawBalance()
        public 
    {
        uint amount = balances[msg.sender];
        balances[msg.sender] = 0;
        msg.sender.transfer(amount);
    }

    function pause(bool newPaused)
        public
        onlyAdmin
    {
        isPaused = newPaused;
    }

    function balanceTransfer(address recipient)
        public
        payable
    {
        balances[recipient] = balances[recipient].add(msg.value);
    }

    function emptyBurn()
        public
        onlyAdmin
    {
        uint amount = burnFees;
        burnFees = 0;
        // TODO: Where send?
    }
}