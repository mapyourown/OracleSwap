var SwapMarket = artifacts.require("./SwapMarket.sol");
var MultiOracle = artifacts.require("./MultiOracle.sol")

module.exports = function(deployer, network, accounts) {
  // Set up the oracle deployment
	var admin = accounts[0];
	var reader = accounts[0];
	console.log("Reader:", reader);
	//var eth, usv, spx, btc, verifier, multi;
	var oracle;
	//var factory;

	deployer.then(function () {
		return deployer.deploy(MultiOracle, 200000000, 4, 1000000);
	}).then(function(instance) {
		oracle = instance;
		// SPX
		return oracle.addAsset('0x535058555344', 2000000000, 2, 15000000, false); 
	}).then(function () {
		//BTC
		return oracle.addAsset('0x425443555344', 6500000000, 3, 2000000, false);
	}).then(function () {
		//ETH/BTC
		return oracle.addAsset('0x4554482f425443', 30000000, 4, 1500000, true);
	}).then(function (result) {
		return deployer.deploy(SwapMarket, oracle.address, 1);
	}).then(function (instance) {
		var market = instance;
		oracle.addReader(market.address);
	});
};