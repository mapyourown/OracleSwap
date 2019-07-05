import { drizzleConnect } from 'drizzle-react'
import React, { Component } from 'react'
import PropTypes from 'prop-types'

const exampleData = {
  "0x1234567890123456789012345678901234567890" : {
    bookAddress: "0xAAA00000000000000000000000",
    rates: {
      currentLong: 1000,
      currentShort: -40
    },
    margin: 25*1e18,
    bookData: {
      totalLong: 12*1e18,
      totalShort: 10*1e18
    }
  },
  "0xABC123ABC123ABC123ABC123ABC123ABC123ABC1" : {
    bookAddress: "0xBBB00000000000000000000000",
    rates: {
      currentLong: 900,
      currentShort: -40
    },
    margin: 100*1e18,
    bookData: {
      totalLong: 65*1e18,
      totalShort: 49*1e18
    }
  },
  "0xA1A1A1A1A1A1A1A1A1A1A1A1A1A1A1A1A1A1A1A1" : {
    bookAddress: "0xCCC00000000000000000000000",
    rates: {
      currentLong: -50,
      currentShort: 60
    },
    margin: 1*1e18,
    bookData: {
      totalLong: 10*1e18,
      totalShort: 11*1e18
    }
  },
}
class LPDetails extends Component {

  constructor(props, context) {
    super(props);
    console.log(props);
    console.log(context);

    this.contracts = context.drizzle.contracts
    this.drizzle = context.drizzle
    this.handleInputChange = this.handleInputChange.bind(this)

    this.state = {
      selectedAssetID: "1",
      lpAddress: "0x1234567890123456789012345678901234567890"
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
              <label> LP Address: 
                <input name="lpAddress" type="text" value={this.state.lpAddress} onChange={this.handleInputChange} placeholder="Address" />
              </label>
            </form> 
          </div>  
          <div className="pure-u-1-1">
            <div>
              
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

export default LPDetails
