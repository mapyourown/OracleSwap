pragma solidity ^0.4.24;

import "./Book.sol";
import "./Oracle.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract AssetSwap {
    
    using SafeMath for uint;
    
    Oracle public oracle;
    
    uint public ASSET_ID;
    address constant BURN_ADDRESS = 0xDEAD;

    uint public lastComputeReturnsTime;

    uint constant MIN_RM = 10 ether; // in wei
    uint constant CLOSE_FEE = 15; // in tenths of a %
    uint constant BURN_FEE = 250; // in tenths of a %
    uint16 public MAX_ORDER_LIMIT;
    int16 public takerLongRate; // in tenths of a %
    int16 public takerShortRate; // in tenths of a %
    int16 public nextTakerLongRate; // in tenths of a %
    int16 public nextTakerShortRate; // in tenths of a %
    uint16 public returnsLeverageRatio; // in hundredths
    uint16 public leverageRatio;
    uint16 public nextLeverageRatio;
    uint public maxOpenBalance;
    address public admin;

    uint[4] public tierCutoffs;
    uint[4] public tierMinOpens;

    // For making profit
    int[8] private takerLongReturns;
    int[8] private takerShortReturns;
    bool public longProfited;

    uint[] public minRMs;
    
    //lp specific info
    mapping(address => address) public books;
    mapping(address => uint) public openBalances;
    mapping(address => uint) public withdrawBalances;
    
    uint public burnFees;
    bool public isPaused;

    event OpenBalance(address indexed book, address lp, uint balance);
    event OrderTaken(address lp, address indexed taker, bytes32 id);
    event FirstPrice(address lp, uint8 startDay);
    event Burn(address lp, bytes32 id, address sender);
    event DEBUG(bytes32 str, uint result);
    event RatesUpdated(int16 newLong, int16 newShort);
    event LeverageRatioUpdated(uint newRatio);
    
    modifier onlyAdmin() {
        require (msg.sender == admin, "Only the admin can perform this action");
        _;
    }

    modifier pausable() {
        require (!isPaused, "Contract has been paused");
        _;
    }
    
    /** Sets up a new SwapMarket contract
    * @param _admin the address of the soon-to-be administrator
    * @param priceOracle the address of the Oracle contract
    * @param assetID the id of the asset according to the Oracle contract
    */
    constructor (address _admin, address priceOracle, uint assetID)
        public
    {
        admin = _admin;
        MAX_ORDER_LIMIT = 20;
        
        oracle = Oracle(priceOracle);
        ASSET_ID = assetID;

        isPaused = false;

        tierCutoffs = [25, 100, 250, 1e6];
        tierMinOpens = [20, 50, 100, 250];

    }

    /** Adjust the Long and Short rates for all contracts
    * @param target the new target rate in tenths of a percent
    * @param basis the new basis rate in tenths of a percent
    * @dev the "long rate" is target - basis, the "short rate" is target + basis
    * @dev the new rates won't go into effect until the following week after ComputeReturns is called
    */
    function setRates(int16 target, int16 basis)
        public
        onlyAdmin
    {
        // target between 0 and 1
        // basis between -2 and 2
        // Does not switch until next week
        require(0 < target &&  target < 99, "Target must be between 0 and 1");
        require(-199 < basis && basis < 199, "Basis must be between -2 and 2");

        nextTakerLongRate = target + basis;
        nextTakerShortRate = target - basis;

        require(0 < nextTakerLongRate + nextTakerShortRate, "Long + Short must be > 0"); 
        
        emit RatesUpdated(target, basis);
    }

    /** Adjust the maximum take sizes for each tier as well as the minimum open balance for that tier
    * @param tiers a uint array of the maximum take size for the tier IN ETH
    * @param minimums a unint array of each tier minimum open balance IN ETH
    */
    function setTiers(uint[4] tiers, uint[4] minimums)
        public
        onlyAdmin
    {
        tierCutoffs = tiers;
        tierMinOpens = minimums;
    }

    function adminCancel(address lp, bytes32 id)
        public
        onlyAdmin
    {
        Book b = Book(books[lp]);
        b.adminCancel(id);
    }


    /** Adjusts the future leverage ratio
    * @param newRatio the new desired leverage ratio
    * @dev the new leverage ratio goes into effect after computeReturns() is called
    */
    function setLeverageRatio(uint16 newRatio)
        public 
        onlyAdmin
    {
        nextLeverageRatio = newRatio;
        emit LeverageRatioUpdated(newRatio);
    }

    /** Allow the LP to create a new book
    * @param min the minimum take size in ETH for the book
    */
    function createBook(uint min)
        public
    {
        require (books[msg.sender] == 0x0, "User must not have a preexisting book");
        books[msg.sender] = new Book(msg.sender, this, min);
    }

    /** Allows a user to add to their Open Balance as a liquidity provider
    * @notice the user must add sufficient balance to meet the minimum for their min take tier
    * @dev the message value is automatically added
    */
    function increaseOpenBalance() 
        public
        payable
    {
        require (books[msg.sender] != 0x0, "Sender does not have a book");
        Book b = Book(books[msg.sender]);
        uint bookMin = b.BOOK_TAKE_MIN();
        if (bookMin < tierCutoffs[0] * 1 ether)
        {
            require(openBalances[msg.sender].add(msg.value) > tierMinOpens[0] * 1 ether,
                "Must have make with sufficient open balance for the tier.");
        } 
        else if (bookMin < tierCutoffs[1] * 1 ether)
        {
            require(openBalances[msg.sender].add(msg.value) > tierMinOpens[1] * 1 ether,
                "Must have make with sufficient open balance for the tier.");
        }
        else if (bookMin < tierCutoffs[2] * 1 ether)
        {
            require(openBalances[msg.sender].add(msg.value) > tierMinOpens[2] * 1 ether,
                "Must have make with sufficient open balance for the tier.");
        }
        else if (bookMin < tierCutoffs[3] * 1 ether)
        {
            require(openBalances[msg.sender].add(msg.value) > tierMinOpens[3] * 1 ether,
                "Must have make with sufficient open balance for the tier.");
        }
        openBalances[msg.sender] = openBalances[msg.sender].add(msg.value);
        emit OpenBalance(books[msg.sender], msg.sender, openBalances[msg.sender]);
    }

    /** Reduce the amount of ETH in the open balance of a user
    * @param amount the amount in Wei to subtract
    */
    function reduceOpenBalance(uint amount) 
        public
    {
        require (openBalances[msg.sender] >= amount, "User does not have enough Open Balance");
        openBalances[msg.sender] = openBalances[msg.sender].sub(amount);
        withdrawBalances[msg.sender] = withdrawBalances[msg.sender].add(amount);
        emit OpenBalance(books[msg.sender], msg.sender, openBalances[msg.sender]);
    }

    /** Take a new subcontract with an LP
    * @param lp the LP to take from
    * @param amount the amount IN ETHER to set the RM of the subcontract
    * @param takerSide the side the taker wishes to take, true for long, false for short
    */
    function take(address lp, uint amount, bool takerSide)
        public
        payable
        pausable
    {
        require(msg.value >= amount * (1 ether), "Insuffient ETH for this RM"); // allow only whole number amounts
        require(msg.value >= MIN_RM, "RM must be larger than the minimum");
        Book book = Book(books[lp]);
        uint lpLong = book.totalLongMargin();
        uint lpShort = book.totalShortMargin();

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

        require(msg.value <= openBalances[lp] + freeMargin, "RM to large for this LP");
        uint remainder = openBalances[lp].sub(msg.value - freeMargin);
        openBalances[lp] = remainder;
        //withdrawBalances[lp] = withdrawBalances[lp].add(feeAmount);
        //collectedFees = collectedFees.add(feeAmount);
        bytes32 newId = book.take.value(msg.value + (msg.value - freeMargin))(msg.sender, amount, takerSide);
        emit OrderTaken(lp, msg.sender, newId);
    }

    /** Burn a specific subcontract at a cost
    * @param lp the address of the LP with the subcontract
    * @param id the id of the subcontract to burn
    */
    function playerBurn(address lp, bytes32 id)
        public
        payable
    {
        Book b = Book(books[lp]);
        uint fee = b.burn(id, msg.sender, msg.value);
        burnFees = burnFees.add(fee);
        withdrawBalances[msg.sender] = withdrawBalances[msg.sender].add(msg.value - fee);
        emit Burn(lp, id, msg.sender);

    }
    
    /** Sets the contract to terminate at the end of the week
    * @param lp the address of the lp with the subcontract
    * @param id the id of the subcontract to cancel
    */
    function playerCancel(address lp, bytes32 id)
        public
        payable
    {
        Book b = Book(books[lp]);
        uint lastSettleTime;
        (, , lastSettleTime, ,) = oracle.assets(ASSET_ID);
        b.cancel.value(msg.value)(lastSettleTime, id, msg.sender, 0, CLOSE_FEE);
    }

    /** Adds value to the taker's margin
    * @param lp the address of the lp with the subcontract
    * @param id the id of the subcontract to add margin to
    */
    function takerFund(address lp, bytes32 id)
        public
        payable
    {
        require(books[lp] != 0x0);
        Book b = Book(books[lp]);
        b.fundTakerMargin.value(msg.value)(id);
    }

    /** Adds value to the lp's margin for their whole book
    * @param lp the address of the lp to add margin to
    */
    function lpFund(address lp)
        public
        payable
    {
        require(books[lp] != 0x0);
        Book b = Book(books[lp]);
        b.fundlpMargin.value(msg.value)();
    }
    
    /** Moves value out of the taker margin into the withdraw balance
    * @param amount the amount to move in wei
    * @param lp the lp with the subcontract to move balance from the taker margin
    * @param id the id of the subcontract
    */
    function takerWithdrawal(uint amount, address lp, bytes32 id)
        public
    {
        require(books[lp] != 0x0);
        
        Book b = Book(books[lp]);
        uint lastOracleSettleTime;
        (, ,lastOracleSettleTime, , ) = oracle.assets(ASSET_ID);

        // will revert if during settle period
        b.takerWithdrawal(id, amount, lastOracleSettleTime, msg.sender);
    }

    /** Moves value out of the lp margin into the withdraw balance
    * @param amount the amount to move in wei
    */
    function lpMarginWithdrawal(uint amount)
        public
    {
        require(books[msg.sender] != 0x0);
        
        Book b = Book(books[msg.sender]);
        uint lastOracleSettleTime;
        (, ,lastOracleSettleTime, , ) = oracle.assets(ASSET_ID);

        // Will revert if during settle period
        b.lpMarginWithdrawal(amount, lastOracleSettleTime);
    }

    /** Sends the owed balance to a user stored on this contract to an external address
    */
    function withdrawBalance()
        public 
    {
        uint amount = withdrawBalances[msg.sender];
        withdrawBalances[msg.sender] = 0;
        msg.sender.transfer(amount);
    }

    /** Function for easily getting the useful data about an LP's book
    * @param lp the lp who owns the book
    * @return book the address of the lp book
    * @return lpMargin the lp's current margin
    * @return totalLong the total RM of all long contracts the LP is engaged in
    * @return totalShort the total RM of all short contracts the LP is engaged in
    * @return lpRM the margin required for the LP
    * @return numContracts the number of subcontracts that the lp has in their book
    * @return bookMinimum the minimum size in wei to make a subcontract with this book
    */
    function getBookData(address lp)
        public
        view
        returns ( address book,
            uint lpMargin,
            uint totalLong,
            uint totalShort,
            uint lpRM, 
            uint numContracts,
            uint bookMinimum,
            bool lpDefaulted)
    {
        book = books[lp];
        if (book != 0x0) {
            Book b = Book(book);
            lpMargin = b.lpMargin();
            totalLong = b.totalLongMargin();
            totalShort = b.totalShortMargin();
            lpRM = b.requiredMargin();
            numContracts = b.numContracts();
            bookMinimum = b.BOOK_TAKE_MIN();
            lpDefaulted = b.lpDefaulted();
        }
    }

    /** Function to easily get specific information about a subcontract
    * @param lp the address of the lp with the subcontract
    * @param id the id of the subcontract
    * @return takerMargin the taker's margin
    * @return reqMargin the required margin of the subcontract
    * @return initialDay the day of the week the contract was started on
    * @return side the LP's side for the contract
    * @return isCancelled the status of if the subcontract is cancelled
    * @return isBurned the status of if the subcontract is burned
    */
    function getSubcontractData(address lp, bytes32 id)
        public
        view
        returns (
            uint takerMargin,
            uint reqMargin,
            uint8 initialDay,
            bool side, 
            bool isPending,
            bool isCancelled, 
            bool isBurned)
            //bool toDelete)
    {
        address book = books[lp];
        if (book != 0x0) {
            Book b = Book(book);
            (takerMargin, reqMargin, initialDay,side,
                isPending, isCancelled, isBurned/*, toDelete*/) = b.getSubcontract(id);
        }
    }

    /** Set all new contracts in the lp's book to use the next oracle price
    * @param lp the address of the lp to put prices in
    */
    function priceInitialization(address lp)
        public
        onlyAdmin
    {
        require(books[lp] != 0x0, "Book does not exist");
        Book b = Book(books[lp]);
        uint8 currentDay;
        bool isFinalDay;
        ( , , ,currentDay, isFinalDay) = oracle.assets(ASSET_ID);
        // want to start with the next day to be entered, which will be 0 on settlement days
        uint8 startDay = currentDay + 1;
        if (isFinalDay)
            startDay = 0;
        b.firstPrice(startDay);
        emit FirstPrice(lp, startDay);
    }

    /** Calculate what the returns are in terms of the maker for every day this week
    * @dev this should be ran sometime after prices are updated but before settle
    * @dev returns are computed once then applied to all contracts
    * @dev changes the funding rates and leverage ratio to apply for next week
    */
    function computeReturns()
        public
        onlyAdmin
    {

        // at least 3 days between returns
        require(lastComputeReturnsTime < 3 days);

        // Want: LR * ETH/ETH for every day
        // Want: A_1/A_0 - 1 - basis for every day.
        uint assetPrice  = oracle.getCurrentPrice(ASSET_ID);
        uint ethPrice = oracle.getCurrentPrice(0);
        
        /*uint[8] memory assetPastWeek;
        uint[8] memory ethPastWeek;
        assetPastWeek = oracle.lastWeekPrices(ASSET_ID);
        ethPastWeek = oracle.lastWeekPrices(0);*/

        uint assetPastPrice;
        uint ethPastPrice;

        for (uint8 i = 0; i < 8; i++)
        {
            assetPastPrice = oracle.lastWeekPrices(ASSET_ID, i);
            ethPastPrice = oracle.lastWeekPrices(0, i);
            if (assetPastPrice == 0 || ethPastPrice == 0)
                continue;

            int assetReturn = int((assetPastPrice * (1 ether)) / assetPrice) - 1 ether;
            takerLongReturns[i] = assetReturn - int(takerLongRate) * (1 ether)/1e3;
            takerLongReturns[i] = (takerLongReturns[i] * int(returnsLeverageRatio * ethPastPrice))/int(ethPrice * 100);
            takerShortReturns[i] = (-1 * assetReturn) - int(takerShortRate) * (1 ether)/1e3;
            takerShortReturns[i] = (takerShortReturns[i] * int(returnsLeverageRatio * ethPastPrice))/int(ethPrice * 100);
        }
        
        longProfited = (assetPrice > oracle.lastWeekPrices(ASSET_ID, 0));

        returnsLeverageRatio = leverageRatio;
        leverageRatio = nextLeverageRatio;
        takerLongRate = nextTakerLongRate;
        takerShortRate = nextTakerShortRate;
        lastComputeReturnsTime = block.timestamp;
    }
    
    /** Settle all subcontracts for this lp
    * @param lp the lp to settle
    */
    function settle(address lp)
        public
        onlyAdmin
    {
        require(books[lp] != 0x0);
        Book b = Book(books[lp]);

        // Can't be settled if not a settle day
        uint lastAssetSettleTime;
        (, , lastAssetSettleTime, , ) = oracle.assets(ASSET_ID);
        require(lastComputeReturnsTime > lastAssetSettleTime);
        
        b.settle(takerLongReturns, takerShortReturns, longProfited);
        
    }

    /** Prevent new subcontracts from being created while contract is paused
    * @param pauseValue true for pause, false for unpause
    */
    function pause(bool pauseValue)
        public
        onlyAdmin
    {
        isPaused = pauseValue;
    }

    /** Transfer all collected burn fees to the burn address
    */
    function emptyBurn()
        public
        onlyAdmin
    {
        uint amount = burnFees;
        burnFees = 0;
        BURN_ADDRESS.transfer(amount);
    }

    /** Credit a users balance with the message value
    * @param recipient the user to get balance
    * @dev used by the Book when it needs to give players value
    */
    function balanceTransfer(address recipient)
        public
        payable
    {
        withdrawBalances[recipient] = withdrawBalances[recipient].add(msg.value);
    }

    /** Terminate a defaulted/burned/cancelled subcontract
    * @param lp the address of the lp with the subcontract
    * @param id the subcontract id
    */
    function redeem(address lp, bytes32 id)
        public
    {
        require(books[lp] != 0x0);
        Book b = Book(books[lp]);
        b.redeemSubcontract(id);

    }

    /** Change the address of the administrator
    * @param newAdmin the new administrator address
    */
    function changeAdmin(address newAdmin) 
        public 
        onlyAdmin
    {
        admin = newAdmin;
    }

    function checkLengthDEBUG(address maker)
        public
        view
        returns (uint long, uint short)
    {
        require(books[maker] != 0x0);
        Book b = Book(books[maker]);
        long = b.returnLongLenth();
        short = b.returnShortLength();
    }
}