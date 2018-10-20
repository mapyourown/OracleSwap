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
    uint16 public BURN_FEE; // in %
    address public admin;

    bool noTakerWithdraw;
    
    struct lpRates{
        int16 currentLong; // in hundreths of a percent, 40 = 0.0040 weekly
        int16 currentShort; // hundreths of a percent
        int16 nextLong;
        int16 nextShort;
        bool updated;
    }

    lpRates public defaultRates;
    
    uint maxOrderLimit;
    uint public EthLeveraging; // 6 extra decimals
    //lp specific info
    mapping(address => address) public books;
    mapping(address => address) public lpChanges;
    mapping (address => lpRates) public rates;
    mapping(address => uint) public openMargins;
    mapping(address => uint) public balances;
    
    uint8 constant public marginSafetyFactor = 100;
    
    uint public collectedFees;

    bool public isPaused;

    event OpenMargin(address _lp, address _book);
    event OrderTaken(address _lp, address indexed taker, bytes32 id);
    event FirstPrice(address _lp, uint _price);
    
    modifier onlyAdmin() {
        require (msg.sender == admin);
        _;
    }

    modifier pausable() {
        require (!isPaused);
        _;
    }
    
    constructor ( address priceOracle, uint assetID)
        public
    {
        admin = msg.sender;
        lpRates memory adminRates;
        // todo can't change
        adminRates.nextLong = 10; // .001
        adminRates.nextShort = 4; // .0004
        adminRates.currentLong = 10;
        adminRates.currentShort = 4;

        defaultRates = adminRates;

        OPEN_FEE = 2; // 2%
        CANCEL_FEE = 3; // 3 %
        BURN_FEE = 5; // 5%
        
        oracle = MultiOracle(priceOracle);
        ASSET_ID = assetID;

        isPaused = false;

        MIN_RM = 10 ether;

        noTakerWithdraw = false;
        
    }   

    // Tools for being Liquidity provider
    function increaseOpenMargin(uint amount) 
        public
        payable
    {
        require (msg.value == amount);
        if (books[msg.sender] == 0x0) // make a new book
            books[msg.sender] = new Book(msg.sender, this);
        openMargins[msg.sender] = openMargins[msg.sender].add(msg.value);
        emit OpenMargin(msg.sender, books[msg.sender]);
    }

    function reduceOpenMargin(uint amount) 
        public
        payable
    {
        require (openMargins[msg.sender] >= amount);
        openMargins[msg.sender] = openMargins[msg.sender].sub(amount);
        balances[msg.sender] = balances[msg.sender].add(amount);
        
    }
    
    /*function getlpRates(address lp)
        public
        view
        returns (int16 longRate, int16 shortRate, int16 nextLong, int16 nextShort)
    {
        lpRates storage mRates = rates[lp];
        longRate = mRates.currentLong;
        shortRate = mRates.currentShort;
        nextLong = mRates.nextLong;
        nextShort = mRates.nextShort;
    }*/

    function getBookData(address lp)
        public
        view
        returns (address book, uint totalLong, uint totalShort)
    {
        book = books[lp];
        if (book != 0x0) {
            Book b = Book(book);
            totalLong = b.totalLongMargin();
            totalShort = b.totalShortMargin();
        }
    }

    function getSubcontractData(address lp, bytes32 id)
        public
        view
        returns (
            address taker,
            uint takerMargin,
            uint reqMargin,
            uint8 initialDay,
            bool side, 
            bool isCancelled, 
            bool isBurned)
    {
        address book = books[lp];
        if (book != 0x0) {
            Book b = Book(book);
            (taker, takerMargin, reqMargin, initialDay,
                side, isCancelled, isBurned) = b.getSubcontract(id);
        }
    }
    
    function take(address lp, uint amount, bool side)
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
        if (side) // taker is long, lp is short
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
        bytes32 newId = book.take.value(msg.value + (msg.value - freeMargin))(msg.sender, msg.value, side);
        emit OrderTaken(lp, msg.sender, newId);
    }

    function firstPrice(address lp)
        public
        onlyAdmin
    {
        if (books[lp] == 0x0)
            return;
        Book b = Book(books[lp]);
        uint8 currentDay;
        bool isFinal;
        ( , isFinal, , , currentDay, ,) = oracle.assets(ASSET_ID);
        b.firstPrice(currentDay);
        uint currentPrice;
        (currentPrice, ) = oracle.getCurrentPrice(ASSET_ID);
        emit FirstPrice(lp, currentPrice);
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
    function computeReturns(int16 longRate, int16 shortRate)
        internal
        view
        returns(int[8] longReturns, int[8] shortReturns, bool longProfit)
    {
        uint assetPrice;
        int16 assetBasis;
        (assetPrice, assetBasis) = oracle.getCurrentPrice(ASSET_ID);
        uint[8] memory assetPastWeek;
        uint[8] memory lrPastWeek;
        (lrPastWeek, assetPastWeek) = oracle.getPastPrices(ASSET_ID);

        uint ethPrice;
        (ethPrice, ) = oracle.getCurrentPrice(0);
        uint[8] memory ethPastWeek;
        (, ethPastWeek) = oracle.getPastPrices(0);

        //
        for (uint8 i = 0; i < 8; i++)
        {
            if (assetPastWeek[i] == 0)
                continue;

            //int leverage = int(lrPastWeek[i] * ethPastweek[i])) / int(ethPrice);
            int assetReturn = int(assetPrice * (1 ether)/ assetPastWeek[i]) - (1 ether);
            int longFee = ((1 ether) * int(-1 * assetBasis + shortRate))/1e4;
            int shortFee = ((1 ether) *  int(assetBasis + longRate))/1e4;
            longReturns[i] = ((assetReturn + longFee) * int(lrPastWeek[i]) * int(ethPastWeek[i]) ) / int(ethPrice * 1e6);
            shortReturns[i] = (((-1 * assetReturn) + shortFee) * int(lrPastWeek[i]) * int(ethPastWeek[i]) ) / int(ethPrice * 1e6);
        }
        longProfit = (assetPrice > oracle.lastWeekPrices(0, ASSET_ID));
    }
    
    function settle(address lp)
        public
        onlyAdmin
    {
        if (books[lp] == 0x0)
            return; 
        Book b = Book(books[lp]);
        int16 longRate;
        int16 shortRate;
        lpRates storage mRates = rates[lp];

        // Give lps default rates if they haven't changed theirs
        if (mRates.currentLong == 0 && mRates.currentShort == 0)
        {
            longRate = defaultRates.currentLong;
            shortRate = defaultRates.currentShort;
        }
        else
        {
            longRate = mRates.currentLong;
            shortRate = mRates.currentShort;
        }

        int[8] memory longReturns;
        int[8] memory shortReturns;
        bool longProfited;

        (longReturns, shortReturns, longProfited) = computeReturns(longRate, shortRate);
        
        b.settle(longReturns, shortReturns, longProfited);
        
        mRates.currentLong = mRates.nextLong;
        mRates.currentShort = mRates.nextShort;
        
        if (lpChanges[lp] != 0x0)
            lpModify(lp, lpChanges[lp]);
        
        lpChanges[lp] = 0x0;
        
    }
    
    function setRate(int16 longRate, int16 shortRate)
        public
    {
        // 100 means 1%
        // LPs cannot be negative overall.
        require(0 < longRate + shortRate); 
        require(longRate < 100 &&  shortRate < 100); 
        require(longRate > -100 && shortRate > -100);
        bool finalDay;
        (, finalDay, , , , ,) = oracle.assets(ASSET_ID);
        require(!finalDay); // Rates locked in by day before
        lpRates storage mRates = rates[msg.sender];
        mRates.nextLong = longRate;
        mRates.nextShort = shortRate;
    }

    function playerBurn(address lp, bytes32 id)
        public
        payable
    {
        // TODO make sure only durring settle period
        Book b = Book(books[lp]);
        b.burn.value(msg.value)(id, msg.sender);
    }
    
    function playerCancel(address lp, bytes32 id)
        public
        payable
    {
        Book b = Book(books[lp]);
        uint lastSettleTime;
        (, , , lastSettleTime, , ,) = oracle.assets(ASSET_ID);
        b.cancel.value(msg.value)(lastSettleTime, id, msg.sender, OPEN_FEE, CANCEL_FEE);
    }
    
    function changelp(address _newlp)
        public
    {
        lpChanges[msg.sender] = _newlp;
    }
    
    function lpModify(address _oldlp, address _newlp)
        internal
        returns (bool valid)
    {
        if (books[_newlp] != 0x0)
            return false;
        books[_newlp] = books[_oldlp];
        books[_oldlp] = 0x0;
        return true;
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

    function balanceTransfer(address reciever)
        public
        payable
    {
        balances[reciever] = balances[msg.sender].add(msg.value);
    }

    function pause(bool newPaused)
        public
        onlyAdmin
    {
        isPaused = newPaused;
    }
}