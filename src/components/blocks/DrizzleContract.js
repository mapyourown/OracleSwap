import { drizzleConnect } from 'drizzle-react'
import React, { Component } from 'react'
import PropTypes from 'prop-types'
import * as testData from '../../../data/snapshot.json'
import { Box, Flex } from '@rebass/grid'
import {Radius} from '../basics/Style'
import { B, A, E } from '../basics/Colors.js'
import Text from '../basics/Text.js'
import Triangle from '../basics/Triangle.js'
import {If, autoBind} from 'react-extras'

/*
 * Create component.
 */

class DrizzleContract extends Component {
  constructor(props, context) {
    super(props)
    autoBind(this)
    
    this.assetKey = ''
    this.asset_name = ''
    this.asset_id = this.props.id
    this.state = {
      name: '',
      id: 0,
      openMargin: 0,
      totalLongs: 0,
      totalShorts: 0,
      totalSubcontracts: 0,
      basis: 0,
      leverageRatio: 0,
      totalContracts: 0
    }
    this.contractDict = {
      0: "ETHSwap",
      1: "SPXSwap",
      2: "BTCSwap",
      3: "BTCETHSwap"
    }
    this.contractDict2 = {
      0: "ETHUSD",
      1: "SPXUSD",
      2: "BTCUSD",
      3: "BTCETH"
    }

    this.allLPKeys = {};
    this.contracts = context.drizzle.contracts
  }

  componentDidMount() {
    this.lookupName(this.props.id)
    this.getLeverage(this.props.id)
    this.getTakeLogs()
    /*this.lookupName(this.props.id)
    this.calculateOpenMargin(this.props.id)
    this.calculateTotalShorts(this.props.id)
    this.calculateTotalLongs(this.props.id)
    this.calculateTotalSubcontracts(this.props.id)
    this.getBasis(this.props.id)
    this.getLeverage(this.props.id)*/
  }

  lookupID(name) {
    let cont_id = this.contractDict[name];
    this.asset_id = cont_id;

  }

  lookupName(id) {
    this.assetKey = this.contracts.Oracle.methods.assets.cacheCall(id)
    //console.log(this.contracts.Oracle)
    //console.log(context.drizzle)
    //console.log(this.contracts)
    //console.log(this.props.oracle)
    //this.setState({ name:this.props.oracle.methods.assets.})
    //this.assetKey = this.contracts.MultiOracle.methods.assets.cacheCall(id)
  }

