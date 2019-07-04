import { drizzleConnect } from 'drizzle-react'
import React, { Component } from 'react'
import PropTypes from 'prop-types'
import * as testData from '../../../data/snapshot.json'

/*
 * Create component.
 */

class ContractBrief extends Component {
  constructor(props, context) {
    super(props);

    this.lookupName = this.lookupName.bind(this);

    //console.log(testData);

    /*this.contracts = context.drizzle.contracts;

    // Get the contract ABI

    this.idKey = this.contracts[this.props.contract].methods.ASSET_ID.cacheCall(); */
    
    this.assetKey = ''
    this.asset_name = ''
    this.asset_id = ''
    var initialState = {};
    this.lookupName(this.props.id)
    this.state = initialState;
  }

  lookupName(id) {
    //this.assetKey = this.contracts.MultiOracle.methods.assets.cacheCall(id)
  }


  render() {
    /*if (this.idKey in this.props.contracts[this.props.contract].ASSET_ID && this.asset_id === '')
    {
      this.asset_id = this.props.contracts[this.props.contract].ASSET_ID[this.idKey].value
    }

    var asset = {};
    if (this.assetKey in this.props.contracts.MultiOracle.assets)
    {
      asset = this.props.contracts.MultiOracle.assets[this.assetKey].value
    }*/
    var asset = {}
    asset.name = 'SPX'
    asset.currentBasis = 222.111

    if (asset.name)
    {
      return (
        <div>
          <h2><a href="/offers">Name: {hex_to_ascii(asset.name)}</a></h2>
          <p>Available margin: {314}</p>
          <p>Total longs: {314}</p>
          <p>Total Shorts: {314}</p>
          <p>Current Leverage: {3.14}</p>
          <p>Current Basis: {asset.currentBasis}</p>
        </div>
      )
    }
    else
    {
      return (
        <div>
          <p>Loading</p>
        </div>
      )
    }
  }
}

function hex_to_ascii(str1)
{
  var hex  = str1.toString();
  var str = '';
  for (var n = 0; n < hex.length; n += 2) {
    str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
  }
  return str;
}

ContractBrief.contextTypes = {
  drizzle: PropTypes.object
}


const mapStateToProps = state => {
  return {
    contracts: state.contracts
  }
}

export default drizzleConnect(ContractBrief, mapStateToProps)