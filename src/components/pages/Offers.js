import React, { Component } from 'react'
import * as testData from '../../../data/snapshot.json'
//import * as experiment from '../../../data/test.json'
import { drizzleConnect } from 'drizzle-react'
import PropTypes from 'prop-types'
import Split from '../layout/Split'
import { Box, Flex } from '@rebass/grid'
import Logo from '../basics/Logo'
import Text from '../basics/Text'
import {E, C} from '../basics/Colors'
import IndicatorB from '../basics/IndicatorB'
import {autoBind} from 'react-extras'
import DrizzleContract from '../blocks/DrizzleContract'
import Triangle from '../basics/Triangle.js'
import Button from '../basics/Button'
import OffersTable from '../blocks/OffersTable.js';
import Form from '../basics/Form.js'

class Offers extends Component {

  constructor(props, context) {
    super(props)
    autoBind(this)
    
    console.log(props)
    //console.log(context)
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
    
    this.lpKeys = {}

    this.contracts = context.drizzle.contracts
    this.drizzle = context.drizzle

    this.state = {
        name: '',
        openMargin: 0,
        totalLongs: 0,
        totalShorts: 0,
        currentLong: 0,
        currentShort: 0,
        totalSubcontracts: 0,
        basis: 0,
        leverageRatio: 0,
        totalContracts: 0,
        contractID: 1,
        addOpen: 0,
        reduceOpen: 0,
        newLong: 0,
        newShort: 0,
        minRM: 0,
        lps: {},
        offers: [
            {
                lpAddress: "0xCb295513a705963c44c0A4257DDF86eD1C6c6211",
                marginRates: {
                    long: 0.31,
                    short: -0.05
                },
                currentBalance: {
                    long: 22,
                    short: 10
                },
                availableMargin: 2,
                remainingMargin: 8.2343
            },
            {
                lpAddress: "0xCb29551wa705963c44c0A4257DDF86eD1C6c6211",
                marginRates: {
                    long: 0.22,
                    short: 0.10
                },
                currentBalance: {
                    long: 20,
                    short: 15
                },
                availableMargin: 6,
                remainingMargin: 10.12292
            }
        ],
        availableBalance: 0,
        requiredMargin: 0,
        actualMargin: 0,
        
        contracts: [
            {
                id: 1,
                name: "SPXSwap"
            },
            {
                id: 1,
                name: "SPXSwap"
            }
        ],
        
        underlayingAsset: "ETH",
        leverage: 0,
        
        LPOpenAmount: 12,
        takerMarginRate: {
            long: "",
            short: ""
        },
        newBalance: ""
    }
  }

  getAllLPs() {
    const web3 = this.context.drizzle.web3
    const swap = this.drizzle.contracts[this.contractDict[this.currentContract]]
    const contractweb3 = new web3.eth.Contract(swap.abi, swap.address);
    var LPMakes = {};
    var MadeEventLPS = []
    var HardCodedLPS = [
      {
        returnValues: {
          lp: '0x2eef12ee57fb8ecdea24f1d6e61db326e4072350',
          newLPMargin: 20e18
        }
      }]
    /*contractweb3.getPastEvents(
      'LPFundedMargin', 
      {
        fromBlock: 0,
        toBlock: 'latest'
      }
    ).then(function(events) {
      MadeEventLPS = events
      MadeEventLPS.forEach(function(element) {
        LPMakes[element.returnValues.lp] =
          {
            "bookData": this.contracts[this.contractDict[this.currentContract]].methods.getBookData.cacheCall(element.returnValues.lp),
          }
      }, this);
      this.lpKeys = LPMakes
    }.bind(this));*/
    HardCodedLPS.forEach(function(element) {
      LPMakes[element.returnValues.lp] =
        {
          "bookData": this.contracts[this.contractDict[this.currentContract]].methods.getBookData.cacheCall(element.returnValues.lp),
        }
    }, this);
    this.lpKeys = LPMakes
  }
  
  openLP(lpAddress) {
    console.log("Open LP", lpAddress)
    const url = '/' + this.currentContract + '/lp/'
      + lpAddress + '/provider';
    window.open(url, '_blank');
  }
  
