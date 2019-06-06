pragma solidity ^0.4.24;

contract DataTest {

	mapping(bytes32 => BigSubcontract) public bigSubcontracts;
	mapping(bytes32 => LittleSubcontract) public littleSubcontracts;

	uint public numContracts;

	struct BigSubcontract {
		address Taker; 		// defaults to 0x0
        uint256 index;
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
        bool toDelete;
	}

	struct LittleSubcontract {
		address Taker;
		uint64 TakerMargin;
		uint64 ReqMargin;
		uint16 index;
		uint8 InitialDay;
		bool Side;
		bool isInitialized;
        bool isPending;
		bool isCancelled; 	// if a player cancels, set this to true
		bool isBurned;
        bool newSubcontract;
		bool makerBurned;
        bool toDelete;
	}

	constructor() public {

	}

	function addBig(address _taker, uint256 _takerMargin, uint256 _reqMargin, uint8 _initialDay, bool _side)
		public
		returns (bytes32 id)
	{
		BigSubcontract memory order;
        order.ReqMargin = _reqMargin;
        order.Side = !_side;
        order.isInitialized = true;
        order.TakerMargin = _takerMargin;
        order.InitialDay = _initialDay;
        order.newSubcontract = true;
        order.isPending = true;
        order.Taker = _taker;
        id = keccak256(abi.encodePacked(_taker, numContracts));
        numContracts += 1;
        bigSubcontracts[id] = order;
        return id;
	}

	function addLittle(address _taker, uint64 _takerMargin, uint64 _reqMargin, uint8 _initialDay, bool _side)
		public
		returns (bytes32 id)
	{
		LittleSubcontract memory order;
        order.ReqMargin = _reqMargin;
        order.Side = !_side;
        order.isInitialized = true;
        order.InitialDay = _initialDay;
        order.TakerMargin = _takerMargin;
        order.newSubcontract = true;
        order.isPending = true;
        order.Taker = _taker;
        id = keccak256(abi.encodePacked(_taker, numContracts));
        numContracts += 1;
        littleSubcontracts[id] = order;
        return id;
	}

	function modifyBig(bytes32 id)
		public
	{
		BigSubcontract storage k = bigSubcontracts[id];
        k.TakerMargin = k.TakerMargin - 100;
        k.isCancelled = true;
	}

	function modifyLittle(bytes32 id)
		public
	{
		LittleSubcontract storage k = littleSubcontracts[id];
        k.TakerMargin = k.TakerMargin - 100;
        k.isCancelled = true;
	}


}
