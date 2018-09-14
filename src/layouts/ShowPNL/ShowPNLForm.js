import { drizzleConnect } from 'drizzle-react'
import React, { Component } from 'react'
import PropTypes from 'prop-types'
import ShowPNL from './ShowPNL'
import Book from './../../../build/contracts/Book.json'

/*
 * Create component.
 */

class ShowPNLForm extends Component {
  constructor(props, context) {
    super(props);

    console.log('PNL props', props)
    console.log('PNL context', context)
    this.drizzle = context.drizzle;
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);

    this.contracts = context.drizzle.contracts;


    this.state = {
      /*makerAddress: '0x49f4a41075bB0CEadcd29fc2063Db3dB717c5D0f',
      bookAddress: '0xe268e5b9d27c2B5a0303168f0348C7C18c751c87',
      subcontractID: '0x4ef511263fd7b50903db64fa7007697880bfb62495f17c2a83007507042da827'*/
      makerAddress: '',
      bookAddress: '',
      subcontractID: ''
    };
  }

  handleSubmit() {
  	var config = {
      contractName: 'Book',
      web3Contract: new this.drizzle.web3.eth.Contract(Book.abi, this.state.bookAddress)
    }
    this.drizzle.addContract(config)
    console.log('drizzle at submit', this.drizzle)
    this.keys = {};
    this.keys.ratesKey = this.contracts.SwapMarket.methods.rates.cacheCall(this.state.makerAddress)
    this.keys.basisKey = this.contracts.SPX_Oracle.methods.basis.cacheCall()
    this.keys.subcontractKey = this.drizzle.contracts.Book.methods.getSubcontract.cacheCall(this.state.subcontractID)
    this.keys.assetPriceKey = this.contracts.SPX_Oracle.methods.getPrice.cacheCall()
    this.keys.assetPricesKey = this.contracts.SPX_Oracle.methods.getPrices.cacheCall()
    this.keys.ethPriceKey = this.contracts.ETH_Oracle.methods.getPrice.cacheCall()
    this.keys.ethPricesKey = this.contracts.ETH_Oracle.methods.getPrices.cacheCall()
  }

  handleInputChange(event) {
    this.setState({ [event.target.name]: event.target.value });
  }

  render() {

    return (
      <div>
        <ShowPNL keys={this.keys} newState={this.drizzle.store.getState()} maker={this.state.makerAddress} id={this.state.subcontractID} />
        <br/>
        <form className="pure-form pure-form-stacked">
          <input name="makerAddress" type="text" value={this.state.makerAddress} onChange={this.handleInputChange} placeholder="LP Address" />
          <input name="bookAddress" type="text" value={this.state.bookAddress} onChange={this.handleInputChange} placeholder="Book Address" />
          <input name="subcontractID" type="text" value={this.state.subcontractID} onChange={this.handleInputChange} placeholder="Subcontract ID" />
          <button key="submit" className="pure-button" type="button" onClick={this.handleSubmit}>View PNL</button>
        </form>
      </div>
    )
  }
}

ShowPNLForm.contextTypes = {
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

export default drizzleConnect(ShowPNLForm, mapStateToProps)