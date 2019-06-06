const DataTest = artifacts.require("./DataTest.sol")

function gasCosts(receipt, trans_str) {
	var gasUsed = receipt.receipt.gasUsed;
	console.log(`Transaction: ${trans_str}`);
    console.log(`GasUsed: ${receipt.receipt.gasUsed}`);
}

contract('DataTest', async (accounts) => {
	var tester;
	var numContracts;
	var bigID;
	var smallID;
	it ("Should find the contract", async function() {
		tester = await DataTest.deployed();
		numContracts = await tester.numContracts();
		assert.equal(numContracts, 0);
	})

	it ("Should get the gas cost of adding a big sized subcontract", async function () {
		bigID = await tester.addBig.call(0x123, 5e18, 3e18, 2, false);
		let tx = await tester.addBig(0x123, 5e18, 3e18, 2, false);
		gasCosts(tx, "Big sized subcontract creation");

		numContracts = await tester.numContracts();
		assert.equal(numContracts, 1);
	});

	it ("Should get the gas cost of adding a little sized subcontract", async function () {
		smallID = await tester.addLittle.call(0x123, 5e18, 3e18, 2, false);
		let tx = await tester.addLittle(0x123, 5e18, 3e18, 2, false);
		gasCosts(tx, "Little sized subcontract creation");
		numContracts = await tester.numContracts();
		assert.equal(numContracts, 2);
	});

	it ("Should get the gas cost of modifying a big sized subcontract", async function () {
		let tx = await tester.modifyBig(bigID);
		gasCosts(tx, "Big sized subcontract modification");
		numContracts = await tester.numContracts();
		assert.equal(numContracts, 2);
	});

	it ("Should get the gas cost of modifying a little sized subcontract", async function () {
		let tx = await tester.modifyLittle(smallID);
		gasCosts(tx, "Little sized subcontract modification");
		numContracts = await tester.numContracts();
		assert.equal(numContracts, 2);
	});
});