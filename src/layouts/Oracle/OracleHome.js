import React, { Component } from 'react'
import { drizzleConnect } from 'drizzle-react'
import { 
  ContractData,
  ContractForm,
  AccountData
   } from 'drizzle-react-components'

class OracleHome extends Component {
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
	      	</div>
          <div className="pure-u-1-1">
            <h2>Oracle Operations</h2>
            <h3>ETH Oracle </h3>
            <p><strong>Price: </strong><ContractData contract="ETH_Oracle" method="getPrice" methodArgs={[{from: this.props.accounts[0]}]}/></p>
            <p><strong>Day: </strong><ContractData contract="ETH_Oracle" method="currentDay"/></p>
            <p><strong>Last Wednesday: </strong><ContractData contract="ETH_Oracle" method="lastPrice" /></p>
            <p>New Daily Price: </p>
            <ContractForm contract="ETH_Oracle" method="setIntraweekPrice" sendArgs={{from: this.props.accounts[0]}}/>
            <p>New Final Intraweek Price (Tuesday Price) </p>
            <ContractForm contract="ETH_Oracle" method="setFinalIntraweekPrice" sendArgs={{from: this.props.accounts[0]}}/>
            <p>New Wednesday Settle Price </p>
            <ContractForm contract="ETH_Oracle" method="weeklySettlePrice" sendArgs={{from: this.props.accounts[0]}}/>
            <p>Wednesday Settle Price, new basis included </p>
            <ContractForm contract="ETH_Oracle" method="weeklySettlePriceWithBasis" sendArgs={{from: this.props.accounts[0]}}/>
            <h3>SPX Oracle </h3>
            <p><strong>Price: </strong><ContractData contract="SPX_Oracle" method="getPrice" methodArgs={[{from: this.props.accounts[0]}]}/></p>
            <p><strong>Day: </strong><ContractData contract="SPX_Oracle" method="currentDay"/></p>
            <p><strong>Last Wednesday: </strong><ContractData contract="SPX_Oracle" method="lastPrice" /></p>
            <p>New Daily Price: </p>
            <ContractForm contract="SPX_Oracle" method="setIntraweekPrice" sendArgs={{from: this.props.accounts[0]}}/>
            <p>New Final Intraweek Price (Tuesday Price) </p>
            <ContractForm contract="SPX_Oracle" method="setFinalIntraweekPrice" sendArgs={{from: this.props.accounts[0]}}/>
            <p>New Wednesday Settle Price </p>
            <ContractForm contract="SPX_Oracle" method="weeklySettlePrice" sendArgs={{from: this.props.accounts[0]}}/>
            <h3>VIX Oracle </h3>
            <p><strong>Price: </strong><ContractData contract="VIX_Oracle" method="getPrice" methodArgs={[{from: this.props.accounts[0]}]}/></p>
            <p><strong>Day: </strong><ContractData contract="VIX_Oracle" method="currentDay"/></p>
            <p><strong>Last Wednesday: </strong><ContractData contract="VIX_Oracle" method="lastPrice" /></p>
            <p>New Daily Price: </p>
            <ContractForm contract="VIX_Oracle" method="setIntraweekPrice" sendArgs={{from: this.props.accounts[0]}}/>
            <p>New Final Intraweek Price (Tuesday Price) </p>
            <ContractForm contract="VIX_Oracle" method="setFinalIntraweekPrice" sendArgs={{from: this.props.accounts[0]}}/>
            <p>New Wednesday Settle Price </p>
            <ContractForm contract="VIX_Oracle" method="weeklySettlePrice" sendArgs={{from: this.props.accounts[0]}}/>
            <h3>BTC Oracle </h3>
            <p><strong>Price: </strong><ContractData contract="BTC_Oracle" method="getPrice" methodArgs={[{from: this.props.accounts[0]}]}/></p>
            <p><strong>Day: </strong><ContractData contract="BTC_Oracle" method="currentDay"/></p>
            <p><strong>Last Wednesday: </strong><ContractData contract="BTC_Oracle" method="lastPrice" /></p>
            <p>New Daily Price: </p>
            <ContractForm contract="BTC_Oracle" method="setIntraweekPrice" sendArgs={{from: this.props.accounts[0]}}/>
            <p>New Final Intraweek Price (Tuesday Price) </p>
            <ContractForm contract="BTC_Oracle" method="setFinalIntraweekPrice" sendArgs={{from: this.props.accounts[0]}}/>
            <p>New Wednesday Settle Price </p>
            <ContractForm contract="BTC_Oracle" method="weeklySettlePrice" sendArgs={{from: this.props.accounts[0]}}/>
            <h3>Pause All Contracts</h3>
            <ContractForm contract="SwapMarket" method="pause" sendArgs={{from: this.props.accounts[0]}}/>
          </div>

          <div className="pure-u-1-1">
            <h2>Settlement Functions</h2>
            <h3>1. First Price</h3>
            <ContractForm contract="SwapMarket" method="firstPrice" sendArgs={{from: this.props.accounts[0]}}/>
            <h3>2. Calculate Returns</h3>
            <ContractForm contract="SwapMarket" method="computeReturns" sendArgs={{from: this.props.accounts[0]}}/>
            <h3>3. Settle Liquidity Provider</h3>
            <ContractForm contract="SwapMarket" method="settle" sendArgs={{from: this.props.accounts[0]}}/>
          </div>
          
	    	</div>
      </main>
		)
  }
}

export default OracleHome
