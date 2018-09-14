/* eslint-disable */

var Oracle = artifacts.require("./Oracle.sol");
var SwapMarket = artifacts.require("./SwapMarket.sol");
var Book = artifacts.require("./Book.sol")

contract('SwapMarket', async (accounts) => {

	var eth_address = '0xf2f9490c019d8f5e21c58fb45ed87a34d3585d6f'
	var vix_address = '0x7cf532fa803a194b641b46340a2e33e9c40facdb'
	var spx_address = '0x6e97844bb668cde82ef38c74d4793743489afc73'
	var btc_address = '0x4d21c0dbc4f0ca5fb42102afc64c1a81b7e8ab54'

	let maker = accounts[1];
	let taker_1 = accounts[2];
	let taker_2 = accounts[3];

	it("should open with 85 RM", async () => {
		let instance = await SwapMarket.deployed();
		await instance.increaseOpenMargin(85*1e18, {from: maker, value: 85*1e18})
		let openMargin = await instance.openMargins.call(maker);
		assert.equal(openMargin.valueOf(), 85*1e18);
	})

	it ("should have proper Oracles", async () => {
		let eth_oracle = await Oracle.at(eth_address);
		let spx_oracle = await Oracle.at(spx_address);
		let vix_oracle = await Oracle.at(vix_address);
		let btc_oracle = await Oracle.at(btc_address);

		var eth_start = 500;
		var spx_start = 2000;
		var vix_start = 110;
		var btc_start = 10000;
		var basis = 10;

		await eth_oracle.weeklySettlePrice(eth_start, {from: accounts[0]})
		await spx_oracle.weeklySettlePriceWithBasis(spx_start, basis, {from: accounts[0]})
		await vix_oracle.weeklySettlePrice(vix_start, {from: accounts[0]})
		await btc_oracle.weeklySettlePrice(btc_start, {from: accounts[0]})

		let new_eth = await eth_oracle.getPrice({from: accounts[0]})
		let new_spx = await spx_oracle.getPrice({from: accounts[0]})
		let new_vix = await vix_oracle.getPrice({from: accounts[0]})
		let new_btc = await btc_oracle.getPrice({from: accounts[0]})

		assert.equal(eth_start, new_eth);
		assert.equal(spx_start, new_spx);
		assert.equal(vix_start, new_vix);
		assert.equal(btc_start, new_btc);
	})

	it ("should let a taker take 20 Long", async () => {
		let takeAmount = 20 * 1e18
		let instance = await SwapMarket.deployed();
		let swap = instance;
		let makerStartingOpenMargin = await swap.openMargins.call(maker);
		let taketx = await swap.take(maker, 20, true, {from: taker_1, value: 20 * 1e18});
		let makerNewOpenMargin = await swap.openMargins.call(maker);
		let openFee = await swap.openFee.call();
		let totalTake = takeAmount * (1 + openFee/100)
		assert.equal(makerStartingOpenMargin.valueOf() - totalTake, makerNewOpenMargin.valueOf());
	})



});
