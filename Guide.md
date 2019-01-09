# Dapp Overview
The code powering the SmartSwap Dapp is split over multiple solidity contracts, each with a different purpose. Users interact with the **SwapMarket** contract to make, take, and maintain financial contracts with other users. The individual contracts between users are called **Subcontracts** to distinguish them from separate Solidity contracts. All the subcontracts that are financed by a single user are stored together in an instance of the **Book** contract, which is specific to that user. As more users make trades, more Book contracts will be created. The SwapMarket contract is responsible for settling the subcontracts at the end of every week. Prices are provded from from the **OracleContract**. Each asset swap, such as ETH/USD and BTC/USD, has its own SwapMarket contract.
# Terminology
* Liquidy Provider (LP) - A user who finances subcontracts without picking a side and acts as a market liquidity provider
* Taker - A user who approaches a liquidity provider and creates a subcontract by choosing a side and margin amount
* Oracle - The agent who posts price data to the Oracle Contracts
* Admin - The admin is a user with the responsibility of updating the contract values as well as settling each maker at the scheduled time each week.
* Subcontract - the individual swap contract between a LP and a Taker. Known as a Subcontract to distinguish it from solidity contracts.
* Settlement - Every week at the specified time, all subcontracts are evaluated, value changes hands between LP and taker, and the subcontract is renewed if the proper conditions are met.
* Book - All trades that a given liquidity provider is involved in, located in a single smart contract.
* Required Margin (RM)- The value a player must post to the contract in order to continue their trades into the future. This determines the size of the subcontract.
* Default - When a user has not met their margin requirements, they are said to have defaulted, and their trade(s) are cancelled.
* LP Rates - Liquidity providers may provide rates according to which a premium is paid from the taker
* PNL - This is the amount payed by one player to another based on the the results of the contract at settlement.
* Cancel - When a player cancels a trade, a cancel fee is paid to the other side, and the contract is not renewed at the next settlement. Settlement is handled normally and both players recieve their PNL as usual.
* Burn - When a player burns, they must pay a substantial fraction of their RM. This money is not sent to any players or the admin, and is instead 'burned' and sent to burn address where it cannot be retrieved. When the trade is settled, the player who burned gets their required margin back minus any losses from the PNL. These losses are also sent to the Burn account rather than the other player. The other side simply gets back any margin they posted for the trade.

# Contracts
### SwapMarket
This is the main contract that users will interact with and contains the bulk of functionality. Users will use this contract to be a liquidity provider, Take, Burn, or Cancel.

#### Important Variables
Variables in all caps are contract constants.
- `MIN_RM`: the global minimum RM for any subcontract
- `OPEN_FEE`: the fee rate paid by LPs to the administrator when a new subcontract is initialized
- `CANCEL_FEE`: the fee rate paid by users to cancel a subcontract
- `BURN_FEE`: Similar to the cancel fee except for burning
- `MAX_ORDER_LIMIT`: No single LP can exceed this many subcontracts

- `balances[]` stores the amount of ETH owed to each user available for withdrawal.
- `lpRates[]` stores the rates any new subcontract will have for a given LP
- `defaultRates` if no LP rates are specified these are the fallback rates for new subcontracts


#### User related functions

- `increaseOpenMargin()`: When a user wants to act as a liquidy provider, they must use this function. They must also send the value in Ether equal to the amount they are increasing their margin. `increaseOpenMargin()` will update the the stored value to reflect this change. Importantly, this is where the contract instantion of a Book contract for this user occurs if the user does not currently have one. As a result the gas cost will be much more costly the first time a user calls this function.
- `decreaseOpenMargin()`: similarly to `increaseOpenMargin()`, this function adjusts a liquidity providers open margin value. After setting the value to its new amount, the appropriate balance is moved to the `balances` mapping avaible for withdrawal.
- `setRate()`: A liquidity provider uses this function to changes the values of the LP rates that future subcontracts will be created with. There are some limitations, the sum of the long and short rate must be positive, and niether may exceed 1%. The parameters this function takes are in hundredths of a percent, so a pair of rates 50, -25 corresponds to .50%, -.25% or .0050, -.0025 weekly.
- `setMinimum()`: An LP can set their own minimum required margin for each subcontract. New subcontracts must respect both the global and the LP minimum.
- `take()`: A user wishing to become a taker uses the `take()` function by specifying the LP address, side, and required margin for the subcontract they wish to create. The taker must send ETH corresponding to the required margin parameter. The required margin must be in whole numbers of ETH and must meet the minimum margin requirements. As well as initializing the subcontract data, this is where the open fee is collected from the liquidity provider. The details of the subcontract are exposed in an event emitted by the function.
- `playerCancel()`: When either an LP or taker decides not to continue a subcontract into the next week, they call this function. It is fairly straightforward, the user must only provide the address of the LP and the individual subcontract ID to cancel. In addition, the caller must send enough ETH to match the cancel fee.
- `playerBurn()`: Similar to `playerCancel()`, except the user must pay the full burn fee.
- `takerFund()`: This provides the ability for a taker to add ETH to fund a subcontract by sending value with this function call.
- `lpFund()`: Similar to `takerFund()` but for liquidity providers
- `takerWithdrawal()`: This allows a taker to remove ETH value from a subcontract
- `lpMarginWithdrawal()`: This allows an LP to remove excess ETH from their book
- `withdrawalBalance()`: This is the only function that allows users to move ETH value out of SmartSwap into their own accounts. This choice was made to increase the security of the contracts. All other withdrawal functions only change the value in `balances`, this function actually sends the ether to the caller.

Note: In all functions available to players, although the players send Ether to SwapMarket to make these transactions, the value is passed along and stored in the individual Book contracts.
In addition to the functionality for players, this contract provides functionality to the Admin to settle all of the trades at the end of the week. This is done in the Settle function, which settles an entire Book for a given maker at a time. Once again, the SwapMarket contract checks if the owner of the book should be treated as Verified or Unverified when settling.

### Book
The Book serves as a storage contract for all trades assigned to a given user. The Book contract defines how the storage structure of a book should be implemented. Subcontracts are stored in a doubly-linked list sorted by notional, and this contract contains the implementation for this linked list. It declares functions for settlement, calculating required margin, and adding new subcontracts. This contract is behind-the-scenes and not interacted with directly by users.

### OracleContract
The OracleContract is where a privledged administrator enters the value of multiple real-world prices each week. By design, prices can only be changed after at least 4 days have passed since the last time, with the exception of a 15 minute window to correct any mistakes. This enforces that an agent acting as the Oracle cannot cheat players by rapidly manipulating prices. As well as the current prices, last weeks prices are stored here. Current prices are marked private from other contracts. Only priveledged contracts may retrieve these current prices.

#### Important Variables

`assets[]`: contains all the info for each tracked asset
`currentBasis`: Defines a rate for the premium paid by the player with a long position, locked until the settlement day when subcontracts are refreshed
`nextBasis`: Defines the basis rate for next week


