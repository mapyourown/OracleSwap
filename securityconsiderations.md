# Security Considerations

Whevever possible, the contracts have been written to minimize the possibility of a malicious use. With that in mind, here is a non-exhaustive list of how the contract has been designed to avoid the most common attack vectors.

## Integer Overflow

The contracts utilize OpenZeppelins SafeMath library whenever possible when computing arithmetic. This library automatically checks for integer overflow and underflow.

## Re-Entrancy

To avoid re-entrancy attacks the contract has been written with the Checks-Effects-Interactions pattern. Furthermore, the only function that sends Ether outside the contract is the `withdrawBalance()` function which follows this behavior. Any attempt to remove Ether from the contracts must go through this function.

## Gas Limits

For any liquidity provider, the contract must settle all of that providers subcontracts at once. This involves a loop over the entirety of the liquidity provider's book. If the size of the book grows too large, it is possible for the gas cost of the settle computation to exceed the block gas limit. In consideration of this, the size of the liquidity provider's book is capped. The approximate gas cost of settling each subcontract is known, and the limit was chosen to keep settlement of the entire book well under the gas limit. The settlement funcion is the only such loop in the entire smart contract structure.

## Sending and Recieving Ether

As mentioned in the Re-Entrancy section, the only way ether is sent out of the smart contracts are through the `withdrawBalance()` function in the SwapMarket contract. This function uses Solidity's `transfer` function which is considered the safest way to send Ether to an unknown contract. Furthermore the contracts do not have a fallback function, which in the latest versions of Solidity mean any Ether sent without a function call will be rejected.

## Timestamp Dependence

It is known that a miner may manipulate the block timestamp up to about 30 seconds. The SmartSwap contracts do rely on the block timestamp to restrict access to certain functions. However, the scale of all of the time-dependent checks are at a much larger magnitude and can easily tolerate manipulation of this size.

## General Considerations

In addition to addressing the known attacks above the contracts have been written with best practices in mind. Access to the most important functions are restricted to either the Admin or players in the contract. The mult-contract structure ensures that any attempt to sabatoge a liquidity provider's book will be restricted to that liquidity provider alone. If somehow the Admins abilility to administrate the SwapMarket or Oracle is eliminated, all funds will be made available to users again after 20 days of the admin not acting.
