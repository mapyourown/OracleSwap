var Oracle = artifacts.require("./Oracle.sol")
var AssetSwap = artifacts.require("./AssetSwap.sol");
let SwapFactory = artifacts.require("./SwapFactory.sol");
var truffleAssert = require('truffle-assertions')
let utils = require('./utils.js')

function gasCosts(receipt, trans_str) {
	var gasUsed = receipt.receipt.gasUsed;
	console.log(`Transaction: ${trans_str}`);
    console.log(`GasUsed: ${receipt.receipt.gasUsed}`);
}
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

	const NUM_MAKERS = 1;
	const NUM_TAKERS = 90;

	var swap;
	var factory;
	var oracle;

	const maker = accounts[1];
	var used_accounts = 2;
	var takers = accounts.slice(used_accounts, NUM_TAKERS + used_accounts);
	console.log(takers)
	used_accounts += takers.length;
	var ids = new Array(takers.length)

	it ("Should find the SPX AssetSwap conract", async function () {
		factory = await SwapFactory.deployed();
		let spx_addr = await factory.swapContracts(contracts["SPX"].assetID);
		swap = await AssetSwap.at(spx_addr);
		let swap_id = await swap.ASSET_ID();

		assert.equal(swap_id, contracts["SPX"].assetID);
	});

	it ("Should find the oracle contract", async function () {
		oracle = await Oracle.deployed();
		let isAdmin = await oracle.admins(admin);
		assert.equal(isAdmin, true);
		//console.log('o admin ', oracleAddress);
		//console.log('script admin', admin);
	});

	it ("Should set up the first maker with 900 ETH OpenBalance", async function () {
		let makeAmount = web3.toWei(2000, 'ether'); // in range from 11 to 25 ETH
		let bookTx = await swap.createBook(10, {from: maker});
		let makeTx = await swap.lpFund(maker, {from: maker, value: makeAmount});
		let bookData = await swap.getBookData(maker);
		assert.equal(bookData[1].toNumber(), makeAmount)
	})

	it (`Should set up ${NUM_TAKERS} takers`, async function () {
		for (const [i, taker] of Object.entries(takers)) {
			let takeTx = await swap.take(maker, 10, true, {from: taker, value: web3.toWei(10, 'ether')});
			let id = takeTx.logs[0].args.id;
			ids[i] = id;
		}

	});

	it (`Should initialize all ${NUM_TAKERS} takers`, async function () {
		let priceTx = await swap.priceInitialization(maker, {from: admin});
	});

	/*it (`Should cancel all the contracts`, async function () {
		for (const [i, taker] of Object.entries(takers)) {
			let cancelTx = swap.playerCancel(maker, ids[i], {from: taker, value: web3.toWei(5, 'ether')});
		}
	});*/

	it (`Should admin cancel the contracts`, async function () {
		for (const [i, taker] of Object.entries(takers)) {
			let cancelTx = await swap.adminCancel(maker, ids[i], {from: admin});
			await sleep(1000);
		}
	})

	/*it ("Should update the oracle", async function () {
		await utils.timeTravel(60 * 60 * 24); // one day
		let oracleAddress = await oracle.admin();
		let ethTX = await oracle.setIntraweekPrice(0, 100000000, false, {from: admin});
	});

	it ("Should update the oracle 2", async function () {
		let oracleAddress = await oracle.admin();
		let assets = await oracle.assets(1);
		console.log(assets);
		let ethAsset = await oracle.assets(0);
		console.log(ethAsset);
		console.log(web3.eth.getBlock(web3.eth.blockNumber).timestamp);
		let spxTX = await oracle.setIntraweekPrice(1, 2800000000, false, {from: admin});
	});*/

	it ("Should advance the oracle a week", async function () {
		await utils.timeTravel(60 * 60 * 24); // one day
		await oracle.setIntraweekPrice(0, 200e6, false, {from: admin});
		await oracle.setIntraweekPrice(1, 2800e6, false, {from: admin});
		await utils.timeTravel(60 * 60 * 24 * 4); // 4 days into the future
		await oracle.setIntraweekPrice(0, 200e6, true);
		await oracle.setIntraweekPrice(1, 2800e6, true);
		await utils.timeTravel(60 * 60 * 24); // one day
		await oracle.setSettlePrice(0, 200e6);
		await oracle.setSettlePrice(1, 2700e6);
	});

	it ("Should compute returns", async function () {
		let returnsTx = await swap.computeReturns({from: admin});
	});

	it ("Should settle the maker", async function () {
		let lengths = await swap.checkLengthDEBUG(maker);
		//console.log(lengths);
		let settleTx = await swap.settle(maker, {from: admin});
		gasCosts(settleTx, `Settle with $(NUM_TAKERS) takers`);
	});

	it ("Should redeem a subcontract", async function () {
		let info = await swap.getSubcontractData(maker, ids[0]);
		let bookInfo = await swap.getBookData(maker);
		//console.log(bookInfo);
		//console.log(info);
		let redeemtx = await swap.redeem(maker, ids[0], {from: maker});
		gasCosts(redeemtx, "Redeeming one subcontract")
	})
})