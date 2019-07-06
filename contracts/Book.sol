pragma solidity ^0.4.25;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./AssetSwap.sol";

contract Book {

    using SafeMath for uint;
    
    address public lp;
    AssetSwap public assetSwap;
    
    uint public lastBookSettleTime;
    
    bool public lpDefaulted;
    uint public lpMargin;
    uint public burnFees;

    uint public burnMargin;
    uint public totalLongMargin;    // total RM of all subks where lp is long
    uint public totalShortMargin;   // total RM of all subks where lp is short
    uint public lpRequiredMargin;   // ajusted by take, reset at settle
    uint public takeMinimum;
    
    uint public numContracts;
    bytes32[] public pendingContracts;    // for subcontracts awaiting price initialization
    bytes32[] public shortTakerContracts; // where lp is long
    bytes32[] public longTakerContracts;  // where lp is short
    
    mapping(bytes32 => Subcontract) public subcontracts;

    uint public minRM; // in wei

    uint constant DEFAULT_FEE = 1250; // in hundredths of a percent
    uint constant BURN_FEE = 2500; // in hundredths of a percent
    uint constant TIME_TO_SELF_DESTRUCT = 9 days;
    uint constant TIME_BETWEEN_SETTLES = 4 days;
    uint constant MAX_SUBCONTRACTS = 90;
    uint constant SIZE_DISC_CUTOFF= 10 ether;
    uint constant NUM_DISC_CUTOFF = 20;

    
    modifier onlyAdmin()
    {
        require(msg.sender == address(assetSwap));
        _;
    }
    
    event OrderTaken(address indexed _taker, bytes32 indexed _id, uint _amount);
    event TakerDefault(address indexed _taker, bytes32 indexed _id);
    event DeleteTraker(uint index, bool willDelete);
    
    struct Subcontract {
        uint index;
		address Taker; 		
		uint256 TakerMargin;
		uint256 ReqMargin;        // in wei
        uint8 InitialDay;
		bool MakerSide;           // true for long
		bool isInitialized;       // true if taken
        bool isNewContract;       // true if started this week
		bool isCancelled; 	      
		bool isBurned;
		bool makerBurned;
        bool toDelete;
        bool takerCloseDiscount;
	}

    /** Sets up a new Book for an LP.
    * @notice each LP should have only one book
    * @dev the minumum take size is established here and never changes
    * @param user the address of the LP the new book should belong to
    * @param admin the address responsible for managing the Book (should be the assetSwap)
    * @param minBalance the minimum balance size in ETH
    */
    constructor(address user, address admin, uint minBalance)
        public 
    {
        assetSwap = AssetSwap(admin);
        lp = user;
        minRM = minBalance.mul(1 ether);
        lastBookSettleTime = block.timestamp;
    }
	
    /** Internal function for removing a subcontract from storage.
    * @notice automatically refunds the balances and does the proper accounting for the taker
    * @param id the id of the subcontract to erase
    */
	function deleteSubcontract(bytes32 id) 
	    internal
    {

	    Subcontract storage k = subcontracts[id];
		
        uint tMargin = k.TakerMargin;
        k.TakerMargin = 0;
        balanceSend(tMargin, k.Taker);
        
        // implicitly delete by swapping with last element and shortening
        uint index = k.index;
        if (k.MakerSide) {
            Subcontract storage lastShort = subcontracts[shortTakerContracts[shortTakerContracts.length - 1]];
            lastShort.index = index;
            shortTakerContracts[index] = shortTakerContracts[shortTakerContracts.length - 1];
            shortTakerContracts.length--;
        } else {
            Subcontract storage lastLong = subcontracts[longTakerContracts[longTakerContracts.length - 1]];
            lastLong.index = index;
            longTakerContracts[index] = longTakerContracts[longTakerContracts.length - 1];
            longTakerContracts.length--;
        }
            
        Subcontract memory blank;
        subcontracts[id] = blank;
        numContracts--;
	}
    /** Internal function for removing a subcontract from consideration.
    * @notice the contract should be redeemed after this
    * @notice this is only called during settle
    * @param id the id of the subcontract to erase
    */
    function markForDeletion(bytes32 id)
        internal
    {
        Subcontract storage k = subcontracts[id];
        uint rMargin = k.ReqMargin;
        if (k.MakerSide)
            totalLongMargin = totalLongMargin.sub(rMargin);
        else
            totalShortMargin = totalShortMargin.sub(rMargin);
        k.toDelete = true;
    }

    /** This function returns the stored values of a subcontract
    * @param id the subcontract id
    * @return takerMargin the takers actual margin balance
    * @return reqMargin the required margin for both parties for the subcontract
    * @return initialDay the integer value corresponding to the index (day) for retrieving prices
    * @return side the side of the contract in terms of the LP
    * @return isCancelled if true, the subcontract has been marked as cancelled
    * @return isBurned if true, the subconract has been marked as burned
    * @return toDelete if true, the subcontract has been evaluated the last time and should be deleted
    */
    function getSubcontract(bytes32 id)
        public
        view
        returns (uint takerMargin, uint reqMargin, uint8 initialDay,
          bool side, bool isCancelled, bool isBurned, bool toDelete, bool takerDiscount)
    {
        Subcontract storage k = subcontracts[id];
        takerMargin = k.TakerMargin;
        reqMargin = k.ReqMargin;
        initialDay = k.InitialDay;
        side = k.MakerSide;
        isCancelled = k.isCancelled;
        isBurned = k.isBurned;
        toDelete = k.toDelete;
        takerDiscount = k.takerCloseDiscount;
    }

    /** Create a new subcontract of the given parameters
    * @param taker the address of the party on the other side of the contract
    * @param amount the amount in ETH to create the subcontract for
    * @param takerSide the side (long = true) the taker is taking
    * @return id the id of the newly created subcontract
	*/
	function take(address taker, uint amount, bool takerSide)
        public
        payable
        onlyAdmin
        returns (bytes32 id)
    {
        require(amount * 1 ether >= minRM);
        require(numContracts < MAX_SUBCONTRACTS);
        uint RM = amount * 1 ether; 

        Subcontract memory order;
        order.ReqMargin = RM;
        order.MakerSide = !takerSide;
        order.isInitialized = true;
        order.TakerMargin = msg.value;
        order.isNewContract = true;
        order.Taker = taker;

        id = keccak256(abi.encodePacked(lp, block.timestamp, numContracts));
        numContracts++;

        if (takerSide)
        {           // Case 1: taker is long, make is short
            order.index = longTakerContracts.length;
            longTakerContracts.push(id);
            totalShortMargin = totalShortMargin.add(RM);
            if (totalShortMargin - totalLongMargin > lpRequiredMargin)
                lpRequiredMargin = totalShortMargin - totalLongMargin;
        } else {    // Case 2: taker is short, maker is long
            order.index = shortTakerContracts.length;
            shortTakerContracts.push(id);
            totalLongMargin = totalLongMargin.add(RM);
            if (totalLongMargin - totalShortMargin > lpRequiredMargin)
                lpRequiredMargin = totalLongMargin - totalShortMargin;
        }

        if ((totalLongMargin + totalShortMargin) > SIZE_DISC_CUTOFF) || (numContract > NUM_DISC_CUTOFF))
            { order.takerCloseDiscount = true;}

        
        subcontracts[id] = order;
        pendingContracts.push(id);
        
        require (lpMargin >= lpRequiredMargin, "Something went wrong, this take should not be allowed");

        emit OrderTaken(taker, id, RM);
        return id;
    }

    /** Deposit wei into the LP margin
    * @notice the message value is directly deposited
    */
    function fundlpMargin()
        public
        payable
    {
        lpMargin = lpMargin.add(msg.value);
    }
    
    /** Deposit wei into a taker's margin
    * @param id the id of the subcontract to deposit into
    * @notice the message value is directly deposited.
    */
    function fundTakerMargin(bytes32 id)
        public
        payable
    {
        Subcontract storage k = subcontracts[id];
        require (k.isInitialized);
        k.TakerMargin= k.TakerMargin.add(msg.value);
    }

    /** Set the initial day of all new subcontracts
    * @param priceDay the index value of the current day of the oracle
    */
    function firstPrice(uint8 priceDay)
        public
        onlyAdmin
    {

        uint length = pendingContracts.length;
        for (uint32 i = 0; i < length; i++) {
            Subcontract storage k = subcontracts[pendingContracts[i]];
            k.InitialDay = priceDay;
        }
        delete pendingContracts;
    }

    /** Cancel a subcontract
    * @param oraclePriceTime the last settle price timestamp
    * @param id the subcontract id
    * @param sender who sent the cancel to the AssetSwap contract
    * @param cancelFee the cancel fee for cancelling a subcontract the rest of the time
    */
    function cancel(uint oraclePriceTime, bytes32 id, address sender, uint cancelFee)
        public
        payable
        onlyAdmin
    {
        Subcontract storage k = subcontracts[id];
		require(sender == k.Taker || sender == lp, "Canceller is not LP or Taker");
        require(!k.isCancelled, "Subcontract is already cancelled");
		require (oraclePriceTime < lastBookSettleTime, "Players may not cancel during the settle period");

        uint fee;
        if (sender == k.Taker && k.takerCloseDiscount)
            fee =(k.ReqMargin * cancelFee)/2e4;
        else
            fee = (k.ReqMargin * cancelFee)/1e4;
		require(msg.value >= fee, "Insufficient cancel fee");

        k.isCancelled = true;

        balanceSend(fee, assetSwap.feeAddress());
        balanceSend(msg.value - fee, sender);
    }

    /** Allow the OracleSwap admin to cancel any  subcontract
    * @param id the subcontract to cancel
    */
    function adminCancel(bytes32 id)
        public
        payable
        onlyAdmin
    {
        Subcontract storage k = subcontracts[id];
        k.isCancelled = true;
    }

    /** Burn a subcontract
    * @param id the subcontract id
    * @param sender who called the function in AssetSwap
    * @param amount the message value
    */
    function burn( bytes32 id, address sender, uint amount)
        public
        payable
        onlyAdmin
        returns (uint)
    {
        Subcontract storage k = subcontracts[id];
        require(sender == lp || sender == k.Taker);
        require(!k.isBurned);
        
        // cost to kill
		uint burnFee = (k.ReqMargin * BURN_FEE)/1e4;
		require (amount >= burnFee);
		if (msg.sender == lp)
			k.makerBurned = true;
		// set appropriate flags for settlment
		k.isBurned = true;
        return burnFee;
    }
    
    /** Allow a taker to withdraw margin
    * @param id the subcontract id
    * @param lastOracleSettlePrice the block timestamp of the last oracle settle price
    * @param sender who sent this message to AssetSwap
    * @notice reverts during settle period
    */
    function takerWithdrawal(bytes32 id, uint amount, uint lastOracleSettlePrice, address sender)
        public
        onlyAdmin
    {
        Subcontract storage k = subcontracts[id];
        require(lastOracleSettlePrice < lastBookSettleTime,
            "Taker cannot withdraw during the settle period.");
        require(k.TakerMargin >= k.ReqMargin.add(amount),
            "Taker must have sufficient margin");
        require(sender == k.Taker,
            "Must be taker to call this function");
        
        k.TakerMargin = k.TakerMargin.sub(amount);
        balanceSend(amount, k.Taker);
    }

    /** Settle the whole book
    * @param takerLongRets the returns for a long contract for a taker each day of the week
    * @param takerShortRets the returns for a short contract for a taker each day of the week
    * @param longProfited if true, indicates that the long positiion had earnings
    */
    function settle(int[8] takerLongRets, int[8] takerShortRets, bool longProfited)
        public
        onlyAdmin
    {
        require (block.timestamp > lastBookSettleTime + TIME_BETWEEN_SETTLES,
            "Book has been settled too recently");

        if (longProfited)
        {
            for (i = 0; i < shortTakerContracts.length; i++) {
                settleSubcontract(shortTakerContracts[i], takerShortRets);
            }
            for (uint i = 0; i < longTakerContracts.length; i++) {
                settleSubcontract(longTakerContracts[i], takerLongRets);
            }  
        }
        else
        {  
            for (i = 0; i < longTakerContracts.length; i++) {
                settleSubcontract(longTakerContracts[i], takerLongRets);
            }
            for (i = 0; i < shortTakerContracts.length; i++) {
                settleSubcontract(shortTakerContracts[i], takerShortRets);
            }
        }

        lastBookSettleTime = block.timestamp;
        burnMargin = 0;

        if (totalLongMargin > totalShortMargin)
            lpRequiredMargin = totalLongMargin - totalShortMargin;
        else
            lpRequiredMargin = totalShortMargin - totalLongMargin;

        if (lpMargin < lpRequiredMargin)
        {
            lpDefaulted = true;
            uint toSub = min(lpMargin, lpRequiredMargin.mul(DEFAULT_FEE)/1e4);
            lpMargin = lpMargin - toSub;
            balanceSend(toSub, assetSwap.feeAddress());
        }
    }

    /** Internal fn to settle an individual subcontract
    * @param id the id of the subcontract
    * @param takerRets the taker returns for a contract of that position for each day of the week
    */
    function settleSubcontract(bytes32 id, int[8] takerRets)
        internal
    {
        Subcontract storage k = subcontracts[id];

        // Don't settle terminated contracts
        if (k.toDelete)
            return;

        // Dont settle subcontracts started today
        if (k.isNewContract && k.InitialDay == 0)
        {
            k.isNewContract = false;
            return;
        }

        int makerPNL = (-1 * takerRets[k.InitialDay]) * int(k.ReqMargin / 1 ether);
        
        uint absolutePNL;
        if (makerPNL > 0)
            absolutePNL = uint(makerPNL);
        else
            absolutePNL = uint(makerPNL * (-1));

        // in the case the maker should profit
        if (makerPNL > 0)
        {
            uint toTake = min(k.TakerMargin, absolutePNL);
            k.TakerMargin = k.TakerMargin.sub(toTake);

            // add to burn margin if taker burned or burn fees if maker burned
            if (!k.isBurned)
                lpMargin = lpMargin.add(toTake);
            else if (k.makerBurned)
                lpMargin = lpMargin.add(toTake);
            else 
                burnMargin = burnMargin.add(toTake);
        } 
        else // in the case the taker should profit
        {
            // Take from the burn margin if possible
            uint burnMarginTake = min(burnMargin, absolutePNL);
            uint lpMarginTake = min(lpMargin, (absolutePNL - burnMarginTake));
            lpMargin = lpMargin.sub(lpMarginTake);
            burnMargin = burnMargin.sub(burnMarginTake);
            if (!k.isBurned)
                k.TakerMargin = k.TakerMargin.add(lpMarginTake + burnMarginTake);
            else if (!k.makerBurned)
                k.TakerMargin = k.TakerMargin.add(lpMarginTake + burnMarginTake);
            else
                assetSwap.BURN_ADDRESS().transfer(lpMarginTake + burnMarginTake);
        }
        
        
        // close if killed or cancelled, to be redeemed by user
        if (k.isBurned || k.isCancelled) {
            markForDeletion(id);
            return;
        }
        
        // this is the case the taker defaulted
        if (k.TakerMargin < k.ReqMargin)
        {
            uint toSub = min(k.TakerMargin, k.ReqMargin.mul(DEFAULT_FEE)/1e4);
            k.TakerMargin = k.TakerMargin.sub(toSub);
            balanceSend(toSub, assetSwap.feeAddress());
            emit TakerDefault(k.Taker, id);
            markForDeletion(id);
        } else {
            k.isNewContract = false;
            k.InitialDay = 0;
        }
    }
    
    /** Withdraw margin from the LP margin 
    * @param amount the amount of margin to move
    * @param lastOracleSettleTime timestamp of the last oracle setlement time
    * @notice reverts if during the settle period
    */
    function lpMarginWithdrawal(uint amount, uint lastOracleSettleTime)
        public
        onlyAdmin
    {
        if (lpDefaulted || reachedSelfDestructTime())
        {
            require (lpMargin >= amount,
                "Attempting to withdraw more than the margin");
        }
        else
        {
            require (lpMargin >= lpRequiredMargin.add(amount),
                "Attempting to withdraw more than the allowed amount");
            require(lastOracleSettleTime < lastBookSettleTime,
                "LP cannot withdraw during the settle period.");
        }
        lpMargin = lpMargin.sub(amount);
        balanceSend(amount, lp);
    }

    /** Allow the LP to change the minimum take size in their book
    * @param min the minimum take size in ETH for the book
    */
    function adjustMinRM(uint min)
        public
        onlyAdmin
    {
        minRM = min * 1 ether;
    }

    /** Refund the balances and remove from storage a subcontract that has been defaulted, cancelled,
    * burned, or expired.
    * @param id the id of the subcontract
    */
    function redeemSubcontract(bytes32 id)
        public
        onlyAdmin
    {
        Subcontract storage k = subcontracts[id];
        require(k.toDelete || lpDefaulted || reachedSelfDestructTime(),
            "Subcontract is not eligible for deletion");
        deleteSubcontract(id);
    }

    /** Function to send balances back to the Assetswap contract
    * @param amount the amount in wei to send
    * @param recipient the address to credit the balance to
    */
    function balanceSend(uint amount, address recipient)
        internal
    {
        assetSwap.balanceTransfer.value(amount)(recipient);
    }

    /** Will check and see if we reached the self destruct time
    * @return true if contract has passed self destruct time
    */
    function reachedSelfDestructTime()
        public
        view
        returns (bool)
    {
        return block.timestamp > lastBookSettleTime + TIME_TO_SELF_DESTRUCT;
    }

    /** Utility function to find the minimum of two unsigned values
    * @notice returns the first parameter if they are equal
    */
    function min(uint a, uint b)
        internal
        pure
        returns (uint minimum)
    {
        if (a <= b)
            minimum = a;
        else
            minimum = b;
    }
}