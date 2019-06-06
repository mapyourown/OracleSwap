pragma solidity ^0.4.0;

contract Oracle {
    
    struct Asset {
        bytes32 name;
        uint lastPriceUpdateTime;
        uint lastSettlePriceTime;
        uint8 currentDay;
        bool isFinalDay;
    }
    
    address public admin;
    Asset[] public assets;
    uint[8][] private prices; // includes 6 decimal places, 12000000 = 12.000000
    uint[8][] public lastWeekPrices; // includes 6 decimal places, 120000000 = 12.000000
    mapping(address => bool) public readers;

    uint constant DAILY_PRICE_TIME_MIN = 18 hours;
    uint constant WEEKLY_PRICE_TIME_MIN = 4 days;
    uint constant EDIT_PRICE_TIME_MAX = 30 minutes;
    
    modifier onlyAdmin()
    {
        require(msg.sender == admin);
        _;
    }
    
    event AssetAdded(
        uint indexed id,
        bytes32 name,
        uint price
    );

    event PriceUpdated(
        uint indexed id,
        bytes32 name,
        uint price,
        uint timestamp
    );

    event SettlePrice(
        uint indexed id,
        bytes32 name,
        uint price,
        uint timestamp
    );

    event PriceCorrected(
        uint indexed id,
        bytes32 indexed name, 
        uint price,
        uint timestamp
    );
    
    /** Contract Constructor
    * @param ethPrice the starting price of ETH in USD, represented as 150000000 = 150.00 USD
    * @dev The message sender is assigned as the contract administrator
    */
    constructor (uint ethPrice) public {
        admin = msg.sender;
        addAsset("ETHUSD", ethPrice);
    }

    /** Add a new asset tracked by the Oracle
    * @param name the plaintext name of the asset
    * @param startPrice the starting price of the asset in USD * 10^6, eg 120000 = $0.120000
    * @dev this should usually be called on a Settlement Day
    * @return id the newly assigned ID of the asset
    */
    function addAsset(bytes32 name, uint startPrice)
        public
        returns (uint id)
    {
        require (msg.sender == admin || msg.sender == address(this));

        // Fill the asset struct
        Asset memory asset;
        asset.name = name;
        asset.currentDay = 0;
        asset.lastPriceUpdateTime = block.timestamp;
        asset.lastSettlePriceTime = block.timestamp;
        assets.push(asset);

        // set up price array and LR
        uint[8] memory _prices;
        lastWeekPrices.push(_prices);

        _prices[0] = startPrice;
        prices.push(_prices);

        emit AssetAdded(assets.length - 1, name, startPrice);
        emit PriceUpdated(assets.length - 1, name, startPrice, block.timestamp);
        return assets.length - 1;
    }
    
    /** Publishes an asset price. Does not initiate a settlement.
    * @param assetID the ID of the asset to update
    * @param price the current price of the asset * 10^6
    * @param finalDayStatus true if this is the last intraweek price update (the next will be a settle)
    * @dev this can only be called after the required time has elapsed since the most recent price update
    * @dev if finalDayStatus is true this function cannot be called again until after settle
    */ 
    function setIntraweekPrice(uint assetID, uint price, bool finalDayStatus)
        public
        onlyAdmin
    {
        Asset storage asset = assets[assetID];        
        // Prevent price update too early
        require(block.timestamp > asset.lastPriceUpdateTime + DAILY_PRICE_TIME_MIN,
            "Sufficient time must pass between daily price updates.");
        require(!asset.isFinalDay, "The next price update must be a settlement price update.");
        
        asset.currentDay = asset.currentDay + 1;
        asset.lastPriceUpdateTime = block.timestamp;
        prices[assetID][asset.currentDay] = price;
        asset.isFinalDay = finalDayStatus;

        emit PriceUpdated(assetID, asset.name, price, block.timestamp);
    }
    
    /** Publishes a new asset price while updating data for a new week of prices
    * @param assetID the id of the asset to update
    * @param price the current price of the asset * 10^6
    * @dev Moves the current prices into LastWeekPrices, overwriting them
    */
    function setSettlePrice(uint assetID, uint price)
        public
        onlyAdmin
    {
        Asset storage asset = assets[assetID];
        // Timing restrictions to prevent oracle cheating
        require(block.timestamp > asset.lastPriceUpdateTime + DAILY_PRICE_TIME_MIN,
            "Sufficient time must pass between daily price updates.");
        require(block.timestamp > asset.lastSettlePriceTime + WEEKLY_PRICE_TIME_MIN,
            "Sufficient time must pass between weekly price updates.");
        require(asset.isFinalDay, "Settlement day must have been declared the previous day");

        // push current prices into previous week
        lastWeekPrices[assetID] = prices[assetID];

        // Set up new price array
        asset.currentDay = 0;
        uint[8] memory newPrices;
        newPrices[0] = price;

        prices[assetID] = newPrices;

        asset.lastPriceUpdateTime = block.timestamp;
        asset.lastSettlePriceTime = block.timestamp;
        asset.isFinalDay = false;

        emit PriceUpdated(assetID, asset.name, price, block.timestamp);
        emit SettlePrice(assetID, asset.name, price, block.timestamp);
    }
    
    /** Quickly fix an erroneous price
    * @param assetID the id of the asset to change
    * @param newPrice the new price to change to
    * @dev this must be called within 30 minutes of the lates price update occurence
    */
    function editPrice(uint assetID, uint newPrice)
        public
        onlyAdmin
    {
        Asset storage asset = assets[assetID];
        require(block.timestamp < asset.lastPriceUpdateTime + EDIT_PRICE_TIME_MAX,
            "Cannot edit the price after the time minimum has elapsed");
        prices[assetID][asset.currentDay] = newPrice;
        emit PriceUpdated(assetID, asset.name, newPrice, block.timestamp);
        emit PriceCorrected(assetID, asset.name, newPrice, block.timestamp);
    }

    /** Change the address of the administrator
    * @param newAdmin the new administrator address
    */
    function changeAdmin(address newAdmin) 
        public 
        onlyAdmin
    {
        admin = newAdmin;
    }

    /** Grant an address permision to access private information about the assets
    * @param newReader the address of the account to grant reading priviledges
    * @dev this allows the reader to use the getCurrentPricesFunction
    */
    function addReader(address newReader)
        public
        onlyAdmin
    {
        readers[newReader] = true;
    }

    /** Return the entire current price array for a given asset
    * @param id the asset id of the desired asset
    * @return currentPrices the price array for the asset
    * @dev only the admin and addresses granted readership may call this function
    */
    function getCurrentPrices(uint id)
        public
        view
        returns (uint[8] currentPrices)
    {
        require (msg.sender == admin || readers[msg.sender],
            "Function caller is not approved to call this function.");
        currentPrices = prices[id];
    }

    /** Return only the latest prices
    * @param id the asset id of the desired asset
    * @return price the latest price of the given asset
    * @dev only the admin or a designated reader may call this function
    */
    function getCurrentPrice(uint id)
        public
        view
        returns (uint price)
    {
        require (msg.sender == admin || readers[msg.sender],
            "Function caller is not approved to call this function.");    
        price =  prices[id][assets[id].currentDay];
    }
}