  calculateOpenMargin(id) {
    this.setState({
      openMargin:testData[this.props.id]["openMargin"]
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

  /*getOracleLogs(id) {
    const web3 = this.context.drizzle.web3
    const oracle = this.drizzle.contracts.MultiOracle
    const contractweb3 = new web3.eth.Contract(oracle.abi, oracle.address);
    var pricedata = [];
    contractweb3.getPastEvents(
      'PriceUpdated', 
      {
        filter: {_id: id},
        fromBlock: 0,
        toBlock: 'latest'
      }
    ).then(function(events) { 
      events.forEach(function(element) {
        if (element.returnValues._id == id)
          pricedata.push( {
            blockNum: element.blockNumber, 
            price: element.returnValues._price, 
            leverageRatio: element.returnValues._ratio,
            time: element.returnValues._timestamp})
      }, this);
      this.priceHistory[id] = pricedata
    }.bind(this));
  }*/

  getTakeLogs() {
    const web3 = this.context.drizzle.web3
    const assetContract = this.contracts[this.contractDict[this.asset_id]]
    const contractweb3 = new web3.eth.Contract(assetContract.abi, assetContract.address);
    var takelps = {};
    contractweb3.getPastEvents(
      'OrderTaken', 
      {
        //filter: {_id: id},
        fromBlock: 0,
        toBlock: 'latest'
      }
    ).then(function(events) { 
      events.forEach(function(element) {
        this.getLPInfo(element.returnValues.lp)
        takelps[element.returnValues.lp] = true;
      }, this);
    }.bind(this));
    console.log(takelps)
    this.allLPS = takelps;
  }

  getLPInfo(lp) {
    
    this.allLPKeys[lp] = this.contracts[this.contractDict[this.asset_id]].methods.getBookData.cacheCall(lp);
  }

  getBasis(id) {
    this.setState({
      basis:testData[this.props.id]["basis"]/1e4
    })
  }

  getLeverage(id) {
    //console.log(this.contracts[this.contractDict[id]])
    this.leverageKey = this.contracts[this.contractDict[id]].methods.leverageRatio.cacheCall()
  }

  render() {
    let totalLong = 0;
    let totalShort = 0;

    Object.keys(this.allLPKeys).forEach(function(key) {
      let bookData = {}
      if (this.allLPKeys[key] in this.props.contracts[this.contractDict[this.asset_id]].getBookData)
      {
        bookData = this.props.contracts[this.contractDict[this.asset_id]].getBookData[this.allLPKeys[key]].value
        totalLong += bookData.totalLong;
        totalShort += bookData.totalShort;
      }
    }, this);

    let asset = {};
    if (this.assetKey in this.props.contracts.Oracle.assets)
    {
      asset = this.props.contracts.Oracle.assets[this.assetKey].value
    }
    let leverageRatio = -1;
    if (this.leverageKey in this.props.contracts[this.contractDict[this.asset_id]].leverageRatio)
    {
      leverageRatio = this.props.contracts[this.contractDict[this.asset_id]].leverageRatio[this.leverageKey].value
    }

    let loaded = (Object.keys(asset).length !== 0) && (leverageRatio !== -1)
    if (loaded)
    {
      return (
        <Flex
        style={{
            borderRadius: Radius,
            overflow: "hidden",
            width: this.props.width
        }}>
          <Box width={1}>
            <Box
            style={{
                backgroundColor: this.props.color ? this.props.color : B
            }}>
                <Box
                px="10px"
                pt="5px">
                    <Text color={A} size="28px" weight="300">{hex_to_ascii(asset.name)}</Text>
                </Box>
                <Flex
                px="10px"
                pb="10px">
                    <Box width={1}>
                        <Box><Text color={A} size="11px">Lev. Ratio</Text></Box>
                        <Box><Text color={A} size="16px">{leverageRatio/100}</Text></Box>
                    </Box>
                </Flex>
                <Flex
                px="10px"
                pt="4px"
                pb="10px"
                style={{
                    borderBottom: `thin solid ${E}`
                }}>
                    <Box width={1/2}>
                        <Text color={A} size="10px">Long</Text> <Text color={A} size="10px" underline={E}>{totalLong/1e18} Ξ</Text>
                    </Box>
                    <Box width={1/2}>
                        <Text color={A} size="10px">Short</Text> <Text color={A} size="10px" underline={E}>{totalShort/1e18} Ξ</Text>
                    </Box>
                </Flex>
              </Box>
              <If
              condition={this.props.showActions}
              render={() =>
                <Box
                style={{
                    backgroundColor: B,
                    cursor: "pointer"
                }}>
                    <Box
                    px="12px"
                    pt="7px"
                    pb="9px"
                    onClick={this.props.onClickTake}
                    style={{
                        borderBottom: `thin solid ${E}`
                    }}>
                        <Triangle margin="7px" color="#70B43F"/> <a href={"/" + this.contractDict2[this.asset_id] + "/offers"} ><Text color={A} size="13px">Make or Take an offer</Text></a>
                    </Box>
                    <Box
                    onClick={ this.props.onClickPositions}
                    px="12px"
                    pt="7px"
                    pb="10px">
                        <Triangle margin="7px" color="#D55757" rotation="180deg"/> 
                        <a href={"/" + this.contractDict2[this.asset_id] +"/taker/" + this.props.accounts[0]} >
                          <Text color={A} size="13px">View My Taken Positions</Text>
                        </a>
                    </Box>
                </Box>
              }/>
          </Box>
        </Flex>
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

DrizzleContract.contextTypes = {
  drizzle: PropTypes.object
}


const mapStateToProps = state => {
  return {
    contracts: state.contracts,
    accounts: state.accounts,
    drizzleStatus: state.drizzleStatus
  }
}

export default drizzleConnect(DrizzleContract, mapStateToProps)