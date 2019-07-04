import { drizzleConnect } from 'drizzle-react'
import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { calculatePNL} from './CalculatePNL.js'

/*
 * Create component.
 */

class ShowPNL extends Component {
  constructor(props, context) {
    super(props);

    this.contracts = context.drizzle.contracts;
  }

  render() {

    if(!this.props.contracts.SwapMarket.initialized) {
      return (
        <span>Initializing...</span>
      )
    }
    
    if(!this.props.subcontract || !this.props.assetWeek || !this.props.ethWeek) {
      return (
        <span> Waiting for Data </span>
      )
    }

    var subcontract = this.props.subcontract
    var settleTime = this.props.settleTime
    var oracleTime = this.props.assetData.lastSettlePriceTime
    var isSettlePeriod;
    // normally just see if oracle time is newer, however this does not work if the settle time is wrong
    if (settleTime != 0)
      isSettlePeriod = (oracleTime > settleTime)
    else
      isSettlePeriod = Math.floor((new Date()).getTime()/1000) - oracleTime < 60 * 60 * 4 //within 4 hours
    var oracleSettle = dateFromTimestamp(oracleTime)
    var subSettle = dateFromTimestamp(settleTime)
    var offset = "UTC + " + new Date().getTimezoneOffset()/100
    
    var basis = this.props.assetData.currentBasis
    var assetPrice = this.props.assetPrice
    var assetStart = this.props.assetWeek.pastPrices[subcontract.initialDay]
    var ethPrice = this.props.ethPrice
    var ethStart = this.props.ethWeek.pastPrices[subcontract.initialDay]
    var leverageRatio = this.props.assetWeek.pastLRatios[subcontract.initialDay]

    var marginRate = subcontract.marginRate;

    var sideString;
    var status = 'Ongoing'
    if (subcontract.side)
    {
      sideString = "Long"
    }
    else
    {
      sideString = "Short"
    }

    if (subcontract.isCancelled)
      status = "Cancelled"
    if (subcontract.isBurned)
      status = "Burned"

    var rmAmount = subcontract.reqMargin/1e18;
    var takerMarginAmount = subcontract.takerMargin/1e18;

/*    var assetReturn;
    var ethReturn;
    if (assetStart && ethStart)
    {
      assetReturn = assetPrice*1.0/assetStart - 1
      ethReturn = ethPrice/ethStart
    }
    else {
      assetReturn = assetPrice*1.0/assetWeekPrices[subcontract.initialDay] - 1
      ethReturn = ethPrice/ethWeekPrices[subcontract.initialDay]
    } */
    
    //var ETHRawPNL = (rmAmount * leverageRatio * assetReturn) / ethReturn
    var pnl = calculatePNL(ethStart,
      ethPrice,
      assetStart,
      assetPrice,
      marginRate,
      rmAmount,
      leverageRatio,
      basis,
      subcontract.side);

    return (
      <div>
        <p>LP: {this.props.lp}</p>
        <p>Last Subcontract Settlement Time: {settleTime == 0 ? "N/A" : subSettle.date + " " + subSettle.time } ({offset}) </p>
        <p>Last Oracle Settlement Price Time: {oracleSettle.date} {oracleSettle.time} Local Time ({offset})</p>
        <p><strong>{isSettlePeriod ? "This is the settle period" : "This is not the settle period"}</strong></p>
        <p>Subcontract ID: {this.props.id}</p>
        <p>Required Margin: {rmAmount}</p>
        <p>Taker Margin: {takerMarginAmount}</p>
        <p>LP Side: {sideString}</p>
        <p>First Day ID: {subcontract.initialDay}</p>
        <p>First Day Asset Price: {assetStart/1e6}</p>
        <p>Final Asset Price: {assetPrice / 1e6} </p>
        <p>First Day ETH Price: {ethStart / 1e6}</p>
        <p>Final ETH Price: {ethPrice / 1e6} </p>
        <p>Leverage Ratio: {leverageRatio/ 1e6}</p>
        <p>Margin Rate: {marginRate/1e4} </p>
        <p>Basis: {basis/1e4}</p>
        <p>LP PNL: {pnl} ETH</p>
        <p>Taker PNL: {-1.0 * pnl} ETH</p>
        <p>New Taker Margin: {takerMarginAmount - pnl} ETH</p>
        <p>Status: {status}</p>
      </div>
    );
  }
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

ShowPNL.contextTypes = {
  drizzle: PropTypes.object
}

/*
 * Export connected component.
 */

const mapStateToProps = state => {
  return {
    contracts: state.contracts
  }
}

export default drizzleConnect(ShowPNL, mapStateToProps)