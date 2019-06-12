# Security Considerations

This suite of contracts emphasize simplicity to minimize attack surfaces. While unknown unknowns exist, the following known attacks are addressed.

## General

### Integer Overflow

The contracts utilize [OpenZeppelin's](https://github.com/OpenZeppelin/openzeppelin-solidity) SafeMath library when computing arithmetic. This library automatically checks for integer overflow and underflow. This ensures values such as users balances do not 'wrap around' to either the maximum or minimum integer values. It is especially important for computing differences when settling subcontracts between users.
The SafeMath Library can be found [here](https://github.com/OpenZeppelin/openzeppelin-solidity/blob/master/contracts/math/SafeMath.sol)

### Re-Entrancy Attacks

The contract has been written with the Checks-Effects-Interactions pattern to avoid reentry attacks. Also, the only function that sends Ether outside the contract is the `withdrawBalance()` function which follows the recommended Withdrawal pattern. Any attempt to remove Ether from the contracts must go through this function. Further information about these common security patterns can be found [here](https://solidity.readthedocs.io/en/latest/common-patterns.html).

### Gas Limit Attacks

Because there is a finite gas limit that can be spent within a single block, it is important to ensure that no malicious users may manipulate the contract to a state where any transactions will fail by exceeding the gas limit. In the smart contracts associated with OracleSwap, user-exposed functions have constant execution gas cost with few exceptions. The functions that do not have constant execution cost scale with the size of the stored data within the contracts. The only place where a user may affect this is by creating multiple subcontracts within one liquidity provider.
For any liquidity provider the contract settles all its active subcontracts at once. This involves a loop over the entirety of the liquidity provider's book. If the size of the book grows too large, it is possible for the gas cost of the settle computation to exceed the block gas limit.  To mitigate this issue, a liquidity provider's number of active subcontracts is capped. The approximate gas cost of settling each subcontract is known, and the limit was chosen to keep settlement of the entire book well under the gas limit. The settlement function is the only such necessary loop in the entire smart contract structure. OracleSwap can accommodate a nearly endless number of liquidity providers because each provider is treated on an individual basis, and at no time are all providers considered in a single function.

### Sending and Receiving Ether

As mentioned in the Re-Entrancy section, the only way ether is sent out of the smart contracts are through the `withdrawBalance()` function in the SwapMarket contract. This follows the general security advice of favoring pulling rather than pushing. This function uses Solidity's `transfer` function which is considered the safest way to send Ether to an unknown contract. Furthermore, none of the OracleSwap contracts have a fallback function. The contracts have been compiled and deployed with a newer version of Solidity so that any Ether sent without a function call will be rejected.

### Timestamp Dependence

It is known that a miner may manipulate the block timestamp up to about 30 seconds. The OracleSwap contracts do rely on the block timestamp to restrict access to certain functions. The use of the timestamp is not to ensure certain events occur in order, but to reduce how often each function can be executed. These functions include when the Oracle may post prices and how often subcontracts may be settled. However, the scale of all of the time-dependent checks are at a much larger magnitude (usually hours) and can easily tolerate manipulation of ±30 seconds, though even here this would involve an evil Oracle, in which case manipulating blocks to get around these limitations would be pointless. 

### Front Running

Some Ethereum contracts may have issues where block miners may manipulate the order in which transactions are executed within a block. This a typical problem for market contracts where an attacker might see a transaction for an order, and insert their transaction to be executed prior. However, the nature of OracleSwap makes this kind of attack irrelevant. Since forward starting prices are used to open and close a position there is no way for an attacker to profit by getting a transaction in before another taker (i.e., front running involves getting a position based on stale prices, not unknown future market prices). The only functions where the timing can be gamed are operated by the oracle/admin. For instance, each taker must take before approximately 3:45 pm ET, when the oracle will lock the trading day for new positions as starting at the subsequent close (4:00 PM price). The oracle will post those new closing prices around 4:15 PM on the Oracle contract.  There is no way to take a position conditional upon known prices. 

### Denial of Service

The OracleSwap contracts are carefully written to prevent a condition in which the cost of contract execution for any one contract function is too high. In order to accomplish this, the key functions of OracleSwap are structured in a way to allow for natural growth of the smart contracts. As new liquidity providers come to OracleSwap, new contracts are created for them to store their subcontract data. Each admin function considers an LP individually, so the gas costs do not grow with the number of Liquidity Providers. Some OracleSwap functions do increase in gas cost as the number of takers associated with an LP grow. Anticipating this, a taker limit was chosen to prevent the execution cost from rising beyond a certain point. The contract suite has been carefully tested to ensure that the taker limit keeps the execution cost well below the level where it could cause difficulties for the admin. Once a taker is no longer active the oracle will run a script to remove inactive subcontracts from the LP's book to free space, as this allows more takers and thus more oracle revenue. However, if negligent, anyone can log into the LP book contract and delete canceled subcontracts from the LP's book, as there is no risk from this. Further, we have given users some safety by allowing any subcontract to automatically refund the participants if the admin were somehow unable to perform the necessary functions. After 9 days without a settlement, any counterparty can withdraw their entire margin, as presumably the Oracle is dead or unconcious. 

### Entropy

No uncertainty or random number generation is used for the OracleSwap suite. This makes the contract inherently resistant to attacks that try to exploit the the generation of uncertainty in the smart contracts.

### Other General Considerations

In addition to addressing the known attacks above the contracts have been written with best practices in mind. Access to critical functions is restricted to either the Admin or players in the contract. The multi-contract structure ensures that any attempt to sabotage a liquidity provider's book will be restricted to that liquidity provider alone and will not affect all providers. If somehow the Admin's ability to administrate the OracleSwap contract is eliminated, all funds will be made available to users again after 9 days of the admin not updating prices. Additionally, there is a mechanism to prevent new subcontracts from being created in the event of an upgrade or discovery of a catastrophic bug. If this were to occur, the Oracle can cancel all existing subcontracts, which would just terminate the subcontracts at the subsequent settlement, which would have a neutral effect on counterparties.

The only attack surface comes from an evil oracle posting fraudulent prices to inflate the PNL of a certain positions, presumably the evil oracle's sock-puppet accounts. This is addressed through the incentives generated by the present value of cheating vs. not at any point in time, and is addressed in the OracleSwap White Paper and Technical Document. That is, it is possible for the Oracle to post fraudulent prices, but it would be irrational. 



