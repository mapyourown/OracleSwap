import { drizzleConnect } from 'drizzle-react'
import React, { Component } from 'react'
import PropTypes from 'prop-types'
import DisplayRates from './DisplayRates'

/*
 * Create component.
 */

class RatesForm extends Component {
  constructor(props, context) {
    super(props);

    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);

    this.contracts = context.drizzle.contracts;


    this.state = {
      makerAddress: ''
    };
  }

  handleSubmit() {
    this.ratesKey = this.contracts.SwapMarket.methods.rates.cacheCall(this.state.makerAddress)
    console.log ('test', this.state.makerAddress)
    console.log('key', this.ratesKey)
  }

  handleInputChange(event) {
    this.setState({ [event.target.name]: event.target.value });
  }

  render() {

    return (
      <div>
        <div>
          <DisplayRates ratesKey={this.ratesKey} />
        </div>
        <form className="pure-form pure-form-stacked">
          <input name="makerAddress" type="text" value={this.state.makerAddress} onChange={this.handleInputChange} placeholder="Address" />
          <button key="submit" className="pure-button" type="button" onClick={this.handleSubmit}>Submit</button>
        </form>
      </div>
    )
  }
}

RatesForm.contextTypes = {
  drizzle: PropTypes.object
}

/*
 * Export connected component.
 */

const mapStateToProps = state => {
  return {
    contracts: state.contracts
  }
}

export default drizzleConnect(RatesForm, mapStateToProps)