import { drizzleConnect } from 'drizzle-react'
import React, { Component } from 'react'
import PropTypes from 'prop-types'
import ShowLPPNL from './ShowLPPNL'
import Book from './../../../build/contracts/Book.json'

/*
 * Create component.
 */

class LPPNLForm extends Component {
  constructor(props, context) {
    super(props);

    this.drizzle = context.drizzle;
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);

    this.contracts = context.drizzle.contracts;

    this.assetID = 1
    this.assetKey = this.contracts.MultiOracle.methods.assets.cacheCall(this.assetID)
    this.ethKey = this.contracts.MultiOracle.methods.assets.cacheCall(0)
    this.assetPastKey = this.contracts.MultiOracle.methods.getPastPrices.cacheCall(this.assetID)
    this.ethPastKey = this.contracts.MultiOracle.methods.getPastPrices.cacheCall(0)
    this.bookKey = this.contracts.SwapMarket.methods.books.cacheCall(this.props.accounts[0])
    this.getOracleLogs = this.getOracleLogs.bind(this)
    this.priceHistory = {}
    this.getOracleLogs(this.assetID);
    this.getOracleLogs(0)

    this.keys = {}

    this.state = {
      bookAddress: '',
      finalAssetPrice: '',
      finalEthPrice: '',
      startingAssetPrice: '',
      startingEthPrice: '',
      subcontractID: ''
    };
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
          pricedata.push({
            blockNum: element.blockNumber, 
            price: element.returnValues._price,
            ratio: element.returnValues._ratio
          })
      }, this);
      this.priceHistory[id] = pricedata
    }.bind(this));
  }

  handleSubmit() {
    var bookAddress;
    if (this.bookKey in this.props.contracts.SwapMarket.books)
    {
      bookAddress = this.props.contracts.SwapMarket.books[this.bookKey].value
    }
  	var config = {
      contractName: 'Book',
      web3Contract: new this.drizzle.web3.eth.Contract(Book.abi, bookAddress)
    }
    this.drizzle.addContract(config)
    this.keys = {};
    this.keys.subcontractKey = this.drizzle.contracts.Book.methods.getSubcontract.cacheCall(this.state.subcontractID)
    this.keys.settleTimeKey = this.drizzle.contracts.Book.methods.lastSettleTime.cacheCall()
  }

  handleInputChange(event) {
    this.setState({ [event.target.name]: event.target.value });
  }

  render() {

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

    var subcontract
    var lastSettleTime
    if (this.props.contracts.Book)
    {
      if (this.keys.subcontractKey in this.props.contracts.Book.getSubcontract)
      {
        subcontract = this.props.contracts.Book.getSubcontract[this.keys.subcontractKey].value
      }
      if (this.keys.settleTimeKey in this.props.contracts.Book.lastSettleTime)
        lastSettleTime = this.props.contracts.Book.lastSettleTime[this.keys.settleTimeKey].value;
    }

    var assetHistory = this.priceHistory[this.assetID];
    var ethHistory = this.priceHistory[0];

    var assetPrice;
    if(!this.state.finalAssetPrice)
    {
      var assetprices = this.priceHistory[this.assetID]
      if (!assetprices || assetprices.length === 0)
        assetPrice = 0;
      else
        assetPrice=assetprices[assetprices.length - 1].price
    } else {
      assetPrice = this.state.finalAssetPrice;
    }

    var ethPrice;
    if(!this.state.finalAssetPrice)
    {
      var ethprices = this.priceHistory[0]
      if (!ethprices || ethprices.length === 0)
        ethPrice = 0;
      else
        ethPrice=ethprices[ethprices.length - 1].price
    } else {
      ethPrice = this.state.finalEthPrice;
    }

    var assetPastWeek;
    if (this.assetPastKey in this.props.contracts.MultiOracle.getPastPrices)
      assetPastWeek = this.props.contracts.MultiOracle.getPastPrices[this.assetPastKey].value;

    var ethPastWeek;
    if (this.ethPastKey in this.props.contracts.MultiOracle.getPastPrices)
      ethPastWeek = this.props.contracts.MultiOracle.getPastPrices[this.ethPastKey].value;

    return (
      <div>
        <ShowLPPNL assetData={assetData} ethData={ethData} subcontract={subcontract}  
          assetWeek={assetPastWeek} ethWeek={ethPastWeek}
          assetPrice={assetPrice} ethPrice={ethPrice}
          assetStart={this.state.startingAssetPrice * 1000000} ethStart={this.state.startingEthPrice * 1000000}
          settleTime={lastSettleTime}
          lp={this.props.accounts[0]} id={this.state.subcontractID} />
        <br/>
        <form className="pure-form pure-form-stacked">
          <input name="subcontractID" type="text" value={this.state.subcontractID} onChange={this.handleInputChange} placeholder="Subcontract ID" />
          <input name="finalAssetPrice" type="text" value={this.state.finalAssetPrice} onChange={this.handleInputChange} placeholder="Final Asset Price (optional)" />
          <input name="finalEthPrice" type="text" value={this.state.finalEthPrice} onChange={this.handleInputChange} placeholder="Final ETH Price (optional)" />
          <button key="submit" className="pure-button" type="button" onClick={this.handleSubmit}>View PNL</button>
        </form>
      </div>
    )
  }
}

LPPNLForm.contextTypes = {
  drizzle: PropTypes.object
}

/*
 * Export connected component.
 */

const mapStateToProps = state => {
  return {
    accounts: state.accounts,
    contracts: state.contracts
  }
}

export default drizzleConnect(LPPNLForm, mapStateToProps)