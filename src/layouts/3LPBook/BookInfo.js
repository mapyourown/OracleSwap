import React, { Component } from 'react'
import * as testData from '../../../data/snapshot.json'
//import * as experiment from '../../../data/test.json'
import { drizzleConnect } from 'drizzle-react'
import PropTypes from 'prop-types'
//import logo from '../../logo.png'

class BookInfo extends Component {

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
      totalLongs: 0,
      totalShorts: 0,
      totalSubcontracts: 0,
      basis: 0,
      leverageRatio: 0,
      totalContracts: 0,
      addOpen: 0,
      reduceOpen: 0,
      newLong: 0,
      newShort: 0,
      lps: {},

      lpAddress: '',
      bookAddress: '',
      longRate: '',
      shortRate: '',
      openMargin: '',
      currentLong: 0,
      currentShort: 0,
      pendingLong: 0,
      pendingShort: 0,
      cancelledLong: 0,
      cancelledShort: 0,

      takeAmount: 0,
      takerIsLong: "long"
    };
    
    this.state = initialState;

    this.handleChange = this.handleChange.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);

    this.lookupName = this.lookupName.bind(this);
    this.calculateOpenMargin = this.calculateOpenMargin.bind(this);
    this.calculateTotalLongs = this.calculateTotalLongs.bind(this);
    this.calculateTotalShorts = this.calculateTotalShorts.bind(this);
    this.calculateTotalSubcontracts = this.calculateTotalSubcontracts.bind(this);
    this.findValues = this.findValues.bind(this)
    this.getBasis = this.getBasis.bind(this)
    this.getLeverage = this.getLeverage.bind(this)
    this.getLPList = this.getLPList.bind(this)

    this.findLpInfo = this.findLpInfo.bind(this)

  }

  componentDidMount() {
    this.findValues(this.state.contractID)
  }

  lookupName(id) {
    this.setState({ name:testData[id]["name"]})
    //this.assetKey = this.contracts.MultiOracle.methods.assets.cacheCall(id)
  }

  calculateOpenMargin(id) {
    this.setState({
      openMargin:testData[id]["openMargin"]
    })
  }

  calculateTotalLongs(id) {
    var sum = 0;
    Object.keys(testData[id]["lps"]).forEach(function (lp) {
      sum += testData[id]["lps"][lp]['totalLong']
    }, this)
    this.setState({ totalLongs:sum})
  }

  calculateTotalShorts(id) {
    var sum = 0;
    Object.keys(testData[id]["lps"]).forEach(function (lp) {
      sum += testData[id]["lps"][lp]['totalShort']
    }, this)
    this.setState({totalShorts: sum})
  }

  calculateTotalSubcontracts(id) {
    var count = 0;
    Object.keys(testData[id]["lps"]).forEach(function (lp) {
      count += testData[id]["lps"][lp]['book']['subcontracts'].length
    }, this)
    this.setState({totalSubcontracts: count})
  }

  getBasis(id) {
    this.setState({
      basis:testData[id]["basis"]/1e4
    })
  }

  getLeverage(id) {
    this.setState({
      leverageRatio:testData[id]["leverageRatio"]/1e6
    })
  }

  getLPList(id) {
    var num_lps = 0
    var lp_dict = {}
    for (var lp in testData[id]["lps"]) {
      lp_dict[lp] = testData[id]["lps"][lp]
      if (num_lps > 20)
        break
      num_lps += 1
    }
    this.setState({lps: lp_dict})
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

  findLpInfo() {
    this.setState({
      bookAddress: testData[this.state.contractID]["lps"][this.state.lpAddress]['book']['address'],
      longRate: testData[this.state.contractID]["lps"][this.state.lpAddress]['longRate'],
      shortRate: testData[this.state.contractID]["lps"][this.state.lpAddress]['shortRate'],
      openMargin: testData[this.state.contractID]["lps"][this.state.lpAddress]['openMargin'],
      currentLong: 80,
      currentShort: 70,
      pendingLong: 50,
      pendingShort: 80,
      cancelledLong: 30,
      cancelledShort: 20,

    })

  }

  findValues(id) {
    this.lookupName(id)
    this.calculateOpenMargin(id)
    this.calculateTotalShorts(id)
    this.calculateTotalLongs(id)
    this.calculateTotalSubcontracts(id)
    this.getBasis(id)
    this.getLeverage(id)
    this.getLPList(id)
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
                </label>
              </form>
              <button className="pure-button" type="button" onClick={this.findLpInfo}>Lookup</button>
            </div>
            <br/>
            <div>
              <p><strong>LP Address: {this.state.lpAddress}</strong></p>
              <p>Book Address: {this.state.bookAddress}</p>
              <table>
                <tbody>
                  <tr>
                    <th>Basis Rate</th>
                    <th>Long Rate</th>
                    <th>Short Rate</th>
                  </tr>
                  <tr>
                    <td>{this.state.basis * 100}%</td>
                    <td>{this.state.longRate/100}%</td>
                    <td>{this.state.shortRate/100}%</td>
                  </tr>
                </tbody>
              </table>
              <p>Available Balance: {this.state.openMargin}</p>
            </div>
            <br/>
            <div>
              <h3>Take Contract</h3>
              <p>LP: {this.state.lpAddress}</p>
              <form>
                <label>
                  Take amount: 
                  <input name="takeAmount" type="text" value={this.state.takeAmount} onChange={this.handleInputChange} placeholder="eg. 10 ETH" />
                  <label>Side: 
                    <select name="takerIsLong" value={this.state.takerIsLong} onChange={this.handleInputChange} >
                      <option value="long">Long</option>
                      <option value="short">Short</option>
                    </select>
                  </label>
                  <button key="submit" type="button" onClick={this.handleSubmit}>Take</button>
                </label>
              </form>
            </div>

            <div>
              <p>Additional Details</p>
              <table>
                <tr>
                  <th>Type</th>
                  <th>Long</th>
                  <th>Short</th>
                  <th>Net</th>
                  <th>Actual</th>
                </tr>
                <tr>
                  <td>Current</td>
                  <td>{this.state.currentLong}</td>
                  <td>{this.state.currentShort}</td>
                  <td>{Math.abs(this.state.currentLong - this.state.currentShort)}</td>
                  <td>0</td>
                </tr>
                <tr>
                  <td>Pending&Stub</td>
                  <td>{this.state.pendingLong}</td>
                  <td>{this.state.pendingShort}</td>
                  <td>{Math.abs(this.state.pendingLong - this.state.pendingShort)}</td>
                  <td>0</td>
                </tr>
                <tr>
                  <td>Cancelled</td>
                  <td>{this.state.cancelledLong}</td>
                  <td>{this.state.cancelledShort}</td>
                  <td>{Math.abs(this.state.cancelledLong - this.state.cancelledShort)}</td>
                  <td>0</td>
                </tr>
                <tr>
                  <td>Expected</td>
                  <td>{this.state.currentLong + this.state.pendingLong - this.state.cancelledLong}</td>
                  <td>{this.state.currentShort + this.state.pendingShort - this.state.cancelledShort}</td>
                  <td>{Math.abs(this.state.currentLong + this.state.pendingLong - this.state.cancelledLong - (this.state.currentShort + this.state.pendingShort - this.state.cancelledShort))}</td>
                  <td>0</td>
                </tr>
              </table>

            </div>

            <br/>
            <br/>
            
            <DisplayLPs lps={this.state.lps} />
          </div>          
        </div>
      </main>
    )
  }
}

