import React, { Component } from 'react'
import { 
  ContractForm,
  AccountData
   } from 'drizzle-react-components'
import BookDataContainer from './BookDataContainer'
import MarginsContainer from './MarginsContainer'
import RatesContainer from './RatesContainer'
import LPPNLForm from '../ShowPNL/LPPNLForm'
import WithdrawForm from '../Withdraw/WithdrawForm'
import BookPNL from './BookPNL'

class LPHome extends Component {
  constructor(props, context) {
    super(props);

    this.contracts = context.drizzle.contracts
    this.drizzle = context.drizzle
    this.state = {
   	  toIncrease: 0,
      lpFundAmount: ''
    }

    this.lpFund = this.lpFund.bind(this)
    this.handleInputChange = this.handleInputChange.bind(this)

    this.bookKey = this.contracts.SwapMarket.methods.books.cacheCall(this.props.accounts[0])

  }

  handleInputChange(event) {
    const target = event.target;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const name = target.name;
    this.setState({
      [name]: value
    });
  }

  lpFund() {
    var amount = this.drizzle.web3.utils.toWei(this.state.lpFundAmount, 'ether')
    var stackID = this.contracts.SwapMarket.methods.lpFund.cacheSend(this.props.accounts[0], {value: amount})
    console.log('stackID', stackID)
  }


  render () {

  	return (
  	  <main className="container">
        <div className="pure-g">
		  		<div className="pure-u-1-1">
		        <h2>Active Account</h2>
		        <AccountData accountIndex="0" units="ether" precision="3" />
		        <BookDataContainer account={this.props.accounts[0]}/>
	      	</div>	

	      	<div className="pure-u-1-1">
            <MarginsContainer account={this.props.accounts[0]}/>
            <br/>
            <RatesContainer account={this.props.accounts[0]} />
          </div>

          <div className="pure-u-1-1">
            <BookPNL/>
          </div>

          <div className="pure-u-1-1">
            <h2>Trade Interactions</h2>
            <h3>Calculate Profit</h3>
            <LPPNLForm />
            <p>Cancel </p>
            <ContractForm contract="SwapMarket" method="playerCancel" sendArgs={{value: 1000000000000000000}} />
            <br/>
            <h3> Add Margin </h3>
            <p>Add margin to Book:</p>
            <label>Amount (in ETH): 
                <input name="lpFundAmount" type="number" value={this.state.lpFundAmount} onChange={this.handleInputChange} />
            </label>
            <button className="pure-button" type="button" onClick={this.lpFund}>Send Funds</button>
            <br/>
            <p>Burn</p>
            <ContractForm contract="SwapMarket" method="playerBurn" />
            <p>Move excess margin into balance</p>
            <ContractForm contract="SwapMarket" method="lpMarginWithdrawal" />
            <br/>
            <p>Change LP </p>
            <ContractForm contract="SwapMarket" method="changelp"/>
            <WithdrawForm />
          </div>
	    	</div>
      </main>
		)
  }
}

export default LPHome
