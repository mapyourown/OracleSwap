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
    //console.log('DisplayRates props', props)
    //console.log('DisplayRates context', context)
  }

  render() {
    //console.log('Test',this.props.newState)
    //console.log('keys', this.props.keys)
    // Contract is not yet intialized.
    if(!this.props.contracts.SwapMarket.initialized) {
      return (
        <span>Initializing...</span>
      )
    }

    if (!this.props.keys)
    {
      return (
          <span> No data </span>
      )
    }

    // If the cache key we received earlier isn't in the store yet; the initial value is still being fetched.
    if(!(this.props.keys.ratesKey in this.props.contracts.SwapMarket.rates)
      || !(this.props.keys.basisKey in this.props.contracts.SPX_Oracle.basis)
      || !(this.props.keys.subcontractKey in this.props.newState.contracts.Book.getSubcontract)
      || !(this.props.keys.assetPriceKey in this.props.contracts.SPX_Oracle.getPrice)
      || !(this.props.keys.ethPriceKey in this.props.contracts.ETH_Oracle.getPrice) 
      || !(this.props.keys.assetPricesKey in this.props.contracts.SPX_Oracle.getPrices)
      || !(this.props.keys.ethPricesKey in this.props.contracts.ETH_Oracle.getPrices)) {
      return (
        <span>Waiting...</span>
      )
    }

    // Show a loading spinner for future updates.
    var pendingSpinner = this.props.contracts.SwapMarket.rates.synced ? '' : ' 🔄'

    // Optionally hide loading spinner (EX: ERC20 token symbol).
    if (this.props.hideIndicator) {
      pendingSpinner = ''
    }

    var subcontract = this.props.newState.contracts.Book.getSubcontract[this.props.keys.subcontractKey].value
    var rates = this.props.contracts.SwapMarket.rates[this.props.keys.ratesKey].value
    var basis = this.props.contracts.SPX_Oracle.basis[this.props.keys.basisKey].value
    var assetPrice = this.props.contracts.SPX_Oracle.getPrice[this.props.keys.assetPriceKey].value
    var assetWeekPrices = this.props.contracts.SPX_Oracle.getPrices[this.props.keys.assetPricesKey].value
    var ethPrice = this.props.contracts.ETH_Oracle.getPrice[this.props.keys.ethPriceKey].value
    var ethWeekPrices = this.props.contracts.ETH_Oracle.getPrices[this.props.keys.ethPricesKey].value


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
    var usdReturn = assetPrice*1.0/assetWeekPrices[subcontract.initialDay] - 1
    var ethReturn = (usdReturn * ethWeekPrices[subcontract.initialDay])/ethPrice
    var pnl;
    if (subcontract.side)
    {
      pnl = ethReturn + basis*(1.0/1000)*rmAmount + rates.currentShort*(1.0/1000)*rmAmount
    }
    else
    {
      pnl = -1.0* (ethReturn + basis*(1.0/1000)*rmAmount) + rates.currentLong*(1.0/1000)*rmAmount
    }

    return (
      <div>
        <p>LP: {this.props.maker}</p>
        <p>Subcontract ID: {this.props.id}</p>
        <p>Required Margin: {rmAmount}</p>
        <p>Taker: {subcontract.taker}</p>
        <p>Taker Margin: {takerMarginAmount}</p>
        <p>LP Side: {side}</p>
        <p>First Day ID: {subcontract.initialDay}</p>
        <p>Status: {status}</p>
        <p>LP PNL: {pnl}</p>
        <p>Taker PNL: {-1.0 * pnl} </p>
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