function DisplayLPs(props) {
  const listitems = Object.keys(props.lps).map( function(id) {
    var longMargin = props.lps[id]['totalLong'] 
    var shortMargin = props.lps[id]['totalShort']
    var reqMargin = Math.max(longMargin - shortMargin, shortMargin - longMargin)
    return(
      <tr key={id.toString()}>
        <td><a href="/subcontract">{id}</a></td>
        <td>{props.lps[id]['openMargin']}</td>
        <td>{props.lps[id]['longRate']/100}%</td>
        <td>{props.lps[id]['shortRate']/100}%</td>
        <td>{props.lps[id]['totalLong']}</td>
        <td>{props.lps[id]['totalShort']}</td>
        <td>{reqMargin}</td>
        <td>{props.lps[id]['actualMargin']}</td>
      </tr>
    );
  });
  return (
    <table>
      <tr>
        <th>LP Address</th>
        <th>Available Balance</th>
        <th>Current Long Rates</th>
        <th>Current Short Rates</th>
        <th>Current Long Balance</th>
        <th>Current Short Balance</th>
        <th>Required Margin</th>
        <th>Actual Margin</th>
      </tr>
      {listitems}
    </table>
    
  );
}


BookInfo.contextTypes = {
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

export default drizzleConnect(BookInfo, mapStateToProps);
