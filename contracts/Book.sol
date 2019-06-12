pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./AssetSwap.sol";

library Utils {
    using SafeMath for uint;
    
    /** Utility function to find out the largest amount that can be taken from one unsigned value
    * @param minuend the amount to take
    * @param subtrahend the amount being taken from
    * equivalent to max(minuend, subtrahend)
    */
    function maxSubtract(uint minuend, uint subtrahend)
        internal
        pure
        returns (uint amount)
    {
        if (minuend >= subtrahend)
            amount = subtrahend;
        else
            amount = minuend; 
    }
}

contract Book {

    using SafeMath for uint;
       
    address constant public burnAddress = 0x0;
    
    address public lp;
    AssetSwap public assetSwap;
    uint public lastSettleTime;
    
    uint public lpMargin;
    uint public burnFees;

    uint public totalLongMargin;
    uint public totalShortMargin;
    uint public totalNewMargin;
    uint public takeMinimum;
    uint public numContracts;
    
    uint public numEntries;
    mapping(bytes32 => Subcontract) public subcontracts;
    bytes32[] public pendingContracts;
    bytes32[] public shortTakerContracts; //where lp is long
    bytes32[] public longTakerContracts; // where lp is short
    mapping(bytes32 => uint) public indexes;

    uint public burnMargin;

    bool public lpDefaulted;

    uint public minRM;
    uint constant DEFAULT_FEE = 125; // in tenths of a percent
    uint constant TIME_TO_SELF_DESTRUCT = 8 days;
    uint constant MAX_SUBCONTRACTS = 300;

    
    modifier onlyAdmin()
    {
        require(msg.sender == address(assetSwap));
        _;
    }
    
    event OrderTaken(address indexed _taker, bytes32 indexed _id, uint _amount);
    event TakerDefault(address indexed _taker, bytes32 indexed _id);
    event DeleteTraker(uint index, bool willDelete);
    
    struct Subcontract {			// should be all things unique to each order, that can change
        uint index;
		address Taker; 		// defaults to 0x0
		uint256 TakerMargin;	// margin is in ETH
		uint256 ReqMargin;
        uint8 InitialDay;
		bool Side;
		bool isInitialized;
        bool isPending;
		bool isCancelled; 	// if a player cancels, set this to true
		bool isBurned;
		bool makerBurned;
        bool toDelete;
        bool isNewWednesday; // true if started between tuesday pm and wednesday first price
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
        lastSettleTime = block.timestamp;
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
        uint index = indexes[id];
        if (k.Side) {
            shortTakerContracts[index] = shortTakerContracts[shortTakerContracts.length - 1];
            shortTakerContracts.length--;
        } else {
            longTakerContracts[index] = longTakerContracts[longTakerContracts.length - 1];
            longTakerContracts.length--;
        }
            
        Subcontract memory blank;
        subcontracts[id] = blank;
        numEntries--;
	}
    /** Internal function for removing a subcontract from consideration.
    * @notice the contract should be redeemed after this
    * @param id the id of the subcontract to erase
    */
    function markForDeletion(bytes32 id)
        internal
    {
        Subcontract storage k = subcontracts[id];
        uint rMargin = k.ReqMargin;
        if (!k.isPending)
        {
            if (k.Side)
                totalLongMargin = totalLongMargin.sub(rMargin);
            else
                totalShortMargin = totalShortMargin.sub(rMargin);
        }
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
          bool side, bool isPending, bool isCancelled, bool isBurned)//, bool toDelete)
    {
        Subcontract storage k = subcontracts[id];
        takerMargin = k.TakerMargin;
        reqMargin = k.ReqMargin;
        initialDay = k.InitialDay;
        side = k.Side;
        isPending = k.isPending;
        isCancelled = k.isCancelled;
        isBurned = k.isBurned;
        //toDelete = k.toDelete;
    }

    /** Return the required margin of the LP
    * @return RM the lp's required margin
    */
    function requiredMargin()
        public
        view
        returns (uint RM)
    {
        if (totalLongMargin > totalShortMargin)
            return totalLongMargin - totalShortMargin + totalNewMargin;
        else
            return totalShortMargin - totalLongMargin + totalNewMargin;
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
        require(numEntries < MAX_SUBCONTRACTS);
        uint RM = amount * 1 ether; 
        uint makerShare = msg.value.sub(RM);
        totalNewMargin = totalNewMargin.add(RM);
        lpMargin = lpMargin.add(makerShare);

        Subcontract memory order;
        order.ReqMargin = RM;
        order.Side = !takerSide;
        order.isInitialized = true;
        order.TakerMargin = RM;
        order.isPending = true;
        order.Taker = taker;

        id = keccak256(abi.encodePacked(lp, block.timestamp, numContracts));
        numContracts += 1;

        if (takerSide)
        {
            order.index = longTakerContracts.length;
            longTakerContracts.push(id);
        } else {
            order.index = shortTakerContracts.length;
            shortTakerContracts.push(id);
        }
        
        subcontracts[id] = order;
        pendingContracts.push(id);
        if (takerSide)
        {
            order.index = longTakerContracts.length;

        }
        numEntries++;
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
        // move directly to LL
        uint length = pendingContracts.length;
        for (uint32 i = 0; i < length; i++) {
            Subcontract storage k = subcontracts[pendingContracts[i]];
            
            // simply record the price for updating
            // then move it to the rest of the list
            if (k.Side)
                totalLongMargin = totalLongMargin.add(k.ReqMargin);
            else
                totalShortMargin = totalShortMargin.add(k.ReqMargin);
            k.InitialDay = priceDay;

        }
        delete pendingContracts;
    }
    
    /** internal function for applying changes to the book after an LP defaults
    * @param cancelFeePercentage the cancelation fee
    */
    function lpDefault(uint8 cancelFeePercentage)
        internal
    {
        // cancel pending contracts first
        uint length = pendingContracts.length;
        for (uint32 i = 0; i < length; i++) {
            Subcontract storage k = subcontracts[pendingContracts[i]];
            uint toPayPend = Utils.maxSubtract(lpMargin, k.ReqMargin.mul(cancelFeePercentage)/100);
            lpMargin = lpMargin.sub(toPayPend);
            uint tMargin = k.TakerMargin;
            k.TakerMargin = 0;
            //balances[k_pend.Taker] = balances[k_pend.Taker].add(tMargin + toPayPend);
            balanceSend(tMargin + toPayPend, k.Taker);
        }
        delete pendingContracts;
        
        // cancel the rest
        for (i = 0; i < shortTakerContracts.length; i++) {
            bytes32 id = shortTakerContracts[i];
            k = subcontracts[id];
            k.isCancelled = true;
            uint toPay = Utils.maxSubtract(lpMargin, k.ReqMargin.mul(2 * cancelFeePercentage)/100); 
            lpMargin = lpMargin.sub(toPay);
            k.TakerMargin = k.TakerMargin.add(toPay);
        }

        for (i = 0; i < longTakerContracts.length; i++) {
            id = longTakerContracts[i];
            k = subcontracts[id];
            k.isCancelled = true;
            toPay = Utils.maxSubtract(lpMargin, k.ReqMargin.mul(2 * cancelFeePercentage)/100); 
            lpMargin = lpMargin.sub(toPay);
            k.TakerMargin = k.TakerMargin.add(toPay);
        }
    }

    /** Cancel a subcontract
    * @param priceTime the last settle price timestamp
    * @param id the subcontract id
    * @param sender who sent the cancel to the AssetSwap contract
    * @param openFee the cancel fee for cancelling an new subcontract
    * @param cancelFee the cancel fee for cancelling a subcontract the rest of the time
    */
    function cancel(uint priceTime, bytes32 id, address sender, uint8 openFee, uint cancelFee)
        public
        payable
        onlyAdmin
    {
        Subcontract storage k = subcontracts[id];
		require(sender == k.Taker || sender == lp, "Canceller is not LP or Taker");
        require(!k.isCancelled, "Subcontract is already cancelled");
		uint fee;
		if (k.isPending) {
			fee = (k.ReqMargin * openFee)/100;
		} else {
			if (priceTime > lastSettleTime) // settlement period
            {
                require(sender != k.Taker || lastSettleTime == 0, "Taker cannot cancel during settle"); // taker cannot cancel during settle
            }
            fee = (k.ReqMargin * cancelFee)/100;
		}
		require(msg.value >= fee, "Insufficient cancel fee");
		if (sender == k.Taker)
		    //lpMargin = lpMargin.add(fee);
            balanceSend(fee, assetSwap.feeAddress());
	    else if (sender == lp)
	        //k.TakerMargin = k.TakerMargin.add(fee);
            balanceSend(fee, assetSwap.feeAddress());
        //balances[sender] += (msg.value - fee);
        balanceSend(msg.value - fee, sender);
	    k.isCancelled = true;
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
		uint burnFee = k.ReqMargin/4;
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
        require(lastOracleSettlePrice < lastSettleTime,
            "Taker cannot withdraw during the settle period.");

        if (lpDefaulted)
        {
            require(amount <= k.TakerMargin);
        }
        else
        {
            require(k.TakerMargin >= k.ReqMargin.add(amount));
        }
        
        k.TakerMargin = k.TakerMargin.sub(amount);
        balanceSend(amount, sender);
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
        // todo timestamp 4 days
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

        totalNewMargin = 0;
        lastSettleTime = block.timestamp;
        burnMargin = 0;

        uint req = requiredMargin();
        if (lpMargin < req)
        {
            lpDefaulted = true;
            uint toSub = Utils.maxSubtract(lpMargin, req.mul(DEFAULT_FEE)/1000);
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

        if (k.toDelete || k.isNewWednesday)
        {
            k.isNewWednesday = false;
            return;
        }

        if (k.isPending) // Add contracts taken this week to margining requirements
        {
            if (k.Side)
                totalLongMargin = totalLongMargin.add(k.ReqMargin);
            else
                totalShortMargin = totalShortMargin.add(k.ReqMargin);
        } else {
            int makerPNL = (-1 * takerRets[k.InitialDay]) * int(k.ReqMargin);
            //makerPNL = 1 ether;
                
            uint absolutePNL;

            if (makerPNL > 0)
                absolutePNL = uint(makerPNL);
            else
                absolutePNL = uint(makerPNL * (-1));

            // in the case the maker should profit
            if (makerPNL > 0)
            {
                uint toTake = Utils.maxSubtract(k.TakerMargin, absolutePNL);
                k.TakerMargin = k.TakerMargin.sub(toTake); // switch to .sub?
                //k.TakerMargin = (9 ether);

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
                // the most we can take from burn margin
                // Take from the burn margin if possible
                uint burnMarginTake = Utils.maxSubtract(burnMargin, absolutePNL);
                uint lpMarginTake = Utils.maxSubtract(lpMargin, (absolutePNL - burnMarginTake));
                lpMargin = lpMargin.sub(lpMarginTake);
                burnMargin = burnMargin.sub(burnMarginTake);
                if (!k.isBurned)
                    k.TakerMargin = k.TakerMargin.add(lpMarginTake + burnMarginTake);
                else if (!k.makerBurned)
                    k.TakerMargin = k.TakerMargin.add(lpMarginTake + burnMarginTake);
                else
                    burnFees = burnFees.add(lpMarginTake + burnMarginTake);
            }
        }
        
        // close if killed or cancelled, to be redeemed
        if (k.isBurned || k.isCancelled) {
            markForDeletion(id);
        }
        
        // setup for next week
        // this is the case the taker defaulted
        if (k.TakerMargin < k.ReqMargin)
        {
            uint toSub = Utils.maxSubtract(k.TakerMargin, k.ReqMargin.mul(DEFAULT_FEE)/1000);
            k.TakerMargin = k.TakerMargin.sub(toSub);
            balanceSend(toSub, assetSwap.feeAddress());
            emit TakerDefault(k.Taker, id);
            markForDeletion(id);
        }
    }
    
    /** Withdraw margn from the LP margin 
    * @param amount the amount of margin to move
    * @param lastOracleSettlePrice use to ensure it's not the settle period
    * @notice reverts if during the settle period
    */
    function lpMarginWithdrawal(uint amount, uint lastOracleSettlePrice)
        public
        onlyAdmin
    {
        require(lastOracleSettlePrice < lastSettleTime,
            "LP cannot withdraw during the settle period.");
        uint req = requiredMargin();
        require (lpMargin >= req.add(amount));
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
        // Allow any subcontract to be redeemed if it hasn't been settled for the time period
        if (block.timestamp < lastSettleTime + TIME_TO_SELF_DESTRUCT)
            require(k.toDelete || lpDefaulted, 'Subcontract is not eligible for deletion');
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

    // DEBUG FUNCTION
    function returnLongLenth()
        public
        view
        returns (uint)
    {
        return longTakerContracts.length;
    }

    // DEBUG FUNCTION
    function returnShortLength()
        public
        view
        returns (uint)
    {
        return shortTakerContracts.length;
    }

}