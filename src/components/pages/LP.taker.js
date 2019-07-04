import React, { Component } from 'react'
import * as testData from '../../../data/snapshot.json'
//import * as experiment from '../../../data/test.json'
import { drizzleConnect } from 'drizzle-react'
import PropTypes from 'prop-types'
import Split from '../layout/Split'
import { Box, Flex } from '@rebass/grid'
import Logo from '../basics/Logo'
import Text from '../basics/Text'
import Form from '../basics/Form'
import {B, E, C, A, D, G} from '../basics/Colors'
import IndicatorB from '../basics/IndicatorB'
import IndicatorC from '../basics/IndicatorC'
import IndicatorA from '../basics/IndicatorA'
import LabeledText from '../basics/LabeledText'
import {autoBind} from 'react-extras'
import Triangle from '../basics/Triangle'
import Chart from '../basics/Chart'
import { Themes } from 'react-tradingview-widget'
import Button from '../basics/Button'
import TruncatedAddress from '../basics/TruncatedAddress.js';


class BookInfo extends Component {

  constructor(props, context) {
    super(props)
    autoBind(this)
    
    this.assets = [
        {
            contract: context.drizzle.contracts.ETHSwap,
            id: 0
        },
        {
            contract: context.drizzle.contracts.SPXSwap,
            id: 1
        },
        {
            contract: context.drizzle.contracts.BTCSwap,
            id: 2
        },
        {
            contract: context.drizzle.contracts.BTCETHSwap,
            id: 3
        }
    ]
    this.contractDict = {
      "ETHUSD": "ETHSwap",
      "SPXUSD": "SPXSwap",
      "BTCUSD": "BTCSwap",
      "BTCETH": "BTCETHSwap"
    }

    this.currentContract = this.props.routeParams.contract;
    this.currentLP = this.props.routeParams.address;
    console.log(this.currentContract)
    console.log(this.currentLP)

    this.contracts = context.drizzle.contracts
    this.drizzle = context.drizzle

    this.state = {
      contractID: 1,
      name: "",
      totalLongs: 0,
      totalShorts: 0,
      totalSubcontracts: 0,
      basis: 0,
      leverageRatio: 0,
      totalContracts: 0,
      addOpen: 0,
      reduceOpen: 0,
      newLong: 0,
      newShort: 0,
      lps: {},

      lpAddress: "0x8976a846ef2b46b07af60d744f7bb120e82666f2",
      bookAddress: "0x8976a846ef2b46b07af60d744f7bb120e82666f2",
      longRate: "",
      shortRate: "",
      openMargin: "",
      currentLong: 0,
      currentShort: 0,
      pendingLong: 0,
      pendingShort: 0,
      cancelledLong: 0,
      cancelledShort: 0,

      takeAmount: 0,
      takerIsLong: "long",
      
      availableBalance: 0.00,
      
      underlayingAsset: "ETH",
      basis: "0.00%",
      marginTakerRate: {
          long: "0.00%",
          short: "0.00%"
      },
      chartSymbol: "SPX500USD",
      
      position: {
          type: "short",
          amount: 12
      },
      newShortPosition: "",
      newLongPosition: ""
    }
  }
  
  setNewLongPosition(value) {
      this.setState(state => ({...state, newLongPosition: value}))
  }
  
  setNewShortPosition(value) {
    this.setState(state => ({...state, newShortPosition: value}))
  }
  
  takeLongPosition() {
    const {newLongPosition} = this.state
    console.log("New long position", newLongPosition)
    // TODO
  }

  takeShortPosition() {
    const {newShortPosition} = this.state
    console.log("New short position", newShortPosition)
    // TODO
  }

  componentDidMount() {
    this.findValues(this.state.contractID)
  }

  lookupName(id) {
    this.setState({ name:testData[id]["name"]})
    //this.assetKey = this.contracts.MultiOracle.methods.assets.cacheCall(id)
  }

  calculateOpenMargin(id) {
    this.setState({
      openMargin:testData[id]["openMargin"]
    })
  }

  calculateTotalLongs(id) {
    var sum = 0
    Object.keys(testData[id]["lps"]).forEach(function (lp) {
      sum += testData[id]["lps"][lp]['totalLong']
    }, this)
    this.setState({ totalLongs:sum})
  }

  calculateTotalShorts(id) {
    var sum = 0
    Object.keys(testData[id]["lps"]).forEach(function (lp) {
      sum += testData[id]["lps"][lp]['totalShort']
    }, this)
    this.setState({totalShorts: sum})
  }

