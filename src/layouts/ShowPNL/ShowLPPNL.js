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
    
    if(!this.props.subcontract || !this.props.lpRates || !this.props.assetWeek || !this.props.ethWeek) {
      return (
        <span> Waiting for Data </span>
      )
    }

    // Show a loading spinner for future updates.
    var pendingSpinner = this.props.contracts.SwapMarket.rates.synced ? '' : ' 🔄'

    // Optionally hide loading spinner (EX: ERC20 token symbol).
    if (this.props.hideIndicator) {
      pendingSpinner = ''
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
    var assetStart = this.props.assetStart //assetWeekPrices[subcontract.initialDay]
    var ethStart = this.props.ethStart //ethWeekPrices[subcontract.initialDay]

    var rates
    if (this.props.lpRates.currentLong == 0 && this.props.lpRates.currentShort == 0)
      rates = this.props.defaultRates
    else
      rates = this.props.lpRates

    var sideString;
    var status = 'Ongoing'
    if (subcontract.side)
      sideString = "Long"
    else
      sideString = "Short"

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
      rates.currentLong,
      rates.currentShort,
      rmAmount,
      leverageRatio,
      basis,
      subcontract.side);
    /*var basisFee = basis*(1.0/10000)*rmAmount
    var rate
    if (subcontract.side)
    {
      rate = rates.currentShort*(1.0/10000)
      pnl = ETHRawPNL + basisFee + rate*rmAmount
    }
    else
    {
      rate = rates.currentLong*(1.0/10000)
      pnl = -1.0* (ETHRawPNL + basisFee) + rate*rmAmount
    }*/

    return (
      <div>
        <p>Subcontract ID: {this.props.id}</p>
        <p>Last Subcontract Settlement Time: {settleTime == 0 ? "N/A" : subSettle.date + " " + subSettle.time } ({offset}) </p>
        <p>Last Oracle Settlement Price Time: {oracleSettle.date} {oracleSettle.time} Local Time ({offset})</p>
        <p><strong>{isSettlePeriod ? "This is the settle period" : "This is not the settle period"}</strong></p>
        <p>Required Margin: {rmAmount}</p>
        <p>Taker: {subcontract.taker}</p>
        <p>Taker Margin: {takerMarginAmount}</p>
        <p>LP Side: {sideString}</p>
        <p>First Day ID: {subcontract.initialDay}</p>
        <p>First Day Asset Price: {assetStart ? assetStart/1e6 : assetWeekPrices[subcontract.initialDay] / 1e6}</p>
        <p>Final Asset Price: {assetPrice / 1e6} </p>
        <p>First Day ETH Price: {ethStart ? ethStart / 1e6 : ethWeekPrices[subcontract.initialDay] / 1e6}</p>
        <p>Final ETH Price: {ethPrice / 1e6} </p>
        <p>Leverage Ratio: {leverageRatio}</p>
        <p>LP PNL: {pnl} ETH</p>
        <p>Status: {status}</p>
        <p>New LP status: {this.props.lpChangeAddress == 0x0 ? "No new LP" : "New LP: " + this.props.lpChangeAddress} </p>
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