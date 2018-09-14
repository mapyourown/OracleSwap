pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

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

    // TODO: withdraw goes to Swap
    using SafeMath for uint;
       
    address constant public burnAddress = 0x0;
    
    address public owner;
    address public admin;
    uint public lastSettleTime;
    uint public lastSettlePrice;
    
    uint public ownerMargin;

    uint public totalLongMargin;
    uint public totalShortMargin;
    uint public totalNewMargin;
    
    mapping(address => uint) public balances;

    uint public numContracts;
    uint public burnFees;
    uint public numEntries;
    bytes32 public head;
    bytes32 public tail;
    mapping(bytes32 => LinkedListNode) public nodes;
    bytes32[] public pendingContracts;
    
    modifier onlyAdmin()
    {
        require(msg.sender == admin);
        _;
    }
    
    event OrderTaken(address indexed _taker, bytes32 indexed _id, uint _amount);
    event TakerDefault(address indexed _taker, bytes32 indexed _id);
    
    struct Subcontract {			// should be all things unique to each order, that can change
		address Taker; 		// defaults to 0x0
		uint256 TakerMargin;	// margin is in ETH
		uint256 ReqMargin;
        uint8 InitialDay;
		bool Side;
		bool isInitialized;
        bool isPending;
		bool isCancelled; 	// if a player cancels, set this to true
		bool isBurned;
        bool newSubcontract;
		bool makerBurned;
	}
	
	struct LinkedListNode {
	    bytes32 prev;
	    bytes32 next;
	    Subcontract k;
	}
	
	function LLSortAdd (bytes32 id) 
	    internal
	{
	    LinkedListNode storage ll = nodes[id];
		Subcontract storage order = ll.k;
		
		// case 1: the maker has no other orders
        if (numEntries == 0) {
            // Store the new LL as the makers book
    	    head = id;
    	    tail = id;
        }
        else // case 2: Need to insert the order in sorted order
        {
            bytes32 iter = head;
            
            // we want to insert as soon as we find a "smaller" RM
            // keep in mind that if the side of the order is short, it is smaller than a long
            bool inserted = false;
            int newValue = int(order.ReqMargin);
            if (!order.Side) 
                newValue = newValue * -1;
                
            int iterValue = int(nodes[iter].k.ReqMargin);
            if (!nodes[iter].k.Side)
                iterValue = iterValue * -1;
            
            while (newValue < iterValue) {
                if (nodes[iter].next == 0x0) // we've reached the end of the list
                {
                    // insert as the last element
                    nodes[iter].next = id;
                    tail = id;
                    ll.prev = iter;
                    inserted = true;
                }
                // otherwise, proceed throught the list
                iter = nodes[iter].next;
                iterValue = int(nodes[iter].k.ReqMargin);
                if (!nodes[iter].k.Side)
                    iterValue = iterValue * -1;
            }
            
            // after we've reached a stopping point, insert
            if (!inserted) {
                ll.prev = nodes[iter].prev;
                if (nodes[iter].prev != 0x0) 
                    nodes[nodes[iter].prev].next = id;
                else
                    head = id;
                nodes[iter].prev = id;
                ll.next = iter;
            }
        }
        
        // save the changes
        nodes[id] = ll;
        numEntries = numEntries + 1;
	}
	
	function LLDelete (bytes32 id) 
	    internal
    {
	    LinkedListNode storage ll = nodes[id];
		
		// fix the liked list, then clear out the memory
		if (id == head)
		    head = ll.next;
	    if (id == tail)
	        tail = ll.prev;
	    if (ll.prev != 0x0) 
	        nodes[ll.prev].next = ll.next;
        if (ll.next != 0x0)
            nodes[ll.next].prev = ll.prev;
        uint tMargin = ll.k.TakerMargin;
        ll.k.TakerMargin = 0;
        if (!ll.k.newSubcontract)
        {
            if (ll.k.Side)
            totalLongMargin = totalLongMargin.sub(tMargin);
        else
            totalShortMargin = totalShortMargin.sub(tMargin);
        }
        balances[ll.k.Taker] = balances[ll.k.Taker].add(tMargin);
            
        LinkedListNode memory blank;
        nodes[id] = blank;
        
        numEntries = numEntries - 1;
	}

    function getNode(bytes32 id)
        public
        view
        returns (bytes32 prev, bytes32 next)
    {
        LinkedListNode storage node = nodes[id];
        prev = node.prev;
        next = node.next;
    }

    function getSubcontract(bytes32 id)
        public
        view
        returns (address taker, uint takerMargin, uint reqMargin,
         uint8 initialDay, bool side, bool isCancelled, bool isBurned)
    {
        LinkedListNode storage node = nodes[id];
        taker = node.k.Taker;
        takerMargin = node.k.TakerMargin;
        reqMargin = node.k.ReqMargin;
        initialDay = node.k.InitialDay;
        side = node.k.Side;
        isCancelled = node.k.isCancelled;
        isBurned = node.k.isBurned;
    }
	
	constructor(address maker, address _admin) public {
		admin = _admin;
		owner = maker;
	}

    function requiredMargin()
        public
        view
        returns (uint RM)
    {
        if (totalLongMargin > totalShortMargin)
            return totalLongMargin - totalShortMargin;
        else
            return totalShortMargin - totalLongMargin;
    }
	
	function take(address taker, uint amount, bool takerSide)
        public
        payable
        onlyAdmin
        returns (bytes32)
    {
        uint RM = amount; 
        uint makerShare = msg.value.sub(RM);
        totalNewMargin = totalNewMargin.add(RM);
        ownerMargin = ownerMargin.add(makerShare);

        Subcontract memory order;
        order.ReqMargin = RM;
        order.Side = !takerSide;
        order.isInitialized = true;
        order.TakerMargin = RM;
        order.newSubcontract = true;
        order.Taker = taker;
        
        bytes32 id = keccak256(abi.encodePacked(numContracts, owner, block.timestamp));
        numContracts += 1;
        LinkedListNode memory node;
        node.k = order;
        nodes[id] = node;
        pendingContracts.push(id);
        emit OrderTaken(taker, id, RM);
        LLSortAdd(id);
        return id;
    }

    function fundOwnerMargin()
        public
        payable
    {
        ownerMargin = ownerMargin.add(msg.value);
    }
    
    function fundTakerMargin(bytes32 id)
        public
        payable
    {
        LinkedListNode storage node = nodes[id];
        require (node.k.isInitialized);
        node.k.TakerMargin += msg.value;
    }

    function firstSettle(uint8 priceDay)
        public
        onlyAdmin
    {
        // move directly to LL
        uint length = pendingContracts.length;
        for (uint32 i = 0; i < length; i++) {
            LinkedListNode storage node = nodes[pendingContracts[i]];
            
            if (node.k.isCancelled || node.k.isBurned)
            {
                // delete to give refunds
                LLDelete(pendingContracts[i]);
                continue;
            }
            
            // simply record the price for updating
            // then move it to the rest of the list
            node.k.InitialDay = priceDay;
            node.k.isPending = false;
        }
        delete pendingContracts;
    }
    
    function makerDefault(uint8 cancelFeePercentage)
        internal
    {
        // cancel pending contracts first
        uint length = pendingContracts.length;
        for (uint32 i = 0; i < length; i++) {
            LinkedListNode storage ll_pend = nodes[pendingContracts[i]];
            Subcontract storage k_pend = ll_pend.k;
            uint toPayPend = Utils.maxSubtract(ownerMargin, k_pend.ReqMargin.mul(cancelFeePercentage)/100);
            ownerMargin = ownerMargin.sub(toPayPend);
            uint tMargin = k_pend.TakerMargin;
            k_pend.TakerMargin = 0;
            balances[k_pend.Taker] = balances[k_pend.Taker].add(tMargin + toPayPend);
            LinkedListNode memory empty;
            nodes[pendingContracts[i]] = empty;
        }
        delete pendingContracts;
        
        // cancel the rest
        bytes32 iter = head;
        while (iter != 0x0)
        {
            LinkedListNode storage ll = nodes[iter];
            ll.k.isCancelled = true;
            iter = ll.next;
            
            uint toPay = Utils.maxSubtract(ownerMargin, ll.k.ReqMargin.mul(2 * cancelFeePercentage)/100); 
            ownerMargin = ownerMargin.sub(toPay);
            ll.k.TakerMargin = ll.k.TakerMargin.add(toPay);
        }
    }
    
    function changeOwner(address _newOwner)
        internal
        onlyAdmin
    {
        owner = _newOwner;
    }
    
    function cancel(uint priceTime, bytes32 id, address sender, uint8 openFee, uint8 cancelFee)
        public
        payable
        onlyAdmin
    {
        // TODO: allow Admin
        LinkedListNode storage node = nodes[id];
		require(sender == node.k.Taker || sender == owner);
        require(!node.k.isCancelled);
		uint fee;
		if (node.k.isPending) {
			fee = (node.k.ReqMargin * openFee)/100;
		} else {
			if (priceTime > lastSettleTime) // settlement period
				fee = (node.k.ReqMargin * cancelFee * 2)/100;
			else
				fee = (node.k.ReqMargin * cancelFee)/100;
		}
		require(msg.value >= fee);
		if (sender == node.k.Taker)
		    ownerMargin = ownerMargin.add(fee);
	    else if (sender == owner)
	        node.k.TakerMargin = node.k.TakerMargin.add(fee);
        balances[sender] += (msg.value - fee);
	    node.k.isCancelled = true;
    }
    
    function burn( bytes32 id, address sender)
        public
        payable
        onlyAdmin
    {
        LinkedListNode storage node = nodes[id];
        require(sender == owner || sender == node.k.Taker);
        require(!node.k.isBurned);
        
        // cost to kill
		uint burnFee = node.k.ReqMargin/3;
		require (msg.value >= burnFee);
		if (msg.sender == owner)
			node.k.makerBurned = true;
		// set appropriate flags for settlment
        burnFees = burnFees.add(burnFee);
        balances[sender] += (msg.value - burnFee);
		node.k.isBurned = true;
    }
    
    function takerWithdrawal(bytes32 id, uint priceTime, uint amount, address sender)
        public
        onlyAdmin
    {
        require(lastSettleTime > priceTime);
        LinkedListNode storage node = nodes[id];
        require(sender == node.k.Taker);
        require(node.k.TakerMargin >= node.k.ReqMargin.add(amount));
        node.k.TakerMargin = node.k.TakerMargin.sub(amount);
        balances[sender] = balances[sender].add(amount);
    }

    function withdrawBalance()
        public
    {
        uint amount = balances[msg.sender];
        balances[msg.sender] = 0;
        msg.sender.transfer(amount);
    }
    
    function settle(int[8] assetReturns, int16[3] rates, bool longProfited)
        public
        onlyAdmin
    {
        // rates is [longFinancing, shortFinancing, basis]
        /*if (ownerMargin < verifiedOwnerRequiredMargin())
            makerDefault(cancelFee);*/
        uint burnMargin = 0;
        bytes32 iter;
        
        if (longProfited)
            iter = head;
        else
            iter = tail;
            
        while (iter != 0x0) 
        {
            LinkedListNode storage node = nodes[iter];
            bytes32 id = iter;
            if (longProfited)
                iter = node.next;
            else
                iter = node.prev;
             
            int makerPNL;
            int assetReturn = assetReturns[node.k.InitialDay] * int(node.k.ReqMargin);    
            node.k.InitialDay = 0;
            uint toTake;

            if (node.k.Side)
            {
                // financingFee = (int(node.k.ReqMargin) * rates[1])/1000;
                makerPNL = assetReturn + (int(node.k.ReqMargin) * rates[2])/1000 + (int(node.k.ReqMargin) * rates[1])/1000;
            }
            else
            {
                // financingFee = (int(node.k.ReqMargin) * rates[0])/1000;
                makerPNL = (-1) * (assetReturn + (int(node.k.ReqMargin) * rates[2])/1000) + (int(node.k.ReqMargin) * rates[0])/1000;
            }

            uint absolutePNL;
            if (makerPNL > 0)
                absolutePNL = uint(makerPNL);
            else
                absolutePNL = uint(makerPNL * (-1));

            // in the case the maker should profit
            if (makerPNL > 0)
            {
                toTake = Utils.maxSubtract(node.k.TakerMargin, absolutePNL);
                node.k.TakerMargin = node.k.TakerMargin.sub(toTake);

                // add to burn margin if taker burned or burn fees if maker burned
                if (!node.k.isBurned)
                    ownerMargin = ownerMargin.add(toTake);
                else if (node.k.makerBurned)
                    ownerMargin = ownerMargin.add(toTake);
                else 
                    burnMargin = burnMargin.add(toTake);
            } 
            else // in the case the taker should profit
            {
                // the most we can take from burn margin
                // Take from the burn margin if possible
                uint burnMarginTake = Utils.maxSubtract(burnMargin, absolutePNL);
                uint ownerMarginTake = Utils.maxSubtract(ownerMargin, (absolutePNL - burnMarginTake));
                ownerMargin = ownerMargin.sub(ownerMarginTake);
                burnMargin = burnMargin.sub(burnMarginTake);
                if (!node.k.isBurned)
                    node.k.TakerMargin = node.k.TakerMargin.add(ownerMarginTake + burnMarginTake);
                else if (!node.k.makerBurned)
                    node.k.TakerMargin = node.k.TakerMargin.add(ownerMarginTake + burnMarginTake);
                else
                    burnFees = burnFees.add(ownerMarginTake + burnMarginTake);
            }
            
            // close if killed or cancelled, will refund everyone
            if (node.k.isBurned || node.k.isCancelled) {
                LLDelete(id);
                continue;
            }

            if (node.k.newSubcontract)
            {
                if (node.k.Side)
                    totalLongMargin = totalLongMargin.add(node.k.ReqMargin);
                else
                    totalShortMargin = totalShortMargin.add(node.k.ReqMargin);
                node.k.newSubcontract = false;
            }
            
            // setup for next week
            if (node.k.TakerMargin < node.k.ReqMargin)
            {
                uint toSub = Utils.maxSubtract(node.k.TakerMargin, 100);
                // TODO: fix
                    //node.k.ReqMargin.mul(burnFee)/100);
                node.k.TakerMargin = node.k.TakerMargin.sub(toSub);
                ownerMargin = ownerMargin.add(toSub);
                LLDelete(id);
                emit TakerDefault(node.k.Taker, id);
            }
        }
        totalNewMargin = 0;
    }
    
    function ownerMarginWithdrawal(uint amount)
        public
        onlyAdmin
    {
        uint req = requiredMargin();
        require (ownerMargin >= req.add(amount));
        ownerMargin = ownerMargin.sub(amount);
        balances[owner] = balances[owner].add(amount);
    }

    function abandonedSelfDestruct()
        public
    {
        require (block.timestamp > lastSettleTime + 20 * (1 days));
        require (lastSettleTime != 0); // set to 0 initially
    }

}