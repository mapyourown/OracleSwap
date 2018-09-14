import { drizzleConnect } from 'drizzle-react'
import React, { Component } from 'react'
import PropTypes from 'prop-types'

/*
 * Create component.
 */

class DisplayRates extends Component {
  constructor(props, context) {
    super(props);

    this.contracts = context.drizzle.contracts;
    //console.log('DisplayRates props', props)
    //console.log('DisplayRates context', context)
  }

  render() {
    // Contract is not yet intialized.
    if(!this.props.contracts.SwapMarket.initialized) {
      return (
        <span>Initializing...</span>
      )
    }

    // If the cache key we received earlier isn't in the store yet; the initial value is still being fetched.
    //console.log(this.props.ratesKey)
    //console.log(this.props.contracts)
    if(!(this.props.ratesKey in this.props.contracts.SwapMarket.rates)) {
      return (
        <span>Rates: Waiting for Maker</span>
      )
    }

    // Show a loading spinner for future updates.
    var pendingSpinner = this.props.contracts.SwapMarket.rates.synced ? '' : ' 🔄'

    // Optionally hide loading spinner (EX: ERC20 token symbol).
    if (this.props.hideIndicator) {
      pendingSpinner = ''
    }

    var rateList = this.props.contracts.SwapMarket.rates[this.props.ratesKey].value

    if (typeof rateList === 'object')
    {
      //console.log(rateList);
      return (
        <span>
          <p>Current Long: {rateList['currentLong']}</p>
          <p>Current Short: {rateList['currentShort']}</p>
          <p>Next Long: {rateList['nextLong']}</p>
          <p>Next Short: {rateList['nextShort']}</p>
        </span>
      );
    }
    
    return(
      <span>{pendingSpinner}</span>
    )
  }
}

DisplayRates.contextTypes = {
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

export default drizzleConnect(DisplayRates, mapStateToProps)