  calculateTotalSubcontracts(id) {
    var count = 0
    Object.keys(testData[id]["lps"]).forEach(function (lp) {
      count += testData[id]["lps"][lp]['book']['subcontracts'].length
    }, this)
    this.setState({totalSubcontracts: count})
  }

  getBasis(id) {
    this.setState({
      basis:testData[id]["basis"]/1e4
    })
  }

  getLeverage(id) {
    this.setState({
      leverageRatio:testData[id]["leverageRatio"]/1e6
    })
  }

  getLPList(id) {
    var num_lps = 0
    var lp_dict = {}
    for (var lp in testData[id]["lps"]) {
      lp_dict[lp] = testData[id]["lps"][lp]
      if (num_lps > 20)
        break
      num_lps += 1
    }
    this.setState({lps: lp_dict})
  }

  handleChange(event) {
    this.setState({contractID: event.target.value})
    this.findValues(event.target.value)
  }

  handleInputChange(event) {
    this.setState({ [event.target.name]: event.target.value })
  }

  handleSubmit(event) {
    alert('Submitted!')
    event.preventDefault()
  }

  getBookData() {
    this.bookDataKey = this.contracts[this.contractDict[this.currentContract]].methods.getBookData.cacheCall(this.currentLP)
  }

  getLongAndShortRates() {
    this.longKey = this.contracts[this.contractDict[this.currentContract]].methods.takerLongRate.cacheCall()
    this.shortKey = this.contracts[this.contractDict[this.currentContract]].methods.takerShortRate.cacheCall()
  }

  findLpInfo() {
    this.setState({
      bookAddress: testData[this.state.contractID]["lps"][this.state.lpAddress]['book']['address'],
      longRate: testData[this.state.contractID]["lps"][this.state.lpAddress]['longRate'],
      shortRate: testData[this.state.contractID]["lps"][this.state.lpAddress]['shortRate'],
      openMargin: testData[this.state.contractID]["lps"][this.state.lpAddress]['openMargin'],
      currentLong: 80,
      currentShort: 70,
      pendingLong: 50,
      pendingShort: 80,
      cancelledLong: 30,
      cancelledShort: 20,

    })

  }

  findValues(id) {
    this.getBookData()
    this.getLongAndShortRates()

    this.lookupName(id)
    this.calculateOpenMargin(id)
    this.calculateTotalShorts(id)
    this.calculateTotalLongs(id)
    this.calculateTotalSubcontracts(id)
    this.getBasis(id)
    this.getLeverage(id)
    this.getLPList(id)
  }

