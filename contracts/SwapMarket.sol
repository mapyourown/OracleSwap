pragma solidity ^0.4.24;

import "./Book.sol";
import "./MultiOracle.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract SwapMarket {
    
    using SafeMath for uint;
    
    MultiOracle public oracle;
    uint public assetID;

    uint public minRM; // in ETH
    uint8 public openFee; // in %
    uint8 public cancelFee; // in %
    uint16 public burnFee; // in %
    address public admin;
    
    struct lpRates{
        int16 currentLong; // in hundreths of a percent, 40 = 0.0040 weekly
        int16 currentShort; // hundreths of a percent
        int16 nextLong;
        int16 nextShort;
        bool updated;
    }

    lpRates public defaultRates;
    
    uint maxOrderLimit;

    int[8] public dailyReturns;
    int public weeklyReturn;
    bool public longProfited;
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
    
    modifier onlyAdmin() {
        require (msg.sender == admin);
        _;
    }

    modifier pausable() {
        require (!isPaused);
        _;
    }
    
    constructor ( address _oracle, uint _assetID)
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

        openFee = 2; // 2%
        cancelFee = 3; // 3 %
        burnFee = 5; // 5%
        
        oracle = MultiOracle(_oracle);
        assetID = _assetID;

        isPaused = false;

        minRM = 1 * (1 ether);
        
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
        returns (address taker, uint takerMargin, uint reqMargin,
         uint8 initialDay, bool side, bool isCancelled, bool isBurned)
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
        require(msg.value >= minRM);
        Book book = Book(books[lp]);
        uint lpLong = book.totalLongMargin();
        uint lpShort = book.totalShortMargin();
        uint feeAmount = (msg.value * openFee)/100;
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
        ( , isFinal, , , currentDay, , , , ) = oracle.assets(assetID);
        uint8 startDay;
        b.firstSettle(currentDay);
        //b.firstSettle(oracle.assets(assetID).currentDay);
    }

    function computeReturns()
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
        uint[8] memory assetPastWeek;
        (, assetPastWeek, assetPrice) = oracle.getPrices(assetID);

        uint ethPrice;
        uint[8] memory ethPastweek;
        (, ethPastweek, ethPrice) = oracle.getPrices(0);

        uint ratio;
        ( , , , , , , , ratio,) = oracle.assets(assetID);

        for (uint8 i = 0; i < numDays; i++)
        {
            if (assetPastWeek[i] == 0)
                continue;

            int assetReturn = ( int(assetPrice.mul(1 ether)) / int(assetPastWeek[i]) ) - (1 ether);
            int leveraged = (assetReturn * 10000) / int(ratio);
            int pnl = (leveraged * int(ethPastweek[i])) / int(ethPrice);

            dailyReturns[i] = pnl;
        }
        weeklyReturn = dailyReturns[0];
        longProfited = (assetPrice > oracle.lastWeekPrices(0, assetID));
    }

/*    function getReturns()
        public
        view
        returns (int[8] _dailyReturns)
    {
        _dailyReturns = dailyReturns;
    }*/
    
    function settle(address lp)
        public
        onlyAdmin
    {
        if (books[lp] == 0x0)
            return; 
        Book b = Book(books[lp]);
        int16[3] memory settleRates;
        lpRates storage mRates = rates[lp];

        // Give lps default rates
        if (mRates.currentLong == 0 && mRates.currentShort == 0)
        {
            settleRates[0] = defaultRates.currentLong;
            settleRates[1] = defaultRates.currentShort;
        }
        else
        {
            settleRates[0] = rates[lp].currentLong;
            settleRates[1] = rates[lp].currentShort;
        }
        int16 basis;
        (, , , , , basis, , , ) = oracle.assets(assetID);
        settleRates[2] = basis;
        
        b.settle(dailyReturns, settleRates, longProfited);
        
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
        (, finalDay, , , , , , ,) = oracle.assets(assetID);
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
        (, , , lastSettleTime, , , , ,) = oracle.assets(assetID);
        b.cancel.value(msg.value)(lastSettleTime, id, msg.sender, openFee, cancelFee);
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
        Book b = Book(books[lp]);
        b.takerWithdrawal(id, amount, msg.sender);
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