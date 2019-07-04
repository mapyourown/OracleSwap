import React, { Component } from 'react'
//import * as testData from '../../../data/snapshot.json'
//import * as experiment from '../../../data/test.json'
import { drizzleConnect } from 'drizzle-react'
import PropTypes from 'prop-types'
import {autoBind} from 'react-extras'
import Text from '../basics/Text'

class OracleHistory extends Component {

  constructor(props, context) {
    super(props)
    autoBind(this)
    console.log(props)
    console.log(context)
    //console.log('splash:', testData)
    
    this.state = {
        contracts: [
            {
                asset: "ETHUSD",
                id: 0
            },
            {
                asset: "SPXUSD",
                id: 1
            },
            {
                asset: "BTCUSD",
                id: 2
            },
            {
                asset: "ETHBTC",
                id: 3
            }
        ],
    }

    this.assets= {
        0: "ETHUSD",
        1: "SPXUSD",
        2: "BTCUSD",
        3: "BTCETH"
    }

    this.contracts = context.drizzle.contracts
    this.drizzle = context.drizzle

    this.priceHistory = {}

  }

  componentDidMount() {
    Object.keys(this.assets).forEach(function(asset) {
        this.getOracleLogs(asset)
      }, this);
    
  }

  getOracleLogs(id) {
    const web3 = this.context.drizzle.web3
    const oracle = this.drizzle.contracts.Oracle
    const contractweb3 = new web3.eth.Contract(oracle.abi, oracle.address);
    var pricedata = [];
    contractweb3.getPastEvents(
      'PriceUpdated', 
      {
        filter: {id: id},
        fromBlock: 0,
        toBlock: 'latest'
      }
    ).then(function(events) { 
      events.forEach(function(element) {
        pricedata.push({
          blockNum: element.blockNumber, 
          price: element.returnValues.price, 
          time: element.returnValues.timestamp})
      }, this);
      this.priceHistory[id] = pricedata
    }.bind(this));
  }
  

  render() {

    if (Object.keys(this.priceHistory).length === 0)
      return (
        <Text size="20px" weight="200">No data to show</Text>
        )
    else 
    {
      return (
          <div>
              {Object.keys(this.priceHistory).map( id =>
                <div key={id}>
                  <Text size="25px" weight="200">Contract: {this.assets[id]}</Text> <br/>
                  {
                    this.priceHistory[id].map((event, index) =>
                      <div key={index}>
                        <Text size="15px" weight="200">Price: {event.price/1e6}</Text><br/>
                        <Text size="15px" weight="200">Timestamp: {event.time}</Text><br/>
                      </div>
                    )
                  }
                </div>
                  
              )}
          </div>
      )
    }
  }
}

OracleHistory.contextTypes = {
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

export default drizzleConnect(OracleHistory, mapStateToProps)
