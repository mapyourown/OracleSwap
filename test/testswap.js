var MultiOracle = artifacts.require("./MultiOracle.sol")
var SwapMarket = artifacts.require("./SwapMarket.sol");
var SwapFactory = artifacts.require("./SwapFactory.sol")
var truffleAssert = require('truffle-assertions')

contract('SwapMarket', async (accounts) => {

	var admin = accounts[0]

	var used_accounts = 1;

	var contracts = {
		"ETH" : {
			'assetID': '0',
			'crypto': false
		},
		"SPX" : {
			'assetID': '1',
			'crypto': false
		},
		"BTC": {
			'assetID': '2',
			'crypto': false
		},
		"ETHBTC": {
			'assetID': '3',
			'crypto': true
		}
	}

	const NUM_CONTRACTS = 3;

	const NUM_MAKERS_PER_C = 5;

	contracts['ETH'].prices = [151, 155, 160, 170];
	contracts['SPX'].prices = [2550, 2400, 2450, 2420];
	contracts['BTC'].prices = [3010, 2800, 2900, 3100];
	contracts['ETHBTC'].prices = contracts['ETH'].prices.map(function (num, idx) {
			return parseFloat((num/contracts['BTC'].prices[idx]).toFixed(6));
	});
	contracts['ETH'].lrs = [2, 2, 2, 2]
	contracts['SPX'].lrs = [13.48, 14, 12.94, 13.1]
	contracts['BTC'].lrs = [2.5, 2.5, 2.5, 2.5]
	contracts['ETHBTC'].lrs = [2.5, 2.5, 2.5, 2.5]

	const setIntraweekPrice = async (contract, prices, lrs, day) => {
		await oracle.setIntraweekPrice(contract.assetID, prices[day], lrs[day], {from: admin});
	}

	var oracle;

	// set time forward methods
	/*const send = (method, params = []) =>
	  web3.currentProvider.send({ id, jsonrpc, method, params })
	const timeTravel = async seconds => {
	  await send('evm_increaseTime', [seconds])
	  await send('evm_mine')
	}*/

	const advanceTime = async seconds => {
	  await web3.currentProvider.send({
	  	id: new Date().getTime(),
	  	jsonrpc: "2.0",
	  	method: 'evm_increaseTime',
	  	params: [seconds]});
	  await web3.currentProvider.send({
	  	id: new Date().getTime(),
	  	jsonrpc: "2.0",
	  	method: 'evm_mine',
	  })
	}

	const sleep = function(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	it ("Should find the 4 swap contracts", async function () {
		let factory = await SwapFactory.deployed();
		let ethAddr = await factory.swapContracts.call(0);
		let spxAddr = await factory.swapContracts.call(1);
		let btcAddr = await factory.swapContracts.call(2);
		let ethbtcAddr = await factory.swapContracts.call(3);

		contracts["ETH"].instance = await SwapMarket.at(ethAddr);
		contracts["SPX"].instance = await SwapMarket.at(spxAddr);
		contracts["BTC"].instance = await SwapMarket.at(btcAddr);
		contracts["ETHBTC"].instance = await SwapMarket.at(ethbtcAddr);

		let ethID = await contracts['ETH'].instance.ASSET_ID.call();
		let spxID = await contracts["SPX"].instance.ASSET_ID.call();
		let btcID = await contracts["BTC"].instance.ASSET_ID.call();
		let ethbtcID = await contracts["ETHBTC"].instance.ASSET_ID.call();
		assert.equal(ethID, 0, 'Eth swap asset does not match');
		assert.equal(spxID, 1, 'Spx swap asset does not match');
		assert.equal(btcID, 2, 'Btc Swap asset does not match');
		assert.equal(ethbtcID, 3, 'Eth/Btc swap asset does not match');
	});

	it ("Should find the Oracle", async function () {
		oracle = await MultiOracle.deployed();
	});

	const setSettlePrice = async (contract, prices, lrs, day) => {
		console.log('Settling: ', contract.assetID)
		console.log('Price: ', prices[day])
		console.log('LR: ', lrs[day])
		await oracle.setIntraweekPrice(contract.assetID, prices[day], lrs[day], {from: admin});
	}

	it (`Should allow ${NUM_MAKERS_PER_C} LPs to create an open balance (on each contract)`, async function () {
		Object.keys(contracts).forEach(function(name, i) {
			var makers = accounts.slice(used_accounts, NUM_MAKERS_PER_C + used_accounts)
			used_accounts += makers.length;
			var makerInfo = new Array(makers.length)
			contracts[name].makers = makers;
			contracts[name].makerInfo = makerInfo;
		}, contracts);

		for (const [name, contract] of Object.entries(contracts)) {
			console.log(`Working on contract ${name}...`);
			for (const [i, maker] of Object.entries(contract.makers)) {
				let makeAmount = web3.toWei(Math.floor(Math.random() * 15 + 11), 'ether'); // in range from 11 to 25 ETH
				contract.makerInfo[i] = [makeAmount];
				console.log(`Making on maker ${i} with ${makeAmount}`)
				let makeTx = await contract.instance.increaseOpenMargin({from: maker, value: makeAmount});
			}
		}
	});

	it ("should allow LPs to change their margin rates", async function () {
		for (const [name, contract] of Object.entries(contracts)) {
			console.log(`Working on contract ${name}...`);
			for (const [i, maker] of Object.entries(contract.makers)) {
				let longRate = Math.floor(Math.random() * 199 - 99); // in range from -99 to 99
				let shortRate = Math.floor(Math.random() * (99 + longRate) - longRate + 1); // in range from -longRate + 1 to 99
				contract.makerInfo[i].push([longRate, shortRate]);
				console.log(`Making on LP ${i}`);
				console.log(`LP rates are: ${longRate}, ${shortRate}`);
				let rateTx = await contract.instance.setRate(longRate, shortRate, {from: maker});
			}
		}
	});

	it ("Should allow an LP to reduce open balance", async function () {
		for (const [name, contract] of Object.entries(contracts)) {
			console.log(`Working on contract ${name}...`);
			let maker = contract.makers[0]
			let reduceAmount = web3.toWei(Math.random() * 0.5, 'ether');
			let startingBalance = await contract.instance.balances.call(maker);
			let reduceTx = await contract.instance.reduceOpenMargin(reduceAmount, {from: maker})
			let endingBalance = await contract.instance.balances.call(maker);
			let start = web3.fromWei(startingBalance, 'ether');
			let reduction = web3.fromWei(reduceAmount, 'ether');
			let end = web3.fromWei(endingBalance, 'ether');
			assert.equal(start.toNumber() + reduction, end.toNumber());
		}
	});

	const NUM_DIFF_TAKERS_PER_C = 5;

	it (`should allow ${NUM_DIFF_TAKERS_PER_C} takers to take from different LPs`, async function () {
		Object.keys(contracts).forEach(function(name, i) {
			var takers = accounts.slice(used_accounts, used_accounts + NUM_DIFF_TAKERS_PER_C)
			used_accounts += takers.length;
			var takerInfo = new Array(takers.length)
			contracts[name].takers = takers;
			contracts[name].takerInfo = takerInfo;
		}, contracts);

		for (const [name, contract] of Object.entries(contracts)) {
			contract.openFee = await contract.instance.OPEN_FEE.call();
			let min = await contract.instance.MIN_RM.call();
			contract.minimum = (web3.fromWei(min, 'ether')).toNumber()
		}

		for (const [name, contract] of Object.entries(contracts)) {
			console.log(`Working on contract ${name}...`);
		
			for (const [i, taker] of Object.entries(contract.takers)) {
				let makerIndex = contract.makers[i]
				let available = contract.makerInfo[i][0] * (1 - contract.openFee/100)
				let takeAmount = Math.floor(Math.random() * (available/1e18 - contract.minimum) + contract.minimum) // choose in range minimum - all 
				contract.takerInfo[i] = [makerIndex, takeAmount];
				console.log(`Making on taker ${i} with ${takeAmount}`)
				let takeTx = await contract.instance.take(contract.makers[i], takeAmount, (i % 2 == 0), {from: taker, value: web3.toWei(takeAmount, 'ether')});
			}
		}
	});

	const NUM_TAKERS_1_LP = 10;

	it (`should allow ${NUM_TAKERS_1_LP} takers to take from 1 LP`, async function () {
		Object.keys(contracts).forEach(function(name, i) {
			let bigMaker = accounts[used_accounts];
			used_accounts++;
			let makeAmount = web3.toWei(500, 'ether');
			let openTx = contracts[name].instance.increaseOpenMargin({from: bigMaker, value: makeAmount})
			contracts[name].bigMaker = bigMaker;
			let takers = accounts.slice(used_accounts, used_accounts + NUM_TAKERS_1_LP);
			used_accounts += takers.length;
			contracts[name].multiTakers = takers;
			contracts[name].multiTakersInfo = new Array(takers.length);
		}, contracts);

		for (const [name, contract] of Object.entries(contracts)) {
			console.log(`Working on contract ${name}...`);
			for (const [i, taker] of contract.multiTakers.entries()) {
				let takeAmount = Math.floor(Math.random() * 30 + 10) // choose in range minimum - all 
				contract.multiTakersInfo[i] = [takeAmount];
				console.log(`Making on taker ${i} with ${takeAmount}`)
				let takeTx = await contract.instance.take(contract.bigMaker, takeAmount, (i % 2 == 0), {from: taker, value: web3.toWei(takeAmount, 'ether')});
			}
		}
	});

	it ("should set the subcontract margin rate for an LP with no specific rates to the default margin rate", async function () {
		
		Object.keys(contracts).forEach(function(name, i) {
			let nonSpecificMaker = accounts[used_accounts];
			used_accounts++;
			let makeAmount = web3.toWei(50, 'ether');
			let openTx = contracts[name].instance.increaseOpenMargin({from: nonSpecificMaker, value: makeAmount})
			contracts[name].nonSpecificMaker = nonSpecificMaker;
			let taker = accounts[used_accounts];
			used_accounts++;
			contracts[name].nonSpecificTaker = taker;
		}, contracts);

		for (const [name, contract] of Object.entries(contracts)) {
			console.log(`Working on contract ${name}...`);
			let takeTx = await contract.instance.take(contract.nonSpecificMaker, 25, true, {from: contract.nonSpecificTaker, value: web3.toWei(25, 'ether')})
			let id = takeTx.logs[0].args.id;
			let subcontractInfo = await contract.instance.getSubcontractData.call(contract.nonSpecificMaker, id);
			let defaultRates = await contract.instance.defaultRates.call();
			let subcontractLong = subcontractInfo[2].toNumber();
			let defaultLong = defaultRates[0].toNumber();
			console.log(subcontractLong)
			console.log(defaultLong)
			assert.equal(subcontractLong, defaultLong);
		}
	});

	it ("should not allow more takers than the maximum to take from 1 LP");

	it ("should not allow takers to take less than the global take minimum", async function () {

		Object.keys(contracts).forEach(function(name, i) {
			let smallTaker = accounts[used_accounts];
			used_accounts++;
			contracts[name].smallTaker = smallTaker;
		}, contracts);

		for (const [name, contract] of Object.entries(contracts)) {
			console.log(`Working on contract ${name}...`);
			await truffleAssert.reverts(
				contract.instance.take(contract.nonSpecificMaker, 7, true, {from: contract.nonSpecificTaker, value: web3.toWei(7, 'ether')})
			);
		}
	});

	it ("should allow an LP to set a minimum take amount, and deny takers from taking less than that", async function () {
		for (const [name, contract] of Object.entries(contracts)) {
			console.log(`Working on contract ${name}...`);
			let setMinTx = await contract.instance.setMinimum(15, {from: contract.nonSpecificMaker})
			await truffleAssert.reverts(
				contract.instance.take(contract.nonSpecificMaker, 14, true, {from: contract.smallTaker, value: web3.toWei(14, 'ether')})
			);
		}
	});

	it ("should allow an LP to fund their margin", async function () {
		for (const name of Object.keys(contracts)) {
			let withdrawMaker = accounts[used_accounts];
			used_accounts++;
			let makeAmount = web3.toWei(50, 'ether');
			let openTx = contracts[name].instance.increaseOpenMargin({from: withdrawMaker, value: makeAmount})
			contracts[name].withdrawMaker = withdrawMaker;
			let withdrawTaker = accounts[used_accounts];
			used_accounts++;
			contracts[name].withdrawTaker = withdrawTaker;
		}

		for (const [name, contract] of Object.entries(contracts)) {
			console.log(`Working on contract ${name}...`);
			let bookDataStart = await contract.instance.getBookData.call(contract.withdrawMaker);
			let startMargin = web3.fromWei(bookDataStart[1], 'ether').toNumber()
			let fundTx = await contract.instance.lpFund(contract.withdrawMaker, {from: contract.withdrawMaker, value: web3.toWei(10, 'ether')})
			let bookDataEnd = await contract.instance.getBookData.call(contract.withdrawMaker);
			let endMargin = web3.fromWei(bookDataEnd[1], 'ether').toNumber()
			assert.equal(startMargin + 10, endMargin);
		}
	});

	it ("should allow a taker to fund their margin", async function() {
		for (const [name, contract] of Object.entries(contracts)) {
			console.log(`Working on contract ${name}...`);
			let takeTx = await contract.instance.take(contract.withdrawMaker, 10, true, {from: contract.withdrawTaker, value: web3.toWei(10, 'ether')});
			let id = takeTx.logs[0].args.id;
			contract.takerWithdrawId = id;
			let subcontractInfo = await contract.instance.getSubcontractData.call(contract.withdrawMaker, id);
			let startMargin = web3.fromWei(subcontractInfo[0], 'ether').toNumber()
			let fundTx = await contract.instance.takerFund(contract.withdrawMaker, id, {from: contract.withdrawTaker, value: web3.toWei(5, 'ether')})
			let subcontractInfo2 = await contract.instance.getSubcontractData.call(contract.withdrawMaker, id);
			let endMargin = web3.fromWei(subcontractInfo2[0], 'ether').toNumber()
			assert.equal(startMargin + 5, endMargin)
		}
	});

	it ("should allow an LP to withdraw some margin", async function() {
		for (const [name, contract] of Object.entries(contracts)) {
			console.log(`Working on contract ${name}...`);
			let bookDataStart = await contract.instance.getBookData.call(contract.withdrawMaker);
			let startMargin = web3.fromWei(bookDataStart[1], 'ether').toNumber()
			let moveTx = await contract.instance.lpMarginWithdrawal(web3.toWei(5, 'ether'), {from: contract.withdrawMaker})
			let bookDataEnd = await contract.instance.getBookData.call(contract.withdrawMaker);
			let endMargin = web3.fromWei(bookDataEnd[1], 'ether').toNumber()
			assert.equal(startMargin - 5, endMargin)
		}
	});

	it ("should allow a taker to withdraw some margin", async function() {
		for (const [name, contract] of Object.entries(contracts)) {
			console.log(`Working on contract ${name}...`);
			let subcontractInfo = await contract.instance.getSubcontractData.call(contract.withdrawMaker, contract.takerWithdrawId);
			let startMargin = web3.fromWei(subcontractInfo[0], 'ether').toNumber()
			let withdrawTx = await contract.instance.takerWithdrawal(web3.toWei(2.5, 'ether'), contract.withdrawMaker, contract.takerWithdrawId, {from: contract.withdrawTaker});
			let subcontractInfo2 = await contract.instance.getSubcontractData.call(contract.withdrawMaker, contract.takerWithdrawId);
			let endMargin = web3.fromWei(subcontractInfo2[0], 'ether').toNumber()
			assert.equal(startMargin - 2.5, endMargin)
		}
	});

	it ("should allow an lp to change their margin rates and have 5 takers with 5 different rates", async function () {
		for (const name of Object.keys(contracts)) {
			let changeRateMaker = accounts[used_accounts];
			used_accounts++;
			let makeAmount = web3.toWei(500, 'ether');
			let openTx = await contracts[name].instance.increaseOpenMargin({from: changeRateMaker, value: makeAmount});
			contracts[name].changeRateMaker = changeRateMaker;
			let changeRateTakers = accounts.slice(used_accounts, used_accounts + 5);
			used_accounts += 5;
			contracts[name].changeRateTakers = changeRateTakers;
		}

		const newRates = [[2, -1], [4, -2], [6, -3], [8, -4], [10, -5]]

		for (const [name, contract] of Object.entries(contracts)) {
			console.log(`Working on contract ${name}...`);
			for (const [i, taker] of Object.entries(contract.changeRateTakers)) {
				let rateTx = await contract.instance.setRate(newRates[i][0], newRates[i][1], {from: contract.changeRateMaker});
				//let makerSize = await contract.instance.getBookData(contract.changeRateMaker)
				//console.log(makerSize[4])
				// console.log(taker)
				let takeTx = await contract.instance.take(contract.changeRateMaker, 10 + parseInt(i), (i % 2 == 0), 
					{from: taker, value: web3.toWei(10 + parseInt(i), 'ether')});
				//let takeTx = await contract.instance.take(contract.changeRateMaker, 10, (i % 2 == 0), 
				//	{from: taker, value: web3.toWei(10, 'ether')});
				//console.log(takeTx)
				//console.log(takeTx.logs[0])
				let id = takeTx.logs[0].args.id;
				//console.log(id)
				let subcontractInfo = await contract.instance.getSubcontractData.call(contract.changeRateMaker, id);
				//console.log(subcontractInfo)
				let rate = subcontractInfo[2].toNumber();
				console.log(`taker ${i} with rate of ${newRates[i][i % 2]}`)
				assert.equal(rate, newRates[i][i % 2]);

			}
		}
	})

	// fees

	it ("should collect the proper open fee from the LP", async function () {
		for (const name of Object.keys(contracts)) {
			console.log(`Working on contract ${name}`)
			let openFeeMaker = accounts[used_accounts];
			used_accounts++;
			let makeAmount = web3.toWei(50, 'ether');
			let openTx = await contracts[name].instance.increaseOpenMargin({from: openFeeMaker, value: makeAmount})
			let openFeeTaker = accounts[used_accounts];
			used_accounts++;
			let contract_open_fee = await contracts[name].instance.OPEN_FEE.call();
			contracts[name].openFee = contract_open_fee.toNumber();
			contracts[name].openFeeMaker = openFeeMaker;
			contracts[name].openFeeTaker = openFeeTaker;
		}

		for (const [name, contract] of Object.entries(contracts)) {
			console.log(`Working on contract ${name}...`);
			let takeAmount = 15;
			let takeTx = await contract.instance.take(contract.openFeeMaker, takeAmount, true,
			 {from: contract.openFeeTaker, value: web3.toWei(takeAmount, 'ether')});
			let endingMargin = await contract.instance.openMargins(contract.openFeeMaker);
			let expectedChange = (takeAmount * (1 + contract.openFee/100)) * 1e18;
			assert.equal(web3.toWei(50, 'ether') - expectedChange, endingMargin.toNumber());
		}
	});

	it ("should collect the proper cancel fee from the LP for a pending contract (Equal to the open fee)", async function () {

		for (const name of Object.keys(contracts)) {
			var feeMakers = accounts.slice(used_accounts, used_accounts + 6)
			used_accounts += feeMakers.length;
			contracts[name].feeMakers = feeMakers;
			var feeTakers = accounts.slice(used_accounts, used_accounts + 6)
			used_accounts += feeTakers.length;
			contracts[name].feeTakers = feeTakers;
			let cancelFee = await contracts[name].instance.CANCEL_FEE();
			contracts[name].cancelFee = cancelFee.toNumber();
			let feeTakeInfo = new Array(feeTakers.length)
			for (const [i, maker] of Object.entries(feeMakers)) {
				let makeAmount = web3.toWei(20, 'ether');
				let takeAmount = 15;
				let makeTx = await contracts[name].instance.increaseOpenMargin({from: maker, value: makeAmount});
				let takeTx = await contracts[name].instance.take(maker, takeAmount, true, {from: feeTakers[i], value: web3.toWei(takeAmount, 'ether')});
				//console.log(takeTx)
				let id = takeTx.logs[0].args.id;
				console.log(id)
				feeTakeInfo[i] = [id, takeAmount];
			}
			contracts[name].feeTakeInfo = feeTakeInfo;
		}

		for (const [name, contract] of Object.entries(contracts)) {
			console.log(`Working on contract ${name}...`);
			let expectedFee = contract.openFee/100 * contract.feeTakeInfo[0][1]

			let cancelTx = await contract.instance.playerCancel(contract.feeMakers[0], contract.feeTakeInfo[0][0],
			 {from: contract.feeMakers[0], value: web3.toWei(1, 'ether')});
			let LPbalance = await contract.instance.balances(contract.feeMakers[0])
			//console.log(LPbalance)
			//console.log(contract.feeMakers[0])
			let subcontractInfo = await contract.instance.getSubcontractData.call(contract.feeMakers[0],
			 contract.feeTakeInfo[0][0]);
			assert.equal(subcontractInfo[0].toNumber(), (contract.feeTakeInfo[0][1] + expectedFee) * 1e18)
			assert.equal(LPbalance.toNumber(), web3.toWei(1, 'ether') - expectedFee * 1e18);

		}
	});

	it ("should collect the proper cancel fee from the taker for a pending contract", async function () {
		for (const [name, contract] of Object.entries(contracts)) {
			console.log(`Working on contract ${name}...`);
			let expectedFee = contract.openFee/100 * contract.feeTakeInfo[1][1]
			let cancelTx = await contract.instance.playerCancel(contract.feeMakers[1], contract.feeTakeInfo[1][0],
			 {from: contract.feeTakers[1], value: web3.toWei(1, 'ether')});
			let Takerbalance = await contract.instance.balances(contract.feeTakers[1])
			let bookInfo = await contract.instance.getBookData(contract.feeMakers[1])
			let bookMargin = bookInfo[1].toNumber()
			assert.equal(bookMargin, (contract.feeTakeInfo[1][1] + expectedFee) * 1e18)
			assert.equal(Takerbalance.toNumber(), web3.toWei(1, 'ether') - expectedFee * 1e18);
		}
	});

	it ("should take the proper cancel fee from the LP for a legacy contract", async function () {
		await advanceTime(60 * 60 * 24 * 5);
		for (const [name, contract] of Object.entries(contracts)) {
			console.log(`Working on contract ${name}...`);
			let makerFundTx = await contract.instance.lpFund(contract.feeMakers[2], 
				{from: contract.feeMakers[2], value: web3.toWei(10, 'ether')});
			let takerFundTx = await contract.instance.takerFund(contract.feeMakers[2],
				contract.feeTakeInfo[2][0], {from: contract.feeTakers[2], value: web3.toWei(10, 'ether')});
			let firstPriceTx = await contract.instance.firstPrice(contract.feeMakers[2], true, {from: admin});
			let settleTx = await contract.instance.settle(contract.feeMakers[2], {from: admin});
			//let subcontractInfoStart = await contract.instance.getSubcontractData(contract.feeMakers[2],
			// contract.feeTakeInfo[2][0]);
			let cancelTx = await contract.instance.playerCancel(contract.feeMakers[2], contract.feeTakeInfo[2][0],
				{from: contract.feeMakers[2], value: web3.toWei(1, 'ether')});
			let LPbalance = await contract.instance.balances(contract.feeMakers[2])
			//console.log(LPbalance)
			//console.log(contract.feeMakers[0])
			let subcontractInfoEnd = await contract.instance.getSubcontractData(contract.feeMakers[2],
			 contract.feeTakeInfo[2][0]);
			assert.equal(subcontractInfoEnd[0].toNumber(), (10 + 15)*1e18 + (15 * 3) * 1e16);
			assert.equal(LPbalance.toNumber(), web3.toWei(1, 'ether') - (15 * 3) * 1e16);
		}
	});

	it ("should collect the proper cancel fee from the taker for a legacy contract", async function () {
		
		await advanceTime(60 * 60 * 24 * 5);

		for (const [name, contract] of Object.entries(contracts)) {
			console.log(`Working on contract ${name}...`);	
			let makerFundTx = await contract.instance.lpFund(contract.feeMakers[3], 
				{from: contract.feeMakers[3], value: web3.toWei(10, 'ether')});
			let takerFundTx = await contract.instance.takerFund(contract.feeMakers[3],
			 contract.feeTakeInfo[3][0], {from: contract.feeTakers[3], value: web3.toWei(10, 'ether')});
			let firstPriceTx = await contract.instance.firstPrice(contract.feeMakers[3], true, {from: admin});
			let settleTx = await contract.instance.settle(contract.feeMakers[3], {from: admin});
			let expectedFee = contract.cancelFee/100 * contract.feeTakeInfo[3][1]
			let cancelTx = await contract.instance.playerCancel(contract.feeMakers[3], contract.feeTakeInfo[3][0],
			 {from: contract.feeTakers[3], value: web3.toWei(1, 'ether')});
			let Takerbalance = await contract.instance.balances(contract.feeTakers[3])
			let bookInfo = await contract.instance.getBookData(contract.feeMakers[3])
			let bookMargin = bookInfo[1].toNumber()
			assert.equal(bookMargin, (contract.feeTakeInfo[3][1] + expectedFee) * 1e18 + 10 * 1e18)
			assert.equal(Takerbalance.toNumber(), web3.toWei(1, 'ether') - (15 * 3) * 1e16);
		}
	});	

	it ("should remove the correct fee and if taker burn", async function () {
		for (const [name, contract] of Object.entries(contracts)) {
			console.log(`Working on contract ${name}...`);
			let emptyBurnTx = await contract.instance.emptyBurn({from: admin});
			let expectedFee = contract.feeTakeInfo[4][1]/3 * 1e18
			let burnlTx = await contract.instance.playerBurn(contract.feeMakers[4], contract.feeTakeInfo[4][0],
			 {from: contract.feeTakers[4], value: web3.toWei(10, 'ether')});
			
			let Takerbalance = await contract.instance.balances(contract.feeTakers[4])
			let bookInfo = await contract.instance.getBookData(contract.feeMakers[4])
			let collectedBurn = await contract.instance.burnFees()
			assert.equal(collectedBurn.toNumber(), expectedFee)
			assert.equal(Takerbalance.toNumber(), web3.toWei(10, 'ether') - expectedFee);
		}
	});

	it ("should remove the correct fee and burn if LP burn", async function () {
		for (const [name, contract] of Object.entries(contracts)) {
			console.log(`Working on contract ${name}...`);
			let emptyBurnTx = await contract.instance.emptyBurn({from: admin});
			let expectedFee = contract.feeTakeInfo[5][1]/3 * 1e18
			let burnTx = await contract.instance.playerBurn(contract.feeMakers[5], contract.feeTakeInfo[5][0],
			 {from: contract.feeMakers[5], value: web3.toWei(10, 'ether')});
			let LPbalance = await contract.instance.balances(contract.feeMakers[5])
			//console.log(LPbalance)
			//console.log(contract.feeMakers[0])
			let subcontractInfo = await contract.instance.getSubcontractData.call(contract.feeMakers[5],
			 contract.feeTakeInfo[5][0]);
			let collectedBurn = await contract.instance.burnFees()
			assert.equal(collectedBurn.toNumber(), expectedFee)
			assert.equal(LPbalance.toNumber(), web3.toWei(10, 'ether') - expectedFee);

		}
	});

	it ("should delete cancelled and burned contracts at settle correctly", async function () {
		await advanceTime(60 * 60 * 24 * 6);
		for (const [name, contract] of Object.entries(contracts)) {
			console.log(`Working on contract ${name}...`);
			for (const [i, maker] of Object.entries(contract.feeMakers)) {
				let firstPriceTx = await contract.instance.firstPrice(maker, true, {from: admin});
			}
			await setSettlePrice(contract, contract.prices, contract.lrs, 0);
			for (const [i, maker] of Object.entries(contract.feeMakers)) {
				let settleTx = await contract.instance.settle(maker, {from: admin});
				let book = await contract.instance.books(maker);

				let subcontractInfo = await contract.instance.getSubcontractData(maker, contract.feeTakeInfo[i][0])
				assert.equal(subcontractInfo[1].toNumber(), 0);
			}
		}
	});

	// book math
	let marginSum = function(a, x, i) {
		if (i % 2 == 0)
			return a + x;
		else
			return a - x;
	}

	it ("should correctly not net required margin for an LP with 5 new contracts", async function () {
		
		for (const [name, contract] of Object.entries(contracts)) {
			console.log(`Working on contract ${name}...`);
			let netMaker = accounts[used_accounts];
			used_accounts++;
			let makeTx = await contract.instance.increaseOpenMargin({from: netMaker, value: web3.toWei(500, 'ether')});
			let fundTx = await contract.instance.lpFund(netMaker, {from: netMaker, value: web3.toWei(100, 'ether')});
			let takeAmounts = [15, 20, 25, 30, 35, 11, 11, 11, 11, 11]
			let netTakers = accounts.slice(used_accounts, used_accounts + takeAmounts.length);
			let netTakerInfo = new Array(netTakers.length);
			
			for (const [i, taker] of Object.entries(netTakers)) {
				let takeTx = await contract.instance.take(netMaker, takeAmounts[i], i % 2 ==0, 
					{from: taker, value: web3.toWei(takeAmounts[i], 'ether')});
				let id = takeTx.logs[0].args.id;
				netTakerInfo[i] = id;
				let takerFundTx = await contract.instance.takerFund(netMaker, id, {from: taker, value: web3.toWei(50, 'ether')});
				await sleep(1000);
			}
			let bookinfo = await contract.instance.getBookData(netMaker);
			contract.netMaker = netMaker;
			contract.netTakers = netTakers;
			contract.netTakeAmounts = takeAmounts;
			contract.netTakerInfo = netTakerInfo;
			contract.grossMargin = takeAmounts.reduce((a, b) => a + b, 0) * 1e18;
			assert.equal(bookinfo[4].toNumber(), contract.grossMargin);
		}
	});

	it ("should correctly net required margin for the same LP with 5 legacy contracts", async function () {
		await advanceTime(60 * 60 * 24 * 5);
		for (const [name, contract] of Object.entries(contracts)) {
			console.log(`Working on contract ${name}...`);
			let firstPriceTx = await contract.instance.firstPrice(contract.netMaker, true, {from: admin});
			await setSettlePrice(contract, contract.prices, contract.lrs, 0);
			let settleTx = await contract.instance.settle(contract.netMaker, {from: admin});
			let bookinfo = await contract.instance.getBookData(contract.netMaker);
			let netMargin = contract.netTakeAmounts.reduce(marginSum, 0);
			contract.netMargin = netMargin * 1e18;
			assert.equal(bookinfo[4].toNumber(), netMargin * 1e18);
		}
	});

	it ("should correctly net required margin for the same LP with 5 new and 5 legacy contracts", async function () {
		await advanceTime(60 * 60 * 24 * 5);
		for (const [name, contract] of Object.entries(contracts)) {
			console.log(`Working on contract ${name}...`);
			await contract.instance.checkLengthDEBUG(contract.netMaker);
			let takeAmounts2 = [12]//, 18, 13, 28, 29]
			let netTakers2 = accounts.slice(used_accounts, used_accounts + takeAmounts2.length);
			let netTakerInfo2 = new Array(netTakers2.length);
				
			for (const [i, taker] of Object.entries(netTakers2)) {
				console.log('taking: ', i)
				console.log('address: ', taker)

				let takeTx = await contract.instance.take(contract.netMaker, takeAmounts2[i], i % 2 !=0, 
					{from: taker, value: web3.toWei(takeAmounts2[i], 'ether')});
				console.log('finished taking: ', i)
				let id = takeTx.logs[0].args.id;
				netTakerInfo2[i] = id;
				let takerFundTx = await contract.instance.takerFund(contract.netMaker, id, {from: taker, value: web3.toWei(50, 'ether')});
			}
			contract.netTakers2 = netTakers2;
			contract.tetTakeAmount2 = takeAmounts2;
			contract.netTakerInfo2 = netTakerInfo2;
			contract.allNetTakers = contract.netTakers.concat(contract.netTakers2);
			contract.allNetTakerInfo = contract.netTakerInfo.concat(contract.netTakerInfo2);
			let newMargin = contract.netMargin + takeAmounts2.reduce((a, b) => a + b, 0) * 1e18;
			let bookinfo = await contract.instance.getBookData(contract.netMaker);
			assert.equal(bookinfo[4].toNumber(), newMargin);

		}
	});

	it ("should correctly net required margin once the new 5 are added to become 10 legacy contracts", async function () {
		await advanceTime(60 * 60 * 24 * 5);
		for (const [name, contract] of Object.entries(contracts)) {
			console.log(`Working on contract ${name}...`);
			let firstPriceTx = await contract.instance.firstPrice(contract.netMaker, true, {from: admin});
			await setSettlePrice(contract, contract.prices, contract.lrs, 0);
			let settleTx = await contract.instance.settle(contract.netMaker, {from: admin});
			let bookinfo = await contract.instance.getBookData(contract.netMaker);
			let allContractAmounts = contract.netTakeAmounts.concat(contract.netTakeAmounts2)
			let netMargin = allContractAmounts.reduce(marginSum, 0);
			assert.equal(bookinfo[4].toNumber(), netMargin * 1e18);
		}
	});

	it ("should correctly update required margin if 5 of those contracts cancel and are settled", async function () {
		await advanceTime(60 * 60 * 24 * 5);
		let toCancel = new Set([1, 3, 6, 7, 9])
		for (const [name, contract] of Object.entries(contracts)) {
			console.log('all net: ', contract.allNetTakers)
			console.log(`Working on contract ${name}...`);
			for (const [i, taker] of Object.entries(contract.allNetTakers)) {
				if (toCancel.has(i))
				{
					let cancelTx = await contract.instance.cancel(contract.netMaker, contract.allNetTakerInfo[i], 
						{from: taker, value: web3.toWei(5, 'ether')});
				}
			}
			await setSettlePrice(contract, contract.prices, contract.lrs, 0);
			let settleTx = await contract.instance.settle(contract.netMaker, {from: admin});
			let bookinfo = await contract.instance.getBookData(contract.netMaker);
			let netMargin = contract.netTakeAmounts.concat(contract.netTakeAmounts2).reduce(marginSum, 0);
			console.log("Net Margin: ",netMargin * 1e18)
			assert.equal(bookinfo[4].toNumber(), netMargin * 1e18);
		}
	});

	// pnl assignment

	it ("should discard the pnl when the taker burns, the LP didnt, and the LP would recieve PNL");

	it ("should assign pnl as normal when the taker burns, the LP didnt, and the taker would recieve PNL");

	it ("should discard pnl when the LP burns, the taker didnt, and the taker would recieve PNL");

	it ("should assign pnl as normal when the LP burns, the taker didnt, and the LP would recieve PNL");

	it ("should assign pnl as normal when the taker cancels, and niether burn");

	it ("should assign pnl as normal the LP cancels, and niether burn");

	it ("should assign pnl as when both players cancel, and niether burn");

	// Continuation of contracts

	it ("should terminate the contract when the LP cancels, and niether burn", async function () {

		await advanceTime(60 * 60 * 24 * 5);

		for (const [name, contract] of Object.entries(contracts)) {
			console.log(`Working on contract ${name}...`);
			var termMakers = accounts.slice(used_accounts, used_accounts + 6)
			used_accounts += termMakers.length;
			contract.termMakers = termMakers;
			var termTakers = accounts.slice(used_accounts, used_accounts + 6)
			used_accounts += termTakers.length;
			contract.termTakers = termTakers;
			let openAmount = web3.toWei(500, 'ether');
			let takeAmount = 15;
			let termTakeInfo = new Array(termMakers.length)
			// last one should lose on long
			let makerRateTx = await contract.instance.setRate(-150, 200, {from: termMakers[5]});
			for (const [i, maker] of Object.entries(termMakers)) {
				let openTx = await contract.instance.increaseOpenMargin({from: maker, value: openAmount});
				let makerFundTx = await contract.instance.lpFund(maker, {from: maker, value: web3.toWei(100, 'ether')});
				let takeTx = await contract.instance.take(maker, takeAmount, true, 
					{from: termTakers[i], value: web3.toWei(takeAmount, 'ether')});
				let id = takeTx.logs[0].args.id;
				termTakeInfo[i] = id;
				let takerFundTx = await contract.instance.takerFund(maker, id, {from: termTakers[i], value: web3.toWei(50, 'ether')});
			}
			contract.termTakeInfo = termTakeInfo;
			let firstPriceTx = await contract.instance.firstPrice(termMakers[0], true, {from: admin});
			let cancelTx = await contract.instance.playerCancel(termMakers[0], termMakerInfo[0], {from: termMakers[0], value: web3.toWei(1, 'ether')});
			await setSettlePrice(contract, contract.prices, contract.lrs, 0);
			console.log('before settle')
			let settleTx = await contract.instance.settle(termMakers[0], {from: admin});
			let kInfo = await contract.instance.getSubcontractData(termMakers[0], termTakeInfo[0]);
			assert.equal(kInfo[1].toNumber(), 0);
		}
	});

	it ("should terminate the contract when the taker cancels, and niether burn", async function () {
		for (const [name, contract] of Object.entries(contracts)) {
			console.log(`Working on contract ${name}...`);
			let firstPriceTx = await contract.instance.firstPrice(contract.termMakers[1], true, {from: admin});
			let cancelTx = await contract.instance.playerCancel(contract.termMakers[1], contract.termMakerInfo[1], 
				{from: contract.termTakers[1], value: web3.toWei(1, 'ether')});
			await setSettlePrice(contract, contract.prices, contract.lrs, 0);
			let settleTx = await contract.instance.settle(contract.termMakers[1], {from: admin});
			let kInfo = await contract.instance.getSubcontractData(contract.termMakers[1], contract.termTakeInfo[1]);
			assert.equal(kInfo[1].toNumber(), 0);
		}
	});

	it ("should terminate the contract when the LP burns", async function () {
		for (const [name, contract] of Object.entries(contracts)) {
			console.log(`Working on contract ${name}...`);
			let firstPriceTx = await contract.instance.firstPrice(contract.termMakers[2], true, {from: admin});
			let burnTx = await contract.instance.playerBurn(contract.termMakers[2], contract.termMakerInfo[2],
				{from: contract.termMakers[2], value: web3.toWei(10, 'ether')});
			console.log('Burn tx:', burnTx)
			await setSettlePrice(contract, contract.prices, contract.lrs, 0);
			let settleTx = await contract.instance.settle(contract.termMakers[2], {from: admin});
			let kInfo = await contract.instance.getSubcontractData(contract.termMakers[2], contract.termTakeInfo[2]);
			assert.equal(kInfo[1].toNumber(), 0);
		}
	});

	it ("should terminate the contract when the taker burns", async function () {
		for (const [name, contract] of Object.entries(contracts)) {
			console.log(`Working on contract ${name}...`);
			let firstPriceTx = await contract.instance.firstPrice(contract.termMakers[3], true, {from: admin});
			let burnTx = await contract.instance.playerBurn(contract.termMakers[3], contract.termMakerInfo[3], 
				{from: contract.termTakers[3], value: web3.toWei(10, 'ether')});
			await setSettlePrice(contract, contract.prices, contract.lrs, 0);
			let settleTx = await contract.instance.settle(contract.termMakers[3], {from: admin});
			let kInfo = await contract.instance.getSubcontractData(contract.termMakers[3], contract.termTakeInfo[3]);
			assert.equal(kInfo[1].toNumber(), 0);
		}
	});

	it ("should terminate the contract when the taker does not meet RM", async function () {
		for (const [name, contract] of Object.entries(contracts)) {
			console.log(`Working on contract ${name}...`);
			console.log('take info: ', contract.termTakeInfo);
			let withdrawTx = await contract.instance.takerWithdrawal(web3.toWei(50, 'ether'), contract.termMakers[4],
				contract.termTakeInfo[4], {from: contract.termTakers[4]});
			console.log('takerWithdrawal: ', withdrawTx)
			let firstPriceTx = await contract.instance.firstPrice(contract.termMakers[4], true, {from: admin});
			await setSettlePrice(contract, contract.prices, contract.lrs, 0);
			let settleTx = await contract.instance.settle(contract.termMakers[4], {from: admin});
		}
		await advanceTime(60 * 60 * 24 * 5);

		for (const [name, contract] of Object.entries(contracts)) {
			await setSettlePrice(contract, contract.prices, contract.lrs, 0);
			let settleTx = await contract.instance.settle(contract.termMakers[4], {from: admin});
			let kInfo = await contract.instance.getSubcontractData(contract.termMakers[4], contract.termTakeInfo[4]);
			assert.equal(kInfo[1].toNumber(), 0);
		}
	});

	it ("should terminate all contracts in an LP book when the LP does not meet RM", async function() {
		for (const [name, contract] of Object.entries(contracts)) {
			console.log(`Working on contract ${name}...`);
			let withdrawTx = await contract.instance.lpMarginWithdrawal(web3.toWei(100, 'ether'), {from: contract.termMakers[5]});
			console.log('LP withdraw: ', withdrawTx);
			let firstPriceTx = await contract.instance.firstPrice(contract.termMakers[5], true, {from: admin});
			await setSettlePrice(contract, contract.prices, contract.lrs, 0);
			let settleTx = await contract.instance.settle(contract.termMakers[5], {from: admin});
		}
		await advanceTime(60 * 60 * 24 * 5);

		for (const [name, contract] of Object.entries(contracts)) {
			await setSettlePrice(contract, contract.prices, contract.lrs, 0);
			let settleTx = await contract.instance.settle(contract.termMakers[5], {from: admin});
			let kInfo = await contract.instance.getSubcontractData(contract.termMakers[5], contract.termTakeInfo[5]);
			assert.equal(kInfo[1].toNumber(), 0);
		}
	});

	it ("should refund balance when contract terminated", async function() {
		for (const [name, contract] of Object.entries(contracts)) {
			console.log(`Working on contract ${name}...`);
			let LPbalance = await contract.instance.balances(contract.termMakers[0]);
			let Takerbalance = await contract.instance.balances(contract.termTakers[0]);
			assert.equal(LPbalance.toNumber(), (15 + 100) * 1e18);
			assert.equal(Takerbalance.toNumber(), 15 * contract.openFee * 1e16 + 65 * 1e18);
		}
	});

	// PNL evaluation
	contracts['ETH'].pnlPrices = [100, 110];
	contracts['SPX'].pnlPrices = [2500, 3500];
	contracts['BTC'].pnlPrices = [3000, 3100];
	contracts['ETHBTC'].pnlPrices = contracts['ETH'].pnlPrices.map(function (num, idx) {
			return parseFloat((num/contracts['BTC'].pnlPrices[idx]).toFixed(6));
	});

	contracts['ETH'].pnlLrs = [2, 2];
	contracts['SPX'].pnlLrs = [13.25, 13.10];
	contracts['BTC'].pnlLrs = [2.5, 2.5];
	contracts['ETHBTC'].pnlLrs = [2.5, 2.5];

	it ("should assign PNL properly when LP is long, & long profited for each contract", async function () {
		await advanceTime(60 * 60 * 24 * 5);

		let takeAmount = 50;

		// Initialize contracts
		for (const [name, contract] of Object.entries(contracts)) {
			console.log(`Working on contract ${name}...`);
			let maker = accounts[used_accounts];
			used_accounts++;
			let taker = accounts[used_accounts];
			used_accounts++;
			let makeTx = await contract.instance.increaseOpenMargin({from: maker, value: web3.toWei(100, 'ether')});
			console.log('after make')
			let takeTx = await contract.instance.take(maker, takeAmount, false, {from: taker, value: web3.toWei(takeAmount, 'ether')});
			console.log('after take')
			let id = takeTx.logs[0].args.id;
			let makerFundTx = await contract.instance.lpFund(maker, {from: maker, value: web3.toWei(50, 'ether')});
			let takerFundTx = await contract.instance.takerFund(maker, id, {from: taker, value: web3.toWei(50, 'ether')});
			let firstPriceTx = await contract.instance.firstPrice(maker, true, {from: admin});
			await setSettlePrice(contract, contract.pnlPrices, contract.pnlLrs, 0);	
			let initialSettleTx = await contract.instance.settle(maker, {from: admin});
		}

		await advanceTime(60 * 60 * 24 * 5);

		// Initial Settle
		for (const [name, contract] of Object.entries(contracts)) {
			let makerRates = await contract.instance.defaultRates();
			let lpLongRate = makerRates[1];
			let lpShortRate = makerRates[0];
			let assetInfo = await oracle.assets(contract.assetID);
			let basis = assetInfo[5];
			console.log('maker here: ', maker)
			let finalSettleTx = await contract.instance.settle(maker, {from: admin});
			let lpPNL = calculatePNL (
				contracts['ETH'].pnlPrices[0],
				contracts['ETH'].pnlPrices[1],
				contract.pnlPrices[0],
				contract.pnlPrices[1],
				lpLongRate,
				takeAmount * 1e18,
				contract.pnlLrs[0],
				basis,
				true, // side
				contract.isCrypto
			);
			assert.equal()
		}
		
	});

	it ("should assign PNL properly when LP is short, & long profited");

	it ("should assign PNL properly when LP is long, & short profited");

	it ("should assign PNL properly when LP is short, & short profited");

	// compare basis, LP profit

	it ("should assign PNL properly when LP would make pnl from +asset return, +basis, and +margin rate");

	it ("should assign PNL properly when LP would make pnl from +asset return, +basis, and -margin rate");

	it ("should assign PNL properly when LP would make pnl from +asset return, -basis, and +margin rate");

	it ("should assign PNL properly when LP would make pnl from +asset return, -basis, and -margin rate");

	it ("should assign PNL properly when LP would make pnl from -asset return, +basis, and +margin rate");

	it ("should assign PNL properly when LP would make pnl from -asset return, +basis, and -margin rate");

	it ("should assign PNL properly when LP would make pnl from -asset return, -basis, and +margin rate");

	it ("should assign PNL properly when LP would make pnl from -asset return, -basis, and -margin rate");

	// compare basis, taker profit

	it ("should assign PNL properly when taker would make pnl from +asset return, +basis, and +margin rate");

	it ("should assign PNL properly when taker would make pnl from +asset return, +basis, and -margin rate");

	it ("should assign PNL properly when taker would make pnl from +asset return, -basis, and +margin rate");

	it ("should assign PNL properly when taker would make pnl from +asset return, -basis, and -margin rate");

	it ("should assign PNL properly when taker would make pnl from -asset return, +basis, and +margin rate");

	it ("should assign PNL properly when taker would make pnl from -asset return, +basis, and -margin rate");

	it ("should assign PNL properly when taker would make pnl from -asset return, -basis, and +margin rate");

	it ("should assign PNL properly when taker would make pnl from -asset return, -basis, and -margin rate");

	it ("should assign PNL properly for 5 stub contracts started each weekday with one LP");

	it ("should assign PNL properly for 5 legacy contracts for one LP");

	it ("should assign PNL properly for 5 stub and 5 legacy contracts with one LP");

	// Check zero conditions

	it ("should assign PNL properly when the asset return is 0");

	it ("should assign PNL properly when the basis is 0");

	it ("should assign PNL properly when the margin rate is 0");

	// conditions where one term dominates

	it ("should assign PNL properly when asset return > -1*(basis + margin rate), and they have opposite sides");

	it ("should assign PNL properly when asset return < -1*(basis + margin rate), and they have opposite sides");

	// All sizes of pnl
	it ("should assign pnl properly when taker would recieve entire RM (pnl > RM)");

	it ("should assign pnl properly when LP would recieve entire RM (pnl > RM)");

	it ("should assign pnl properly when PNL is exactly 0");

	// Restricted contract functions

	it ("should only allow the admin to first price", async function () {
		for (const name of Object.keys(contracts)) {
			let settleTestMaker = accounts[used_accounts];
			console.log('settle test maker: ', settleTestMaker)
			console.log('used accounts: ', used_accounts)
			used_accounts++;
			let makeAmount = web3.toWei(50, 'ether');
			let openTx = await contracts[name].instance.increaseOpenMargin({from: settleTestMaker, value: makeAmount})
			let settleTestTaker = accounts[used_accounts];
			used_accounts++;
			let takeAmount = 15;
			let takeTx = await contracts[name].instance.take(settleTestMaker, takeAmount, true,
			 {from: settleTestTaker, value: web3.toWei(takeAmount, 'ether')});
			let id = takeTx.logs[0].args.id;
			contracts[name].settleTestTaker = settleTestTaker;
			contracts[name].settleTestMaker = settleTestMaker;
			contracts[name].settleTestID = id;
			//let priceTx = await oracle.firstPrice
		}

		for (const [name, contract] of Object.entries(contracts)) {
			console.log(`Working on contract ${name}...`);
			await truffleAssert.reverts(
				contract.instance.firstPrice(contract.settleTestMaker, false, {from: contract.settleTestMaker})
			);
			console.log('non-admin reverted')
			let priceTx = await contract.instance.firstPrice(contract.settleTestMaker, false, {from: admin});
		}
	});

	it ("should only allow the admin to settle", async function () {

		await advanceTime(60 * 60 * 24 * 5);
		
		for (const [name, contract] of Object.entries(contracts)) {
			console.log(`Working on contract ${name}...`);
			await truffleAssert.reverts(
				contract.instance.settle(contract.settleTestMaker, {from: contract.settleTestMaker})
			);
			console.log('non-admin reverted')
			let book = await contract.instance.books(contract.settleTestMaker);
			console.log(book);
			let settleTx = await contract.instance.settle(contract.settleTestMaker, {from: admin});
		}
	});

	it ("should only allow the admin to pause", async function () {
		for (const [name, contract] of Object.entries(contracts)) {
			console.log(`Working on contract ${name}...`);
			await truffleAssert.reverts(
				contract.instance.pause(true, {from: contract.settleTestMaker})
			);
			console.log('non-admin reverted')
			let pauseTx = await contract.instance.pause(true, {from: admin});
			let unpauseTx = await contract.instance.pause(false, {from: admin});
		}
	});

	it ("should only allow the admin to lock the takers from withdrawing", async function () {
		for (const [name, contract] of Object.entries(contracts)) {
			console.log(`Working on contract ${name}...`);
			await truffleAssert.reverts(
				contract.instance.takerWithdrawalLock(true, {from: contract.settleTestMaker})
			);
			console.log('non-admin reverted')
			let pauseTx = await contract.instance.takerWithdrawalLock(true, {from: admin});
			let unpauseTx = await contract.instance.takerWithdrawalLock(false, {from: admin});
		}
	});

	// taker lock

	it ("should block takers from withdrawing after the lock is set", async function () {
		for (const [name, contract] of Object.entries(contracts)) {
			let lockTx = await contract.instance.takerWithdrawalLock(true, {from: admin});
			let fundTx = await contract.instance.takerFund(contract.settleTestMaker, contract.settleTestID, {value: web3.toWei(5, 'ether')});
			await truffleAssert.reverts(
				contract.instance.takerWithdrawal(web3.toWei(2, 'ether'), contract.settleTestMaker, contract.settleTestID, {from: contract.settleTestTaker})
			);
			let unlockTx = await contract.instance.takerWithdrawalLock(false, {from: admin});
			let withdrawTx = await contract.instance.takerWithdrawal(web3.toWei(2, 'ether'), contract.settleTestMaker, contract.settleTestID, {from: contract.settleTestTaker});
		}
	});

	// pausing

	it ("should prevent taking after pause function enabled, and re-allow after pause disabled", async function () {
		for (const [name, contract] of Object.entries(contracts)) {
			let pauseTx = await contract.instance.pause(true, {from: admin});
			let takeAmount = 15;
			console.log('settle test: ', contract.settleTestMaker)
			console.log('amount: ', takeAmount)
			await truffleAssert.reverts(
				contract.instance.take(contract.settleTestMaker, takeAmount, true,
			 		{from: contract.settleTestTaker, value: web3.toWei(takeAmount, 'ether')})
			);
			let unpauseTx = await contract.instance.pause(false, {from: admin});
			let take2Tx = contract.instance.take(contract.settleTestMaker, takeAmount, true,
		 		{from: contract.settleTestTaker, value: web3.toWei(takeAmount, 'ether')});	
		}
	});

	//Time spans: 

	// Wedensday after price update:
	it ("should let contract 0 be taken Wednesday between price update and settlement", async function () {
		// setup for time spans
		for (const [name, contract] of Object.entries(contracts)) {
			var timeMaker = accounts[used_accounts]
			console.log('time maker: ', timeMaker)
			used_accounts += 1;
			contract.timeMaker = timeMaker;
			var timeTakers = accounts.slice(used_accounts, used_accounts + 6)
			used_accounts += timeTakers.length;
			contract.timeTakers = timeTakers;
			let timeTakeInfo = new Array(timeTakers.length)
			let makeAmount = web3.toWei(500, 'ether');
			console.log('before make')
			let makeTx = await contracts[name].instance.increaseOpenMargin({from: timeMaker, value: makeAmount});
			console.log('after make')
			contracts[name].timeTakeInfo = timeTakeInfo;
		}

		await advanceTime(60 * 60 * 24 * 5);
		let settleEthTx = await oracle.setSettlePrice(0, 150000000, 2000000, {from: admin});
		let settleSPXTx = await oracle.setSettlePrice(1, 2500000000, 13480000, {from: admin});
		let settleBTCTx = await oracle.setSettlePrice(2, 3000000000, 2500000, {from: admin});
		let settleETHBTCTx = await oracle.setSettlePrice(3, 34161, 2500000, {from: admin});

		//wednesday = 0, thursday = 1, friday = 2, monday = 3, tuesday = 4

		for (const [name, contract] of Object.entries(contracts)) {
			console.log(`Working on contract ${name}...`);
			let takeAmount = 15;
			let takeTx = await contract.instance.take(
				contract.timeMaker, takeAmount, true, {from: contract.timeTakers[0], value: web3.toWei(takeAmount, 'ether')});
			let id = takeTx.logs[0].args.id;
			contract.timeTakeInfo[0] = [id, takeAmount];
			console.log('contract taken')
		}
	});

	// Wednesday after settlement

	it ("should not have settled contract 0", async function () {
		await advanceTime(60 * 60 * 4);

		for (const [name, contract] of Object.entries(contracts)) {
			console.log(`Working on contract ${name}...`);
			let bookInfoStart = await contract.instance.getBookData(contract.timeMaker)
			let startingLPMargin = bookInfoStart[1]
			let startKInfo = await contract.instance.getSubcontractData(contract.timeMaker, contract.timeTakeInfo[0][0]);
			let startingTakerMargin = startKInfo[0];
			let settleTx = await contract.instance.settle(contract.timeMaker, {from:admin});
			let bookInfoEnd = await contract.instance.getBookData(contract.timeMaker)
			let endingLPMargin = bookInfoEnd[1]
			let endKInfo = await contract.instance.getSubcontractData(contract.timeMaker, contract.timeTakeInfo[0][0]);
			let endingTakerMargin = endKInfo[0];
			assert.equal(startingLPMargin.toNumber(), endingLPMargin.toNumber());
			assert.equal(startingTakerMargin.toNumber(), endingTakerMargin.toNumber());
		}
	});

	it ("should let contract 1 be taken after 9pm Wednesday", async function () {
		for (const [name, contract] of Object.entries(contracts)) {
			console.log(`Working on contract ${name}...`);
			let takeAmount = 15;
			let takeTx = await contract.instance.take(
				contract.timeMaker, takeAmount, true, {from: contract.timeTakers[1], value: web3.toWei(takeAmount, 'ether')});
			let id = takeTx.logs[0].args.id;
			contract.timeTakeInfo[1] = [id, takeAmount];
			console.log('contract taken')
		}
	});

	// Weekday after first price

	it ("should first price contract 0 and 1 with Thursday prices", async function() {

		await advanceTime(60 * 60 * 20);

		for (const [name, contract] of Object.entries(contracts)) {
			let firstPriceTx = await contract.instance.firstPrice(contract.timeMaker, false, {from: admin});
			console.log(`Working on contract ${name}...`);
			let subcontract0Info = await contract.instance.getSubcontractData(contract.timeMaker, contract.timeTakeInfo[0][0]);
			let startingDay0 = subcontract0Info[3];
			let subcontract1Info = await contract.instance.getSubcontractData(contract.timeMaker, contract.timeTakeInfo[1][0]);
			let startingDay1 = subcontract1Info[3];
			assert.equal(startingDay0.toNumber(), 1);
			assert.equal(startingDay1.toNumber(), 1);
		}
	});

	it ("should let contract 2 be taken after Thursday first price before price update", async function () {

		for (const [name, contract] of Object.entries(contracts)) {
			console.log(`Working on contract ${name}...`);
			let takeAmount = 16;
			let takeTx = await contract.instance.take(
				contract.timeMaker, takeAmount, true, {from: contract.timeTakers[2], value: web3.toWei(takeAmount, 'ether')});
			let id = takeTx.logs[0].args.id;
			contract.timeTakeInfo[2] = [id, takeAmount];
			console.log('contract taken')
		}
	});

	// Weekday after oracle price update
	it ("should let contract 3 be taken Thursday after price update", async function () {
		await advanceTime(60 * 60 * 4);

		for (const [name, contract] of Object.entries(contracts)) {
			console.log(`Working on contract ${name}...`);
			await setIntraweekPrice(contract, contract.prices, contract.lrs, 0);
			let takeAmount = 17;
			let takeTx = await contract.instance.take(
				contract.timeMaker, takeAmount, true, {from: contract.timeTakers[3], value: web3.toWei(takeAmount, 'ether')});
			let id = takeTx.logs[0].args.id;
			contract.timeTakeInfo[3] = [id, takeAmount];
			console.log('contract taken')
		}

	});

	// Weekday after first price again

	it ("should set contracts 2 and 3 first price as Friday", async function () {
		await advanceTime(60 * 60 * 20);
		for (const [name, contract] of Object.entries(contracts)) {
			let firstPriceTx = await contract.instance.firstPrice(contract.timeMaker, false, {from: admin});
			console.log(`Working on contract ${name}...`);
			let subcontract2Info = await contract.instance.getSubcontractData(contract.timeMaker, contract.timeTakeInfo[2][0]);
			let startingDay2 = subcontract2Info[3];
			let subcontract3Info = await contract.instance.getSubcontractData(contract.timeMaker, contract.timeTakeInfo[3][0]);
			let startingDay3 = subcontract3Info[3];
			assert.equal(startingDay2.toNumber(), 2);
			assert.equal(startingDay3.toNumber(), 2);
		}
	});

	// Weekday after OPU again

	it ("should have some days without takers", async function () {
		for (const [name, contract] of Object.entries(contracts)) {
			await setIntraweekPrice(contract, contract.prices, contract.lrs, 1);// friday
		}

		await advanceTime(60 * 60 * 24 * 3);

		for (const [name, contract] of Object.entries(contracts)) {
			await setIntraweekPrice(contract, contract.prices, contract.lrs, 2);// Monday
		}
	})

	// Final weekday after first price

	it ("should let contract 4 be taken Tuesday after first price before Price update", async function () {
		await advanceTime (60 * 60 * 20);
		for (const [name, contract] of Object.entries(contracts)) {
			console.log(`Working on contract ${name}...`);
			let firstPriceTx = await contract.instance.firstPrice(contract.timeMaker, false, {from: admin});
			let takeAmount = 18;
			let takeTx = await contract.instance.take(
				contract.timeMaker, takeAmount, true, {from: contract.timeTakers[4], value: web3.toWei(takeAmount, 'ether')});
			let id = takeTx.logs[0].args.id;
			console.log(id)
			contract.timeTakeInfo[4] = [id, takeAmount];
			console.log('contract taken')
		}
	});

	// Final weekday after oracle price update

	it ("should let contract 5 be taken after Wednesday morning", async function () {
		for (const [name, contract] of Object.entries(contracts)) {
			await setIntraweekPrice(contract, contract.prices, contract.lrs, 3);// tuesday
		}
		await advanceTime (60 * 60 * 10);
		for (const [name, contract] of Object.entries(contracts)) {
			console.log(`Working on contract ${name}...`);
			let takeAmount = 19;
			let takeTx = await contract.instance.take(
				contract.timeMaker, takeAmount, true, {from: contract.timeTakers[5], value: web3.toWei(takeAmount, 'ether')});
			let id = takeTx.logs[0].args.id;
			contract.timeTakeInfo[5] = [id, takeAmount];
			console.log('contract taken')
		}
	});

	// Wednesday after first price
	it ("should have first price settled contracts 4 and 5 with the next Wednesday prices", async function() {
		await advanceTime(60 * 60 * 14);

		for (const [name, contract] of Object.entries(contracts)) {
			console.log(`Working on contract ${name}...`);
			let firstPriceTx = await contract.instance.firstPrice(contract.timeMaker, true, {from: admin});
			let subcontract4Info = await contract.instance.getSubcontractData(contract.timeMaker, contract.timeTakeInfo[4][0]);
			let startingDay4 = subcontract4Info[3];
			let subcontract5Info = await contract.instance.getSubcontractData(contract.timeMaker, contract.timeTakeInfo[5][0]);
			let startingDay5 = subcontract5Info[3];
			assert.equal(startingDay4.toNumber(), 0);
			assert.equal(startingDay5.toNumber(), 0);
		}
	});

	// Wednesday after OPU
	it ("should prevent a taker from cancelling during the settlement period", async function() {
		await advanceTime(60 * 30);
		let settleEthTx = await oracle.setSettlePrice(0, 172 * 1e6, 2 * 1e6, {from: admin});
		let settleSPXTx = await oracle.setSettlePrice(1, 2410 * 1e6, 13.6 * 1e6, {from: admin});
		let settleBTCTx = await oracle.setSettlePrice(2, 3130 * 1e6, 2.5 * 1e6, {from: admin});
		let settleETHBTCTx = await oracle.setSettlePrice(3, 54952, 2.5 * 1e6, {from: admin});

		for (const [name, contract] of Object.entries(contracts)) {
			console.log(`Working on contract ${name}...`);
			await truffleAssert.reverts(
				contract.instance.playerCancel(contract.timeMaker, contract.timeTakeInfo[0][0],
			 		{from: contract.timeTakers[0], value: web3.toWei(1, 'ether')})
			);
		}
	});

	// Final weekday after settle

	it ("should have settled contract 0 - 3 as stubs", async function () {
		await advanceTime(60 * 30 * 7);
		for (const [name, contract] of Object.entries(contracts)) {
			let settleTx = await contract.instance.settle(contract.timeMaker, {from: admin});
		}

		assert.equal(0, 1);
	});

	it ("should have set contracts 4 and 5 as no longer pending or new", async function() {
		assert.equal(0, 2);
	});

	// next week happens

	it ("should have settled contracts 0 - 5", async function() {
		assert.equal(0, 3);
	});

	it ("should allow all players to retrive margins when oracle not active for 20 days");

	it ("should allow a user to collect withdraw balance");
});

function calculatePNL( ethStart,
		ethFinal,
		assetStart,
		assetFinal,
		marginRate,
		requiredMargin,
		leverageRatio,
		basis,
		side,
		isCrypto) {

	var leveragedEth = requiredMargin * leverageRatio / 1e6
	var ethRatio = ethFinal / ethStart
	var assetRatio = assetFinal / assetStart

	var CFDReturn = assetRatio - 1 - basis/1e4

	var lpPNL
	if (!isCrypto) {
		if (side) // maker is long taker gets Short Rate
			lpPNL = leveragedEth * (CFDReturn + marginRate/1e4) / ethRatio
		else
			lpPNL = leveragedEth * ((-1.0 * CFDReturn) + marginRate/1e4) / ethRatio

		if (lpPNL > requiredMargin)
	      lpPNL = requiredMargin
	    if (lpPNL < -1.0 * requiredMargin)
	      lpPNL = -1.0 * requiredMargin
	} else {
		if (side) // maker is long taker gets Short Rate
			lpPNL = leveragedEth * (CFDReturn + marginRate/1e4) / ethRatio
		else
			lpPNL = leveragedEth * ((-1.0 * CFDReturn) + marginRate/1e4) / ethRatio

		if (lpPNL > requiredMargin)
	      lpPNL = requiredMargin
	    if (lpPNL < -1.0 * requiredMargin)
	      lpPNL = -1.0 * requiredMargin
	  	//TODO
	  	lpPNL = 0
	}

	return lpPNL
}
