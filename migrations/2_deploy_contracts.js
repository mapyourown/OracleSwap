var AssetSwap = artifacts.require("./AssetSwap.sol");
var SwapFactory = artifacts.require("./SwapFactory.sol")
var Oracle = artifacts.require("./Oracle.sol")
var DataTest = artifacts.require("./DataTest.sol")

module.exports = function(deployer, network, accounts) {
	if (network == "testlive") {
		var admin = accounts[0]
		console.log(admin)
		deployer.then(function () { // ETH
			return deployer.deploy(Oracle, 242510000, {from: admin});
		}).then(function(instance) {
			oracle = instance;
			// SPX
			return oracle.addAsset('0x535058555344', 2850960000, {from: admin}); 
		}).then(function () {
			//BTC
			return oracle.addAsset('0x425443555344', 8214290000, {from: admin});
		}).then(function () {
			//ETH/BTC
			return oracle.addAsset('0x4554482f425443', 29523, {from: admin});
		})
	} else if (network == "development")
	{
	  // Set up the oracle deployment
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
			return factory.newSwapMarket(oracle.address, 0);
		}).then(function (result) {
			return AssetSwap.at(result.logs[0].args._new);
		}).then(function (instance) {
			ethswap = instance;
			console.log("ETH Swap Market: " + ethswap.address);
			return factory.newSwapMarket(oracle.address, 1);
		}).then(function (result) {
			return AssetSwap.at(result.logs[0].args._new);
		}).then(function (instance){
			spxswap = instance;
			console.log("SPX Swap Market: " + spxswap.address);
			return factory.newSwapMarket(oracle.address, 2);
		}).then(function (result) {
			return AssetSwap.at(result.logs[0].args._new);
		}).then(function (instance) {
			btcswap = instance;
			console.log("BTC Swap Market: " + btcswap.address);
			return factory.newSwapMarket(oracle.address, 3);
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
			return deployer.deploy(DataTest)
		}).then(function () {
			console.log('Finished deployment');
		});
	} else if (network == "ropsten")
	{
	  var admin = accounts[0]
		deployer.then(function () {
			return deployer.deploy(MultiOracle, 200000000, 4, 1000000, {from: admin});
		}).then(function(instance) {
			oracle = instance;
			// SPX
			return oracle.addAsset('0x535058555344', 2000000000, 2, 15000000, false, {from: admin}); 
		}).then(function () {
			//BTC
			return oracle.addAsset('0x425443555344', 6500000000, 3, 2000000, false, {from: admin});
		}).then(function () {
			//ETH/BTC
			return oracle.addAsset('0x4554482f425443', 30000000, 4, 1500000, true, {from: admin});
		})
	}
};

/*module.exports = async function(deployer, network, accounts) {
	if (network == "testlive") {
		let admin = accounts[0];
		console.log(admin);
		var oracle = await deployer.deploy(MultiOracle, 119620000, 5, 2000000, {from: admin});
		var addSpxTx = await oracle.addAsset('0x535058555344', 26707100000, 1, 13480000, false, {from: admin});
		var addBtcTx = await oracle.addAsset('0x425443555344', 3606190000, 5, 2500000, false, {from: admin});
		var addEthBtcTx = await oracle.addAsset('0x4554482f425443', 34161, 0, 2500000, true, {from: admin});
			
	} else if (network == "development")
	{
	  // Set up the oracle deployment
		var admin = accounts[0];
		var oracle;
		var factory;
		//var factory;
		var ethswap, spxswap, btcswap, ethbtcswap;

		oracle = await deployer.deploy(MultiOracle, 119620000, 5, 2000000, {from: admin});
		let addSpxTx = await oracle.addAsset('0x535058555344', 2000000000, 2, 15000000, false);
		let addBtcTx = await oracle.addAsset('0x425443555344', 6500000000, 3, 2000000, false);
		let addEthBtcTx = await oracle.addAsset('0x4554482f425443', 30000000, 4, 1500000, true);
		factory = await deployer.deploy(SwapFactory);
		let ethswapTx = await factory.newSwapMarket(oracle.address, 0);
		ethswap = await SwapMarket.at(ethswapTx.logs[0].args._new);
		console.log("ETH Swap Market: " + ethswap.address);
		let spxSwapTx = await factory.newSwapMarket(oracle.address, 1);
		spxswap = await SwapMarket.at(spxSwapTx.logs[0].args._new);
		console.log("SPX Swap Market: " + spxswap.address);
		let btcSwapTx = await factory.newSwapMarket(oracle.address, 2);
		btcswap = await SwapMarket.at(btcSwapTx.logs[0].args._new);
		console.log("BTC Swap Market: " + btcswap.address);
		let ethbtcSwapTx = await factory.newSwapMarket(oracle.address, 3);
		ethbtcswap = await SwapMarket.at(ethbtcSwapTx.logs[0].args._new);
		console.log("ETH/BTC Swap Market: " + ethbtcswap.address);
		let addEthReadTx = await oracle.addReader(ethswap.address);
		let addSpxReadTx = await oracle.addReader(spxswap.address);
		let addBtcReadTx = await oracle.addReader(btcswap.address);
		let addEthBtcReadTx = await oracle.addReader(ethbtcswap.address);
	}
};*/