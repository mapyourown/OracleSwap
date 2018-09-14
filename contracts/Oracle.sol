pragma solidity ^0.4.0;

contract Oracle {
    
	uint private currentPrice;
	uint public lastWeeklyTime;
	uint public lastPriceTime;
	uint public lastPrice;

	bool public isFinalDay;
	uint[8] public dailyPrices;
	uint[8] public lastWeekPrices;
	int16 public nextBasis;
	int16 public basis;
	uint8 public currentDay;
	bytes32 public asset;
	address public admin;
	mapping(address => bool) public readers;

	event PriceUpdated(uint _newPrice);
	event PriceCorrection(uint _newPrice);
	event SettlePrice(uint _newPrice);

	constructor(address _admin, bytes32 _asset) public {
		admin = _admin;
		asset = _asset;
		currentPrice = 0;
		currentDay = 0;
	}

	function addReader(address newReader)
		public
	{
		require (msg.sender == admin);
		readers[newReader] = true;
	}

	function setIntraweekPrice(uint newPrice) 
		public 
	{
		require(msg.sender == admin);
		//require(block.timestamp > latestPriceTime + 22 hours); // TODO: remove for real
		lastPrice = currentPrice;
		currentPrice = newPrice;
		currentDay += 1;
		dailyPrices[currentDay] = newPrice;
		emit PriceUpdated(newPrice);
	}

	// 
	function setFinalIntraweekPrice(uint newPrice)
		public
	{
		isFinalDay = true;
		setIntraweekPrice(newPrice);
	}

	function weeklySettlePrice(uint newPrice) 
	    public
    {
		require(msg.sender == admin);
		// require(block.timestamp < lastWeeklyTime + 5 days);
		
		lastPrice = currentPrice;
		currentPrice = newPrice;
		lastWeekPrices = dailyPrices;
		currentDay = 0;
		uint[8] memory blank;
		dailyPrices = blank;
		dailyPrices[0] = newPrice;
		lastWeeklyTime = block.timestamp;
		lastPriceTime = block.timestamp;
		isFinalDay = false;
		basis = nextBasis;
		emit SettlePrice(newPrice);
	}

	// Function overloading does not work in Truffle
	function weeklySettlePriceWithBasis(uint newPrice, int16 newBasis) 
	    public
    {
		weeklySettlePrice(newPrice);
		nextBasis = newBasis;
    }

	// allow for mistakes to be corrected within 15 minutes
	function editPrice(uint newPrice) public {
		require(msg.sender == admin);
		require (block.timestamp < lastPriceTime + 15 minutes);
		currentPrice = newPrice;
		emit PriceCorrection(newPrice);
	}

	function getPrice() 
		public 
		constant 
		returns(uint _price) 
	{
		require (readers[msg.sender]);
		return currentPrice;
	}

	function getPrices() 
		public
		constant
		returns(uint[8] _prices)
	{
		require (readers[msg.sender]);
		_prices = dailyPrices;
	}

	function changeAdmin(address newAdmin) public {
		require (msg.sender == admin);
		admin = newAdmin;
	}
}