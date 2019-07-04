import React, { Component } from 'react'
import * as testData from '../../../data/snapshot.json'
//import * as experiment from '../../../data/test.json'
import { drizzleConnect } from 'drizzle-react'
import PropTypes from 'prop-types'
//import logo from '../../logo.png'

class TakerInfo extends Component {

  constructor(props, context) {
    super(props);
    console.log(props);
    console.log(context);
    console.log('data:', testData)

    this.contracts = context.drizzle.contracts
    this.drizzle = context.drizzle

    var initialState = {
      contractID: 1,

      name: '',
      lps: {},

      takerAddress: '',
      takerContracts: []
    };
    
    this.state = initialState;

    this.handleChange = this.handleChange.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);

    this.lookupName = this.lookupName.bind(this);
    this.findValues = this.findValues.bind(this)

    this.findTakerInfo = this.findTakerInfo.bind(this)

  }

  componentDidMount() {
    this.findValues(this.state.contractID)
  }

  lookupName(id) {
    this.setState({ name:testData[id]["name"]})
    //this.assetKey = this.contracts.MultiOracle.methods.assets.cacheCall(id)
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

  findTakerInfo() {
    var contracts = testData[this.state.contractID]["takers"][this.state.takerAddress]
    for (var i in contracts) {
      var lp = contracts[i].lpAddress
      var subid = contracts[i].subcontractId
      contracts[i]['requiredMargin'] = testData[this.state.contractID]["lps"][lp]["book"][subid]["ReqMargin"]
      contracts[i]['side'] = testData[this.state.contractID]["lps"][lp]["book"][subid]["Side"]
      contracts[i]['isCancelled'] = testData[this.state.contractID]["lps"][lp]["book"][subid]["isCancelled"]
      contracts[i]['isBurned'] = testData[this.state.contractID]["lps"][lp]["book"][subid]["isBurned"]
    }
    this.setState({takerContracts: contracts})
  }

  findValues(id) {
    this.lookupName(id)
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
                  Enter Taker Address:
                  <input name="takerAddress" type="text" value={this.state.takerAddress} onChange={this.handleInputChange} placeholder="Address" />
                </label>
              </form>
              <button className="pure-button" type="button" onClick={this.findTakerInfo}>Lookup</button>
            </div>
            <br/>
            <div>
              <DisplayTakenContracts contracts={this.state.takerContracts} />
            </div>
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
        <td><a href="/subcontract">{contract['subcontractId']}</a></td>
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


TakerInfo.contextTypes = {
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

export default drizzleConnect(TakerInfo, mapStateToProps);
