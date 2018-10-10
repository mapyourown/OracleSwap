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
		return oracle.addAsset('0x535058', 2000000000, 2, 15000000); 
	}).then(function () {
		//BTC
		return oracle.addAsset('0x425443', 6500000000, 3, 2000000);
	}).then(function () {
		//BTC ETH
		return oracle.addAsset('0x4254432f455448', 30000000, 4, 1500000);
	}).then(function (result) {
		return deployer.deploy(SwapMarket, oracle.address, 1);
	}).then(function (instance) {
		var market = instance;
		oracle.addReader(market.address);
	});

	/*deployer.then(function () {
		return deployer.deploy(OracleFactory);
	}).then(function(instance) {
		factory = instance;
		return factory.newOracle("ETH", {from: admin});
	}).then(function(result) {
		return Oracle.at(result.logs[0].args._new);
	}).then(function(instance) {
		eth = instance;
		console.log("ETH: " + eth.address);
		return eth.addReader(reader, {from: admin});
	}).then(function(result) {
		return factory.newOracle("USV", {from: admin});
	}).then(function(result) {
		return Oracle.at(result.logs[0].args._new);
	}).then(function(instance) {
		usv = instance;
		console.log("USV: " + usv.address);
		return usv.addReader(reader, {from: admin});
	}).then(function (result) {
		return factory.newOracle("SPX", {from: admin});
	}).then(function(result) {
		return Oracle.at(result.logs[0].args._new);
	}).then(function(instance) {
		spx = instance;
		console.log("SPX: " + spx.address);
		return spx.addReader(reader, {from: admin});
	}).then(function(result) {
		return factory.newOracle("BTC", {from: admin});
	}).then(function(result) {
		return Oracle.at(result.logs[0].args._new);
	}).then(function (instance) {
		btc = instance;
		console.log("BTC: " + btc.address);
		return btc.addReader(reader, {from: admin});
	}).then(function (result) {
		return deployer.deploy(SwapMarket, eth.address, usv.address, spx.address)
	}).then(function (instance) {
		return deployer.deploy(MultiOracle, 200, 4, 50)
	}).then(function (instance) {
		multi = instance;
		//SPX
		return multi.addAsset('0x535058', 2000, 2, 10);
	}).then (function () {
		return multi.addAsset('0x425443', 6500, 3, 40);
	}).then(function () {
		console.log("Finished");
	});*/
};