import React, { Component } from 'react'
import ContractBrief from './ContractBrief'
//import logo from '../../logo.png'


class Splash extends Component {

  constructor(props, context) {
    super(props);
    console.log(props);
    console.log(context);

    this.contracts = context.drizzle.contracts
    this.drizzle = context.drizzle

  }

  render() {

    return (
      <main className="container">
        <div className="pure-g">
          <div className="pure-u-1-1 header">
            <h1>Welcome to Smart Swap</h1>
            <ul className="nav">
              <li><ContractBrief contract="SPXSwap" id="1" /></li>
              <li><ContractBrief contract="BTCSwap" id="2"/></li>
              <li><ContractBrief contract="ETHBTCSwap" id="3" /></li>
            </ul>
            <ul className="other_links">
              <li><a href="/">White Paper</a></li>
              <li><a href="/">Technical Appendix</a></li>
              <li><a href="/">Cheat Strategy</a></li>
              <li><a href="/">Excel Simulation </a></li>
              <li><a href="/">Historical VIX/SPX data</a></li>
              <li><a href="/">Historical BTC/ETH data</a></li>
            </ul>
          </div>          
        </div>
      </main>
    )
  }
}

export default Splash
