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
    this.state = {
   	  toIncrease: 0
    }

    this.assetID = 1

    this.assetKey = this.contracts.MultiOracle.methods.assets.cacheCall(this.assetID)

  }


  render () {
    var data;    
    if (this.assetKey in this.props.contracts.MultiOracle.assets)
    {
      data = this.props.contracts.MultiOracle.assets[this.assetKey].value;
      data.id = this.assetID;
    }

  	return (
  	  <main className="container">
        <div className="pure-g">
          <div className="pure-u-1-1">
            <h2>Oracle Viewer</h2>
            <DisplayAssetData assetData={data}/>
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
        <p>Volatility: {data.volatility}</p>
        <p>Current Basis: {data.currentBasis}</p>
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

export default OracleHome
