import React, { Component } from 'react'
import * as testData from '../../../data/snapshot.json'
//import * as experiment from '../../../data/test.json'
import { drizzleConnect } from 'drizzle-react'
import PropTypes from 'prop-types'
import Split from '../layout/Split'
import { Box, Flex } from '@rebass/grid'
import Logo from '../basics/Logo'
import Text from '../basics/Text'
import {C, D, G} from '../basics/Colors'
import IndicatorB from '../basics/IndicatorB'
import LabeledText from '../basics/LabeledText'
import {autoBind} from 'react-extras'
import Triangle from '../basics/Triangle'
import Form from '../basics/Form.js'
import IndicatorC from '../basics/IndicatorC.js'
import SubcontractRow from '../blocks/SubcontractRow.js'
import Chart from '../basics/Chart.js';
import TableA from '../blocks/TableA.js';
import { Themes } from 'react-tradingview-widget';
import Input from '../basics/Input.js';
import Button from '../basics/Button.js';
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

    console.log(this.drizzle)

    this.state = {
      contractID: 1,
      name: '',
      totalLongs: 0,
      totalShorts: 0,
      totalSubcontracts: 0,
      leverageRatio: 0,
      totalContracts: 0,
      addOpen: 0,
      reduceOpen: 0,
      newLong: 0,
      newShort: 0,
      lps: {},

      lpAddress: '0x8976a846ef2b46b07af60d744f7bb120e82666f2',
      bookAddress: '0x8976a223ef2b46b07af60d744f7bb120e82666f2',
      longRate: '',
      shortRate: '',
      openMargin: '',
      currentLong: 0,
      currentShort: 0,
      pendingLong: 0,
      pendingShort: 0,
      cancelledLong: 0,
      cancelledShort: 0,
      
      subcontracts: [
        {
            address: "0x8976a846ef2b46b07af60d744f7bb120e82666f2",
            bookAddress: "0x8976a846ef2b46b07af60d744f7bb120e82666f2",
            marginRate: 30,
            takerMargin: 35,
            requiredRate: "0.05%",
            canceled: true,
            burned: false,
            position: "Short"
        },
        {
            address: "0x8976a846ef2b46b07af60d744f7bb120e82666f2",
            bookAddress: "0x8976a846ef2b46b07af60d744f7bb120e82666f2",
            marginRate: 20,
            takerMargin: 22,
            requiredRate: "0.10%",
            canceled: false,
            burned: false,
            position: "Long"
        }
      ],

      takeAmount: 0,
      takerIsLong: "long",
      
      customFinalPrice: null,
      customFinalPrice1: null,
      withdrawalBalance: 0.00,
      availableBalance: 0.00,
      projectedLpPnl: -6.1243,
      assetPrice: 201.87,
      underlayingAssetPrice: 120.25,
      settlementPeriod: true,
      actualMargin: 12.2,
      requiredMargin: 10.0,
      
      newLpAddress: "",
      newOpenMargin: "",
      newMargin: "",
      newMarginToWithdrawalBalance: "",
      minRM: "",
      
      speculativeFinalProfit: null
    }
  }
  
  setNewLpAddress(value) {
    this.setState(state => ({...state, newLpAddress: value}))
  }
  
  setNewOpenMargin(value) {
    this.setState(state => ({...state, newOpenMargin: value}))
  }
  
  setNewMargin(value) {
    this.setState(state => ({...state, newMargin: value}))
  }
  
  setNewMarginToWithdrawalBalance(value) {
    this.setState(state => ({...state, newMarginToWithdrawalBalance: value}))
  }

  setMinRM(value) {
    this.setState(state => ({...state, minRM: value}))
  } 
  
  setCustomFinalPrice(value) {
      this.setState(state => ({...state, customFinalPrice: value}))
  }

  setCustomFinalPrice1(value) {
      this.setState(state => ({...state, customFinalPrice1: value}))
  }
  
  changeNewLpAddress() {
    const {newLpAddress} = this.state
    console.log("Change: New LP address", newLpAddress)
    // TODO
  }
  
  changeNewOpenMargin() {
    const {newOpenMargin} = this.state
    console.log("Change: New open margin", newOpenMargin)
    // TODO
  }
  
  changeNewMargin() {
    const {newMargin} = this.state
    console.log("Change: New margin", newMargin)
    this.contracts[this.contractDict[this.currentContract]].methods.lpFund(this.currentLP).send({
      from: this.props.accounts[0], value: newMargin * 1e18
    });
    console.log(this.props.accounts[0])
  }
  
  changeNewMarginToWithdrawalBalance() {
    const {newMarginToWithdrawalBalance} = this.state
    console.log("Change: New margin to withdrawal balance", newMarginToWithdrawalBalance)
    // TODO
  }
  
  calculateCustomFinalPrices() {
    const {customFinalPrice} = this.state
    console.log("Change: New custom final price", customFinalPrice)
    // TODO
    this.setState(state => ({...state, speculativeFinalProfit: `ETH ${customFinalPrice * 20}`}))
  }
  
  withdrawBalance() {
      const {withdrawalBalance} = this.state
      console.log("Balance withdrawal requested", withdrawalBalance)
      // TODO
  }

  createBook() {
    console.log("create book")
    const {minRM} = this.state
    console.log(minRM)
    this.contracts[this.contractDict[this.currentContract]].methods.createBook.cacheSend(minRM, {
      from: this.props.accounts[0]
    });
    this.contracts[this.contractDict[this.currentContract]].methods.createBook(minRM).send({
      from: this.props.accounts[0]
    });
  }
  
  openSubcontract(id) {
      console.log("Opened subcontract", id)
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

  getLeverage(id) {
    this.setState({
      leverageRatio: testData[id]["leverageRatio"]/1e6
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

  findLpInfo() {
    this.setState(state => ({
      ...state,
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

    }))
  }

  getBookData() {
    this.bookDataKey = this.contracts[this.contractDict[this.currentContract]].methods.getBookData.cacheCall(this.currentLP)
  }

  getLongAndShortRates() {
    this.longKey = this.contracts[this.contractDict[this.currentContract]].methods.takerLongRate.cacheCall()
    this.shortKey = this.contracts[this.contractDict[this.currentContract]].methods.takerShortRate.cacheCall()
  }

  getWithdrawalBalance() {
    this.balanceKey = this.contracts[this.contractDict[this.currentContract]].methods.withdrawBalances.cacheCall(this.currentLP)
  }

  findValues(id) {
    this.getBookData()
    this.getLongAndShortRates()
    this.getWithdrawalBalance()
    this.lookupName(id)
    this.calculateOpenMargin(id)
    this.calculateTotalShorts(id)
    this.calculateTotalLongs(id)
    this.calculateTotalSubcontracts(id)
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

    let balance = -1;
    if (this.balanceKey in this.props.contracts[this.contractDict[this.currentContract]].withdrawBalances)
    {
      balance = this.props.contracts[this.contractDict[this.currentContract]].withdrawBalances[this.balanceKey].value
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
                    <Box><Text size="15px" weight="400" color={C}>{bookData.lpMargin/1e18 + " Ξ"}</Text></Box>
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
                
                <Flex
                pt="10px">
                    <Box mr="22px"><LabeledText label="Settlement Period" text={this.state.settlementPeriod ? "Yes" : "No"} transform="uppercase" spacing="1px"/></Box>
                    <Box mr="15px"><LabeledText label="Req. Margin" text={bookData.lpRM/1e18 + " Ξ"} spacing="1px"/></Box>
                    <Box><LabeledText label="Actual Margin" text={bookData.lpMargin/1e18 + " Ξ"} spacing="1px"/></Box>
                </Flex>
                
                <Box
                pt="30px">
                    <Box mb="10px"><Text size="16px">Modify</Text></Box>
                    <Form onChange={this.setNewMargin} value={this.state.newMargin} onSubmit={this.changeNewMargin} mb="30px" justifyContent="space-between" buttonWidth="95px" label="Add margin" inputWidth="280px" placeholder="Set amount" buttonLabel="Add"/>
                    <Form onChange={this.setMinRM} value={this.state.minRM} onSubmit={this.createBook} mb="30px" justifyContent="space-between" buttonWidth="95px" label="Create Book" inputWidth="280px" placeholder="Set min RM" buttonLabel="Create"/>
                    <Box mb="10px"><Text size="16px" justifyContent="space-between" buttonWidth="95px" >Withdraw</Text></Box>
                    <Form onChange={this.setNewMarginToWithdrawalBalance} value={this.state.newMarginToWithdrawalBalance} onSubmit={this.changeNewMarginToWithdrawalBalance} mb="20px" justifyContent="space-between" buttonWidth="95px" label="Move margin to withdrawal balance" inputWidth="280px" placeholder="Set amount" buttonLabel="Move"/>
                    <IndicatorC buttonLabel="Withdraw" onClick={this.withdrawBalance}>
                        <Text size="14px" underline={G}>Withdrawal balance</Text> <Text size="14px">{balance/1e18 + " Ξ"}</Text>
                    </IndicatorC>
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
                            <Text size="12px" color={C}>LP Margin Rates</Text>
                        </Box>
                    </Box>
                </Flex>
            </Flex>
                
            <Box mt="45px" mx="30px">
                <Box>
                    <Text weight="bold">Oracle Prices</Text>
                    <Flex>
                        <Box width={0.3}>
                            <TableA
                            mt="20px"
                            columns={[
                                "ETH", "SPX"
                            ]}
                            rows={[
                                ["Feb-01", 23.22, 34.76],
                                ["Feb-02", 23.22, 34.76],
                                ["Feb-03", 23.22, 34.76],
                                ["Feb-04", 23.22, 34.76],
                            ]}/>
                        </Box>
                        <Box width={0.7}>
                            <Chart
                            symbol="SPX500USD"
                            toolbar_bg="rgba(0, 0, 0, 1)"
                            theme={Themes.DARK}
                            width="100%"
                            height="250px"/>
                        </Box>
                    </Flex>
                </Box>
                <Box mt="20px" style={{borderTop: `thin solid ${D}`}}>
                    <Flex mt="20px">
                        <Box mr="20px" mt="4px"><Text size="15px">Input custom final prices</Text></Box>
                        <Flex>
                          <Input onChange={({target: {value}}) => this.setCustomFinalPrice(value)} mr="10px" label="ETH" value={this.state.customFinalPrice}/>
                          <Input onChange={({target: {value}}) => this.setCustomFinalPrice1(value)} mr="10px" label="SPX" value={this.state.customFinalPrice1}/>
                          <Button onClick={this.calculateCustomFinalPrices}>Submit</Button>
                        </Flex>
                        <Box mt="4px" ml="20px">{this.state.speculativeFinalProfit ? <Text size="15px" color={C}>Your speculative final profit would be <Text weight="bold" color={C}>{this.state.speculativeFinalProfit}</Text></Text> : null}</Box>
                    </Flex>
                    <Flex
                    pt="10px">
                        <Box mr="30px"><LabeledText label="Projected LP PNL" text={this.state.projectedLpPnl + " Ξ"} spacing="1px"/></Box>
                        <Box mr="30px"><LabeledText label="Asset Price" text={this.state.assetPrice} spacing="1px"/></Box>
                        <Box mr="30px"><LabeledText label="ETH Price" text={this.state.underlayingAssetPrice} spacing="1px"/></Box>
                    </Flex>
                </Box>
                <Box mt="60px">
                    <Triangle margin="15px" scale={1.8} color="#70B43F" rotation="0deg"/> <Text>LP Active Subcontracts</Text>
                    <Box
                    mt="20px"
                    style={{
                        borderTop: `thin solid ${D}`
                    }}>
                        {this.state.subcontracts.map((subcontract, index) =>
                            <SubcontractRow
                            key={index}
                            onOpenDetail={() => this.openSubcontract("0x8976a846ef2b46b07af60d744f7bb120e82666f2")}
                            fields={subcontract}/>
                        )}
                    </Box>
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
