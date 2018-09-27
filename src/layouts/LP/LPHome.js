import React, { Component } from 'react'
import { 
  ContractData,
  ContractForm,
  AccountData
   } from 'drizzle-react-components'
import BookDataContainer from './BookDataContainer'
import MarginsContainer from './MarginsContainer'
import RatesContainer from './RatesContainer'
import LPPNLForm from './LPPnlForm'

class LPHome extends Component {
  constructor(props, context) {
    super(props);
    console.log('props', props);
    console.log('context', context);
    console.log(this.props.accounts[0])

    this.contracts = context.drizzle.contracts
    this.drizzle = context.drizzle
    this.state = {
   	  toIncrease: 0
    }

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
            <h2>Trade Interactions</h2>
            <LPPNLForm />
            <p>Cancel </p>
            <ContractForm contract="SwapMarket" method="playerCancel" sendArgs={{value: 1000000000000000000}} />
            <br/>
            <p>Burn</p>
            <ContractForm contract="SwapMarket" method="playerBurn" />
            <p>Move excess margin into balance</p>
            <ContractForm contract="SwapMarket" method="lpMarginWithdrawal" />
            <br/>
            <p>Current Balance</p>
            <ContractData contract="SwapMarket" method="balances" methodArgs={[this.props.accounts[0]]}/>
            <label>Collect Balance 
              <ContractForm contract="SwapMarket" method="withdrawBalance" />
            </label>
          </div>
	    	</div>
      </main>
		)
  }
}

export default LPHome
