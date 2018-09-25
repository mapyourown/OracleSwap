import { drizzleConnect } from 'drizzle-react'
import React, { Component } from 'react'
import PropTypes from 'prop-types'

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
    
    if(!this.props.subcontract || !this.props.makerRates || !this.props.assetWeek || !this.props.ethWeek) {
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
    var oracleDate = new Date(oracleTime * 1000)
    var oracleDatestr = oracleDate.getMonth() + "/" + oracleDate.getDate() + "/" + oracleDate.getFullYear();
    var oracleHours = oracleDate.getHours();
    // Minutes part from the timestamp
    var oracleMinutes = "0" + oracleDate.getMinutes();

    // Will display time in 10:30:23 format
    var oracleFormattedTime = oracleHours + ':' + oracleMinutes.substr(-2)
    var offset = "UTC + " + new Date().getTimezoneOffset()/100
    
    var basis = this.props.assetData.currentBasis
    var assetPrice = this.props.assetPrice
    var assetWeekPrices = this.props.assetWeek
    var ethPrice = this.props.ethPrice
    var ethWeekPrices = this.props.ethWeek

    var assetStart = this.props.assetStart //assetWeekPrices[subcontract.initialDay]
    var ethStart = this.props.ethStart //ethWeekPrices[subcontract.initialDay]

    var rates
    if (this.props.makerRates.currentLong == 0 && this.props.makerRates.currentShort == 0)
      rates = this.props.defaultRates
    else
      rates = this.props.makerRates

    var side;
    var status = 'Ongoing'
    if (subcontract.side)
      side = "Long"
    else
      side = "Short"

    if (subcontract.isCancelled)
      status = "Cancelled"
    if (subcontract.isBurned)
      status = "Burned"

    var rmAmount = subcontract.reqMargin/1e18;
    var takerMarginAmount = subcontract.takerMargin/1e18;

    // Settle computation
    /*var assetReturn = assetPrice*1.0/assetStart - 1
    var ethReturn = ethPrice/ethStart*/
    var assetReturn = assetPrice*1.0/assetWeekPrices[subcontract.initialDay] - 1
    var ethReturn = ethPrice/ethWeekPrices[subcontract.initialDay]
    var marginRatio = this.props.assetData.pastMarginRatio/100
    var ETHRawPNL = (rmAmount/marginRatio) * assetReturn / ethReturn
    var pnl;
    var basisFee = basis*(1.0/1000)*rmAmount
    var rate
    if (subcontract.side)
    {
      rate = rates.currentShort*(1.0/1000)
      pnl = ETHRawPNL + basisFee + rate*rmAmount
    }
    else
    {
      rate = rates.currentLong*(1.0/1000)
      pnl = -1.0* (ETHRawPNL + basisFee + rate*rmAmount)
    }

    return (
      <div>
        <p>LP: {this.props.maker}</p>
        <p>Last Settlement Timestamp: {settleTime} </p>
        <p>Last Oracle Final Price Time: {oracleDatestr} {oracleFormattedTime} Local Time ({offset})</p>
        <p>Subcontract ID: {this.props.id}</p>
        <p>Required Margin: {rmAmount}</p>
        <p>Taker: {subcontract.taker}</p>
        <p>Taker Margin: {takerMarginAmount}</p>
        <p>LP Side: {side}</p>
        <p>First Day ID: {subcontract.initialDay}</p>
        <p>First Day Asset Price: {assetWeekPrices[subcontract.initialDay]}</p>
        <p>First Day ETH Price: {ethWeekPrices[subcontract.initialDay]}</p>
        <p>Final Asset Price: {assetPrice} </p>
        <p>Final ETH Price: {ethPrice} </p>
        <p>MarginRatio: {marginRatio}</p>
        <p>ETH PNL: ({rmAmount} ETH / {marginRatio}) * {assetReturn} / {ethReturn} = {ETHRawPNL}</p>
        <p>Basis Fee: {basis*1.0/1000} * {rmAmount} ETH = {basisFee}</p>
        <p>LP Fee: {rate} * {rmAmount} ETH = {rate * rmAmount} </p>
        <p>LP PNL: {pnl} ETH</p>
        <p>Taker PNL: {-1.0 * pnl} ETH</p>
        <p>Status: {status}</p>
      </div>
    );
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