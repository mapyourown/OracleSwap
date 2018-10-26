import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { drizzleConnect } from 'drizzle-react'
import { calculatePNL} from '../ShowPNL/CalculatePNL.js'
import Book from './../../../build/contracts/Book.json'

class BookPNL extends Component {
  constructor(props, context) {
    super(props);
    this.contracts = context.drizzle.contracts
    this.drizzle = context.drizzle
    this.calculate = this.calculate.bind(this)
    this.bookIterate = this.bookIterate.bind(this)
    this.bookPopulate = this.bookPopulate.bind(this)
    this.assetID = 1
    this.assetKey = this.contracts.MultiOracle.methods.assets.cacheCall(this.assetID)
    this.ethKey = this.contracts.MultiOracle.methods.assets.cacheCall(0)
    this.assetPastKey = this.contracts.MultiOracle.methods.getPastPrices.cacheCall(this.assetID)
    this.ethPastKey = this.contracts.MultiOracle.methods.getPastPrices.cacheCall(0)
    this.bookKey = this.contracts.SwapMarket.methods.books.cacheCall(this.props.accounts[0])
    this.getOracleLogs = this.getOracleLogs.bind(this)
    this.priceHistory = {}
    this.bookSubcontracts = {}
    this.bookSubcontractKeys = {}
    this.getOracleLogs(this.assetID);
    this.getOracleLogs(0)
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

  calculate() {
    if(!(this.bookKey in this.props.SwapMarket.books))
      return

    var config = {
      contractName: 'Book',
      web3Contract: new this.drizzle.web3.eth.Contract(Book.abi, this.props.SwapMarket.books[this.bookKey].value)
    }
    this.drizzle.addContract(config)
    this.drizzle.contracts.Book.methods.head().call().then(function (result) {
      var iter = result;
      this.bookIterate(iter, []);
    }.bind(this))
    const marginKey = this.drizzle.contracts.Book.methods.lpMargin.cacheCall()
    this.bookLPMarginKey = marginKey
  }

  bookIterate(iter, ids) {
    if (iter === "0x0000000000000000000000000000000000000000000000000000000000000000")
    {
      this.bookPopulate(ids)
      return;
    }
    ids.push(iter)
    this.drizzle.contracts.Book.methods.getNode(iter).call().then(function (result) {
      var nextIter = result.next;
        this.bookIterate(nextIter, ids)
    }.bind(this));
  }

  async bookPopulate (ids) {
    for (const id of ids) {
      const key = await this.drizzle.contracts.Book.methods.getSubcontract.cacheCall(id)
      this.bookSubcontractKeys[id] = key
    }
    console.log('finished')
    this.bookCalculate();
  }

  bookCalculate() {
    var state = this.drizzle.store.getState()

   	var ethPastWeek = this.props.MultiOracle.getPastPrices[this.ethPastKey].value;
   	var assetPastWeek = this.props.MultiOracle.getPastPrices[this.assetPastKey].value;

   	var assetPrice
   	var assetprices = this.priceHistory[this.assetID]
	  if (!assetprices || assetprices.length === 0)
	    assetPrice = 0;
	  else
	    assetPrice=assetprices[assetprices.length - 1].price
    var ethPrice
    var ethprices = this.priceHistory[0]
    if (!ethprices || ethprices.length === 0)
      ethPrice = 0;
    else
      ethPrice=ethprices[ethprices.length - 1].price

    var assetData = this.props.MultiOracle.assets[this.assetKey].value;

    Object.keys(this.bookSubcontractKeys).forEach(function (id) {
      var key = this.bookSubcontractKeys[id]
      console.log('hello0')
      if (state.contracts.Book)
      {
      	console.log('hello1')
    		console.log(this.props)
      	console.log(state.contracts)
      	console.log(key)
        if (key in state.contracts.Book.getSubcontract)
        {
        	console.log('hello2')
          this.bookSubcontracts[id] = (state.contracts.Book.getSubcontract[key].value)
          this.bookSubcontracts[id].pnl = calculatePNL(
	      	  ethPastWeek.pastPrices[this.bookSubcontracts[id].initialDay],
			      ethPrice,
			      assetPastWeek.pastPrices[this.bookSubcontracts[id].initialDay],
			      assetPrice,
			      this.bookSubcontracts[id].marginRate,
			      this.bookSubcontracts[id].reqMargin,
			      assetPastWeek.pastLRatios[this.bookSubcontracts[id].initialDay],
			      assetData.currentBasis,
			      this.bookSubcontracts[id].side);
          console.log(this.bookSubcontracts[id].pnl)
        }
      }
    }, this)
  }

  render() {
    return (
      <div>
        <DisplayBookPNL subcontracts={this.bookSubcontracts} />
        <button className="pure-button" type="button" onClick={this.calculate}> Calculate Book PNL</button>
      </div>
    )
  }
}


function DisplayBookPNL(props) {
  const listitems = Object.keys(props.subcontracts).map( function(id)  {
    if (props.subcontracts[id].pnl)
    {
      return(
        <li key={id.toString()}>
          <p><strong>Subcontract ID: {id}</strong></p>
          <p>PNL: {props.subcontracts[id].pnl/1e18}</p>
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

BookPNL.contextTypes = {
  drizzle: PropTypes.object
}

const mapStateToProps = state => {
  return {
    SwapMarket: state.contracts.SwapMarket,
    MultiOracle: state.contracts.MultiOracle,
    accounts: state.accounts
  }
}

export default drizzleConnect(BookPNL, mapStateToProps)