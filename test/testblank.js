
contract('SwapMarket', async (accounts) => {

	var eth_address = '0xf2f9490c019d8f5e21c58fb45ed87a34d3585d6f'
	var vix_address = '0x7cf532fa803a194b641b46340a2e33e9c40facdb'
	var spx_address = '0x6e97844bb668cde82ef38c74d4793743489afc73'
	var btc_address = '0x4d21c0dbc4f0ca5fb42102afc64c1a81b7e8ab54'

	//let maker = accounts[1];
	//let taker_1 = accounts[2];
	//let taker_2 = accounts[3];

	it ("should have proper Oracles");

	it ("Should allow 50 LPs to create an open balance");

	it ("Should allow an LP to reduce open balance");

	it ("should allow 25 takers to take from different LPs");

	it ("should allow 10 takers to take from 1 LP");

	it ("should not allow more takers than the maximum to take from 1 LP");

	it ("should not allow takers to take less than the global take minimum");

	it ("should allow an LP to set a minimum take amount, and deny takers from taking less than that");

	it ("should allow an LP to fund their margin");

	it ("should allow a taker to fund their margin");

	it ("should allow an LP to withdraw some margin");

	it ("should allow a taker to withdraw some margin");

	it ("should allow an to change their margin rates");

	it ("should allow an lp to change their margin rates and have 5 takers with 5 different rates")

	// fees

	it ("should collect the proper open fee");

	it ("should collect the proper cancel fee from the LP");

	it ("should collect the proper cancel fee from the taker");

	it ("should remove the correct fee and burn it if taker burn");

	it ("should remove the correct fee and burn it if LP burn");

	// book math

	it ("should correctly not net required margin for an LP with 5 new contracts");

	it ("should correctly net required margin for the same LP with 5 legacy contracts");

	it ("should correctly net required margin for the same LP with 5 new and 5 legacy contracts");

	it ("should correctly net required margin once the new 5 are added to become 10 legacy contracts");

	it ("should correctly update required margin if 5 of those contracts cancel");

	// pnl assignment

	it ("should discard the pnl when both players burn");

	it ("should discard the pnl when the taker burns, the LP didnt, and the LP would recieve PNL");

	it ("should assign pnl as normal when the taker burns, the LP didnt, and the taker would recieve PNL");

	it ("should discard pnl when the LP burns, the taker didnt, and the taker would recieve PNL");

	it ("should assign pnl as normal when the LP burns, the taker didnt, and the LP would recieve PNL");

	it ("should assign pnl as normal when the taker cancels, and niether burn");

	it ("should assign pnl as normal the LP cancels, and niether burn");

	it ("should assign pnl as when both players cancel, and niether burn");

	// Continuation of contracts

	it ("should terminate the contract when the LP cancels, and niether burn");

	it ("should terminate the contract when the taker cancels, and niether burn");

	it ("should terminate the contract when both players cancel, and niether burn");

	it ("should terminate the contract when the LP burns");

	it ("should terminate the contract when the taker burns");

	it ("should terminate the contract when both players burn");

	it ("should terminate the contract when the taker does not meet RM");

	it ("should terminate all contracts in an LP book when the LP does not meet RM");

	// PNL evaluation

	it ("should assign PNL properly when LP is long, long profited, and crypto settled");

	it ("should assign PNL properly when LP is short, long profited, and crypto settled");

	it ("should assign PNL properly when LP is long, short profited, and crypto settled");

	it ("should assign PNL properly when LP is short, short profited, and crypto settled");

	it ("should assign PNL properly when LP is long, long profited, and not crypto settled");

	it ("should assign PNL properly when LP is short, long profited, and not crypto settled");

	it ("should assign PNL properly when LP is long, short profited, and not crypto settled");

	it ("should assign PNL properly when LP is short, short profited, and not crypto settled");

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

	it ("should only allow the admin to settle");

	it ("should only allow the admin to pause");

	it ("should only allow the admin to first price");

	it ("should only allow the admin to lock the takers from withdrawing");

	// taker lock

	it ("should block takers from withdrawing after the lock is set");

	it ("should remove the lock after settlement");

	// pausing

	it ("should prevent taking after pause function enabled");

	it ("should re-enable taking after pause function turned off");

	// TODO: Function timing

	//Time spans: 

	// Wedensday after price update:
	it ("should let contract 0 be taken Wednesday between price update and settlement");

	// Wednesday after settlement

	it ("should not have settled contract 0");

	it ("should let contract 1 be taken after 9pm Wednesday");

	// Weekday after first price

	it ("should first update contract 1 with Thursday prices");

	it ("should let contract 2 be taken after Thursday first price before price update");

	// Weekday after oracle price update

	it ("should let contract 3 be taken Thursday after price update");

	// Weekday after first price again

	it ("should set contracts 2 and 3 first price as Friday");

	// Weekday after OPU again

	// Final weekday after first price

	it ("should let contract 4 be taken Tuesday after first price before Price update");

	// Final weekday after oracle price update

	it ("should let contract 5 be taken after Wednesday morning");


	// Wednesday after first price
	it ("should have first price settled contracts 4 and 5 with the next Wednesday prices");

	// Wednesday after OPU

	// Final weekday after settle

	it ("should have settled contract 0 - 3 as stubs");

	it ("should have set contracts 4 and 5 as no longer pending or new");

	// next week happens

	it ("should have settled contracts 0 - 5");

	it ("should allow all players to retrive margins when oracle not active for 20 days");

	// other
	it ("should allow the oracle to correct a bad price");

	it ("should prevent the oracle from doing so after 15 minutes have gone by");

	it ("should prevent the oracle from doing price updates too quickly after the previous one");

	it ("should prevent the oracle from settling too soon after last week's settle");

	it ("should allow the oracle to change the next basis rate");

	it ("should not update the basis rate until settlement");
});
