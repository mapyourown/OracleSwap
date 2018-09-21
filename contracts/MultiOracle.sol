pragma solidity ^0.4.0;

contract MultiOracle {
    
    struct Asset {
        bytes32 name;
        bool isFinalDay;
        uint lastPriceUpdateTime;
        uint lastSettlePriceTime;
        uint8 currentDay;
        //uint[8] prices; // day 0 is wednesday
        //uint[8] lastWeekPrices;
        int16 currentBasis;
        int16 nextBasis;
        uint nextMarginRate;
        uint currentMarginRate;
        uint pastMarginRate;
    }
    
    address public admin;
    Asset[] public assets;
    uint[8][] private prices;
    uint[8][] public lastWeekPrices;
    mapping(address => bool) public readers;
    
    modifier onlyAdmin()
    {
        require(msg.sender == admin);
        _;
    }
    
    event PriceUpdated(uint indexed _id, bytes32 indexed _name, uint _price);
    event BasisUpdated(uint indexed _id, bytes32 indexed _name, int16 _basis);
    event AssetAdded(uint indexed _id, bytes32 _name, uint _price, int16 _basis, uint _vol);
    event PriceCorrected(uint indexed _id, bytes32 indexed _name, uint _price);
    
    constructor (uint ethPrice, int16 ethBasis, uint ethVol) public {
        admin = msg.sender;
        // first asset is always ETH
        addAsset("ETH", ethPrice, ethBasis, ethVol);
    }

    function addReader(address newReader)
        public
    {
        require (msg.sender == admin);
        readers[newReader] = true;
    }
    
    function addAsset(bytes32 _name, uint _price, int16 _basis, uint _vol)
        public
        returns (uint id)
    {
        require (msg.sender == admin || msg.sender == address(this));
        Asset memory asset;
        asset.name = _name;
        asset.isFinalDay = false;
        asset.currentDay = 0;
        asset.lastPriceUpdateTime = block.timestamp;
        asset.lastSettlePriceTime = block.timestamp;
        uint[8] memory _prices;

        lastWeekPrices.push(_prices);
		
        _prices[0] = _price;
		//asset.prices = _prices;
        asset.currentBasis = _basis;
        asset.nextBasis = _basis;
        asset.currentMarginRate = _vol;
        assets.push(asset);

        prices.push(_prices);

        emit AssetAdded(assets.length - 1, _name, _price, _basis, _vol);
        return assets.length - 1;
    }
    
    function setIntraweekPrice(uint assetID, uint price, bool lastDay)
        public
        onlyAdmin
    {
        Asset storage asset = assets[assetID];
        asset.currentDay = asset.currentDay + 1;
        //asset.prices[asset.currentDay] = price;
        asset.isFinalDay = lastDay;

        prices[assetID][asset.currentDay] = price;

        emit PriceUpdated(assetID, asset.name, price);
    }
    
    function setSettlePrice(uint assetID, uint price)
        public
        onlyAdmin
    {
        // TODO: add time definitions for no double update
        Asset storage asset = assets[assetID];
        //asset.lastWeekPrices = asset.prices;

        lastWeekPrices[assetID] = prices[assetID];

        asset.currentDay = 0;
        uint[8] memory newPrices;
        newPrices[0] = price;
        //asset.prices = newPrices;

        prices[assetID] = newPrices;

        asset.lastPriceUpdateTime = block.timestamp;
        asset.lastSettlePriceTime = block.timestamp;
        asset.isFinalDay = false;
        asset.currentBasis = asset.nextBasis;

        asset.pastMarginRate = asset.currentMarginRate;
        asset.currentMarginRate = asset.nextMarginRate;


        emit PriceUpdated(assetID, asset.name, price);
    }
    
    function editPrice(uint assetID, uint newPrice)
        public
        onlyAdmin
    {
        Asset storage asset = assets[assetID];
        require(block.timestamp < asset.lastPriceUpdateTime + 15 minutes);
        //asset.prices[asset.currentDay] = newPrice;
        prices[assetID][asset.currentDay] = newPrice;
        emit PriceUpdated(assetID, asset.name, newPrice);
        emit PriceCorrected(assetID, asset.name, newPrice);
    }
    
    function setBasis(uint assetID, int16 newBasis)
        public
        onlyAdmin
    {
        Asset storage asset = assets[assetID];
        require(!asset.isFinalDay);
        asset.nextBasis = newBasis;
        emit BasisUpdated(assetID, asset.name, newBasis);
    }
    
    function setVolatility(uint assetID, uint newVol)
        public
        onlyAdmin
    {
        Asset storage asset = assets[assetID];
        asset.nextMarginRate = newVol;
    }

    function getPrices(uint id)
        public
        view
        returns (uint[8] current, uint[8] previous, uint currentPrice)
    {
        require (msg.sender == admin || readers[msg.sender]);
        current = prices[id];
        previous = lastWeekPrices[id];
        currentPrice=prices[id][assets[id].currentDay];
    }

    function getPastPrices(uint id)
        public
        view
        returns (uint[8] _prices)
    {
        _prices = lastWeekPrices[id];
    }

    function changeAdmin(address newAdmin) public {
        require (msg.sender == admin);
        admin = newAdmin;
    }
}