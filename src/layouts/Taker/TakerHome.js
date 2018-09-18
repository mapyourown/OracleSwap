import React, { Component } from 'react'
import { 
  ContractData,
  ContractForm,
  AccountData
   } from 'drizzle-react-components'
import GetMakers from './GetMakers'

class TakerHome extends Component {
  constructor(props, context) {
    super(props);
    console.log('props', props);
    console.log('context', context);

    this.state = {
      takerFundLP: '',
      takerFundID: '',
      takerFundAmount: '',
      takeAmount: '',
      takeMakerAddress: '',
      takerIsLong: true

    }

    this.contracts = context.drizzle.contracts
    this.drizzle = context.drizzle

    this.takerFund = this.takerFund.bind(this)
    this.take = this.take.bind(this)
    this.getTakerSubcontracts = this.getTakerSubcontracts.bind(this)
    this.handleInputChange = this.handleInputChange.bind(this)
    this.addSubcontract = this.addSubcontract.bind(this)
    this.takerTradeEvents = []
    this.takerSubcontractKeys = {}

  }

  take() {
    var amount = this.drizzle.web3.utils.toWei(this.state.takeAmount, 'ether')
    const side = (this.state.takerIsLong === "long")
    console.log(side)
    var stackID = this.contracts.SwapMarket.methods.take.cacheSend(this.state.takeMakerAddress, this.state.takeAmount, side, {value: amount})
    console.log('stackID', stackID)
  }

  takerFund() {
    var amount = this.drizzle.web3.utils.toWei(this.state.takerFundAmount, 'ether')
    var stackID = this.contracts.SwapMarket.methods.takerFund.cacheSend(this.state.takerFundLP, this.state.takerFundID, {value: amount})
    console.log('stackID', stackID)
  }

  getTakerSubcontracts() {
    const web3 = this.drizzle.web3
    const swapcontract = this.drizzle.contracts.SwapMarket
    const contractweb3 = new web3.eth.Contract(swapcontract.abi, swapcontract.address);
    //console.log(contractweb3)
    const takerAddr = this.props.accounts[0];
    contractweb3.getPastEvents(
      'OrderTaken', 
      {
        filter: {taker:takerAddr},
        fromBlock: 0,
        toBlock: 'latest'
      }
    ).then(function(events) { 
      console.log(events)
      events.forEach(function(element) {
        this.addSubcontract(element.returnValues._maker, element.returnValues.id)
      }, this);
    }.bind(this));
  }

  addSubcontract(_maker, _id){
    var keyID = this.contracts.SwapMarket.methods.getSubcontractData.cacheCall(_maker, _id)
    this.takerSubcontractKeys[_id] = {key: keyID, maker: _maker}
  }

  handleInputChange(event) {
    const target = event.target;
    const value = target.value;
    const name = target.name;
    this.setState({
      [name]: value
    });
  }

  render () {

    var takerSubcontracts = {}
    Object.keys(this.takerSubcontractKeys).forEach(function (id) {
      takerSubcontracts[id] = {}
      if (this.takerSubcontractKeys[id].key in this.props.contracts.SwapMarket.getSubcontractData)
      {
          takerSubcontracts[id] = this.props.contracts.SwapMarket.getSubcontractData[this.takerSubcontractKeys[id].key].value
          takerSubcontracts[id].maker = this.takerSubcontractKeys[id].maker
      }

    }, this);

  	return (
  	  <main className="container">
        <div className="pure-g">
		  		<div className="pure-u-1-1">
		        <h2>Active Account</h2>
		        <AccountData accountIndex="0" units="ether" precision="3" />
            <GetMakers />
            <br/>
            <h2>Take</h2>
            <form className="pure-form pure-form-stacked">
              <label> Maker Address: 
                <input name="takeMakerAddress" type="text" value={this.state.takeMakerAddress} onChange={this.handleInputChange} placeholder="Address" />
              </label>
              <label>Amount in ETH:
                <input name="takeAmount" type="number" value={this.state.takeAmount} onChange={this.handleInputChange} placeholder="amount in ETH" />
              </label>
              <label>Side: 
                <select name="takerIsLong" value={this.state.takerIsLong} onChange={this.handleInputChange} >
                  <option value="long">Long</option>
                  <option value="short">Short</option>
                </select>
              </label>
              <button className="pure-button" type="button" onClick={this.take}>Take</button>
            </form>
            <br/>
            <DisplaySubcontracts subcontracts={takerSubcontracts} />
            <button className="pure-button" type="button" onClick={this.getTakerSubcontracts}>Show My Taken Contracts</button>
            <br/>
            <p>Add margin to a Subcontract:</p>
            <label>LP: 
                <input name="takerFundLP" type="text" value={this.state.takerFundLP} onChange={this.handleInputChange} />
            </label>
            <br/>
            <label>Subcontract ID: 
                <input name="takerFundID" type="text" value={this.state.takerFundID} onChange={this.handleInputChange} />
            </label>
            <br/>
            <label>Amount (in ETH): 
                <input name="takerFundAmount" type="number" value={this.state.takerFundAmount} onChange={this.handleInputChange} />
            </label>
            <br/>
            <button className="pure-button" type="button" onClick={this.takerFund}>Send Funds</button>
            <br/>
            <h2>Trade Interactions</h2>
            <p>Cancel </p>
            <ContractForm contract="SwapMarket" method="playerCancel" sendArgs={{value: 1000000000000000000}} />
            <br/>
            <p>Burn</p>
            <ContractForm contract="SwapMarket" method="playerBurn" />
            <p>Move excess margin into balance</p>
            <ContractForm contract="SwapMarket" method="takerWithdrawal" />
            <br/>
            <p>Current Balance</p>
            <ContractData contract="SwapMarket" method="balances" methodArgs={[this.props.accounts[0]]}/>
            <p>Collect Balance </p>
            <ContractForm contract="SwapMarket" method="collectBalance" />
	      	</div>	
	    	</div>
      </main>
		)
  }
}

function DisplaySubcontracts(props) {
  const listitems = Object.keys(props.subcontracts).map( function(id) {
    var side;
    var rmAmount = props.subcontracts[id].reqMargin/1e18;
    var takerMarginAmount = props.subcontracts[id].takerMargin/1e18;
    var status = "Ongoing";
    if (props.subcontracts[id].side)
      side = "Long"
    else
      side = "Short"

    if (props.subcontracts[id].isCancelled)
      status = "Cancelled"
    if (props.subcontracts[id].isBurned)
      status = "Burned"

    return(
        <li key={id.toString()}>
          <p>Subcontract ID: {id}</p>
          <p>LP: {props.subcontracts[id].maker}</p>
          <p>Taker: {props.subcontracts[id].taker}</p>
          <p>Required Margin: {rmAmount}</p>
          <p>Taker Margin: {takerMarginAmount}</p>
          <p>LP Side: {side}</p>
          <p>First Day ID: {props.subcontracts[id].initialDay}</p>
          <p>Status: {status}</p>
        </li>
      );
  });
  return (
    <ul>{listitems}</ul>
  );
}

export default TakerHome
