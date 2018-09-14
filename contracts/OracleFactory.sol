pragma solidity ^0.4.0;

import "./Oracle.sol";

contract OracleFactory {

	event OracleCreated(address _new);

	address[] public oracles;

	constructor() public {

	}

	function newOracle(bytes32 _asset) public returns(address _address) {
		Oracle c = new Oracle(msg.sender, _asset);
		emit OracleCreated(address(c));
		oracles.push(c);
		return c;
	}
}