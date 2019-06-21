pragma solidity ^0.4.0;

import "./AssetSwap.sol";

contract SwapFactory {

	event SwapCreated(address _new);

	address[] public swapContracts;
	address public admin;

	constructor() public {
		admin = msg.sender;
	}

	function newSwapMarket(address oracle, uint assetID, uint16 lr, bool isCrypto) 
		public 
		returns(address _address) 
	{
		require (msg.sender == admin);
		AssetSwap c = new AssetSwap(msg.sender, oracle, assetID, lr, isCrypto);
		emit SwapCreated(address(c));
		swapContracts.push(c);
		return c;
	}
}