  render() {
    let bookData = {
      0: "0x0000000000000000000000000000000000000000",
      1: "0",
      2: "0",
      3: "0",
      4: "0",
      5: "0",
      6: "0",
      7: false,
      book: "0x0000000000000000000000000000000000000000",
      bookMinimum: "0",
      lpDefaulted: false,
      lpMargin: "0",
      lpRM: "0",
      numContracts: "0",
      totalLong: "0",
      totalShort: "0"
    }
    if (this.bookDataKey in this.props.contracts[this.contractDict[this.currentContract]].getBookData)
    {
      bookData = this.props.contracts[this.contractDict[this.currentContract]].getBookData[this.bookDataKey].value
    }

    let longRate = 0;
    if (this.longKey in this.props.contracts[this.contractDict[this.currentContract]].takerLongRate)
    {
      longRate = this.props.contracts[this.contractDict[this.currentContract]].takerLongRate[this.longKey].value
    }

    let shortRate = 0;
    if (this.shortKey in this.props.contracts[this.contractDict[this.currentContract]].takerShortRate)
    {
      longRate = this.props.contracts[this.contractDict[this.currentContract]].takerShortRate[this.shortKey].value
    }
    return (
        <Split
        side={
            <Box mt="30px" ml="25px" mr="35px">
                <Logo/>
                <Box mt="30px">
                    <Text size="22px" weight="400">Liquidity Provider</Text>
                </Box>
                <Flex mt="15px">
                    <Box mr="15px"><Text size="15px" weight="400" color={C}>Total Margin</Text></Box>
                    <Box><Text size="15px" weight="400" color={C}>{bookData.lpMargin/1e18}</Text></Box>
                </Flex>
                
                <Box
                mb="15px"
                mt="15px">
                    {/*<LabeledText label="Address" text={this.state.lpAddress} transform="uppercase" spacing="1px"/>*/}
                    <TruncatedAddress label="Address" addr={this.currentLP} start="8" end="6" transform="uppercase" spacing="1px"/>
                </Box>
                
                <Box
                pt="10px"
                style={{
                    borderTop: `thin solid ${G}`
                }}>
                    {/*<LabeledText label="Book Address" text={this.state.bookAddress} transform="uppercase" spacing="1px"/>*/}
                    <TruncatedAddress label="Book Address" addr={bookData.book} start="8" end="6" transform="uppercase" spacing="1px"/>
                </Box>
                
                
            </Box>
        }>
        
            <Flex mt="30px" mx="25px" justifyContent="space-between">
                <Box>
                    <IndicatorB size="15px" label="Underlaying asset" value={this.currentContract}/>
                </Box>
                <Flex>
                    <Box ml="30px">
                        <Flex>
                            <IndicatorB size="15px" label="Long" value={longRate/1e4 + "%"}/>
                            <IndicatorB ml="20px" size="15px" label="Short" value={shortRate/1e4 + "%"}/>
                        </Flex>
                        <Box style={{textAlign: "center"}}>
                            <Text size="12px" color={C}>Funding Rates for This Asset</Text>
                        </Box>
                    </Box>
                </Flex>
            </Flex>
            
            <Box mt="45px" mx="30px">
                <Box>
                    <Text size="14px" color={B}>Underlaying asset behavior</Text>
                    <Box mt="20px" mb="30px">
                        <Chart
                        symbol={this.state.chartSymbol}
                        toolbar_bg="rgba(0, 0, 0, 1)"
                        theme={Themes.DARK}
                        width="100%"
                        height="250px"/>
                    </Box>
                    <Box>
                        <Triangle margin="15px" scale={1.8} color="#D55757" rotation="180deg"/> <Text>Your position in this book</Text>
                        <Flex mt="20px">
                            <Flex mr="40px">
                                <Box width="150px"><Button onClick={function () {return}}>Open detail</Button></Box>
                                <Box mr="20px"><LabeledText label="Position" big transform="capitalize" text={this.state.position.type}/></Box>
                                <Box><LabeledText label="Amount" big text={this.state.position.amount + " Ξ"}/></Box>
                            </Flex>
                        </Flex>
                    </Box>
                    <br/>
                    <Box>
                        <Triangle margin="15px" scale={1.8} color="#70B43F"/> <Text>Take a New Position</Text>
                        <Flex mt="20px">
                            <Box mr="20px">
                                <Form mb="10px" onChange={this.setNewShortPosition} value={this.state.newShortPosition} onSubmit={this.takeShortPosition}  justifyContent="space-between" buttonWidth="130px" inputWidth="180px" placeholder="New SHORT: amount" buttonLabel="Take Short"/>
                            </Box>
                            <Box>
                                <Form mb="10px" onChange={this.setNewLongPosition} value={this.state.newLongPosition} onSubmit={this.takeLongPosition}  justifyContent="space-between" buttonWidth="110px" inputWidth="180px" placeholder="New LONG: amount" buttonLabel="Take Long"/>
                            </Box>
                        </Flex>
                    </Box>
                </Box>
                <Box mt="20px">
                </Box>
            </Box>
        
        </Split>
    )
  }
}

function DisplayLPs(props) {
  const listitems = Object.keys(props.lps).map( function(id) {
    var longMargin = props.lps[id]['totalLong'] 
    var shortMargin = props.lps[id]['totalShort']
    var reqMargin = Math.max(longMargin - shortMargin, shortMargin - longMargin)
    return(
      <tr key={id.toString()}>
        <td><a href="/subcontract">{id}</a></td>
        <td>{props.lps[id]['openMargin']}</td>
        <td>{props.lps[id]['longRate']/100}%</td>
        <td>{props.lps[id]['shortRate']/100}%</td>
        <td>{props.lps[id]['totalLong']}</td>
        <td>{props.lps[id]['totalShort']}</td>
        <td>{reqMargin}</td>
        <td>{props.lps[id]['actualMargin']}</td>
      </tr>
    )
  })
  return (
    <table>
      <tr>
        <th>LP Address</th>
        <th>Available Balance</th>
        <th>Current Long Rates</th>
        <th>Current Short Rates</th>
        <th>Current Long Balance</th>
        <th>Current Short Balance</th>
        <th>Required Margin</th>
        <th>Actual Margin</th>
      </tr>
      {listitems}
    </table>
    
  )
}


BookInfo.contextTypes = {
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

export default drizzleConnect(BookInfo, mapStateToProps)
