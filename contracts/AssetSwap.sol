pragma solidity ^0.4.25;

import "./Book.sol";
import "./Oracle.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract AssetSwap {
    
    using SafeMath for uint;
    
    Oracle public oracle;
    
    uint public ASSET_ID;
    bool public isCryptoSetted;
    
    uint constant CLOSE_FEE = 150; // in hundredths of a %
    uint constant GLOBAL_MIN_RM = 10; // in ETH

    int16 public takerLongRate; // in hundredths of a %
    int16 public takerShortRate; // in hundredths of a %
    uint16 public returnsLeverageRatio; // the LR * 100
    uint16 public leverageRatio;    // the LR * 100

    // For computing profit
    int[8] private takerLongReturns;
    int[8] private takerShortReturns;
    uint public lastComputeReturnsTime;
    bool public longProfited;
    
    mapping(address => address) public books;
    mapping(address => uint) public withdrawBalances;
    mapping(address => bool) public admins;
    address public feeAddress;
    address public constant BURN_ADDRESS = 0xdead;
    uint public burnFees;
    bool public isPaused; 

    event OrderTaken(address lp, address indexed taker, bytes32 id);
    event FirstPrice(address lp, uint8 startDay);
    event Burn(address lp, bytes32 id, address sender);
    event RatesUpdated(int16 target, int16 basis);
    event LeverageRatioUpdated(uint newRatio);
    
    modifier onlyAdmin()
    {
        require(admins[msg.sender]);
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
    constructor (
        address _admin,
        address priceOracle,
        uint assetID,
        uint16 _leverageRatio,
        bool _isCryptoSettled)
        public
    {
        admins[_admin] = true;
        
        oracle = Oracle(priceOracle);
        ASSET_ID = assetID;
        isCryptoSetted = _isCryptoSettled;

        leverageRatio = _leverageRatio;
    }

    /** Adjust the Long and Short rates for all contracts
    * @param target the new target rate in hundredths of a percent
    * @param basis the new basis rate in hundredths of a percent
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
        require(0 < target &&  target < 100, "Target must be between 0 and 1%");
        require(-200 < basis && basis < 200, "Basis must be between -2 and 2%");

        takerLongRate = target + basis;
        takerShortRate = target - basis;

        require(0 < takerLongRate + takerShortRate, "Long + Short must be > 0"); 
        
        emit RatesUpdated(target, basis);
    }

    function adminCancel(address lp, bytes32 id)
        public
        onlyAdmin
    {
        Book b = Book(books[lp]);
        b.adminCancel(id);
    }

    /** Allow the LP to create a new book
    * @param min the minimum take size in ETH for the book
    */
    function createBook(uint min)
        public
        returns (address newBook)
    {
        require (books[msg.sender] == 0x0, "User must not have a preexisting book");
        require (min >= GLOBAL_MIN_RM, "Must meet the minimum");
        books[msg.sender] = new Book(msg.sender, this, min);
        return books[msg.sender];
    }

    /** Allow the LP to change the minimum take size in their book
    * @param min the minimum take size in ETH for the book
    */
    function adjustMinRM(uint min)
        public
    {
        require (books[msg.sender] != 0x0, "User must have a book");
        require (min >= GLOBAL_MIN_RM, "Must meet the minimum");
        Book b = Book(books[msg.sender]);
        b.adjustMinRM(min);
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
        require(amount >= GLOBAL_MIN_RM, "RM must be larger than the minimum");
        Book book = Book(books[lp]);
        uint lpLong = book.totalLongMargin();
        uint lpShort = book.totalShortMargin();
        uint freeMargin = 0;
        uint lpRM = book.lpRequiredMargin();

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

        require(msg.value <= (book.lpMargin() - lpRM)/2 + freeMargin, "RM to large for this LP");
        bytes32 newId = book.take.value(msg.value)(msg.sender, amount, takerSide);
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
        uint lastSettleTime = oracle.getLastSettleTime(ASSET_ID);
        b.cancel.value(msg.value)(lastSettleTime, id, msg.sender, CLOSE_FEE);
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
        uint lastOracleSettleTime = oracle.getLastSettleTime(ASSET_ID);

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
        uint lastOracleSettleTime= oracle.getLastSettleTime(ASSET_ID);

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
            lpRM = b.lpRequiredMargin();
            numContracts = b.numContracts();
            bookMinimum = b.minRM();
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
            bool isCancelled, 
            bool isBurned,
            bool toDelete)
    {
        address book = books[lp];
        if (book != 0x0) {
            Book b = Book(book);
            (takerMargin, reqMargin, initialDay, side,
                isCancelled, isBurned, toDelete) = b.getSubcontract(id);
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
    * @notice 
    */
    function computeReturns()
        public
        onlyAdmin
    {

        // only compute returns after settle price posted
        require(oracle.isSettleDay(ASSET_ID));

        uint assetPrice  = oracle.getCurrentPrice(ASSET_ID);
        uint ethPrice = oracle.getCurrentPrice(0);

        uint assetPastPrice;
        uint ethPastPrice;

        for (uint8 i = 0; i < 8; i++)
        {
            assetPastPrice = oracle.lastWeekPrices(ASSET_ID, i);
            ethPastPrice = oracle.lastWeekPrices(0, i);
            if (assetPastPrice == 0 || ethPastPrice == 0)
                continue;

            int assetReturn = int((assetPrice * (1 ether)) / assetPastPrice) - 1 ether;
            takerLongReturns[i] = assetReturn - ((1 ether) * int(takerLongRate))/1e4;
            takerShortReturns[i] = (-1 * assetReturn) - ((1 ether) * int(takerShortRate))/1e4;
            if (isCryptoSetted)
            {   
                takerLongReturns[i] = (takerLongReturns[i] * int(leverageRatio * assetPastPrice))/int(assetPrice * 100);
                takerShortReturns[i] = (takerShortReturns[i] * int(leverageRatio * assetPastPrice))/int(assetPrice * 100);
            }
            else
            {
                takerLongReturns[i] = (takerLongReturns[i] * int(leverageRatio * ethPastPrice))/int(ethPrice * 100);
                takerShortReturns[i] = (takerShortReturns[i] * int(leverageRatio * ethPastPrice))/int(ethPrice * 100);
            }
        }
        
        longProfited = (assetPrice > oracle.lastWeekPrices(ASSET_ID, 0));
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

        // Can't be settled if returns haven't been computed yet
        uint lastUpdateTime = oracle.getLastUpdateTime(ASSET_ID);
        require(lastComputeReturnsTime > lastUpdateTime);
        require(oracle.isSettleDay(ASSET_ID));
        
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

    /** Change the address that can withdraw the collected fees
    * @param newAddress the new address to change to
    */
    function changeFeeAddress(address newAddress)
        public
        onlyAdmin
    {
        feeAddress = newAddress;
    }

    /** Grant administrator priviledges to a user
    * @param newAdmin the address to promote
    */
    function addAdmin(address newAdmin)
        public
        onlyAdmin
    {
        admins[newAdmin] = true;
    }

    /** Remove administrator priviledges from a user
    * @param toRemove the address to demote
    * @notice you may not remove yourself
    */
    function removeAdmin(address toRemove)
        public
        onlyAdmin
    {
        require(toRemove != msg.sender, "You may not remove yourself as an admin.");
        admins[toRemove] = false;
    }
}