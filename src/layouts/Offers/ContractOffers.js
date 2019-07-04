import { drizzleConnect } from 'drizzle-react'
import React, { Component } from 'react'
import PropTypes from 'prop-types'
import GetLPs from './GetLPs'

const exampleData = {
  "0x1234567890123456789012345678901234567890" : {
    bookAddress: "0xAAA00000000000000000000000",
    rates: {
      currentLong: 1000,
      currentShort: -40
    },
    margin: 25*1e18,
    bookData: {
      totalLong: 12*1e18,
      totalShort: 10*1e18
    }
  },
  "0xABC123ABC123ABC123ABC123ABC123ABC123ABC1" : {
    bookAddress: "0xBBB00000000000000000000000",
    rates: {
      currentLong: 900,
      currentShort: -40
    },
    margin: 100*1e18,
    bookData: {
      totalLong: 65*1e18,
      totalShort: 49*1e18
    }
  },
  "0xA1A1A1A1A1A1A1A1A1A1A1A1A1A1A1A1A1A1A1A1" : {
    bookAddress: "0xCCC00000000000000000000000",
    rates: {
      currentLong: -50,
      currentShort: 60
    },
    margin: 1*1e18,
    bookData: {
      totalLong: 10*1e18,
      totalShort: 11*1e18
    }
  },
}


class ContractOffers extends Component {
  constructor(props, context) {
    super(props);

    this.lookupName = this.lookupName.bind(this);
    this.getOracleLogs = this.getOracleLogs.bind(this)

    this.contracts = context.drizzle.contracts;

    // Get the contract ABI
    //console.log(this.contracts[this.props.contract])
    this.idKey = this.contracts[this.props.contract].methods.ASSET_ID.cacheCall();
    this.drizzle = context.drizzle

    
    this.assetKey = ''
    this.asset_name = ''
    this.asset_id = ''
    this.priceHistory = {}
    var initialState = {};
    this.state = initialState;

    this.lookupName(this.props.id)
    this.getOracleLogs(this.props.id);
  }

  lookupName(id) {
    this.assetKey = this.contracts.MultiOracle.methods.assets.cacheCall(id)
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
      events.forEach(function(element) {
        if (element.returnValues._id == id)
          pricedata.push( {
            blockNum: element.blockNumber, 
            price: element.returnValues._price, 
            leverageRatio: element.returnValues._ratio,
            time: element.returnValues._timestamp})
      }, this);
      this.priceHistory[id] = pricedata
    }.bind(this));
  }


  render() {
    if (this.idKey in this.props.contracts[this.props.contract].ASSET_ID && this.asset_id === '')
    {
      this.asset_id = this.props.contracts[this.props.contract].ASSET_ID[this.idKey].value
    }

    var asset = {};
    if (this.assetKey in this.props.contracts.MultiOracle.assets)
    {
      asset = this.props.contracts.MultiOracle.assets[this.assetKey].value
    }

    if (asset.name)
    {
      console.log(this.priceHistory[this.props.id])
      return (
        <div>
          <div>
            <p>Name: {hex_to_ascii(asset.name)}</p>
            <p>Current Basis: {asset.currentBasis}</p>
            <p>Current Leverage: {this.priceHistory[this.props.id][0].leverageRatio /1e6}</p>
          </div>
          <br/>
          <div>
            <p>LP Open Amount: {314} </p>
            <p>Long Taker Margin Rate: {3.14} </p>
            <p>Short Taker Margin Rate: {-3.14} </p>
          </div>
          <br/>
          <div>
            <h3>Current Offers</h3>
            <DisplayActiveBooks activeBooks={exampleData} />
          </div>
        </div>
      )
    }
    else
    {
      return (
        <div>
          <p>Loading</p>
        </div>
      )
    }
  }
}

function DisplayActiveBooks(props) {
  const openFee = 0.025
  const listitems = Object.keys(props.activeBooks).map( function(lp)  {
    if (props.activeBooks[lp].bookAddress && props.activeBooks[lp].rates
     && props.activeBooks[lp].margin && props.activeBooks[lp].bookData)
    {
      var currentRates = props.activeBooks[lp].rates
      
      return(
        <li key={lp.toString()}>
          <a href="/lpdetails"><strong>LP: {lp}</strong></a>
          <p>Book: {props.activeBooks[lp].bookAddress}</p>
          <p>Offered Margin: {(props.activeBooks[lp].margin/(1e18))/(1+ openFee)} ETH</p>
          <p>Current Long Rate: {currentRates['currentLong']/100}% per week</p>
          <p>Current Short Rate: {currentRates['currentShort']/100}% per week</p>
          <p>Current Long Margin: {props.activeBooks[lp].bookData['totalLong']/(1e18)} ETH</p>
          <p>Current Short Margin: {props.activeBooks[lp].bookData['totalShort']/(1e18)} ETH</p>
        </li>
      );
    }
    else
      return (
        <span key='empty'>waiting...</span>
      );
  });
  return (
    <ul>{listitems}</ul>
  );
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

ContractOffers.contextTypes = {
  drizzle: PropTypes.object
}

const mapStateToProps = state => {
  return {
    contracts: state.contracts
  }
}

export default drizzleConnect(ContractOffers, mapStateToProps)