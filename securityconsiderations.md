# Security Considerations

Whevever possible, the contracts have been written to minimize the possibility of a malicious use. With that in mind, here is a non-exhaustive list of how the contract has been designed to avoid the most common attack vectors.

## General

### Integer Overflow

The contracts utilize [OpenZeppelin's](https://github.com/OpenZeppelin/openzeppelin-solidity) SafeMath library whenever possible when computing arithmetic. This library automatically checks for integer overflow and underflow. This ensures values such as users balances do not 'wrap around' to either the maximum or minimum integer values. It is especially important for computing differences when settling subcontracts between users.
The SafeMath Library can be found [here](https://github.com/OpenZeppelin/openzeppelin-solidity/blob/master/contracts/math/SafeMath.sol)

### Re-Entrancy Attacks

The contract has been written with the Checks-Effects-Interactions pattern to avoid reentry attacks. Also, the only function that sends Ether outside the contract is the `withdrawBalance()` function which follows the recommended Withdrawal pattern. Any attempt to remove Ether from the contracts must go through this function. Further information about these common security patterns can be found [here](https://solidity.readthedocs.io/en/latest/common-patterns.html).

### Gas Limit Attacks

Because there is a finite gas limit that can be spent within a single block, it is important to ensure that no malicious users may manipulate the contract to a state where any transactions will fail by exceeding the gas limit. In the smart contracts associated with Smart Swap, most user-exposed functions have constant execution gas cost, with few exceptions. The functions that do not have constant execution cost scale with the size of the stored data within the contracts. The only place where a user may affect this is by creating multiple subcontracts within one liquidity provider.
For any liquidity provider, the contract must settle all its active  subcontracts at once. This involves a loop over the entirety of the liquidity provider's book. If the size of the book grows too large, it is possible for the gas cost of the settle computation to exceed the block gas limit.  To mitigate this issue, a liquidity provider's number of active subcontracts is capped. The approximate gas cost of settling each subcontract is known, and the limit was chosen to keep settlement of the entire book well under the gas limit. The settlement function is the only such necessary loop in the entire smart contract structure. SmartSwap can accommodate a nearly endless number of liquidity providers because each provider is treated on an individual basis, and at no time are all providers considered in a single function.

### Sending and Receiving Ether

As mentioned in the Re-Entrancy section, the only way ether is sent out of the smart contracts are through the `withdrawBalance()` function in the SwapMarket contract. This follows the general security advice of favoring pulling rather than pushing. This function uses Solidity's `transfer` function which is considered the safest way to send Ether to an unknown contract. Furthermore, none of the SmartSwap contracts have a fallback function. The contracts have been compiled and deployed with a newer version of Solidity so that any Ether sent without a function call will be rejected.

### Timestamp Dependence

It is known that a miner may manipulate the block timestamp up to about 30 seconds. The SmartSwap contracts do rely on the block timestamp to restrict access to certain functions. The use of the timestamp is not to ensure certain events occur in order, but to reduce how often each function can be executed. These functions include when the Oracle may post prices and how often subcontracts may be settled. However, the scale of all of the time-dependent checks are at a much larger magnitude (usually hours) and can easily tolerate manipulation of ±30 seconds. 

### Front Running

Some Ethereum contracts may have issues where block miners may manipulate the order in which transactions are executed within a block. This a typical problem for market contracts where an attacker might see a transaction for an order, and insert their transaction to be executed prior. However, the nature of SmartSwap makes this kind of attack irrelevant. Since forward starting prices are used, there is no way for an attacker to profit as a taker by getting a transaction in before another taker. The only functions where the timing can be gamed are operated by the oracle/admin. For instance, each taker must take before approximately 4 pm ET, when the oracle will lock the trading day in. Then, the oracle will wait until approximately 4:30 pm ET to post new prices. This prevents a malicious miner from spontaneously taking a contract within the same block the new prices would be posted.

### Other General Considerations

In addition to addressing the known attacks above the contracts have been written with best practices in mind. Access to critical functions is restricted to either the Admin or players in the contract. The multi-contract structure ensures that any attempt to sabotage a liquidity provider's book will be restricted to that liquidity provider alone and will not affect all providers. If somehow the Admin's ability to administrate the OracleSwap contract is eliminated, all funds will be made available to users again after 20 days of the admin not updating prices. Additionally, there is a mechanism to prevent new subcontracts from being created in the event of an upgrade or discovery of a catastrophic bug.