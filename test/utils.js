

function gasCosts(receipt, trans_str) {
	var gasUsed = receipt.receipt.gasUsed;
	console.log(`Transaction: ${trans_str}`);
    console.log(`GasUsed: ${receipt.receipt.gasUsed}`);
}

// set time forward methods
const send = (method, params = []) =>
	web3.currentProvider.send({jsonrpc: "2.0", method: "evm_increaseTime", params: params, id: 0})
const timeTravel = async seconds => {
	await send('evm_increaseTime', [seconds]);
	await send('evm_mine')
}

module.exports = {
	gasCosts: function(reciept, trans_str) {
		return gasCosts(receipt, trans_str);
	},
	timeTravel: function(seconds) {
		return timeTravel(seconds)
	}
}