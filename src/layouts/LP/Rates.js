import React, { Component } from 'react'
import { 
  ContractForm,
   } from 'drizzle-react-components'

class Rates extends Component {
  constructor(props, context) {
    super(props);
    this.contracts = context.drizzle.contracts
    this.ratesKey = this.contracts.SwapMarket.methods.rates.cacheCall(this.props.account)

  }

  render() {
    // If the data isn't here yet, show loading
    if(!(this.ratesKey in this.props.contracts.SwapMarket.rates)) {
      return (
        <span>Loading...</span>
      )
    }
    // If the data is here, get it and display it
    // this.props.SwapMarket.rates[this.ratesKey].value
    var pendingSpinner = this.props.contracts.SwapMarket.synced ? '' : ' 🔄'

    const rateList = this.props.contracts.SwapMarket.rates[this.ratesKey].value;
    var ratesDiv;
    if (Object.keys(rateList).length !== 0)
    {
      ratesDiv = (
        <div>
          <p>Current Long: {rateList['currentLong']/100}% per week{pendingSpinner}</p>
          <p>Current Short: {rateList['currentShort']/100}% per week{pendingSpinner}</p>
          <p>Next Long: {rateList['nextLong']/100}% per week{pendingSpinner}</p>
          <p>Next Short: {rateList['nextShort']/100}% per week{pendingSpinner}</p>
        </div>
      )
    }
    else
    {
      ratesDiv = (
        <div>
          <span>No Rate Data {pendingSpinner}</span>
        </div>
      )
    }
    
    return (
      <div>
        <strong>Your LP Rates: </strong>
        <br/>
        {ratesDiv}
        <p>Update Rates: </p>
        <ContractForm contract="SwapMarket" method="setRate" labels={["New Long Rate (100 = 1%)", "New Short Rate (100=1%)"]} />
      </div>
    )
  }
}
export default Rates

/*Rates.contextTypes = {
  drizzle: PropTypes.object
}*/

/*
 * Export connected component.
 */

/*const mapStateToProps = state => {
  return {
    contracts: state.contracts
  }
}

export default drizzleConnect(Rates, mapStateToProps)*/