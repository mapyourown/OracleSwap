# Security Considerations

This suite of contracts emphasize simplicity to minimize attack surfaces. While unknown unknowns exist, the following known attacks are addressed.

## General Solidity Attacks

### Re-Entrancy Attacks (e.g., DAO attack, $50MM)

The contract has been written with the Checks-Effects-Interactions pattern to avoid reentry attacks. It also uses transfer() and not send() or call() to move ether off the contract. The only function that sends Ether outside the contract is the `withdrawBalance()` function which follows the recommended Withdrawal pattern. Any attempt to remove Ether from the contracts must go through this function. Further information about these common security patterns can be found [here](https://solidity.readthedocs.io/en/latest/common-patterns.html).

### Sending and Receiving Ether

As mentioned in the Re-Entrancy section, the only way ether is sent out of the smart contracts are through the `withdrawBalance()` function in the SwapMarket contract. This follows the general security advice of favoring pulling rather than pushing. This function uses Solidity's `transfer` function which is considered the safest way to send Ether to an unknown contract. Furthermore, none of the OracleSwap contracts have a fallback function. The contracts have been compiled and deployed with a newer version of Solidity so that any Ether sent without a function call will be rejected.

### Integer Overflow

The contracts utilize [OpenZeppelin's](https://github.com/OpenZeppelin/openzeppelin-solidity) SafeMath library when computing arithmetic. This library automatically checks for integer overflow and underflow. This ensures values such as users balances do not 'wrap around' to either the maximum or minimum integer values (e.g., 0-1=2^256 -1). It is especially important for computing differences when settling subcontracts between users.
The SafeMath Library can be found [here](https://github.com/OpenZeppelin/openzeppelin-solidity/blob/master/contracts/math/SafeMath.sol)


### DoS and Gas Limit Attacks

Because there is a finite gas limit that can be spent within a single block, it is important to ensure that no malicious users may manipulate the contract to a state where any transactions will fail by exceeding the gas limit. In the smart contracts associated with OracleSwap, user-exposed functions have constant execution gas cost with few exceptions. The functions that do not have constant execution cost scale with the size of the stored data within the contracts. The only place where a user may affect this is by creating multiple subcontracts within one liquidity provider.

For any liquidity provider the contract settles all its active subcontracts at once. This involves a loop over the entirety of the liquidity provider's book. If the size of the book grows too large, it is possible for the gas cost of the settle computation to exceed the block gas limit.  To mitigate this issue, a liquidity provider's number of active subcontracts is capped. The approximate gas cost of settling each subcontract is known, and the limit was chosen to keep settlement of the entire book well under the gas limit. The settlement function is the only such necessary loop in the entire smart contract structure. OracleSwap can accommodate a nearly endless number of liquidity providers because each provider is treated on an individual basis, and at no time are all providers considered in a single function.

Once a taker is no longer active the oracle will run a script to remove inactive subcontracts from the LP's book to free space, as this allows more takers and thus more oracle revenue. However, if negligent, anyone can log into the LP book contract and delete canceled subcontracts from the LP's book, as there is no risk from this.

Once a taker is no longer active the oracle will run a script to remove inactive subcontracts from the LP's book to free space, as this allows more takers and thus more oracle revenue. If the oracle is negligent, the list could grow too large to be processed due to the size of the LP’s ledger of cancelled subcontracts. Anyone can log into the LP book contract and delete canceled subcontracts from the LP's book using the deleteSubcontract() function, as there is no risk from this. 

More generally, a DoS problem can occur if a contract requires an external call to finish to progress to a new state, and this external call is corrupted or neglected. OracleSwap follows the withdrawal pattern whereby each user can can the withdraw function independently.

In the worst-case scenario where the contract was frozen or neglected by the Oracle, all users can access their entire margins if settlement has not occurred for 9 days.

### Timestamp Dependence

It is known that a miner may manipulate the block timestamp up to about 30 seconds. The OracleSwap contracts do rely on the block timestamp to restrict access to certain functions. The use of the timestamp is not to ensure certain events occur in order, but to reduce how often each function can be executed. These functions include when the Oracle may post prices and how often subcontracts may be settled. However, the scale of all of the time-dependent checks are at a much larger magnitude (usually hours) and can easily tolerate manipulation of ±30 seconds, though even here this would involve an evil Oracle, in which case manipulating blocks to get around these limitations would be pointless. 

### Front Running

Some Ethereum contracts may have issues where block miners may manipulate the order in which transactions are executed within a block. This a typical problem for market contracts where an attacker might see a transaction for an order, and insert their transaction to be executed prior. However, the nature of OracleSwap makes this kind of attack irrelevant. Since forward starting prices are used to open and close a position, pushing someone out of the way to steal their transaction, or to take an LP's offer when they wanted to retract it, would merely be annoying, not costly. 

### Entropy

No uncertainty or random number generation is used for the OracleSwap suite. This makes the contract inherently resistant to attacks that try to exploit the the generation of uncertainty in the smart contracts.

### Unexpected Ether

This attack uses the fact that some contracts use this.balance to represent the amount of ether that shoud be in the contract. As selfdestruct () forces a contract to accept ETH, one can cause this condition not to hold, which can freeze funds OracleSwap does not reference this.balance. 

### DelegateCall

In the second Parity Multisig Wallet attack ($150M) uninitialized libraries were accessed via a DelegateCall function, allowing the hacker to become the owner of a contract library. The hacker then called the kill() function, which froze the contract and all the ETH contained in it. OracleSwap does not use DelegateCall(), and the only external library it uses is OpenZepplin’s well-audited SafeMath. 

### Fallback functions

As mentioned, OracleSwap does not have any fallback functions.
 
### External contract referencing to non-static contracts. 

Solidity does not reference external non-static contracts. 

### Uninitialized Storage pointers

This can cause storage locations for state variables to become transposed, which effectively changes the value of various parameters. The Solidity compiler shows a warning for uninitialized storage variables, and OracleSwap does not contain any. 

### Short address attack

Some contracts concatenate inputs to save gas, so a short address or parameter then alters a subsequent parameter, such as the amount sent. OracleSwap does not concatenate inputs. 

### Unchecked call return values

When call() or send() are used to send ether they return a boolean indicating if the call succeeded or failed, but they do not revert if these functions fail, rather, they simply return false. This can cause the contract to think it sent ether when it did not, which can then allow other contract users to access this unspent ether. OracleSwap uses transfer(), never call() or send(). 

### Constructors with Care

If a constructor does not match name of contract it will behave like a function, leading to unexpected consequences. This error involves a constructor not matching the contract name. This is not possible after v0.4.22, and OracleSwap uses Solidity v0.4.26. OracleSwap also has constructor names that match the contract name. 

### Floating point and precision errors

Solidity does not used fixed-point types, requiring developers to keep track of the precision of the numbers as they are being divided. Functions are designed so that when there is division, the numerator and denominator are in units such that precision is not lost. ETH pnl is to 6 decimal places, given asset prices that are recorded with precision in hundredths (e.g., ethprice=$261.12), and fee and rate parameters that are in basis points (i.e., 1% is 100 basis points). 

### tx.origin

Contracts that authorize users using the tx.origin variable are susceptible to phishing attacks that trick users into performing authenticated actions on the vulnerable contract. OracleSwap does not use tx.origin. 

### Public Visibility

The public visibility of functions, where an outsider can see and access a function can allow hackers to manipulate the contract, such as in the first Parity attack ($31M) where a hacker reset the ownership of these contracts and then drained ether. In OracleSwap players cannot change their account addresses, and anyone accessing a public function can only withdraw ETH from balances tied to their address via a mapping.

### Other General Code Considerations

Access to critical functions is restricted to either the Admin or players in the contract. The multi-contract structure ensures that any attempt to sabotage a liquidity provider's book will be restricted to that liquidity provider alone and will not affect all providers. 

If somehow the Oracle is incapacitated, all funds will be made available to users again after 9 days of the admin not updating prices. 

The oracle can cancel all existing subcontracts (say, if deprecating the contract), but this just terminates the subcontracts at the subsequent settlement, which would have a neutral effect on counterparties, and not apply a cancel fee to either counterparty.

## Contract Logic to Constrain an Evil Oracle/Admin

The only attack surface comes from an evil oracle posting fraudulent prices to inflate the PNL of conspirator positions, presumably the evil oracle's sock-puppet accounts. The game theoretic analysis of OracleSwap's unique oracle/administrator is discussed in the OracleSwap White Paper and Technical Document. The bottom line is that at some level everything is vulnerable if the will, or intent, is not aligned with honest or cooperative actions. OracleSwap's Oracle can cheat, just as Infura or Bitcoin's miners can cheat, but they are all constrained by their self-interest. Alignining incentives lowers transaction costs, which makes it easier to create contracts that people want to use. 

Creating a mechanism that makes honesty the Oracle/admin's dominant strategy involves creating particular payoffs and options, which implies various constraints. Below are several constraints in the code that assist in creating good incentives.

### Settlement can only occur 4 hours after the most recent Oracle update
This provides counterparties time to react if the Oracle reveals its evil nature. 

### Players cannot cancel between the Oracle Contract update and settlement, only burn or continue
If the Oracle posts obviously fraudulent prices, players can burn their PNL rather than send to an obviously evil Oracle. Burn fees, and burnt PNL, are sent to a burn address (0xDEAD) to minimize conspiracy scenarios. Burning requires an extra cost to discourage griefing, but those who find themselves on the 'wrong side' of the evil Oracle's sock-puppet accounts will find it cheaper to burn rather than continue or default. This minimizes a potential Oracle exit scam payoff.  

If they do not burn, the evil oracle will rationally infer, via common knowledge reasoning, he can cheat them again next period by more than 25% RM in expected value.  Most players will have significant excess margin to avoid having to interrupt their activities to avoid default, as for example at MakerDAO 85% of CDP account value is over-collateralized by more than 100%.  For investors with more than 25% RM in their margin after a fraudulent PNL is assessed to their margin, it will be cheaper to to burn their payoff and prevent the cheating oracle from receiving ETH as opposed to either continuing or defaulting. Minimizing the cheat payout is critical because we want the present value of acting honestly to be greater than a cheat payoff at all times.

### Subcontract PNL is capped at the Required Margin (RM)

Leverage is not merely convenient for users, but it minimizes the potential size of an Oracle exit scam payoff (those counterparties who, for some reason, might not burn their PNL when cheated). No matter how much ETH is in a player’s margin, or how large the notional is relative to the RM settlement can only transfer up to the RM regardless of asset price movement.

### Settlement can only occur 5 days after the most recent settlement

This prevents a cheating Oracle/admin from sneaking a succession of settlements at some strange hour, effectively getting around the cap on PNL transfers. 

### Oracle Contract price updates are prohibited between 0.5 and 18 hours after last update

This allows correction to obvious mistakes, but prevents the Oracle from generating fraudulent prices in the middle of the night when no one is watching. 

### Settlement can only occur 22 hours after the Oracle  Contract is flagged for final day 

On Tuesday the Oracle's price update includes changing a variable such that the next Oracle Contract update is the one preceeeding settlement, i.e., the Wednesday prices will be used as closing prices in that week's PNL calculation. Thus the Tuesday 4 PM to Wednesday 4 PM period will be that settlement's final day. This prevents a cheating Oracle/admin from sneaking a settlement on fraudulent prices in on a day that no one is watching. Given Oracle Contract updates cannot occur for 18 hours and settlement cannot occur for 4 hours after the next Oracle Contract update, players do not have to worry that the Oracle might unexpectedly settle after the next Oracle Contract update, and so can safely ignore it for at least a day. This minimizes the amount of vigilance players need to monitor the Oracle.  

An evil oracle's best strategy is surprise, so if the evil oracle posted fraudulent prices a day before settlement, this merely gives users more time to react, and when faced with an evil oracle, burning is the optimal self-interested strategy for anyone with more than 25% of their RM in excess margin. Burning can occur at any time. 

### Oracle Prices are easily audited.

Oracle Price updates generate event logs, and blockchain queries provided at OracleSwap.co allow one to easily see if a price is fraudulent. Contract logic restricts fraudulent activity to Oracle prices, so if these prices are honest, PNLs will be honest. Note that crypto prices are taken at 4 PM ET from Bitwise-approved exchanges. Unlike reputation systems that are difficult to monitor, a cheat is easy to observe, and as the Oracle has no plausible deniability, complete accountability. A single cheat should be fatal to all contracts the OracleSwap's oracle services, like a trigger strategy in a repeated game. 

