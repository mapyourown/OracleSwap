import React, { Component } from 'react'
//import logo from '../../logo.png'


class Home extends Component {

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
            <h1>Smart Contract Interface</h1>
            <ul className="nav">
              <li><a href="/">Home</a></li>
              <li><a href="/make">Liquidity Provider Page</a></li>
              <li><a href="/take">Taker Page </a></li>
              <li><a href="/oracle">Show Oracle</a></li>
              <li><a href="/multi">Admin Page</a></li>
            </ul>
          </div>          
        </div>
      </main>
    )
  }
}

export default Home
