var Oracle = artifacts.require("./Oracle.sol")
var AssetSwap = artifacts.require("./AssetSwap.sol");
var Book = artifacts.require("./Book.sol");
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
	const NUM_TAKERS = 10;

	var swap;
	var factory;
	var oracle;

	const maker = accounts[1];
	var used_accounts = 2;
	var takers = accounts.slice(used_accounts, NUM_TAKERS + used_accounts);
	console.log(takers)
	used_accounts += takers.length;
	var ids = new Array(takers.length)
	var bookAddress;

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
		let makeAmount = web3.toWei(900, 'ether'); // in range from 11 to 25 ETH
		let bookTx = await swap.createBook(10, {from: maker});
		let makeTx = await swap.lpFund(maker, {from: maker, value: makeAmount});
		let bookData = await swap.getBookData(maker);
		bookAddress = bookData[0];
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

	it ("Should advance the time by 9 days without settling", async function () {
		await utils.timeTravel(60 * 60 * 24 * 9);
		let book = await Book.at(bookAddress);
		let timing = await book.reachedSelfDestructTime();
		assert.equal(timing, true);
	});

	it ("Should allow all contracts to be redeemed", async function () {
		for (const [i, taker] of Object.entries(takers)) {
			let cancelTx = await swap.redeem(maker, ids[i], {from: maker});
			await sleep(1000);
		}
	});

	it ("Should allow the LP to withdraw", async function () {
		let withdrawTx = await swap.lpMarginWithdrawal(web3.toWei(900, 'ether'), {from: maker});
		let makerBalance = await swap.withdrawBalances(maker);
		assert.equal(makerBalance.toNumber(), 900e18);
		
		let startLPBalance = await web3.eth.getBalance(maker);
		let lpleaveTx = await swap.withdrawBalance({from: maker});
		let endLPBalance = await web3.eth.getBalance(maker);
		let lpdifference = endLPBalance - startLPBalance;

		let lptx = await web3.eth.getTransaction(lpleaveTx.tx);
	    let lpgasPrice = lptx.gasPrice;
	    let lpgasCosts = lpgasPrice.mul(lpleaveTx.receipt.gasUsed);
		assert.equal(lpdifference, 900e18 - lpgasCosts);
	});

	it ("Should allow the taker to withdraw", async function () {
		let takerBalance = await swap.withdrawBalances(takers[0]);
		assert.equal(takerBalance.toNumber(), 10e18);

		let startTakerBalance = await web3.eth.getBalance(takers[0]);
		let takerleaveTx = await swap.withdrawBalance({from: takers[0]});
		let endTakerBalance = await web3.eth.getBalance(takers[0]);
		let takerdifference = endTakerBalance - startTakerBalance;

		let takertx = await web3.eth.getTransaction(takerleaveTx.tx);
	    let takerGasPrice = takertx.gasPrice;
	    let takerGasCosts = takerGasPrice.mul(takerleaveTx.receipt.gasUsed);
		assert.equal(takerdifference, 10e18 - takerGasCosts);
	});
})