pragma solidity ^0.4.0;

import "./SwapMarket.sol";

contract SwapFactory {

	event SwapCreated(address _new);

	address[] public swapContracts;
	address public admin;

	constructor() public {
		admin = msg.sender;
	}

	function newSwapMarket(address oracle, uint assetID) 
		public 
		returns(address _address) 
	{
		require (msg.sender == admin);
		SwapMarket c = new SwapMarket(msg.sender, oracle, assetID);
		emit SwapCreated(address(c));
		swapContracts.push(c);
		return c;
	}
}