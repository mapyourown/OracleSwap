import React, { Component } from 'react'
import { 
  ContractForm,
  ContractData,
  AccountData
   } from 'drizzle-react-components'
import GetLPs from '../Taker/GetLPs.js'

class MultiOracle extends Component {
  constructor(props, context) {
    super(props);
    console.log('props', props);
    console.log('context', context);
    console.log(this.props.accounts[0])

    this.contracts = context.drizzle.contracts
    this.drizzle = context.drizzle

    this.handleInputChange = this.handleInputChange.bind(this)
    this.findAssets = this.findAssets.bind(this)
    this.addAsset = this.addAsset.bind(this)

    this.return0Key = this.contracts.SwapMarket.methods.dailyReturns.cacheCall(0)
    this.return1Key = this.contracts.SwapMarket.methods.dailyReturns.cacheCall(1)

    this.assetKeys = {}
    this.priceKeys = {}

    this.findAssets()
  }

  findAssets() {
    const web3 = this.drizzle.web3
    const multioracle = this.drizzle.contracts.MultiOracle;
    const contractweb3 = new web3.eth.Contract(multioracle.abi, multioracle.address);
    contractweb3.getPastEvents(
      'AssetAdded', //'allEvents',
      {
         fromBlock: 0,
         toBlock: 'latest'
      }
    ).then(function (events) {
      //console.log(this)
      events.forEach(function(element) {
        var values = element.returnValues
        //console.log(values)
        this.addAsset(values._id, values._name, values._price, values._basis, values._vol)
      }, this);
    }.bind(this));
  }

  addAsset(id, name, price, basis, vol) {
    //console.log(this.contracts.MultiOracle.methods)
    var assetKey = this.contracts.MultiOracle.methods.assets.cacheCall(id)
    var priceKey = this.contracts.MultiOracle.methods.getPrices.cacheCall(id)
    this.assetKeys[id] = assetKey;
    this.priceKeys[id] = priceKey;
  }

  handleInputChange(event) {
    const target = event.target;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const name = target.name;
    this.setState({
      [name]: value
    });
  }


  render () {

    var assets = {}
    Object.keys(this.assetKeys).forEach(function (id) {
      assets[id] = {}
      if (this.assetKeys[id] in this.props.contracts.MultiOracle.assets 
        && this.priceKeys[id] in this.props.contracts.MultiOracle.getPrices)
      {
          assets[id] = this.props.contracts.MultiOracle.assets[this.assetKeys[id]].value
          assets[id].oraclePrices = this.props.contracts.MultiOracle.getPrices[this.priceKeys[id]].value
      }
    }, this);

    var returns = {first: '', second: ''};
    if (this.return0Key in this.props.contracts.SwapMarket.dailyReturns)
      returns.first = this.props.contracts.SwapMarket.dailyReturns[this.return0Key].value

    if (this.return1Key in this.props.contracts.SwapMarket.dailyReturns)
      returns.second = this.props.contracts.SwapMarket.dailyReturns[this.return1Key].value

  	return (
  	  <main className="container">
        <div className="pure-g">
		  		<div className="pure-u-1-1">
		        <h2>Active Account</h2>
		        <AccountData accountIndex="0" units="ether" precision="3" />
	      	</div>
          <div className="pure-u-1-1">
            <h2>Oracle Data</h2>
            <DisplayAssets assets={assets} />
            <h2>Oracle Functions</h2>
            <p>Add Asset</p>
            <ContractForm contract="MultiOracle" method="addAsset" />
            <p>Set Intraweek Price </p>
            <ContractForm contract="MultiOracle" method="setIntraweekPrice" />
            <p>Set Settle Price </p>
            <ContractForm contract="MultiOracle" method="setSettlePrice" />
            <p>Set Basis </p>
            <ContractForm contract="MultiOracle" method="setBasis" />
            <p>Set Margin Rate </p>
            <ContractForm contract="MultiOracle" method="setVolatility" />

            <h3>Pause All Contracts</h3>
            <ContractForm contract="SwapMarket" method="pause" sendArgs={{from: this.props.accounts[0]}}/>
          </div>

          <div className="pure-u-1-1">
            <GetLPs />
            <h2>Settlement Functions</h2>
            <h3>1. First Price</h3>
            <ContractForm contract="SwapMarket" method="firstPrice" sendArgs={{from: this.props.accounts[0]}}/>
            <h3>2. Calculate Returns</h3>
            <p>Day 0 return: {returns.first / 1e18}</p>
            <p>Day 1 return: {returns.second / 1e18} </p>
            <p>Weekly Return: <ContractData contract="SwapMarket" method="weeklyReturn"/></p>
            <ContractForm contract="SwapMarket" method="computeReturns" sendArgs={{from: this.props.accounts[0]}}/>
            <h3>3. Settle Liquidity Provider</h3>
            <ContractForm contract="SwapMarket" method="settle" sendArgs={{from: this.props.accounts[0]}}/>
          </div>
          
	    	</div>
      </main>
		)
  }
}

function DisplayAssets(props) {
  const listitems = Object.keys(props.assets).map( function(id)  {
    if (props.assets[id].name)
    {
      return(
        <li key={id.toString()}>
          <h3>Name: {hex_to_ascii(props.assets[id].name)} </h3>
          <p>ID: {id.toString()} </p>
          <p>This week prices: {DisplayWeekPrices(props.assets[id].oraclePrices.current)}</p>
          <p>MarginRatio: {props.assets[id].currentMarginRatio/10000}</p>
          <p>Current Basis: {props.assets[id].currentBasis}</p>
          <p>Next Basis: {props.assets[id].nextBasis}</p>
          <p>Last Day?: {props.assets[id].isFinalDay ? "Yes" : "No"}</p>
          <p>Current Day ID: {props.assets[id].currentDay} </p>
          <p>Last week prices: {DisplayWeekPrices(props.assets[id].oraclePrices.previous)}</p>
        </li>
      );
    }
    else
      return (
        <span key={id.toString()}>waiting...</span>
      );
  });
  return (
    <ul>{listitems}</ul>
  );
}

function DisplayWeekPrices(priceArray) {
  var middleString;
  middleString = "[ "
  priceArray.forEach(function (price) {
    middleString = middleString + (price / 1000000).toString() + ' '
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

/*function DisplayReturns(props)
{
  var returns = this.props.returns
  return(
    <div>
      <p>Day 0: {returns[0]}</p>
      <p>Day 1: {returns[1]}</p>
      <p>Day 2: {returns[2]}</p>
      <p>Day 3: {returns[3]}</p>
      <p>Day 4: {returns[4]}</p>
      <p>Day 5: {returns[5]}</p>
      <p>Day 6: {returns[6]}</p>
      <p>Day 7: {returns[7]}</p>
    </div>
  );
}*/

export default MultiOracle