  takeFromLP(lpAddress) {
    console.log("Take from LP", lpAddress)
    const url = '/' + this.currentContract + '/lp/'
      + lpAddress + '/taker';
    window.open(url, '_blank');
  }

  openBook() {
    console.log("Open Book Clicked")
    const url = '/' + this.currentContract + '/lp/'
       + this.props.accounts[0] + '/provider';
      window.open(url, '_blank');
  }
  
  setTakerMarginRateShort(value) {
      this.setState(state => ({...state, takerMarginRate: {...state.takerMarginRate, short: value}}))
  }
  
  setTakerMarginRateLong(value) {
    this.setState(state => ({...state, takerMarginRate: {...state.takerMarginRate, long: value}}))
  }
  
  setNewBalance(value) {
    this.setState(state => ({...state, newBalance: value}))
  }
  
  addBalance() {
    var amount = this.drizzle.web3.utils.toWei(this.state.newBalance, 'ether')
    var stackID = this.contracts[this.contractDict[this.currentContract]].methods.lpFund.cacheSend(this.props.accounts[0], {from:this.props.accounts[0], value: amount});
    console.log(amount)
  }

  componentDidMount() {
    this.findValues(this.state.contractID)
  }

  lookupName(id) {
    this.setState(state => ({...state, name: testData[id]["name"]}))
    //this.assetKey = this.contracts.MultiOracle.methods.assets.cacheCall(id)
  }

  getBookData() {
    this.bookDataKey = this.contracts[this.contractDict[this.currentContract]].methods.getBookData.cacheCall(this.props.accounts[0])
  }

  getLongAndShortRates() {
    this.longKey = this.contracts[this.contractDict[this.currentContract]].methods.takerLongRate.cacheCall()
    this.shortKey = this.contracts[this.contractDict[this.currentContract]].methods.takerShortRate.cacheCall()
  }

  calculateTotalLongs(id) {
    var sum = 0
    Object.keys(testData[id]["lps"]).forEach(function (lp) {
      sum += testData[id]["lps"][lp]['totalLong']
    }, this)
    this.setState(state => ({...state, totalLongs: sum}))
  }

  calculateTotalShorts(id) {
    var sum = 0
    Object.keys(testData[id]["lps"]).forEach(function (lp) {
      sum += testData[id]["lps"][lp]['totalShort']
    }, this)
    this.setState(state => ({...state, totalShorts: sum}))
  }

  calculateTotalSubcontracts(id) {
    var count = 0
    Object.keys(testData[id]["lps"]).forEach(function (lp) {
      count += testData[id]["lps"][lp]['book']['subcontracts'].length
    }, this)
    this.setState(state => ({...state, totalSubcontracts: count}))
  }

  setMinRM(value) {
    this.setState(state => ({...state, minRM: value}))
    console.log(value)
  } 

  createBook() {
    console.log("create book")
    const minRM = this.state.minRM
    console.log(minRM)
    this.contracts[this.contractDict[this.currentContract]].methods.createBook.cacheSend(minRM, {
      from: this.props.accounts[0]
    });
  }

  getBasis(id) {
    this.setState(state => ({
        ...state,
        basis: testData[id]["basis"]/1e4
    }))
  }

  getLeverage(id) {
    //console.log(this.contracts[this.contractDict[id]])
    this.leverageKey = this.contracts[this.contractDict[this.currentContract]].methods.leverageRatio.cacheCall()
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
    this.setState(state => ({...state, lps: lp_dict}))
  }

  handleChange(event) {
    this.setState(state => ({...state, contractID: event.target.value}))
    this.findValues(event.target.value)
  }

  handleInputChange(event) {
    this.setState(state => ({...state, [event.target.name]: event.target.value }))
  }

  findValues(id) {
    this.lookupName(id)
    this.getBookData()
    this.getLongAndShortRates()
    this.getAllLPs()
    this.calculateTotalShorts(id)
    this.calculateTotalLongs(id)
    this.calculateTotalSubcontracts(id)
    this.getBasis(id)
    this.getLeverage(id)
    this.getLPList(id)
  }

