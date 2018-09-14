var OracleFactory = artifacts.require("./OracleFactory.sol");
var Oracle = artifacts.require("./Oracle.sol");
var SwapMarket = artifacts.require("./SwapMarket.sol");

module.exports = function(deployer, network, accounts) {
  // Set up the oracle deployment
	var admin = accounts[0];
	var reader = accounts[0];
	console.log("Reader:", reader);
	var eth, usv, spx, btc, verifier;
	var factory;

	deployer.then(function () {
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
		console.log("Finished");
	});
};