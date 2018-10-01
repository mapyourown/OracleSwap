import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { drizzleConnect } from 'drizzle-react'

class GetLPs extends Component {
  constructor(props, context) {
    super(props);
    this.contracts = context.drizzle.contracts
    this.drizzle = context.drizzle
    this.showlps = this.showlps.bind(this)
    this.activelps = []
    this.activelpBookKeys = {}
    this.defaultRatesKey = this.contracts.SwapMarket.methods.defaultRates.cacheCall()
  }

  showlps() {
    var lps = []
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
        var lp = element.returnValues._lp
        if (!lps.includes(lp)) {
          lps.push(lp)
        }
        lps.forEach(function(lp) {
          var key = this.drizzle.contracts.SwapMarket.methods.books.cacheCall(lp)
          bookKeys[lp] = key
        }, this);
        lps.forEach(function(lp) {
          var key = this.drizzle.contracts.SwapMarket.methods.rates.cacheCall(lp)
          rateKeys[lp] = key
        }, this);
        lps.forEach(function(lp) {
          var key = this.drizzle.contracts.SwapMarket.methods.openMargins.cacheCall(lp)
          marginKeys[lp] = key
        }, this);
        lps.forEach(function(lp) {
          var key = this.drizzle.contracts.SwapMarket.methods.getBookData.cacheCall(lp)
          bookDataKeys[lp] = key
        }, this);
      }, this);
    }.bind(this));
    
    this.activelps = lps
    this.activelpBookKeys = bookKeys
    this.activelpRateKeys = rateKeys
    this.activelpMarginKeys = marginKeys
    this.activelpBookDataKeys = bookDataKeys
  }

  render() {
    var activeBooks = {}
    Object.keys(this.activelpBookKeys).forEach(function (lp) {
      activeBooks[lp] = {}
      if (this.activelpBookKeys[lp] in this.props.SwapMarket.books) 
        activeBooks[lp].bookAddress = this.props.SwapMarket.books[this.activelpBookKeys[lp]].value
      if (this.activelpRateKeys[lp] in this.props.SwapMarket.rates) 
        activeBooks[lp].rates = this.props.SwapMarket.rates[this.activelpRateKeys[lp]].value
      if (this.activelpMarginKeys[lp] in this.props.SwapMarket.openMargins) 
        activeBooks[lp].margin = this.props.SwapMarket.openMargins[this.activelpMarginKeys[lp]].value
      if (this.activelpBookDataKeys[lp] in this.props.SwapMarket.getBookData)
        activeBooks[lp].bookData = this.props.SwapMarket.getBookData[this.activelpBookDataKeys[lp]].value
    }, this);

    var defaultRates = {}
    if (this.defaultRatesKey in this.props.SwapMarket.defaultRates)
      defaultRates = this.props.SwapMarket.defaultRates[this.defaultRatesKey].value
    
    return (
      <div>
        <DisplayActiveBooks activeBooks={activeBooks} defaultRates={defaultRates} />
        <button className="pure-button" type="button" onClick={this.showlps}> Show All LPs</button>
      </div>
    )
  }
}
//<Displaylps activelps={this.activelps}/>
function Displaylps(props) {
  const listitems = props.activelps.map((lp) =>
    <li key={lp.toString()}>
      <span>{lp}</span>
    </li>
  );
  return (
    <ul>{listitems}</ul>
  );
}

function DisplayActiveBooks(props) {
  const openFee = 0.025
  const listitems = Object.keys(props.activeBooks).map( function(lp)  {
    if (props.activeBooks[lp].bookAddress && props.activeBooks[lp].rates
     && props.activeBooks[lp].margin && props.activeBooks[lp].bookData)
    {
      var currentRates;
      if (props.activeBooks[lp].rates['currentLong'] == 0 && props.activeBooks[lp].rates['currentShort'] == 0)
        currentRates = props.defaultRates
      else
        currentRates = props.activeBooks[lp].rates
      
      return(
        <li key={lp.toString()}>
          <p><strong>LP: {lp}</strong></p>
          <p>Book: {props.activeBooks[lp].bookAddress}</p>
          <p>Offered Margin: {(props.activeBooks[lp].margin/(1e18))/(1+ openFee)} ETH</p>
          <p>Current Long Rate: {currentRates['currentLong']/100}% per week</p>
          <p>Current Short Rate: {currentRates['currentShort']/100}% per week</p>
          <p>Next Long Rate: {props.activeBooks[lp].rates['nextLong']/100}% per week</p>
          <p>Next Short Rate: {props.activeBooks[lp].rates['nextShort']/100}% per week</p>
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

//<ContractData contract="SwapMarket" method="openMargins" methodArgs={[this.props.account]} />
GetLPs.contextTypes = {
  drizzle: PropTypes.object
}

const mapStateToProps = state => {
  return {
    SwapMarket: state.contracts.SwapMarket
  }
}

export default drizzleConnect(GetLPs, mapStateToProps)
