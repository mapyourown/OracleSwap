import React, { Component } from 'react'
import * as testData from '../../../data/snapshot.json'
import * as oracleData from '../../../data/oracle.json'
//import * as experiment from '../../../data/test.json'
import { drizzleConnect } from 'drizzle-react'
import PropTypes from 'prop-types'
//import logo from '../../logo.png'

class SubcontractInfo extends Component {

  constructor(props, context) {
    super(props);
    console.log(props);
    console.log(context);
    console.log('data:', testData)
    console.log('oracle:', oracleData)

    this.contracts = context.drizzle.contracts
    this.drizzle = context.drizzle

    var initialState = {
      contractID: 1,

      name: '',
      basis: 0,

      lpAddress: '',
      subcontractID: '',

      requiredMargin: 0,
      isCancelled: 0,
      isBurned: 0,
      side: 0,
      initialDay: 0,
      marginRate: 0,
      addMarginAmount: '',
      withdrawAmount: '',

      assetFinal: '',
      ethFinal: ''
    };
    
    this.state = initialState;

    this.handleChange = this.handleChange.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);

    this.lookupName = this.lookupName.bind(this);
    this.getBasis = this.getBasis.bind(this)
    this.findValues = this.findValues.bind(this)

    this.findSubcontractInfo = this.findSubcontractInfo.bind(this)

  }

  componentDidMount() {
    this.findValues(this.state.contractID)
  }

  lookupName(id) {
    this.setState({ name:testData[id]["name"]})
    //this.assetKey = this.contracts.MultiOracle.methods.assets.cacheCall(id)
  }

  getBasis(id) {
    this.setState({
      basis:testData[id]["basis"]/1e4
    })
  }

  handleChange(event) {
    this.setState({contractID: event.target.value});
    this.findValues(event.target.value)
  }

  handleInputChange(event) {
    this.setState({ [event.target.name]: event.target.value });
  }

  handleSubmit(event) {
    alert('Submitted!');
    event.preventDefault();
  }

  findSubcontractInfo() {
    var contract = testData[this.state.contractID]["lps"][this.state.lpAddress]["book"][this.state.subcontractID]
    this.setState({
      requiredMargin: contract['ReqMargin'],
      isCancelled: contract['isCancelled'],
      isBurned: contract['isBurned'],
      side:contract['Side'],
      initialDay: contract['InitialDay'],
      marginRate: contract['MarginRate']
    })
  }

  findValues(id) {
    this.lookupName(id)
    this.getBasis(id)
  }

  render() {

    return (
      <main className="container">
        <div className="pure-g">
          <div className="pure-u-1-1">
            <h1>Welcome to Smart Contract</h1>
            <div>
              <form onSubmit={this.handleSubmit}>
                <label>
                  Select Contract:
                  <select value={this.state.contractID} onChange={this.handleChange}>
                    <option value="1">SPX</option>
                    <option value="2">BTC</option>
                    <option value="3">ETH/BTC</option>
                  </select>
                </label>
              </form>
              <form onSubmit={this.handleSubmit}>
                <label>
                  Enter LP Address:
                  <input name="lpAddress" type="text" value={this.state.lpAddress} onChange={this.handleInputChange} placeholder="Address" />
                  <label>
                    Enter Subcontract ID:
                    <input name="subcontractID" type="text" value={this.state.subcontractID} onChange={this.handleInputChange} placeholder="ID" />
                  </label>
                </label>
              </form>
              <button className="pure-button" type="button" onClick={this.findSubcontractInfo}>Lookup</button>
            </div>
            <br/>
            <div>
              <p>Required Margin: {this.state.requiredMargin / 1e18}</p>
              <p>Cancelled? {this.state.isCancelled === 0 ? 'No' : 'Yes'}</p>
              <p>Burned? {this.state.isBurned === 0 ? 'No' : 'Yes'}</p>
              <p>Taker side: {this.state.side === 0 ? 'Long' : 'Short'}</p>
              <p>Leverage Ratio: {oracleData[this.state.contractID]["current"][this.state.initialDay].leverageRatio / 1e6}</p>
              <p>Margin Rate: {this.state.marginRate/100}%</p>
            </div>

            <h3>Profit Estimation </h3>
            <p>Projected LP PNL: {this.state.requiredMargin / 3.14 /1e18}</p>
            <form className="pure-form pure-form-stacked">
              <label>
                Set ETH Final Price: 
                <input name="ethFinal" type="text" value={this.state.ethFinal} onChange={this.handleInputChange} placeholder="200.00" />
              </label>
            </form>
            <br/>
            <form className="pure-form pure-form-stacked">
              <label>
                Set Asset Final Price: 
                <input name="assetFinal" type="text" value={this.state.assetFinal} onChange={this.assetFinal} placeholder="5282.29" />
              </label>
            </form>
            <br/>
            <p>Required Margin: {this.state.requiredMargin/1e18}</p>
            <p>Taker Actual Margin: {(this.state.requiredMargin + this.state.requiredMargin * (1/3.14))/1e18}</p>
            <p>Is this the final price? {'NO'} </p>

            <h3>Oracle Prices </h3>
            <table>
              <tbody>
                <tr>
                  <th>Day ID </th>
                  <th>ETH Price </th>
                  <th>{this.state.name} Price </th>
                </tr>
                <tr>
                  <td>0</td>
                  <td>{oracleData[0]["current"][0]['price']/1e6}</td>
                  <td>{oracleData[this.state.contractID]["current"][0]['price']/1e6}</td>
                </tr>
                <tr>
                  <td>1</td>
                  <td>{oracleData[0]["current"][1]['price']/1e6}</td>
                  <td>{oracleData[this.state.contractID]["current"][1]['price']/1e6}</td>
                </tr>
                <tr>
                  <td>2</td>
                  <td>{oracleData[0]["current"][2]['price']/1e6}</td>
                  <td>{oracleData[this.state.contractID]["current"][2]['price']/1e6}</td>
                </tr>
                <tr>
                  <td>3</td>
                  <td>{oracleData[0]["current"][3]['price']/1e6}</td>
                  <td>{oracleData[this.state.contractID]["current"][3]['price']/1e6}</td>
                </tr>
                <tr>
                  <td>4</td>
                  <td>{oracleData[0]["current"][4]['price']/1e6}</td>
                  <td>{oracleData[this.state.contractID]["current"][4]['price']/1e6}</td>
                </tr>
              </tbody>
            </table>

            <h3>Actions</h3>
            <form className="pure-form pure-form-stacked">
              <label>
                Add Margin: 
                <input name="addMarginAmount" type="text" value={this.state.addMarginAmount} onChange={this.handleInputChange} placeholder="amount in ETH" />
                <button key="submit" type="button" onClick={this.handleSubmit}>Add</button>
              </label>
            </form>
            <br/>
            <form className="pure-form pure-form-stacked">
              <label>
                Withdraw Margin: 
                <input name="withdrawAmount" type="text" value={this.state.withdrawAmount} onChange={this.handleInputChange} placeholder="amount in ETH" />
                <button key="submit" type="button" onClick={this.handleSubmit}>Withdraw</button>
              </label>
            </form>
            <br/>
            <form className="pure-form pure-form-stacked">
              <label>
                Withdraw Balance: 
                <button key="submit" type="button" onClick={this.handleSubmit}>Withdraw</button>
              </label>
            </form>
            <br/>
            <form className="pure-form pure-form-stacked">
              <label>
                Burn: 
                <button key="submit" type="button" onClick={this.handleSubmit}>Burn</button>
              </label>
            </form>
            <br/>
            <form className="pure-form pure-form-stacked">
              <label>
                Cancel: 
                <button key="submit" type="button" onClick={this.handleSubmit}>Cancel</button>
              </label>
            </form>
          </div>          
        </div>
      </main>
    )
  }
}

