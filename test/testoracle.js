const Oracle = artifacts.require("./Oracle.sol")
const SwapMarket = artifacts.require("./AssetSwap.sol");
let utils = require('./utils.js')
var truffleAssert = require('truffle-assertions')

function gasCosts(receipt, trans_str) {
	var gasUsed = receipt.receipt.gasUsed;
	console.log(`Transaction: ${trans_str}`);
    console.log(`GasUsed: ${receipt.receipt.gasUsed}`);
}

contract('Oracle', async (accounts) => {

	var admin = accounts[0];
	var oracle;

	var dayCounter = 0;
	var assetID = 1;

	it ("Should find the oracle", async function() {
		oracle = await Oracle.deployed();
		let asset = await oracle.assets(assetID);
		dayCounter = asset[3].toNumber()

	})

	it ("Should allow the oracle to update an intraweek price", async function () {
		await utils.timeTravel(60 * 60 * 24 * 1); // 24 hours into the future
		let prices = await oracle.getCurrentPrices(assetID, {from: admin});
		let initialPrice = prices[dayCounter].toNumber()
		let priceUpdateTx = await oracle.setIntraweekPrice(assetID, 2500000000, false, {from: admin});

		gasCosts(priceUpdateTx, "setIntraweekPrice()")

		dayCounter++;
		let prices2 = await oracle.getCurrentPrices(1, {from: admin});
		let finalPrice = prices2[dayCounter].toNumber()
		assert.equal(finalPrice, 2500000000);
	});

	it ("Should not allow the oracle to settle if the finalDay flag has not been set", async function () {
		await utils.timeTravel(60 * 60 * 24 * 1); // 24 hours into the future
		await truffleAssert.reverts(
			oracle.setSettlePrice(assetID, 2200000000, {from: admin})
		);
	});

	it ("Should let the oracle update a final intraweek price", async function () {
		await utils.timeTravel(60 * 60 * 24 * 4); // 4 days into the future
		let prices = await oracle.getCurrentPrices(assetID, {from: admin});
		let initialPrice = prices[dayCounter].toNumber()
		let priceUpdateTx = await oracle.setIntraweekPrice(assetID, 2600000000, true, {from: admin});
		dayCounter++;
		let prices2 = await oracle.getCurrentPrices(1, {from: admin});
		let finalPrice = prices2[dayCounter].toNumber()
		let asset = await oracle.assets(assetID);
		assert.equal(finalPrice, 2600000000);
		assert.equal(asset[4], true);
	});

	it ("Should not let the oracle add a new intraweek price after the finalDay flag has been set", async function() {
		await utils.timeTravel(60 * 60 * 24 * 1); // 24 hours into the future
		await truffleAssert.reverts(
			oracle.setIntraweekPrice(assetID, 2200000000, true, {from: admin})
		);
	});

	it ("Should allow the oracle to set a settle price", async function() {
		let prices = await oracle.getCurrentPrices(assetID, {from: admin});
		let initialPrice = prices[dayCounter].toNumber()
		let priceUpdateTx = await oracle.setSettlePrice(assetID, 2600000000, {from: admin});

		gasCosts(priceUpdateTx, "setSettlePrice()");

		dayCounter = 0;
		let prices2 = await oracle.getCurrentPrices(1, {from: admin});
		let finalPrice = prices2[dayCounter].toNumber()
		let asset = await oracle.assets(assetID);
		assert.equal(finalPrice, 2600000000);
		assert.equal(asset[4], false);
	});

	it ("should allow the oracle to correct a bad price for intraweek", async function () {
		await utils.timeTravel(60 * 60 * 24 * 1); // 24 hours into the future
		let prices = await oracle.getCurrentPrices(assetID, {from: admin});
		let priceUpdateTx = await oracle.setIntraweekPrice(assetID, 2120e6, false, {from: admin});
		dayCounter++;
		let UpdatePrices = await oracle.getCurrentPrices(assetID, {from: admin});
		let incorrectPrice = UpdatePrices[dayCounter];
		assert.equal(incorrectPrice, 2120e6);
  		await utils.timeTravel(60 * 5); // 5 minutes into the future
		let priceCorrectTx = await oracle.editPrice(assetID, 2210e6, {from: admin});

		gasCosts(priceCorrectTx, "editPrice()");

		let prices2 = await oracle.getCurrentPrices(assetID, {from: admin});
		let finalPrice = prices2[dayCounter].toNumber()
		assert.equal(finalPrice, 2210e6);
	});

	it ("should prevent the oracle from correcting after 30 minutes have gone by for intraweek", async function () {
		await utils.timeTravel(60 * 60 * 24 * 1); // 24 hours into the future
		let prices = await oracle.getCurrentPrices(assetID, {from: admin});
		let priceUpdateTx = await oracle.setIntraweekPrice(assetID, 2120e6, true, {from: admin});
		dayCounter++;
		let UpdatePrices = await oracle.getCurrentPrices(assetID, {from: admin});
		let incorrectPrice = UpdatePrices[dayCounter];
		assert.equal(incorrectPrice, 2120e6);
  		await utils.timeTravel(60 * 45); // 45 minutes into the future
  		await truffleAssert.reverts(
			oracle.editPrice(assetID, 2210e6, {from: admin})
		);
		let prices2 = await oracle.getCurrentPrices(assetID, {from: admin});
		let finalPrice = prices2[dayCounter].toNumber()
		assert.equal(finalPrice, 2120e6);
	});

	it ("should allow the oracle to correct a bad price for settle", async function () {
		await utils.timeTravel(60 * 60 * 24 * 3); // 3 days into the future
		let prices = await oracle.getCurrentPrices(assetID, {from: admin});
		let priceUpdateTx = await oracle.setSettlePrice(assetID, 2120e6, {from: admin});
		dayCounter = 0;
		let UpdatePrices = await oracle.getCurrentPrices(assetID, {from: admin});
		let incorrectPrice = UpdatePrices[dayCounter];
		assert.equal(incorrectPrice, 2120e6);
  		await utils.timeTravel(60 * 5); // 5 minutes into the future
		let priceCorrectTx = await oracle.editPrice(assetID, 2210e6, {from: admin});
		let prices2 = await oracle.getCurrentPrices(assetID, {from: admin});
		let finalPrice = prices2[dayCounter].toNumber()
		assert.equal(finalPrice, 2210e6);

	});

	it ("should prevent the oracle from price correcting after 30 minutes have gone by for settle", async function () {
		await utils.timeTravel(60 * 60 * 24 * 5); // 5 days into the future
		// need at least one intraweek price
		await oracle.setIntraweekPrice(assetID, 2500e6, true, {from: admin});
		dayCounter++;

		await utils.timeTravel(60 * 60 * 24 * 1); // 24 hours into the future
		let prices = await oracle.getCurrentPrices(assetID, {from: admin});
		let priceUpdateTx = await oracle.setSettlePrice(assetID, 2120e6, {from: admin});
		dayCounter = 0;
		let UpdatePrices = await oracle.getCurrentPrices(assetID, {from: admin});
		let incorrectPrice = UpdatePrices[dayCounter];
		assert.equal(incorrectPrice, 2120e6);
  		await utils.timeTravel(60 * 45); // 5 minutes into the future
  		await truffleAssert.reverts(
			oracle.editPrice(assetID, 2210e6, {from: admin})
		);
		let prices2 = await oracle.getCurrentPrices(assetID, {from: admin});
		let finalPrice = prices2[dayCounter].toNumber()
		assert.equal(finalPrice, 2120e6);
	});

	it ("should prevent the oracle from doing price updates too quickly after the previous one", async function () {
		await utils.timeTravel(60 * 60 * 24 * 1); // 24 hours into the future
		let priceUpdateTx = await oracle.setIntraweekPrice(assetID, 2500000000, false, {from: admin});
		dayCounter++;
  		await utils.timeTravel(60 * 20); // 20 minutes into the future
		await truffleAssert.reverts(
			oracle.setIntraweekPrice(assetID, 2600000000, false, {from: admin})
		);
	});

	it ("should prevent the oracle from settling too soon after last week's settle", async function () {
		await utils.timeTravel(60 * 60 * 24 * 5); // 5 days into the future
		// need at least one intraweek price
		await oracle.setIntraweekPrice(assetID, 2500e6, true, {from: admin});
		dayCounter++;

		await utils.timeTravel(60 * 60 * 24 * 1); // 1 day into the future
		let settleTx = await oracle.setSettlePrice(assetID, 2500e6, {from: admin});
		dayCounter = 0;

		await utils.timeTravel(60 * 60 * 24 * 1); // 1 day into the future
		await oracle.setIntraweekPrice(assetID, 2500e6, true, {from: admin});
		dayCounter++;

  		await utils.timeTravel(60 * 60 * 24 * 1); // 1 day into the future
		await truffleAssert.reverts(
			oracle.setSettlePrice(1, 2200000000, {from: admin})
		);
	});

	it ("should let the oracle admin add another admin", async function () {
		let newOracle = accounts[1];
		await truffleAssert.reverts(
			oracle.addAdmin(newOracle, {from: newOracle})
		);
		let addTx = await oracle.addAdmin(newOracle, {from: admin});
		let isAdmin = await oracle.admins(newOracle);
		assert.equal(isAdmin, true);
	});

	it ("should let the new admin remove the first one", async function () {
		let newOracle = accounts[1];
		
		let removeTx = await oracle.removeAdmin(admin, {from: newOracle});
		let isAdmin = await oracle.admins(admin);
		await truffleAssert.reverts(
			oracle.addAdmin(accounts[3], {from: admin})
		);
		assert.equal(isAdmin, false);
	});
});