pragma solidity ^0.4.0;

contract MultiOracle {
    
    struct Asset {
        bytes32 name;
        bool isFinalDay;
        uint lastPriceUpdateTime;
        uint lastSettlePriceTime;
        uint8 currentDay;
        int16 currentBasis; // Basis is in hundredths of a percent, e.g. a value of 12 indicates .0012
        int16 nextBasis; // Basis is in hundredths of a percent, e.g. a value of 12 indicates .0012
        uint leverageRatio; // 6 decimal places, 1234567 = 1.234567
    }
    
    address public admin;
    Asset[] public assets;
    uint[8][] private prices; // includes 6 decimal places, 12000000 = 12.000000
    uint[8][] public lastWeekPrices; // includes 6 decimal places, 120000000 = 12.000000
    mapping(address => bool) public readers;
    
    modifier onlyAdmin()
    {
        require(msg.sender == admin);
        _;
    }
    
    event PriceUpdated(uint indexed _id, bytes32 indexed _name, uint _price, uint _timestamp);
    event LeverageRatioUpdated(uint indexed _id, uint _ratio);
    event BasisUpdated(uint indexed _id, bytes32 indexed _name, int16 _basis);
    event AssetAdded(uint indexed _id, bytes32 _name, uint _price, int16 _basis, uint _vol);
    event PriceCorrected(uint indexed _id, bytes32 indexed _name, uint _price, uint _leverageRatio);
    
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
    
    function addAsset(bytes32 name, uint startPrice, int16 basis, uint ratio)
        public
        returns (uint id)
    {
        require (msg.sender == admin || msg.sender == address(this));
        Asset memory asset;
        asset.name = name;
        asset.isFinalDay = false;
        asset.currentDay = 0;
        asset.lastPriceUpdateTime = block.timestamp;
        asset.lastSettlePriceTime = block.timestamp;
        uint[8] memory _prices;

        lastWeekPrices.push(_prices);
		
        _prices[0] = startPrice;
		//asset.prices = _prices;
        asset.currentBasis = basis;
        asset.nextBasis = basis;
        asset.leverageRatio = ratio;
        assets.push(asset);

        prices.push(_prices);

        emit AssetAdded(assets.length - 1, name, startPrice, basis, ratio);
        emit PriceUpdated(assets.length - 1, name, startPrice, block.timestamp);
        return assets.length - 1;
    }
    
    function setIntraweekPrice(uint assetID, uint price, bool lastDay)
        public
        onlyAdmin
    {
        Asset storage asset = assets[assetID];
        asset.currentDay = asset.currentDay + 1;
        asset.isFinalDay = lastDay;
        prices[assetID][asset.currentDay] = price;

        emit PriceUpdated(assetID, asset.name, price, block.timestamp);
    }
    
    function setSettlePrice(uint assetID, uint price, uint leverageRatio)
        public
        onlyAdmin
    {
        // TODO: add time definitions for final release
        Asset storage asset = assets[assetID];
        lastWeekPrices[assetID] = prices[assetID];

        asset.currentDay = 0;
        uint[8] memory newPrices;
        newPrices[0] = price;

        prices[assetID] = newPrices;

        asset.lastPriceUpdateTime = block.timestamp;
        asset.lastSettlePriceTime = block.timestamp;
        asset.isFinalDay = false;
        asset.currentBasis = asset.nextBasis;

        asset.leverageRatio = leverageRatio;


        emit PriceUpdated(assetID, asset.name, price, block.timestamp);
        emit LeverageRatioUpdated(assetID, leverageRatio);
    }
    
    function editPrice(uint assetID, uint newPrice, uint newRatio)
        public
        onlyAdmin
    {
        Asset storage asset = assets[assetID];
        require(block.timestamp < asset.lastPriceUpdateTime + 15 minutes);
        //asset.prices[asset.currentDay] = newPrice;
        prices[assetID][asset.currentDay] = newPrice;
        asset.leverageRatio = newRatio;
        emit PriceUpdated(assetID, asset.name, newPrice, block.timestamp);
        emit LeverageRatioUpdated(assetID, newRatio);
        emit PriceCorrected(assetID, asset.name, newPrice, newRatio);
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