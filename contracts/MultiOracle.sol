pragma solidity ^0.4.0;

contract MultiOracle {
    
    struct Asset {
        bytes32 name;
        uint lastPriceUpdateTime;
        uint lastSettlePriceTime;
        uint8 currentDay;
    }
    
    address public admin;
    Asset[] public assets;
    uint[8][] private prices; // includes 6 decimal places, 12000000 = 12.000000
    uint[8][] public lastWeekPrices; // includes 6 decimal places, 120000000 = 12.000000
    uint[8][] public leverageRatios; // 6 decimal places
    uint[8][] public lastLeverageRatios;
    bool[] public isCryptoSettled;
    mapping(address => bool) public readers;
    
    modifier onlyAdmin()
    {
        require(msg.sender == admin);
        _;
    }
    
    event AssetAdded(
        uint indexed id,
        bytes32 name,
        uint price,
        uint leverageRatio,
        bool cryptoSettled
    );

    event PriceUpdated(
        uint indexed id,
        bytes32 name,
        uint price,
        uint leverageRatio,
        uint timestamp
    );

    event SettlePrice(
        uint indexed id,
        bytes32 name,
        uint price,
        uint leverageRatio,
        uint timestamp
    );

    event LeverageRatioUpdated(uint indexed id, uint ratio);
    event PriceCorrected(uint indexed id, bytes32 indexed name, uint price, uint leverageRatio);
    
    constructor (uint ethPrice, uint ethLR) public {
        admin = msg.sender;
        // first asset is always ETH
        addAsset("ETHUSD", ethPrice, ethLR, false); // TODO: maybe tru?
    }

    function addReader(address newReader)
        public
        onlyAdmin
    {
        readers[newReader] = true;
    }
    
    function addAsset(bytes32 name, uint startPrice, uint leverageRatio, bool isCrypto)
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
        isCryptoSettled.push(isCrypto);
        assets.push(asset);

        // set up price and LR arrays
        uint[8] memory _prices;
        uint[8] memory _ratios;
        lastWeekPrices.push(_prices);
        lastLeverageRatios.push(_ratios);

        _prices[0] = startPrice;
        _ratios[0] = leverageRatio;

        prices.push(_prices);
        leverageRatios.push(_ratios);

        emit AssetAdded(assets.length - 1, name, startPrice, leverageRatio, isCrypto);
        emit PriceUpdated(assets.length - 1, name, startPrice, leverageRatio, block.timestamp);
        return assets.length - 1;
    }
    
    function setIntraweekPrice(uint assetID, uint price, uint leverageRatio)
        public
        onlyAdmin
    {
        Asset storage asset = assets[assetID];        
        // Prevent price update too early
        require(block.timestamp > asset.lastPriceUpdateTime + 18 hours);
        
        asset.currentDay = asset.currentDay + 1;
        asset.lastPriceUpdateTime = block.timestamp;
        prices[assetID][asset.currentDay] = price;
        leverageRatios[assetID][asset.currentDay] = leverageRatio;

        emit PriceUpdated(assetID, asset.name, price, leverageRatio, block.timestamp);
    }
    
    function setSettlePrice(uint assetID, uint price, uint leverageRatio)
        public
        onlyAdmin
    {
        Asset storage asset = assets[assetID];
        // Timing restrictions to prevent oracle cheating
        require(block.timestamp > asset.lastPriceUpdateTime + 18 hours);
        require(block.timestamp > asset.lastSettlePriceTime + 4 days);

        // push current prices into previous week
        lastWeekPrices[assetID] = prices[assetID];
        lastLeverageRatios[assetID] = leverageRatios[assetID];

        // Set up new price and LR arrays
        asset.currentDay = 0;
        uint[8] memory newPrices;
        uint[8] memory newRatios;
        newPrices[0] = price;
        newRatios[0] = leverageRatio;

        prices[assetID] = newPrices;
        leverageRatios[assetID] = newRatios;

        asset.lastPriceUpdateTime = block.timestamp;
        asset.lastSettlePriceTime = block.timestamp;

        emit PriceUpdated(assetID, asset.name, price, leverageRatio, block.timestamp);
        emit SettlePrice(assetID, asset.name, price, leverageRatio, block.timestamp);
    }
    
    function editPrice(uint assetID, uint newPrice, uint newRatio)
        public
        onlyAdmin
    {
        Asset storage asset = assets[assetID];
        require(block.timestamp < asset.lastPriceUpdateTime + 15 minutes);
        prices[assetID][asset.currentDay] = newPrice;
        leverageRatios[assetID][asset.currentDay] = newRatio;
        emit PriceUpdated(assetID, asset.name, newPrice, newRatio, block.timestamp);
        emit PriceCorrected(assetID, asset.name, newPrice, newRatio);
    }

    function changeAdmin(address newAdmin) 
        public 
        onlyAdmin
    {
        admin = newAdmin;
    }

    function getCurrentPrices(uint id)
        public
        view
        returns (uint[8] lRatios, uint[8] currentPrices)
    {
        require (msg.sender == admin || readers[msg.sender]);
        lRatios = leverageRatios[id];
        currentPrices = prices[id];
    }

    function getCurrentPrice(uint id)
        public
        view
        returns (uint price)
    {
        require (msg.sender == admin || readers[msg.sender]);    
        price =  prices[id][assets[id].currentDay];
    }

    function getPastPrices(uint id)
        public
        view
        returns (uint[8] pastLRatios, uint[8] pastPrices)
    {
        pastPrices = lastWeekPrices[id];
        pastLRatios = lastLeverageRatios[id];
    }
}