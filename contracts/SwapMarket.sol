pragma solidity ^0.4.24;

import "./Book.sol";
import "./MultiOracle.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract SwapMarket {
    
    using SafeMath for uint;
    
    MultiOracle public oracle;
    uint public assetID;

    uint public minRM;
    uint8 public openFee;
    uint8 public cancelFee;
    uint16 public burnFee;
    address public admin;
    
    struct makerRates{
        int16 currentLong;
        int16 currentShort;
        int16 nextLong;
        int16 nextShort;
        bool updated;
    }

    makerRates public defaultRates;
    
    uint maxOrderLimit;

    int[8] public dailyReturns;
    int public weeklyReturn;
    bool public longProfited;
    //owner specific info
    mapping(address => address) public books;
    mapping(address => address) public ownerChanges;
    mapping (address => makerRates) public rates;
    mapping(address => uint) public openMargins;
    mapping(address => uint) public balances;
    
    uint8 constant public marginSafetyFactor = 100;
    
    uint public collectedFees;

    bool public isPaused;

    event OpenMargin(address _maker, address _book);
    event OrderTaken(address _maker, address indexed taker, bytes32 id);
    
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
        makerRates memory adminRates;
        // todo can't change
        adminRates.nextLong = 10;
        adminRates.nextShort = 4;
        adminRates.currentLong = 10;
        adminRates.currentShort = 4;

        defaultRates = adminRates;

        openFee = 2;
        cancelFee = 3;
        burnFee = 5;
        
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
    
    /*function getMakerRates(address maker)
        public
        view
        returns (int16 longRate, int16 shortRate, int16 nextLong, int16 nextShort)
    {
        makerRates storage mRates = rates[maker];
        longRate = mRates.currentLong;
        shortRate = mRates.currentShort;
        nextLong = mRates.nextLong;
        nextShort = mRates.nextShort;
    }*/

    function getBookData(address maker)
        public
        view
        returns (address book, uint totalLong, uint totalShort)
    {
        book = books[maker];
        if (book != 0x0) {
            Book b = Book(book);
            totalLong = b.totalLongMargin();
            totalShort = b.totalShortMargin();
        }
    }

    function getSubcontractData(address maker, bytes32 id)
        public
        view
        returns (address taker, uint takerMargin, uint reqMargin,
         uint8 initialDay, bool side, bool isCancelled, bool isBurned)
    {
        address book = books[maker];
        if (book != 0x0) {
            Book b = Book(book);
            (taker, takerMargin, reqMargin, initialDay,
                side, isCancelled, isBurned) = b.getSubcontract(id);
        }
    }
    
    function take(address maker, uint amount, bool side)
        public
        payable
        pausable
    {
        require(msg.value == amount * (1 ether)); // allow only whole number amounts
        require(msg.value >= minRM);
        Book book = Book(books[maker]);
        uint makerLong = book.totalLongMargin();
        uint makerShort = book.totalShortMargin();
        uint feeAmount = (msg.value * openFee)/100;
        require(openMargins[maker] >= feeAmount);

        uint freeMargin = 0;
        if (side) // taker is long, maker is short
        {
            if (makerLong > makerShort)
                freeMargin = makerLong - makerShort;
        }
        else // taker is short, maker is long
        {
            if (makerShort > makerLong)
                freeMargin = makerShort - makerLong;
        }

        require(msg.value + feeAmount <= openMargins[maker] + freeMargin);
        uint remainder = openMargins[maker].sub((msg.value - freeMargin) + feeAmount);
        openMargins[maker] = remainder;
        collectedFees = collectedFees.add(feeAmount);
        bytes32 newId = book.take.value(msg.value + (msg.value - freeMargin))(msg.sender, msg.value, side);
        emit OrderTaken(maker, msg.sender, newId);
    }

    function firstPrice(address owner)
        public
        onlyAdmin
    {
        if (books[owner] == 0x0)
            return;
        Book b = Book(books[owner]);
        uint8 currentDay;
        ( , , , , currentDay, , , ) = oracle.assets(assetID);
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
        for (uint8 i = 0; i < numDays; i++)
        {
            // Do nothing if empty
            if (oracle.lastWeekPrices(i, assetID) == 0)
                continue;
            uint assetPrice;
            (, , assetPrice) = oracle.getPrices(assetID);
            uint volatility;
            ( , , , , , , , volatility) = oracle.assets(i);
            uint ethPrice;
            (, , ethPrice) = oracle.getPrices(0);
            int assetReturn = (int(assetPrice.mul(1 ether)) / int(oracle.lastWeekPrices(i, assetID))) - (1 ether);
            int leveraged = assetReturn / int(volatility);
            // use ETH prices
            int pnl = (leveraged * int(oracle.lastWeekPrices(i, 0)))/int(ethPrice);

            dailyReturns[i] = pnl;
        }
        weeklyReturn = dailyReturns[0];
        longProfited = (assetPrice > oracle.lastWeekPrices(0, assetID));
    }
    
    function settle(address owner)
        public
        onlyAdmin
    {
        if (books[owner] == 0x0)
            return; 
        Book b = Book(books[owner]);
        int16[3] memory settleRates;
        makerRates storage mRates = rates[owner];

        // Give makers default rates
        if (mRates.currentLong == 0 && mRates.currentShort == 0)
        {
            settleRates[0] = defaultRates.currentLong;
            settleRates[1] = defaultRates.currentShort;
        }
        else
        {
            settleRates[0] = rates[owner].currentLong;
            settleRates[1] = rates[owner].currentShort;
        }
        int16 basis;
        (, , , , , basis, , ) = oracle.assets(assetID);
        settleRates[2] = basis;
        
        b.settle(dailyReturns, settleRates, longProfited);
        
        mRates.currentLong = mRates.nextLong;
        mRates.currentShort = mRates.nextShort;
        
        if (ownerChanges[owner] != 0x0)
            ownerModify(owner, ownerChanges[owner]);
        
        ownerChanges[owner] = 0x0;
        
    }
    
    function setRate(int16 longRate, int16 shortRate)
        public
    {
        require(0 < longRate + shortRate);
        require(longRate + shortRate < 52);
        //require()
        bool finalDay;
        (, finalDay, , , , , , ) = oracle.assets(assetID);
        require(!finalDay); // Rates locked in by day before
        makerRates storage mRates = rates[msg.sender];
        mRates.nextLong = longRate;
        mRates.nextShort = shortRate;
    }

    function playerBurn(address owner, bytes32 id)
        public
        payable
    {
        // TODO make sure only durring settle period
        Book b = Book(books[owner]);
        b.burn.value(msg.value)(id, msg.sender);
    }
    
    function playerCancel(address owner, bytes32 id)
        public
        payable
    {
        Book b = Book(books[owner]);
        uint lastSettleTime;
        (, , , lastSettleTime, , , , ) = oracle.assets(assetID);
        b.cancel.value(msg.value)(lastSettleTime, id, msg.sender, openFee, cancelFee);
    }
    
    function changeOwner(address _newOwner)
        public
    {
        ownerChanges[msg.sender] = _newOwner;
    }
    
    function ownerModify(address _oldOwner, address _newOwner)
        internal
        returns (bool valid)
    {
        if (books[_newOwner] != 0x0)
            return false;
        books[_newOwner] = books[_oldOwner];
        books[_oldOwner] = 0x0;
        return true;
    }

    function takerFund(address maker, bytes32 id)
        public
        payable
    {
        require(books[maker] != 0x0);
        Book b = Book(books[maker]);
        b.fundTakerMargin.value(msg.value)(id);
    }

    function lpFund(address maker)
        public
        payable
    {
        require(books[maker] != 0x0);
        Book b = Book(books[maker]);
        b.fundOwnerMargin.value(msg.value)();
    }
    
    function takerWithdrawal(uint amount, address owner, bytes32 id)
        public
    {
        require(books[owner] != 0x0);
        Book b = Book(books[owner]);
        b.takerWithdrawal(id, amount, msg.sender);
    }
    
    function ownerMarginWithdrawal(uint amount)
        public
    {
        require(books[msg.sender] != 0x0);
        
        Book b = Book(books[msg.sender]);
        b.ownerMarginWithdrawal(amount);
    }

    function collectBalance()
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
}