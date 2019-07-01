var AssetSwap = artifacts.require("./AssetSwap.sol");
var SwapFactory = artifacts.require("./SwapFactory.sol")
var Oracle = artifacts.require("./Oracle.sol")

module.exports = function(deployer, network, accounts) {
	if (network == "testlive") {
		// Set up the oracle deployment
		var admin = accounts[0];
		var reader = accounts[0];
		console.log("Reader:", reader);
		var oracle;
		var factory;
		var ethswap, spxswap, btcswap, ethbtcswap;

		var ETH_PRICE = 350.97;
		var SPX_PRICE = 2913.78;
		var BTC_PRICE = 13815.98;
		var BTCETH_PRICE = 39.365;

		deployer.then(function () {
			return deployer.deploy(Oracle, Math.round(ETH_PRICE * 1e6), {from: admin});
		}).then(function(instance) {
			oracle = instance;
			// SPXUSD
			return oracle.addAsset('0x535058555344', Math.round(SPX_PRICE * 1e6), {from: admin}); 
		}).then(function () {
			//BTCUSD
			return oracle.addAsset('0x425443555344', Math.round(BTC_PRICE * 1e6), {from: admin});
		}).then(function () {
			//BTCETH
			return oracle.addAsset('0x425443455448', Math.round(BTCETH_PRICE * 1e6), {from: admin});
		}).then(function (result) {
			return deployer.deploy(SwapFactory);
		}).then(function (instance) {
			factory = instance;
			return factory.newSwapMarket(oracle.address, 0, 200, false);
		}).then(function (result) {
			return AssetSwap.at(result.logs[0].args._new);
		}).then(function (instance) {
			ethswap = instance;
			console.log("ETH AssetSwap: " + ethswap.address);
			return factory.newSwapMarket(oracle.address, 1, 1000, false);
		}).then(function (result) {
			return AssetSwap.at(result.logs[0].args._new);
		}).then(function (instance){
			spxswap = instance;
			console.log("SPX AssetSwap: " + spxswap.address);
			return factory.newSwapMarket(oracle.address, 2, 250, false);
		}).then(function (result) {
			return AssetSwap.at(result.logs[0].args._new);
		}).then(function (instance) {
			btcswap = instance;
			console.log("BTC AssetSwap: " + btcswap.address);
			return factory.newSwapMarket(oracle.address, 3, 250, true);
		}).then(function (result) {
			return AssetSwap.at(result.logs[0].args._new);
		}).then(function (instance) {
			ethbtcswap = instance;
			console.log("ETHBTC AssetSwap: " + ethbtcswap.address);
			return oracle.addReader(ethswap.address);
		}).then(function (result) {
			return oracle.addReader(spxswap.address);
		}).then(function (result) {
			return oracle.addReader(btcswap.address);
		}).then(function (result) {
			return oracle.addReader(ethbtcswap.address);
		}).then(function () {
			console.log('Finished deployment');
		});
	} else if (network == "development")
	{

		// Set up the oracle deployment
		var admin = accounts[0];
		var reader = accounts[0];
		console.log("Reader:", reader);
		var oracle;
		var factory;
		var ethswap, spxswap, btcswap, ethbtcswap;

		var ETH_PRICE = 350.97;
		var SPX_PRICE = 2913.78;
		var BTC_PRICE = 13815.98;
		var BTCETH_PRICE = 39.365;

		deployer.then(function () {
			return deployer.deploy(Oracle, Math.round(ETH_PRICE * 1e6), {from: admin});
		}).then(function(instance) {
			oracle = instance;
			// SPXUSD
			return oracle.addAsset('0x535058555344', Math.round(SPX_PRICE * 1e6), {from: admin}); 
		}).then(function () {
			//BTCUSD
			return oracle.addAsset('0x425443555344', Math.round(BTC_PRICE * 1e6), {from: admin});
		}).then(function () {
			//BTCETH
			return oracle.addAsset('0x425443455448', Math.round(BTCETH_PRICE * 1e6), {from: admin});
		}).then(function (result) {
			return deployer.deploy(SwapFactory);
		}).then(function (instance) {
			factory = instance;
			return factory.newSwapMarket(oracle.address, 0, 200, false);
		}).then(function (result) {
			return AssetSwap.at(result.logs[0].args._new);
		}).then(function (instance) {
			ethswap = instance;
			console.log("ETH Swap Market: " + ethswap.address);
			return factory.newSwapMarket(oracle.address, 1, 1000, false);
		}).then(function (result) {
			return AssetSwap.at(result.logs[0].args._new);
		}).then(function (instance){
			spxswap = instance;
			console.log("SPX Swap Market: " + spxswap.address);
			return factory.newSwapMarket(oracle.address, 2, 250, false);
		}).then(function (result) {
			return AssetSwap.at(result.logs[0].args._new);
		}).then(function (instance) {
			btcswap = instance;
			console.log("BTC Swap Market: " + btcswap.address);
			return factory.newSwapMarket(oracle.address, 3, 250, true);
		}).then(function (result) {
			return AssetSwap.at(result.logs[0].args._new);
		}).then(function (instance) {
			ethbtcswap = instance;
			console.log("ETHBTC Swap Market: " + ethbtcswap.address);
			return oracle.addReader(ethswap.address);
		}).then(function (result) {
			return oracle.addReader(spxswap.address);
		}).then(function (result) {
			return oracle.addReader(btcswap.address);
		}).then(function (result) {
			return oracle.addReader(ethbtcswap.address);
		}).then(function () {
			console.log('Finished deployment');
		});
	  /* Set up the oracle deployment
		var admin = accounts[0];
		var reader = accounts[0];
		console.log("Reader:", reader);
		//var eth, usv, spx, btc, verifier, multi;
		var oracle;
		var factory;
		//var factory;
		var ethswap, spxswap, btcswap, ethbtcswap;

		deployer.then(function () {
			return deployer.deploy(Oracle, 200e6, {from: admin});
		}).then(function(instance) {
			oracle = instance;
			// SPX
			return oracle.addAsset('0x535058555344', 2800e6, {from: admin}); 
		}).then(function () {
			//BTC
			return oracle.addAsset('0x425443555344', 6500000000, {from: admin});
		}).then(function () {
			//ETH/BTC
			return oracle.addAsset('0x4554482f425443', 30000, {from: admin});
		}).then(function (result) {
			return deployer.deploy(SwapFactory);
		}).then(function (instance) {
			factory = instance;
			return factory.newSwapMarket(oracle.address, 0, 200, false);
		}).then(function (result) {
			return AssetSwap.at(result.logs[0].args._new);
		}).then(function (instance) {
			ethswap = instance;
			console.log("ETH Swap Market: " + ethswap.address);
			return factory.newSwapMarket(oracle.address, 1, 1000, false);
		}).then(function (result) {
			return AssetSwap.at(result.logs[0].args._new);
		}).then(function (instance){
			spxswap = instance;
			console.log("SPX Swap Market: " + spxswap.address);
			return factory.newSwapMarket(oracle.address, 2, 250, false);
		}).then(function (result) {
			return AssetSwap.at(result.logs[0].args._new);
		}).then(function (instance) {
			btcswap = instance;
			console.log("BTC Swap Market: " + btcswap.address);
			return factory.newSwapMarket(oracle.address, 3, 250, true);
		}).then(function (result) {
			return AssetSwap.at(result.logs[0].args._new);
		}).then(function (instance) {
			ethbtcswap = instance;
			console.log("ETH/BTC Swap Market: " + ethbtcswap.address);
			return oracle.addReader(ethswap.address);
		}).then(function (result) {
			return oracle.addReader(spxswap.address);
		}).then(function (result) {
			return oracle.addReader(btcswap.address);
		}).then(function (result) {
			return oracle.addReader(ethbtcswap.address);
		}).then(function () {
			console.log('Finished deployment');
		});*/
	}
};
