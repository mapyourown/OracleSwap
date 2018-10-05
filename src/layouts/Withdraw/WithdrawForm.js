import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { drizzleConnect } from 'drizzle-react'

class WithdrawForm extends Component {
  constructor(props, context) {
    super(props);
    this.contracts = context.drizzle.contracts
    this.drizzle = context.drizzle
    this.handleSubmit = this.handleSubmit.bind(this);

    this.balanceKey = this.contracts.SwapMarket.methods.balances.cacheCall(this.props.accounts[0])
  }

  handleSubmit() {
    var stackID = this.contracts.SwapMarket.methods.withdrawBalance.cacheSend()
    console.log('stackID', stackID)
  }

  render() {

    var balance;

    if(!(this.balanceKey in this.props.contracts.SwapMarket.balances)) {
      return (
        <span>Loading Withdraw Balance Information...</span>
      )
    }
    else
    {
      balance = this.props.contracts.SwapMarket.balances[this.balanceKey].value
    }

    return (
      <div>
        <p>Current Balance: {balance === 0 ? "None" : balance/1e18} ETH</p>
        <form className="pure-form pure-form-stacked">
          <button key="submit" className="pure-button" type="button" onClick={this.handleSubmit}>Withdraw</button>
        </form>
      </div>
    )
  }
}

//<ContractData contract="SwapMarket" method="openMargins" methodArgs={[this.props.account]} />
WithdrawForm.contextTypes = {
  drizzle: PropTypes.object
}

const mapStateToProps = state => {
  return {
    accounts: state.accounts,
    contracts: state.contracts
  }
}

export default drizzleConnect(WithdrawForm, mapStateToProps)
