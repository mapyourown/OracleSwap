import React, { Component } from 'react'
import * as testData from '../../../data/snapshot.json'
//import * as experiment from '../../../data/test.json'
import { drizzleConnect } from 'drizzle-react'
import PropTypes from 'prop-types'
import Split from '../layout/Split'
import { Box, Flex } from '@rebass/grid'
import Logo from '../basics/Logo'
import Text from '../basics/Text'
import {C, D, G, H, I} from '../basics/Colors'
import IndicatorB from '../basics/IndicatorB'
import LabeledText from '../basics/LabeledText'
import {autoBind} from 'react-extras'
import Form from '../basics/Form.js'
import IndicatorC from '../basics/IndicatorC.js'
import Button from '../basics/Button.js'
import WarningSign from '../basics/WarningSign'
import TableA from '../blocks/TableA.js'
import Chart from '../basics/Chart'
import { Themes } from 'react-tradingview-widget'
import Input from '../basics/Input.js'
import TruncatedAddress from '../basics/TruncatedAddress.js'

class SubcontractInfo extends Component {

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

    this.idDict = {
      "ETHSwap": 0,
      "SPXSwap": 1,
      "BTCSwap": 2,
      "BTCETHSwap": 3
    }

    this.currentContract = this.props.routeParams.contract;
    this.currentLP = this.props.routeParams.address;
    this.asset_id = this.idDict[this.contractDict[this.currentContract]]
    this.currentSubcontract = this.props.routeParams.id;
    console.log(this.currentContract)
    console.log(this.currentSubcontract)

    this.contracts = context.drizzle.contracts
    this.drizzle = context.drizzle

    this.state = {
      contractID: 1,

      name: '',
      basis: 0,

      lpAddress: "0x8976a846ef2b46b07af60d744f7bb120e82666f2",
      bookAddress: "0x8976a846ef2b46b07af60d744f7bb120e82666f2",
      subcontractID: this.props.params.address,

      requiredMargin: 0,
      isCancelled: 0,
      isBurned: 0,
      side: 0,
      initialDay: 0,
      marginRate: 0,
      addMarginAmount: '',
      withdrawAmount: '',
      customFinalPrice: null,
      customFinalPrice1: null,
      projectedPnl: 0,

      assetFinal: '',
      ethFinal: '',
      
      newPlayerAddress: "",
      newExtraMargin: "",
      newWithdrawMargin: "",
      
      position: "Long",
      marginRate: "0.05%",
      basis: 16,
      leverage: 16.1,
      
      oraclePrices: {
          columnNames: ["ETH", "SPX"],
          rows: [
            ["Feb-01", 23.22, 34.76],
            ["Feb-02", 23.22, 34.76],
            ["Feb-03", 23.22, 34.76],
            ["Feb-04", 23.22, 34.76],
          ]
      },
      chartSymbol: "SPX500USD"
    }

    this.priceHistory = {
      0:[]
    }
    this.priceHistory[this.asset_id] =[]
    this.settleHistory = {
      0:[]
    }
    this.settleHistory[this.asset_id] =[]

