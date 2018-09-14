import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { drizzleConnect } from 'drizzle-react'

class GetMakers extends Component {
  constructor(props, context) {
    super(props);
    this.contracts = context.drizzle.contracts
    this.drizzle = context.drizzle
    this.showMakers = this.showMakers.bind(this)
    this.activeMakers = []
    this.activeMakerBookKeys = {}

  }

  showMakers() {
    var makers = []
    var bookKeys = {}
    var rateKeys = {}
    var marginKeys = {}
    var bookDataKeys = {}
    const web3 = this.drizzle.web3;
    const swapcontract = this.drizzle.contracts.SwapMarket;
    const contractweb3 = new web3.eth.Contract(swapcontract.abi, swapcontract.address);
    contractweb3.getPastEvents(
      'OpenMargin', //'allEvents',
      {
         fromBlock: 0,
         toBlock: 'latest'
      }
    ).then(function (events) {
      //console.log(this)
      events.forEach(function(element) {
        var maker = element.returnValues._maker
        if (!makers.includes(maker)) {
          makers.push(maker)
        }
        makers.forEach(function(maker) {
          var key = this.drizzle.contracts.SwapMarket.methods.books.cacheCall(maker)
          bookKeys[maker] = key
        }, this);
        makers.forEach(function(maker) {
          var key = this.drizzle.contracts.SwapMarket.methods.rates.cacheCall(maker)
          rateKeys[maker] = key
        }, this);
        makers.forEach(function(maker) {
          var key = this.drizzle.contracts.SwapMarket.methods.openMargins.cacheCall(maker)
          marginKeys[maker] = key
        }, this);
        makers.forEach(function(maker) {
          var key = this.drizzle.contracts.SwapMarket.methods.getBookData.cacheCall(maker)
          bookDataKeys[maker] = key
        }, this);
      }, this);
    }.bind(this));
    
    this.activeMakers = makers
    this.activeMakerBookKeys = bookKeys
    this.activeMakerRateKeys = rateKeys
    this.activeMakerMarginKeys = marginKeys
    this.activeMakerBookDataKeys = bookDataKeys
  }

  render() {
    var activeBooks = {}
    Object.keys(this.activeMakerBookKeys).forEach(function (maker) {
      activeBooks[maker] = {}
      if (this.activeMakerBookKeys[maker] in this.props.SwapMarket.books) 
        activeBooks[maker].bookAddress = this.props.SwapMarket.books[this.activeMakerBookKeys[maker]].value
      if (this.activeMakerRateKeys[maker] in this.props.SwapMarket.rates) 
        activeBooks[maker].rates = this.props.SwapMarket.rates[this.activeMakerRateKeys[maker]].value
      if (this.activeMakerMarginKeys[maker] in this.props.SwapMarket.openMargins) 
        activeBooks[maker].margin = this.props.SwapMarket.openMargins[this.activeMakerMarginKeys[maker]].value
      if (this.activeMakerBookDataKeys[maker] in this.props.SwapMarket.getBookData)
        activeBooks[maker].bookData = this.props.SwapMarket.getBookData[this.activeMakerBookDataKeys[maker]].value
    }, this);
    
    return (
      <div>
        <DisplayMakers activeMakers={this.activeMakers}/>
        <DisplayActiveBooks activeBooks={activeBooks} />
        <button className="pure-button" type="button" onClick={this.showMakers}> Show All LPs</button>
      </div>
    )
  }
}

function DisplayMakers(props) {
  const listitems = props.activeMakers.map((maker) =>
    <li key={maker.toString()}>
      <span>{maker}</span>
    </li>
  );
  return (
    <ul>{listitems}</ul>
  );
}

function DisplayActiveBooks(props) {
  const listitems = Object.keys(props.activeBooks).map( function(maker)  {
    if (props.activeBooks[maker].bookAddress && props.activeBooks[maker].rates
     && props.activeBooks[maker].margin && props.activeBooks[maker].bookData)
    {
      // TODO: Not all margin is availble, display
      return(
        <li key={maker.toString()}>
          <p>LP: {maker}</p>
          <p>Book: {props.activeBooks[maker].bookAddress}</p>
          <p>Open Margin: {props.activeBooks[maker].margin/(1e18)} ETH</p>
          <p>Current Long Rate: {props.activeBooks[maker].rates['currentLong']}</p>
          <p>Current Short Rate: {props.activeBooks[maker].rates['currentShort']}</p>
          <p>Next Long Rate: {props.activeBooks[maker].rates['nextLong']}</p>
          <p>Next Short Rate: {props.activeBooks[maker].rates['nextShort']}</p>
          <p>Current Long Margin: {props.activeBooks[maker].bookData['totalLong']/(1e18)} ETH</p>
          <p>Current Short Margin: {props.activeBooks[maker].bookData['totalShort']/(1e18)} ETH</p>
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

//<ContractData contract="SwapMarket" method="openMargins" methodArgs={[this.props.account]} />
GetMakers.contextTypes = {
  drizzle: PropTypes.object
}

const mapStateToProps = state => {
  return {
    SwapMarket: state.contracts.SwapMarket
  }
}

export default drizzleConnect(GetMakers, mapStateToProps)