function DisplayTakenContracts(props) {
  const listitems = props.contracts.map( function(contract) {
    return(
      <tr key={contract['subcontractId'].toString()}>
        <td><a href="/">{contract['subcontractId']}</a></td>
        <td>{contract['lpAddress']}</td>
        <td>{contract['requiredMargin']/1e18}</td>
        <td>{contract['side'] === 0 ? 'Long' : 'Short'}</td>
        <td>{contract['isCancelled'] === 0 ? 'No' : 'Yes'}</td>
        <td>{contract['isBurned'] === 0 ? 'No' : 'Yes'}</td>
      </tr>
    );
  });
  return (
    <table>
      <tbody>
        <tr>
          <th>Subcontract ID</th>
          <th>LP Address</th>
          <th>Required Margin</th>
          <th>Side</th>
          <th>Is Cancelled?</th>
          <th>Is Burned?</th>
        </tr>
        {listitems}
      </tbody>
    </table>
    
  );
}


SubcontractInfo.contextTypes = {
  drizzle: PropTypes.object
}

// May still need this even with data function to refresh component on updates for this contract.
const mapStateToProps = state => {
  return {
    accounts: state.accounts,
    contracts: state.contracts,
    drizzleStatus: state.drizzleStatus
  }
}

export default drizzleConnect(SubcontractInfo, mapStateToProps);