    this.assetName = {
      0: 'ETH',
      1: 'SPX',
      2: 'BTC',
      3: 'BTCETH'
    }

  }
  
  PlayerCancel(margin) {
    console.log("Contract LP cancelation")
    this.contracts[this.contractDict[this.currentContract]].methods.playerCancel.cacheSend(
      this.currentLP, this.currentSubcontract, {from: this.props.accounts[0], value: margin * 0.015});
  }
  
  PlayerBurn(margin) {
    console.log("Contract LP burn")
    this.contracts[this.contractDict[this.currentContract]].methods.playerBurn.cacheSend(
      this.currentLP, this.currentSubcontract, {from: this.props.accounts[0], value: margin *  0.25});
  }

  redeem() {
    console.log("Redemption")
    this.contracts[this.contractDict[this.currentContract]].methods.redeem.cacheSend(
      this.currentLP, this.currentSubcontract, {from: this.props.accounts[0]});
  }
  
  setNewPlayerAddress(value) {
    this.setState(state => ({...state, newPlayerAddress: value}))
  }
  
  setNewExtraMargin(value) {
   this.setState(state => ({...state, newExtraMargin: value})) 
  }
  
  setNewWithdrawMargin(value) {
    this.setState(state => ({...state, newWithdrawMargin: value})) 
  }
  
  changeNewPlayerAddress() {
    const {newPlayerAddress} = this.state
    console.log("Change: New player address", newPlayerAddress)
    // TODO
  }
  
  changeNewExtraMargin() {
    const {newExtraMargin} = this.state
    console.log("Change: New extra margin", newExtraMargin)
    this.contracts[this.contractDict[this.currentContract]].methods.takerFund.cacheSend(
      this.currentLP, this.currentSubcontract, {from: this.props.accounts[0], value: newExtraMargin*1e18});
  }
  
  changeNewWithdrawMargin() {
    const {newWithdrawMargin} = this.state
    console.log("Change: New withdraw margin", newWithdrawMargin)
    this.contracts[this.contractDict[this.currentContract]].methods.takerWithdrawal.cacheSend(
      newWithdrawMargin * 1e18, this.currentLP, this.currentSubcontract, {from: this.props.accounts[0]});
  }

  componentDidMount() {
    this.findValues(this.state.contractID)
  }

  lookupName(id) {
    this.setState({ name:testData[id]["name"]})
    //this.assetKey = this.contracts.MultiOracle.methods.assets.cacheCall(id)
  }

  getBasis(id) {
    this.setState({
      basis:testData[id]["basis"]/1e4
    })
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

  findSubcontractInfo() {
    var contract = testData[this.state.contractID]["lps"][this.state.lpAddress]["book"][this.state.subcontractID]
    this.setState({
      requiredMargin: contract['ReqMargin'],
      isCancelled: contract['isCancelled'],
      isBurned: contract['isBurned'],
      side:contract['Side'],
      initialDay: contract['InitialDay'],
      marginRate: contract['MarginRate']
    })
  }

  getSubcontractInfo() {
    this.subKDataKey = this.contracts[this.contractDict[this.currentContract]].methods.getSubcontractData.cacheCall(
      this.currentLP, this.currentSubcontract)
    this.subKStatusKey = this.contracts[this.contractDict[this.currentContract]].methods.getSubcontractStatus.cacheCall(
      this.currentLP, this.currentSubcontract)
  }

  getWithdrawalBalance() {
    this.balanceKey = this.contracts[this.contractDict[this.currentContract]].methods.withdrawBalances.cacheCall(this.currentLP)
  }

  getLongAndShortRates() {
    this.longKey = this.contracts[this.contractDict[this.currentContract]].methods.takerLongRate.cacheCall()
    this.shortKey = this.contracts[this.contractDict[this.currentContract]].methods.takerShortRate.cacheCall()
  }

  getLeverageRatio() {
    //console.log(this.contracts[this.contractDict[id]])
    this.leverageKey = this.contracts[this.contractDict[this.currentContract]].methods.leverageRatio.cacheCall()
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
        fromBlock: 0,//block_number - 6600 * 7,
        toBlock: 'latest'
      }
    ).then(function(events) { 
      events.forEach(function(element) {
        if (element.returnValues.id == id)
        {
          pricedata.push({
            blockNum: element.blockNumber, 
            price: element.returnValues.price, 
            time: element.returnValues.timestamp
          })
        }
      }, this);
      this.priceHistory[id] = pricedata.slice(-6)
    }.bind(this));
  }

  getSettleLogs(id) {
    const web3 = this.context.drizzle.web3
    const oracle = this.drizzle.contracts.Oracle
    const contractweb3 = new web3.eth.Contract(oracle.abi, oracle.address);
    var pricedata = [];
    contractweb3.getPastEvents(
      'SettlePrice', 
      {
        filter: {id: id},
        fromBlock: 0,//block_number - 6600 * 7,
        toBlock: 'latest'
      }
    ).then(function(events) { 
      events.forEach(function(element) {
        if (element.returnValues.id == id)
        {
          pricedata.push({
            blockNum: element.blockNumber, 
            price: element.returnValues.price, 
            time: element.returnValues.timestamp
          })
        }
      }, this);
      this.settleHistory[id] = pricedata
    }.bind(this));
  }

  findValues(id) {
    this.lookupName(id)
    this.getBasis(id)
    this.getOracleLogs(0)
    this.getOracleLogs(this.asset_id)
    this.getSettleLogs(0)
    this.getSettleLogs(this.asset_id)
    this.getSubcontractInfo()
    this.getWithdrawalBalance()
    this.getLongAndShortRates()
    this.getLeverageRatio()
  }

  setCustomFinalPrice(value) {
      this.setState(state => ({...state, customFinalPrice: value}))
  }

  setCustomFinalPrice1(value) {
      this.setState(state => ({...state, customFinalPrice1: value}))
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


    let subkdata = {
      0: "0",
      1: "0",
      2: "0",
      3: false,
      initialDay: "0",
      reqMargin: "0",
      side: false,
      takerMargin: "0"
    }
    if (this.subKDataKey in this.props.contracts[this.contractDict[this.currentContract]].getSubcontractData)
    {
      subkdata = this.props.contracts[this.contractDict[this.currentContract]].getSubcontractData[this.subKDataKey].value
    }
    let subkstatus = {
      0: false,
      1: false,
      2: false,
      3: false,
      isBurned: false,
      isCancelled: false,
      takerCloseDiscount: false,
      toDelete: false
    }
    if (this.subKStatusKey in this.props.contracts[this.contractDict[this.currentContract]].getSubcontractStatus)
    {
      subkstatus = this.props.contracts[this.contractDict[this.currentContract]].getSubcontractStatus[this.subKStatusKey].value
    }

    let balance = -1;
    if (this.balanceKey in this.props.contracts[this.contractDict[this.currentContract]].withdrawBalances)
    {
      balance = this.props.contracts[this.contractDict[this.currentContract]].withdrawBalances[this.balanceKey].value
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

    let leverageRatio = 0;
    if (this.leverageKey in this.props.contracts[this.contractDict[this.currentContract]].leverageRatio)
    {
      leverageRatio = this.props.contracts[this.contractDict[this.currentContract]].leverageRatio[this.leverageKey].value
    }

    let priceColumns = [];
    if (this.priceHistory[0].length !== 0 && this.priceHistory[this.asset_id].length !== 0)
    {
        priceColumns = this.priceHistory[this.asset_id].map((val, index) => [val.blockNum, this.priceHistory[0][index].price/1e6, val.price/1e6])
    }

    return (
        <Split
        side={
            <Box mt="30px" ml="25px" mr="35px">
                <Logo/>
                <Box mt="30px">
                    <Text size="22px" weight="400">Subcontract</Text>
                    <TruncatedAddress label="Subcontract ID" addr={this.currentSubcontract} start="14" end="12" transform="uppercase" spacing="1px"/>
                </Box>
                
                <Box
                mt="15px"
                pt="10px"
                style={{
                    borderTop: `thin solid ${G}`
                }}>
                    <TruncatedAddress label="LP Address" addr={this.currentLP} start="8" end="6" transform="uppercase" spacing="1px"/>
                    <Box mr="30px"><LabeledText label="Taker Margin" big text={subkdata.takerMargin/1e18 + " Ξ"} spacing="1px"/></Box>
                </Box>
                
                <Flex
                pt="10px">
                    <Box mr="30px"><LabeledText label="Req. Margin" big text={subkdata.reqMargin/1e18 + " Ξ"} spacing="1px"/></Box>
                    <Box mr="30px"><LabeledText label="Taker Side" big text={!subkdata.side ? "Long" : "Short"} spacing="1px"/></Box>
                    <Box mr="30px"><LabeledText label="Cancelled" big text={subkdata.isCancelled ? "Yes" : "No"} spacing="1px"/></Box>
                    <Box mr="30px"><LabeledText label="Burned" big text={subkdata.isBurned ? "Yes" : "No"} spacing="1px"/></Box>
                </Flex>
                
                <Box
                pt="40px">
                    <Box mb="15px"><Text size="16px">LP Actions</Text></Box>
                    <Flex>
                        <Box mr="20px">
                            <Button width="120px" bgColor={H} onClick={() => this.PlayerBurn(subkdata.reqMargin)}><Flex justifyContent="center"><Box mr="20px"><WarningSign width="13"/></Box> <Box>Burn</Box></Flex></Button>
                        </Box>
                        <Box mr="20px">
                            <Button width="120px" bgColor={I} onClick={() => this.PlayerCancel(subkdata.reqMargin)}><Flex justifyContent="center"><Box>Cancel</Box></Flex></Button>
                        </Box>
                        <Box>
                            <Button width="120px" bgColor={I} onClick={() => this.redeem()}><Flex justifyContent="center"><Box>Redeem</Box></Flex></Button>
                        </Box>
                    </Flex>
                </Box>
                
                <Box
                pt="40px">

                    <Box mb="10px"><Text size="16px">Taker Actions</Text></Box>
                    <Flex>
                        <Box mr="20px">
                            <Button width="120px" bgColor={H} onClick={() => this.PlayerBurn(subkdata.reqMargin)}><Flex justifyContent="center"><Box mr="20px"><WarningSign width="13"/></Box> <Box>Burn</Box></Flex></Button>
                        </Box>
                        <Box mr="20px">
                            <Button width="120px" bgColor={I} onClick={() => this.PlayerCancel(subkdata.reqMargin)}><Flex justifyContent="center"><Box>Cancel</Box></Flex></Button>
                        </Box>
                        <Box>
                            <Button width="120px" bgColor={I} onClick={() => this.redeem()}><Flex justifyContent="center"><Box>Redeem</Box></Flex></Button>
                        </Box>
                    </Flex>
                    <Form mb="10px" value={this.state.newExtraMargin} onChange={this.setNewExtraMargin} onSubmit={this.changeNewExtraMargin} justifyContent="space-between" buttonWidth="105px"  label="Add margin" inputWidth="270px" placeholder="Set amount" buttonLabel="Add"/>
                    <Form onChange={this.setNewWithdrawMargin} value={this.state.newWithdrawMargin} onSubmit={this.changeNewWithdrawMargin} mb="20px" justifyContent="space-between" buttonWidth="95px" label="Move margin to withdrawal balance" inputWidth="280px" placeholder="Set amount" buttonLabel="Move"/>
                    <IndicatorC buttonLabel="Withdraw" onClick={this.withdrawBalance}>
                        <Text size="14px" underline={G}>Withdrawal balance</Text> <Text size="14px">{balance/1e18+" Ξ"}</Text>
                    </IndicatorC>
                </Box>
                
                
            </Box>
        }>
        
            <Flex mt="30px" mx="25px" justifyContent="space-between">
                <Flex>
                    <IndicatorB size="15px" label="Taker Side" value={!subkdata.side ? "Long" : "Short"}/>
                    <IndicatorB ml="20px" size="15px" label="Financing Rate" value={!subkdata.side ? longRate/1e4 + "%" : shortRate/1e4 + "%"}/>
                </Flex>
                <Flex>
                    <Box ml="30px">
                        <IndicatorB size="15px" label="Leverage Ratio" value={leverageRatio / 100}/>
                    </Box>
                </Flex>
            </Flex>
            
            <Box mt="45px" mx="30px">
                <Box>
                    <Text weight="bold">Oracle Prices</Text>
                    <Flex>
                        <Box>
                            <TableA
                            mt="20px"
                            mr="20px"
                            columns={[
                                "ETH", this.assetName[this.asset_id]
                            ]}
                            rows={
                                priceColumns
                              }/>
                        </Box>
                        <Box width={0.7}>
                            <Chart
                            symbol={this.state.chartSymbol}
                            toolbar_bg="rgba(0, 0, 0, 1)"
                            theme={Themes.DARK}
                            width="100%"
                            height="250px"/>
                        </Box>
                    </Flex>
                </Box>

                <Box mt="20px" style={{borderTop: `thin solid ${D}`}}>
                  <Box mr="20px" mt="4px"><Text size="15px">Input custom final prices</Text></Box>
                  <Flex mt="20px">  
                      <Flex>
                        <Input onChange={({target: {value}}) => this.setCustomFinalPrice(value)} mr="10px" label="ETH" value={this.state.customFinalPrice}/>
                        <Input onChange={({target: {value}}) => this.setCustomFinalPrice1(value)} mr="10px" label="SPX" value={this.state.customFinalPrice1}/>
                        <Button onClick={this.calculateCustomFinalPrices}>Submit</Button>
                      </Flex>
                      <Box mt="4px" ml="20px">{this.state.speculativeFinalProfit ? <Text size="15px" color={C}>Your speculative final profit would be <Text weight="bold" color={C}>{this.state.speculativeFinalProfit}</Text></Text> : null}</Box>
                  </Flex>
                </Box>
                <Flex
                pt="10px">
                    <Box mr="30px"><LabeledText label="Your projected PNL" size="14px" text={Math.floor(this.state.projectedPnl*10000)/10000 + " Ξ"} spacing="1px"/></Box>
                </Flex>

            </Box>
            
        
        </Split>
    )
  }
}

function DisplayTakenContracts(props) {
  const listitems = props.contracts.map( function(contract) {
    return(
      <tr key={contract['subcontractId'].toString()}>
        <td><a href="/">{contract['subcontractId']}</a></td>
        <td>{contract['lpAddress']}</td>
        <td>{contract['requiredMargin']/1e18}</td>
        <td>{contract['side'] === 0 ? 'Long' : 'Short'}</td>
        <td>{contract['isCancelled'] === 0 ? 'No' : 'Yes'}</td>
        <td>{contract['isBurned'] === 0 ? 'No' : 'Yes'}</td>
      </tr>
    )
  })
  return (
    <table>
      <tbody>
        <tr>
          <th>Subcontract ID</th>
          <th>LP Address</th>
          <th>Required Margin</th>
          <th>Side</th>
          <th>Is Cancelled?</th>
          <th>Is Burned?</th>
        </tr>
        {listitems}
      </tbody>
    </table>
    
  )
}


SubcontractInfo.contextTypes = {
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

export default drizzleConnect(SubcontractInfo, mapStateToProps)
