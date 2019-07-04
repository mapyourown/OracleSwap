import React, { Component } from 'react'
import ContractOffers from './ContractOffers'
//import logo from '../../logo.png'


class Offers extends Component {

  constructor(props, context) {
    super(props);
    console.log(props);
    console.log(context);

    this.contracts = context.drizzle.contracts
    this.drizzle = context.drizzle
    this.handleInputChange = this.handleInputChange.bind(this)

    this.state = {
      selectedAssetID: "1"
    }

  }

  handleInputChange(event) {
    const target = event.target;
    const value = target.value;
    const name = target.name;
    this.setState({
      [name]: value
    });
  }

  render() {

    return (
      <main className="container">
        <div className="pure-g">
          <div className="pure-u-1-1">
            <h1>Offers</h1>
            <form className="pure-form pure-form-stacked">
              <label>Asset: 
                <select name="selectedAssetID" value={this.state.selectedAssetID} onChange={this.handleInputChange} >
                  <option value="1">SPX/USD</option>
                  <option value="2">BTC/USD</option>
                  <option value="3">ETH/BTC</option>
                </select>
              </label>
            </form> 
          </div>  
          <div className="pure-u-1-1">
            <div>
              <ContractOffers contract={stateToContract(this.state.selectedAssetID)} id={this.state.selectedAssetID} />
            </div>   
          </div>
        </div>
      </main>
    )
  }
}

function stateToContract(id)
{
  if (id === "1")
    return "SPXSwap"
  if (id === "2")
    return "BTCSwap"
  if (id === "3")
    return "ETHBTCSwap"
}

export default Offers
