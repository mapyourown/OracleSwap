import { drizzleConnect } from 'drizzle-react'
import React, { Component } from 'react'
import PropTypes from 'prop-types'
import * as testData from '../../../data/snapshot.json'
import { Box, Flex } from '@rebass/grid'
import {Radius} from '../basics/Style'
import { B, A, F, E, D } from '../basics/Colors.js'
import Text from '../basics/Text.js'
import Triangle from '../basics/Triangle.js'
import Circle from '../basics/Circle.js'
import {If, autoBind} from 'react-extras'

/*
 * Create component.
 */

class Contract extends Component {
  constructor(props, context) {
    super(props)
    autoBind(this)
    
    this.assetKey = ''
    this.asset_name = ''
    this.asset_id = ''
    this.state = {
      name: '',
      openMargin: 0,
      totalLongs: 0,
      totalShorts: 0,
      totalSubcontracts: 0,
      basis: 0,
      leverageRatio: 0,
      totalContracts: 0
    }
  }

  componentDidMount() {
    this.lookupName(this.props.id)
    this.calculateOpenMargin(this.props.id)
    this.calculateTotalShorts(this.props.id)
    this.calculateTotalLongs(this.props.id)
    this.calculateTotalSubcontracts(this.props.id)
    this.getBasis(this.props.id)
    this.getLeverage(this.props.id)
  }

  lookupName(id) {
    this.setState({ name:testData[this.props.id]["name"]})
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

  getBasis(id) {
    this.setState({
      basis:testData[this.props.id]["basis"]/1e4
    })
  }

  getLeverage(id) {
    this.setState({
      leverageRatio:testData[this.props.id]["leverageRatio"]/1e6
    })
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

    if (this.state.name)
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
                    <Text color={A} size="28px" weight="300">{this.state.name}</Text>
                </Box>
                <Flex
                px="10px"
                pb="10px">
                    <Box width={1}>
                        <Box><Text color={A} size="11px">Lev. Ratio</Text></Box>
                        <Box><Text color={A} size="16px">{this.state.leverageRatio.toFixed(1)}</Text></Box>
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
                        <Text color={A} size="10px">Long</Text> <Text color={A} size="10px" underline={E}>{this.state.totalLongs} Ξ</Text>
                    </Box>
                    <Box width={1/2}>
                        <Text color={A} size="10px">Short</Text> <Text color={A} size="10px" underline={E}>{this.state.totalShorts} Ξ</Text>
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
                        <Triangle margin="7px" color="#70B43F"/> <Text color={A} size="13px">Make or Take an offer</Text>
                    </Box>
                    <Box
                    onClick={ this.props.onClickPositions}
                    px="12px"
                    pt="7px"
                    pb="10px">
                        <Triangle margin="7px" color="#D55757" rotation="180deg"/> <Text color={A} size="13px">View My Positions</Text>
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

Contract.contextTypes = {
  drizzle: PropTypes.object
}


const mapStateToProps = state => {
  return {
    contracts: state.contracts
  }
}

/*<Box
                    px="12px"
                    pt="7px"
                    pb="9px"
                    onClick={this.props.onClickPositions}
                    style={{
                        borderBottom: `thin solid ${E}`
                    }}>
                        <Circle margin="16px" color="#20202b"/><Text color={A} size="13px">View my Positions</Text>
                    </Box>
*/

export default drizzleConnect(Contract, mapStateToProps)