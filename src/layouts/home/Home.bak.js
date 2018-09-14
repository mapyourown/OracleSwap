import React, { Component } from 'react'
import PropTypes from 'prop-types'

class Home extends Component {
  constructor(props, context) {
    super(props)

    this.contracts = context.drizzle.contracts
    this.handleSetButton = this.handleSetButton.bind(this)
    this.handleSendTokens = this.handleSendTokens.bind(this)
    this.handleInputChange = this.handleInputChange.bind(this)

    this.state = {
      storageAmount: 0,
      tokenRecipientAddress: '',
      tokenTransferAmount: 0
    }
  }

  handleSetButton() {
    this.contracts.SimpleStorage.methods.set(this.state.storageAmount).send()
  }

  handleSendTokens() {
    this.contracts.TutorialToken.methods.transfer(this.state.tokenRecipientAddress, this.state.tokenTransferAmount).send()
  }

  handleInputChange(event) {
    this.setState({ [event.target.name]: event.target.value })
  }

  render() {
    // SimpleStorage Vars
    var storedData = this.props.drizzleStatus.initialized ? this.contracts.SimpleStorage.methods.storedData.call() : 'Loading...'

    // TutorialToken Vars
    var tokenSymbol = this.props.drizzleStatus.initialized ? this.contracts.TutorialToken.methods.symbol.call() : ''
    var tokenSupply = this.props.drizzleStatus.initialized ? this.contracts.TutorialToken.methods.totalSupply.call() : 'Loading...'
    var tokenBalance; // = this.props.drizzleStatus.initialized ? this.contracts.TutorialToken.methods.balanceOf.call(this.props.accounts[0]) : 'Loading...'

    return(
      <main className="container">
        <div className="pure-g">
          <div className="pure-u-1-1">
            <h1>Drizzle Examples</h1>
            <p>Here you'll find two example contract front-ends.</p>
          </div>

          <div className="pure-u-1-1">
            <h2>Active Account</h2>
            <AccountData accountIndex="0" units="ether" precision="3" />
          </div>

          <div className="pure-u-1-1">
            <h2>SimpleStorage</h2>
            <p><strong>Stored Value</strong>: {storedData}</p>
            <form className="pure-form pure-form-stacked">
              <input name="storageAmount" type="number" value={this.state.storageAmount} onChange={this.handleInputChange} />
              <button className="pure-button" type="button" onClick={this.handleSetButton}>Store Value of {this.state.storageAmount}</button>
            </form>

            <br/><br/>
          </div>

          <div className="pure-u-1-1">
            <h2>TutorialToken</h2>
            <p><strong>Total Supply</strong>: {tokenSupply} {tokenSymbol}</p>
            <p><strong>My Balance</strong>: {tokenBalance}</p>
            <h3>Send Tokens</h3>
            <form className="pure-form pure-form-stacked">
              <input name="tokenRecipientAddress" type="text" value={this.state.tokenRecipientAddress} onChange={this.handleInputChange} placeholder="Address" />
              <input name="tokenTransferAmount" type="number" value={this.state.tokenTransferAmount} onChange={this.handleInputChange} placeholder="Amount" />
              <button className="pure-button" type="button" onClick={this.handleSendTokens}>Send Tokens to {this.state.tokenRecipientAddress}</button>
            </form>
          </div>

          <div className="pure-u-1-1">
            <h2>TutorialToken</h2>
            <p>Here we have a form with custom, friendly labels. Also note the token symbol will not display a loading indicator. We've suppressed it with the <code>hideIndicator</code> prop because we know this variable is constant.</p>
            <p><strong>Total Supply</strong>: <ContractData contract="TutorialToken" method="totalSupply" methodArgs={[{from: this.props.accounts[0]}]} /> <ContractData contract="TutorialToken" method="symbol" hideIndicator /></p>
            <p><strong>My Balance</strong>: <ContractData contract="TutorialToken" method="balanceOf" methodArgs={[this.props.accounts[0]]} /></p>
            <h3>Send Tokens</h3>
            <ContractForm contract="TutorialToken" method="transfer" labels={['To Address', 'Amount to Send']} />

            <br/><br/>
          </div>

          <div className="pure-u-1-1">
            <h2>SimpleStorage</h2>
            <p>This shows a simple ContractData component with no arguments, along with a form to set its value.</p>
            <p><strong>Stored Value</strong>: <ContractData contract="SimpleStorage" method="storedData" /></p>
            <ContractForm contract="SimpleStorage" method="set" />
            <br/><br/>
          </div>

          <div className="pure-u-1-1">
            <h2>ComplexStorage</h2>
            <p>Finally this contract shows data types with additional considerations. Note in the code the strings below are converted from bytes to UTF-8 strings and the device data struct is iterated as a list.</p>
            <p><strong>String 1</strong>: <ContractData contract="ComplexStorage" method="string1" toUtf8 /></p>
            <p><strong>String 2</strong>: <ContractData contract="ComplexStorage" method="string2" toUtf8 /></p>
            <strong>Single Device Data</strong>: <ContractData contract="ComplexStorage" method="singleDD" />

            <br/><br/>
          </div>
        </div>
      </main>
    )
  }
}

Home.contextTypes = {
  drizzle: PropTypes.object
}

export default Home