  render() {

    let leverageRatio = 0;
    if (this.leverageKey in this.props.contracts[this.contractDict[this.currentContract]].leverageRatio)
    {
      leverageRatio = this.props.contracts[this.contractDict[this.currentContract]].leverageRatio[this.leverageKey].value
    }

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

    let books = {}
    Object.keys(this.lpKeys).forEach(function(id) {
      if (this.lpKeys[id]['bookData'] in this.props.contracts[this.contractDict[this.currentContract]].getBookData)
      {
        books[id] = this.props.contracts[this.contractDict[this.currentContract]].getBookData[this.lpKeys[id]['bookData']].value
      }
    }, this);

    //console.log(books)

        return (
        <Split
        side={
            <Box mt="30px" ml="25px" mr="35px">
                <Logo/>
                <Box mt="30px">
                    <Text size="22px" weight="400">All Contracts</Text>
                </Box>
                <Flex mt="20px" justifyContent="space-between">
                    {this.assets.slice(0,2).map((asset, index) => <DrizzleContract color={E} width="48%" key={asset.id} showActions={false} id={asset.id}/>)}
                </Flex>
                <Flex mt="20px" justifyContent="space-between">
                    {this.assets.slice(2,4).map((asset, index) => <DrizzleContract color={E} width="48%" key={asset.id} showActions={false} id={asset.id}/>)}
                </Flex>
            </Box>
        }>
        
            <Flex mt="30px" mx="25px" justifyContent="space-between">
                <Box>
                    <IndicatorB size="25px" label="Currently Selected Contract: " value={this.currentContract}/>
                </Box>
                <Flex>
                    <IndicatorB ml="20px" size="25px" label="Leverage Ratio" value={leverageRatio/100}/>
                </Flex>
            </Flex>
            
            <Box mt="65px" mx="30px">
                <Box>
                    <Triangle margin="15px" scale={1.8} color="#70B43F"/> <Text>Make an Offer</Text>
                </Box>
                <Flex mt="20px">
                    <Flex mr="30px" alignItems="center">
                        <Text margin="10px">Current Margin</Text> <Text underline={C}>{bookData.lpMargin} Ξ</Text>
                    </Flex>
                </Flex>
                <Flex mt="15px">
                    <Form onChange={this.setMinRM} value={this.state.minRM} onSubmit={this.createBook} mb="10px" justifyContent="space-between" buttonWidth="95px"  label="Create A Book" inputWidth="280px" placeholder="Set RM" buttonLabel="Create"/>
                </Flex>
                <Flex mt="15px">
                    <Box mr="15px"><Text size="15px" weight="400" color={C}>Margin Rates</Text></Box>
                    <Box ml="10px"><Text size="15px" weight="400" color={C}>Long: {longRate/100 + "%"}</Text></Box>
                    <Box ml="10px"><Text size="15px" weight="400" color={C}>Short: {shortRate/100 + "%"}</Text></Box>
                </Flex>
                <Box mt="10px">
                    <Button onClick={this.openBook}>View your Book</Button>
                </Box>
            </Box>
            
            <Box mt="65px" mx="30px">
                <Box>
                    <Triangle margin="15px" scale={1.8} color="#D55757" rotation="180deg"/> <Text>Take an Offer</Text>
                </Box>
                <Box mt="20px">
                    <Text weight="bold">Current Offers</Text>
                    <OffersTable
                    rows={
                        Object.keys(books).map(lp =>
                            ({
                                fields: [
                                    lp,
                                    books[lp]['totalLong']/1e18,
                                    books[lp]['totalShort']/1e18,
                                    books[lp]['lpRM']/1e18,
                                    (books[lp]['lpMargin']/1e18).toFixed(2)
                                ],
                                onOpenLP: () => this.openLP(lp),
                                onTakeFromThisLP: () => this.takeFromLP(lp)
                            })
                        )
                    }/>
                </Box>
            </Box>
        
        </Split>
        )
    }
}

Offers.contextTypes = {
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

export default drizzleConnect(Offers, mapStateToProps)