var Oracle = artifacts.require("./Oracle.sol")
var AssetSwap = artifacts.require("./AssetSwap.sol");
let SwapFactory = artifacts.require("./SwapFactory.sol");
var truffleAssert = require('truffle-assertions')

contract ('AssetSwap', function (accounts) {

	let admin = accounts[0]

	let contracts = {
		"SPX" : {
			'assetID': '1'
		},
		"BTC": {
			'assetID': '2'
		},
		"ETHBTC": {
			'assetID': '3'
		}
	}

	const NUM_MAKERS = 10;

	var swap;
	var factory;

	const taker = accounts[1];
	const maker_1 = accounts[2];

	console.log(contracts)

	it ("Should find the SPX AssetSwap conract", async function () {
		factory = await SwapFactory.deployed();
		let spx_addr = await factory.swapContracts(contracts["SPX"].assetID);
		swap = await AssetSwap.at(spx_addr);
		let swap_id = await swap.ASSET_ID();

		assert.equal(swap_id, contracts["SPX"].assetID);
	});

	it ("Should not allow an LP to add open balance before they have a book", async function () {
		await truffleAssert.reverts(
			swap.increaseOpenBalance({from: maker_1, value: 16e18})
		);
	});

	it ("Should allow a new LP to create a book, with a 15 ETH minimum", async function () {
		let makeTX = await swap.createBook(15, {from: maker_1});
		let bookData = await swap.getBookData(maker_1);
		assert.equal(bookData[6].toNumber(), 15e18);
	});

	it ("Should allow the LP to add open balance", async function () {
		let increaseBalanceTx = await swap.increaseOpenBalance({from: maker_1, value: 16e18});
		let lp_openBalance = await swap.openBalances(maker_1);
		assert.equal(lp_openBalance.toNumber(), 16e18);
	});

	it ("Should allow the LP to reduce their open balance", async function () {
		let reduceBalanceTx = await swap.reduceOpenBalance(10e18, {from: maker_1});
		let lp_openBalance = await swap.openBalances(maker_1);
		assert.equal(lp_openBalance.toNumber(), 6e18);
	});

	it ("Should allow the admin to adjust the minimum OpenBalance sizes", async function () {
		let tierChange = await swap.setTiers(
			[12, 30, 100, 1e8],
			[12, 40, 100, 1e8]);
		let newTier1 = await swap.tierCutoffs(0);
		assert.equal(newTier1.toNumber(), 12);
	});

	it ("Should prevent an LP from adding to their OpenBalance if they don't add enough to pass the new tier requirements",
		async function () 
	{
		await truffleAssert.reverts(
			swap.increaseOpenBalance({from: maker_1, value: 25e18})
		);
	});


	/*it ("Should find the 3 swap contracts", async function () {
		let factory = await SwapFactory.deployed();
		let spxAddr = await factory.swapContracts.call(0);
		let btcAddr = await factory.swapContracts.call(1);
		let ethbtcAddr = await factory.swapContracts.call(2);

		contracts["SPX"].instance = await SwapMarket.at(spxAddr);
		contracts["BTC"].instance = await SwapMarket.at(btcAddr);
		contracts["ETHBTC"].instance = await SwapMarket.at(ethbtcAddr);

		var spxID = await contracts["SPX"].instance.ASSET_ID.call();
		var btcID = await contracts["BTC"].instance.ASSET_ID.call();
		var ethbtcID = await contracts["ETHBTC"].instance.ASSET_ID.call();
		assert.equal(spxID, 1, 'Spx swap asset does not match');
		assert.equal(btcID, 2, 'Btc Swap asset does not match');
		assert.equal(ethbtcID, 3, 'Eth/Btc swap asset does not match');
	});

	it ("Should Allow 10 makers on each contract", async function () {
		for (const [name, contract] of Object.entries(contracts)) {
			console.log(`Working on contract ${name}...`);
			for (const [i, maker] of contract.makers.entries()) {
				var makeAmount = web3.toWei(Math.floor(Math.random() * 15 + 11), 'ether'); // in range from 11 to 25 ETH
				var longRate = Math.floor(Math.random() * 199 - 99); // in range from -99 to 99
				var shortRate = Math.floor(Math.random() * (99 + longRate + 1) - longRate); // in range from -longRate + 1 to 99
				contract.makerInfo[i] = [makeAmount, [longRate, shortRate]];
				console.log(`Making on maker ${i} with ${makeAmount}`)
				console.log(`Maker rates are: ${longRate}, ${shortRate}`)
				var rateTx = await contract.instance.setRate(longRate, shortRate, {from: maker});
				var makeTx = await contract.instance.increaseOpenMargin(makeAmount, {from: maker, value: makeAmount});
			}

		}
	});*/

	/*it ("Should allow for some takers on each contract", async function () {
		for (const [name, contract] of Object.entries(contracts)) {
			console.log(`Working on contract ${name}...`);
			for (const [i, taker] of contract.takers.entries()) {
				var takeAmount = web3.toWei(Math.floor( + 10), 'ether'); // in range from 11 to 25 ETH
				var longRate = Math.floor(Math.random() * 199 - 99); // in range from -99 to 99
				var shortRate = Math.floor(Math.random() * (99 + longRate + 1) - longRate); // in range from -longRate + 1 to 99
				contract.makerInfo[i] = [makeAmount, [longRate, shortRate]];
				console.log(`Making on maker ${i} with ${makeAmount}`)
				console.log(`Maker rates are: ${longRate}, ${shortRate}`)
				var rateTx = await contract.instance.setRate(longRate, shortRate, {from: maker});
				var makeTx = await contract.instance.increaseOpenMargin(makeAmount, {from: maker, value: makeAmount});
			}s

		;
	});*/

})