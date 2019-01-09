# Dapp Overview
The code powering the SmartSwap Dapp is split over multiple solidity contracts, each with a different purpose. Users interact with the **SwapMarket** contract to make, take, and maintain financial contracts with other users. The individual contracts between users are called **Subcontracts** to distinguish them from separate Solidity contracts. All the trades that a user has made are stored in an instance of the **MakerBook** contract, which is specific to that user. As more users make trades, more MakerBooks will be created. The SwapMarket contract is responsible for settling the subcontracts at the end of every week. Prices come from the **OracleContract**s. In addition, some users are granted special priveledges and are known as VerifiedMakers. Determining whether a maker is verified or not is handled by a separate contract, **VerifiedMakers**.
# Terminology
* Maker - A user who posts a new trade contract to the marketplace
* Taker - A user who accepts an open trade and takes the other side as the Maker.
* Player - Any user who has a trade, maker or taker
* Oracle - The agent who posts price data to the Oracle Contracts
* Admin - The admin is a user with the responsibility of updating the fee values as well as collection of the fees for maintaining the Market contract. Additionally, the admin has the responsibility of Settling each maker at the scheduled time each week.
* Subcontract - the individual trade contract between a Maker and a Taker. Known as a Subcontract to distinguish it from solidity contracts.
* Book - A storage structure that contains all of the information about all of the Subcontracts for a user
* Financing Fee - The premium paid to take a specific side. It is different for longs and shorts
* Required Margin (RM)- The value a player must post to the contract in order to continue their trades into the future.
* Default - When a player has not met their margin requirements, they are said to have defaulted, and their trade(s) are cancelled.
* Unverified Maker - Makers are treated by default as unverified. An unverified maker is considered to have the same privileges as a Taker and will therefore pay the same fees and have the same margin requirements.
* Verified Maker (VM) - A verified maker has been granted special privileges. A VM may set their own financing fees, and these fees are paid to the maker rather than the admin. Additionally, the VM has special allowances for their margin requirements.
* PNL - This is the amount payed by one player to another based on the conditions of the trade and how the prices moved.
* Cancel - When a player cancels a trade, a cancel fee is paid to the other side, and the contract is not renewed at the next settlement. Settlement is handled normally and both players get their usual PNL
* Burn - When a player burns, they must pay a substantial fraction of their RM. This money is not sent to any players or the admin, and is instead 'burned' and sent to burn address where it cannot be retrieved. When the trade is settled, the player who burned gets their required margin back minus any losses from the PNL. These losses are also sent to the Burn account rather than the other player. The other side simply gets back any margin they posted for the trade.

# Contracts
##### SwapMarket
This is the main contract that users will interact with and contains the bulk of functionality. Players will mainly use this contract to Make, Take, Burn, or Cancel.
- Making: If it is the first time the maker has made a trade, a new Book instance is created for them. Otherwise, their new subcontracts are added to their Book instance. When a user makes a subcontract their status as a verified or unverified maker is checked from the VerifiedMakers contract.  In this way SwapMarket decides how the Book should consider the maker's margin requirements for the subcontract. The details of the new subcontract are sent to the Book instance which may accept or reject based on the provided funds. When a new trade is made, the specific trade details are broadcasted as solidity events so that other users may see them here.
- Taking: When a player wants to take the other side of an open subcontract, they do so here. The user provides the address of the Maker and the specific id of the trade (retrieved from the logs when it was made) as well as the funds to satisfy the margin requirements. These are passed along to the proper Book to store the Taker's details.
- Canceling and Burning: players cancel or burn on the SwapMarket contract by providing the details and fees associated with the trade that they would like to terminate.

Note: In all functions available to players, although the players send Ether to SwapMarket to make these transactions, the value is passed along and stored in the individual Book contracts.
In addition to the functionality for players, this contract provides functionality to the Admin to settle all of the trades at the end of the week. This is done in the Settle function, which settles an entire Book for a given maker at a time. Once again, the SwapMarket contract checks if the owner of the book should be treated as Verified or Unverified when settling.

##### MakerBook
The MakerBook serves as a storage contract for all trades assigned to a given user. The way that MakerBooks are defined is split accross four contracts. The first one, Book, is the most important. It is and abstract contract defines how the storage structure of a Book should be implemented. Subcontracts are stored in a doubly-linked list sorted by notional, and this contract contains the implementation for this linked list. It declares functions for settlement, calculating required margin, and adding new subcontracts, but it lacks implementation for these. Two more solidity contracts, VerifiedBook and UnverifedBook, derive from the base Book contract and implement these functions according to the rules for verified or unverified makers. The final contract, MakerBook, inherits from both VerfiedBook and Unverifedbook. The reasoning for this structure is so that by the principles of polymorphism the SwapMarket contract can use any given MakerBook and consider it as either a VerifiedBook or UnverfiedBook at any time.
##### OracleContract
The OracleContract is where a privledged administrator enters the value of a real-world price each week. By design, prices can only be changed after at least 5 days have passed since the last time, with the exception of a 15 minute window to correct any mistakes. This enforces that an agent acting as the Oracle cannot cheat players by rapidly manipulating prices. As well as the current prices, last weeks prices are stored here. Current prices are marked private from other contracts. Only priveledged contracts may retrieve prices here.
##### VerifiedMakers
This contract determines whether a user is verified or unverified. The determination is done off-chain, so this contract exists for the purpose of making that data available to SwapMarket.

