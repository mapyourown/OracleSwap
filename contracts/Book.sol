pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./SwapMarket.sol";

library Utils {
    using SafeMath for uint;
    
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
    // TODO: cap the number of subcontracts
    using SafeMath for uint;
       
    address constant public burnAddress = 0x0;
    
    address public lp;
    address public admin;
    uint public lastSettleTime;
    
    uint public lpMargin;
    uint public burnFees;

    uint public totalLongMargin;
    uint public totalShortMargin;
    uint public totalNewMargin;

    uint public takeMinimum;

    uint public contractNonce;
    
    uint public numEntries;
    bytes32 public head;
    bytes32 public tail;
    mapping(bytes32 => Subcontract) public subcontracts;
    bytes32[] public pendingContracts;
    bytes32[] public longContracts; //where lp is long
    bytes32[] public shortContracts; // where lp is short
    mapping(bytes32 => uint) public indexes;

    uint public burnMargin;

    
    modifier onlyAdmin()
    {
        require(msg.sender == admin);
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
        int16 MarginRate;
        uint8 InitialDay;
		bool Side;
		bool isInitialized;
        bool isPending;
		bool isCancelled; 	// if a player cancels, set this to true
		bool isBurned;
        bool newSubcontract;
		bool makerBurned;
	}
	
	function deleteSubcontract (bytes32 id) 
	    internal
    {

	    Subcontract storage k = subcontracts[id];
		
        uint tMargin = k.TakerMargin;
        k.TakerMargin = 0;
        uint rMargin = k.ReqMargin;
        if (!k.newSubcontract)
        {
            if (k.Side)
                totalLongMargin = totalLongMargin.sub(rMargin);
            else
                totalShortMargin = totalShortMargin.sub(rMargin);
        }
        //balances[ll.k.Taker] = balances[ll.k.Taker].add(tMargin);
        balanceSend(tMargin, k.Taker);

        // implicitly delete by swapping with last element and shortening
        uint index = indexes[id];
        if (k.Side) {
            longContracts[index] = longContracts[longContracts.length - 1];
            longContracts.length--;
        } else {
            shortContracts[index] = shortContracts[shortContracts.length - 1];
            shortContracts.length--;
        }
            
        Subcontract memory blank;
        subcontracts[id] = blank;
	}

    function getSubcontract(bytes32 id)
        public
        view
        returns (uint takerMargin, uint reqMargin, int16 marginRate, uint8 initialDay,
          bool side, bool isCancelled, bool isBurned)
    {
        Subcontract storage k = subcontracts[id];
        takerMargin = k.TakerMargin;
        reqMargin = k.ReqMargin;
        marginRate = k.MarginRate;
        initialDay = k.InitialDay;
        side = k.Side;
        isCancelled = k.isCancelled;
        isBurned = k.isBurned;
    }
	
	constructor(address _lp, address _admin) public {
		admin = _admin;
		lp = _lp;
	}

    function setTakeMinimum(uint min)
        public
        onlyAdmin
    {
        takeMinimum = min;
    }

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
	
	function take(address taker, uint amount, bool takerSide, int16 rate)
        public
        payable
        onlyAdmin
        returns (bytes32)
    {
        require(amount > takeMinimum);
        uint RM = amount; 
        uint makerShare = msg.value.sub(RM);
        totalNewMargin = totalNewMargin.add(RM);
        lpMargin = lpMargin.add(makerShare);

        Subcontract memory order;
        order.ReqMargin = RM;
        order.MarginRate = rate;
        order.Side = !takerSide;
        order.isInitialized = true;
        order.TakerMargin = RM;
        order.newSubcontract = true;
        order.isPending = true;
        order.Taker = taker;

        bytes32 id = keccak256(abi.encodePacked(lp, block.timestamp, numContracts));
        numContracts += 1;

        if (takerSide)
        {
            order.index = shortContracts.length;
            shortContracts.push(id);
        } else {
            order.index = longContracts.length;
            longContracts.push(id);
        }
        
        subcontracts[id] = order;
        pendingContracts.push(id);
        if (takerSide)
        {
            order.index = shortContracts.length;

        }
        emit OrderTaken(taker, id, RM);
        return id;
    }

    function fundlpMargin()
        public
        payable
    {
        lpMargin = lpMargin.add(msg.value);
    }
    
    function fundTakerMargin(bytes32 id)
        public
        payable
    {
        Subcontract storage k = subcontracts[id];
        require (k.isInitialized);
        k.TakerMargin += msg.value;
    }

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
            k.InitialDay = priceDay;
            k.isPending = false;
        }
        delete pendingContracts;
    }
    
    function makerDefault(uint8 cancelFeePercentage)
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
        for (i = 0; i < longContracts.length; i++) {
            bytes32 id = longContracts[i];
            k = subcontracts[id];
            k.isCancelled = true;
            uint toPay = Utils.maxSubtract(lpMargin, k.ReqMargin.mul(2 * cancelFeePercentage)/100); 
            lpMargin = lpMargin.sub(toPay);
            k.TakerMargin = k.TakerMargin.add(toPay);
        }

        for (i = 0; i < shortContracts.length; i++) {
            id = shortContracts[i];
            k = subcontracts[id];
            k.isCancelled = true;
            toPay = Utils.maxSubtract(lpMargin, k.ReqMargin.mul(2 * cancelFeePercentage)/100); 
            lpMargin = lpMargin.sub(toPay);
            k.TakerMargin = k.TakerMargin.add(toPay);
        }
    }
    
    function cancel(uint priceTime, bytes32 id, address sender, uint8 openFee, uint8 cancelFee)
        public
        payable
        onlyAdmin
    {
        Subcontract storage k = subcontracts[id];
		require(sender == k.Taker || sender == lp);
        require(!k.isCancelled);
		uint fee;
		if (k.isPending) {
			fee = (k.ReqMargin * openFee)/100;
		} else {
			if (priceTime > lastSettleTime) // settlement period
            {
                require(sender != k.Taker); // taker cannot cancel during settle
            }
            fee = (k.ReqMargin * cancelFee)/100;
		}
		require(msg.value >= fee);
		if (sender == k.Taker)
		    lpMargin = lpMargin.add(fee);
	    else if (sender == lp)
	        k.TakerMargin = k.TakerMargin.add(fee);
        //balances[sender] += (msg.value - fee);
        balanceSend(msg.value - fee, sender);
	    k.isCancelled = true;
    }
    
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
		uint burnFee = k.ReqMargin/3;
		require (amount >= burnFee);
		if (msg.sender == lp)
			k.makerBurned = true;
		// set appropriate flags for settlment
		k.isBurned = true;
        return burnFee;
    }
    
    function takerWithdrawal(bytes32 id, uint amount, address sender)
        public
        onlyAdmin
    {
        Subcontract storage k = subcontracts[id];
        require(k.TakerMargin >= k.ReqMargin.add(amount));
        k.TakerMargin = k.TakerMargin.sub(amount);
        //balances[sender] = balances[sender].add(amount);
        balanceSend(amount, sender);
    }

    function pnlCalculation(uint leverage, int longReturn, uint reqMargin, int16 marginRate, bool makerSide)
        internal
        pure
        returns(int makerPNL)
    {
        int intMargin = int(reqMargin);

        if (makerSide)
            makerPNL = (intMargin/1e12 * int(leverage) * (longReturn + (int(marginRate) * (1 ether)/1e4)))/(1 ether);
        else
            makerPNL = (intMargin/1e12 * int(leverage) * ((-1 * longReturn) + (int(marginRate) * (1 ether)/1e4)))/(1 ether);

        if (makerPNL > intMargin)
            makerPNL = intMargin;
        if (makerPNL < -1 * intMargin)
            makerPNL = -1 * intMargin;
    }

    function settleSubcontract(bytes32 id, uint[8] leverages, int[8] longReturns)
        internal
        returns (bool deleted)
    {
        Subcontract storage k = subcontracts[id];

        if (k.newSubcontract)
        {
            if (k.Side)
                totalLongMargin = totalLongMargin.add(k.ReqMargin);
            else
                totalShortMargin = totalShortMargin.add(k.ReqMargin);
            k.newSubcontract = false;
        } else {
         
            int makerPNL = pnlCalculation(leverages[k.InitialDay], longReturns[k.InitialDay], k.ReqMargin,
                k.MarginRate, k.Side);
                
            uint toTake;

            uint absolutePNL;
            if (makerPNL > 0)
                absolutePNL = uint(makerPNL);
            else
                absolutePNL = uint(makerPNL * (-1));

            // in the case the maker should profit
            if (makerPNL > 0)
            {
                toTake = Utils.maxSubtract(k.TakerMargin, absolutePNL);
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
        
        // close if killed or cancelled, will refund everyone
        if (k.isBurned || k.isCancelled) {
            deleteSubcontract(id);
            return true;
        }
        
        // setup for next week
        if (k.TakerMargin < k.ReqMargin)
        {
            uint toSub = Utils.maxSubtract(k.TakerMargin, 100);
            // TODO: fix
                //k.ReqMargin.mul(burnFee)/100);
            k.TakerMargin = k.TakerMargin.sub(toSub);
            lpMargin = lpMargin.add(toSub);
            emit TakerDefault(k.Taker, id);
            deleteSubcontract(id);
            return true;
        }

        return false;
    }

    function settle(uint[8] leverages, int[8] longReturns, bool longProfited)
        public
        onlyAdmin
    {
        bool toDelete;
        if (longProfited)
        {
            for (uint i = 0; i < shortContracts.length; i++) {
                if (settleSubcontract(shortContracts[i], leverages, longReturns))
                    i--;
            }   
            for (i = 0; i < longContracts.length; i++) {
                if (settleSubcontract(longContracts[i], leverages, longReturns))
                    i--;
            }
        }
        else
        {  
            for (i = 0; i < longContracts.length; i++) {
                if (settleSubcontract(longContracts[i], leverages, longReturns))
                    i--;
            }
            for (i = 0; i < shortContracts.length; i++) {
                if (settleSubcontract(shortContracts[i], leverages, longReturns))
                    i--;
            }
        }

        totalNewMargin = 0;
        lastSettleTime = block.timestamp;
        burnMargin = 0;
    }
    
    function lpMarginWithdrawal(uint amount)
        public
        onlyAdmin
    {
        uint req = requiredMargin();
        require (lpMargin >= req.add(amount));
        lpMargin = lpMargin.sub(amount);
        balanceSend(amount, lp); //balances[lp] = balances[lp].add(amount);
    }

    function abandonedSelfDestruct(bytes32 id) // set the RM to zero
        public
    {
        require (block.timestamp > lastSettleTime + (20 days));
        require (lastSettleTime != 0); // set to 0 initially

        deleteSubcontract(id);
    }

    function balanceSend(uint amount, address reciever)
        internal
    {
        SwapMarket market = SwapMarket(admin);
        market.balanceTransfer.value(amount)(reciever);
    }

    function setMinimum(uint amount)
        public
        onlyAdmin
    {
        takeMinimum = amount;
    }

}