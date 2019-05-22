pragma solidity ^0.4.24;

import "./Book.sol";
import "./Oracle.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract AssetSwap {
    
    using SafeMath for uint;
    
    Oracle public oracle;
    
    uint public ASSET_ID;
    address public BURN_ADDRESS = 0xDEAD;

    uint public lastComputeReturnsTime;

    // isCryptoSettled
    // 6 decimal places for each, 2500000 = 2.5
    uint public currentLeverageRatios;
    uint public nextLeverageRatios;

    uint public MIN_RM; // in wei
    uint8 public CLOSE_FEE; // in tenths of a %
    uint16 public MAX_ORDER_LIMIT;
    int16 public takerLongRate;
    int16 public takerShortRate;
    int16 public nextTakerLongRate;
    int16 public nextTakerShortRate;
    uint16 public leverageRatio;
    uint16 public nextLeverageRatio;
    uint public maxOpenBalance;
    address public admin;

    // For making profit
    int[8] private longReturns;
    int[8] private shortReturns;
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

        CLOSE_FEE = 15; // 1.5 %
        MAX_ORDER_LIMIT = 20;
        
        oracle = Oracle(priceOracle);
        ASSET_ID = assetID;

        isPaused = false;

        MIN_RM = 10 ether;
    }

    /** Adjust the Long and Short rates for all contracts
    * @param target the new target rate
    * @param basis the new basis rate
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

    /** Allows a user to be a liquidity provider and add to their Open Balance
    * @dev the message value is automatically added
    */
    function increaseOpenBalance() 
        public
        payable
    {
        if (books[msg.sender] == 0x0) // make a new book
            books[msg.sender] = new Book(msg.sender, this);
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

    /** Allow the LP to set a specific take minimum for their book
    * @param min the amount in ETH that is the new desired minimum
    */
    function setMinimum(uint min)
        public
    {
        require (books[msg.sender] != 0x0, "User does not have a book");
        Book b = Book(books[msg.sender]);
        b.setMinimum(min * (1 ether));
    }

    /** Allow the LP to create a new book
    * @param min the minimum take size in ETH for the book
    */
    function createBook(uint min)
    {
        require (books[msg.sender] == 0x0, "User must not have a preexisting book");
        books[msg.sender] = new Book(msg.sender, this, min);
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
        b.cancel.value(msg.value)(lastSettleTime, id, msg.sender, 0, CANCEL_FEE);
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
        (, ,lastOracleSettleTime, , ) = oracle.Assets(ASSET_ID);

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
        b.lpMarginWithdrawal(amount);
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
    */
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
            bool isCancelled, 
            bool isBurned)
    {
        address book = books[lp];
        if (book != 0x0) {
            Book b = Book(book);
            (takerMargin, reqMargin, initialDay,
                side, isCancelled, isBurned) = b.getSubcontract(id);
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

        // Todo: timing restrictions?
        // > last OPC Update
        // Can't call multiple times because Rate
        // DO returns here

        // at least 3 days between returns
        require(lastComputeReturnsTime < 3 days);


        /*

        // Want: LR * ETH/ETH for every day
        // Want: A_1/A_0 - 1 - basis for every day.
        uint assetPrice  = oracle.getCurrentPrice(ASSET_ID);
        uint[8] memory assetPastWeek;
        uint lrPastWeek;
        (lrPastWeek, assetPastWeek) = oracle.getPastPrices(ASSET_ID);

        uint ethPrice = oracle.getCurrentPrice(0);
        uint[8] memory ethPastWeek;
        (, ethPastWeek) = oracle.getPastPrices(0);

        for (uint8 i = 0; i < 8; i++)
        {
            if (assetPastWeek[i] == 0)
                continue;
            //leverages[i] = lrPastWeek[i] * (ethPastWeek[i] * 1e6 ) / ethPrice; // add 6 more decimals
            //longReturns[i] = int(assetPrice * (1 ether)/ assetPastWeek[i]) - (1 ether / 1e4);
            
        }
        //longProfit = (assetPrice > oracle.lastWeekPrices(0, ASSET_ID));*/

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
        uint[8] memory leverages;

        // Can't be settled if not a settle day
        uint lastAssetSettleTime;
        (, , lastAssetSettleTime, , ) = oracle.assets(assetID);
        require(lastComputeReturnsTime > lastAssetSettleTime);


        computeReturns();
        
        b.settle(leverages, longReturns, longProfited);
        
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
        // TODO: Where send?
    }

    /** Credit a users balance with the message value
    * @dev used by the Book when it needs to give players value
    */
    function balanceTransfer(address recipient)
        public
        payable
    {
        withdrawBalances[recipient] = withdrawBalances[recipient].add(msg.value);
    }

    function checkLengthDEBUG(address maker)
        public
    {
        require(books[maker] != 0x0);
        Book b = Book(books[maker]);
        uint long = b.returnLongLenth();
        uint short = b.returnShortLength();

        emit DEBUG("Long: ", long);
        emit DEBUG("Short: ", short);
    }
}