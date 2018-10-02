import React, { Component } from 'react'
/*import { 
  ContractData,
  ContractForm,
  AccountData
   } from 'drizzle-react-components'*/

class OracleHome extends Component {
  constructor(props, context) {
    super(props);
    console.log('props', props);
    console.log('context', context);
    console.log(this.props.accounts[0])

    this.contracts = context.drizzle.contracts
    this.drizzle = context.drizzle

    this.assetID = 1
    this.assetKey = this.contracts.MultiOracle.methods.assets.cacheCall(this.assetID)
    this.ethKey = this.contracts.MultiOracle.methods.assets.cacheCall(0)

    this.getOracleLogs = this.getOracleLogs.bind(this)
    this.priceHistory = {}
    this.getOracleLogs(this.assetID);
    this.getOracleLogs(0);

  }

  getOracleLogs(id) {
    const web3 = this.drizzle.web3
    const oracle = this.drizzle.contracts.MultiOracle
    const contractweb3 = new web3.eth.Contract(oracle.abi, oracle.address);
    var pricedata = [];
    contractweb3.getPastEvents(
      'PriceUpdated', 
      {
        filter: {_id: id},
        fromBlock: 0,
        toBlock: 'latest'
      }
    ).then(function(events) { 
      console.log(events)
      events.forEach(function(element) {
        if (element.returnValues._id == id)
          pricedata.push( {
            blockNum: element.blockNumber, 
            price: element.returnValues._price, 
            time: element.returnValues._timestamp})
      }, this);
      this.priceHistory[id] = pricedata
    }.bind(this));
  }


  render () {
    var assetData;    
    if (this.assetKey in this.props.contracts.MultiOracle.assets)
    {
      assetData = this.props.contracts.MultiOracle.assets[this.assetKey].value;
      assetData.id = this.assetID;
    }

    var ethData;    
    if (this.ethKey in this.props.contracts.MultiOracle.assets)
    {
      ethData = this.props.contracts.MultiOracle.assets[this.ethKey].value;
      ethData.id = 0;
    }

    var assetHistory = this.priceHistory[this.assetID];
    var ethHistory = this.priceHistory[0];

  	return (
  	  <main className="container">
        <div className="pure-g">
          <div className="pure-u-1-1">
            <h2>Oracle Viewer</h2>
            <DisplayAssetData assetData={assetData}/>
            <DisplayPriceLogHistory priceHistory={assetHistory}/>
            <DisplayAssetData assetData={ethData}/>
            <DisplayPriceLogHistory priceHistory={ethHistory}/>
          </div>
	    	</div>
      </main>
		)
  }
}

function DisplayAssetData(props) {
  var data = props.assetData;
  //console.log(props.assetData)
  if (data) {
    return (
      <div>
        <h3>Name: {hex_to_ascii(data.name)} </h3>
        <p>ID: {data.id.toString()} </p>
        <p>Leverage Ratio: {data.leverageRatio/1000000}</p>
        <p>Current Basis: {data.currentBasis/10000}</p>
        <p>Next Basis: {data.nextBasis}</p>
        <p>Last Day?: {data.isFinalDay ? "Yes" : "No"}</p>
        <p>Current Day ID: {data.currentDay} </p>
      </div>
    );
  } else {
    return (
      <span>waiting...</span>
    );
  }
}

function DisplayPriceLogHistory(props) {
  var prices = props.priceHistory;
  if (!prices)
  {
    return (<span> waiting... </span>);
  }
  if (prices.length > 5)
    prices = prices.slice(prices.length - 5, prices.length)


  const listitems = prices.map( function(item, index) {
    var date = dateFromTimestamp(item.time)
    return(
        <li key={index.toString()}>
          <p>Block Number: {item.blockNum} Price: {item.price/1000000} Time: {date.date} {date.time} local time</p>
        </li>
      );
  });
  return (
    <div>
      <h3> Latest Prices </h3>
      <ul>{listitems}</ul>
    </div>
  );
}

function DisplayWeekPrices(priceArray) {
  var middleString;
  middleString = "[ "
  priceArray.forEach(function (price) {
    middleString = middleString + price.toString() + ' '
  });
  middleString = middleString + "]"
  return middleString;
}

function hex_to_ascii(str1)
 {
  var hex  = str1.toString();
  var str = '';
  for (var n = 0; n < hex.length; n += 2) {
    str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
  }
  return str;
 }

function dateFromTimestamp(timestamp) {
  var date = new Date(timestamp * 1000)
  var dayMonthYear = date.getMonth() + "/" + date.getDate() + "/" + date.getFullYear();
  var hours = date.getHours();
  // Minutes part from the timestamp
  var minutes = "0" + date.getMinutes();

  // Will display time in 10:30:23 format
  var formattedTime = hours + ':' + minutes.substr(-2)

  return {
    time: formattedTime,
    date: dayMonthYear
  }
}

export default OracleHome
