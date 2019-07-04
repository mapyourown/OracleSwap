import React, { Component } from 'react'
//import * as testData from '../../../data/snapshot.json'
//import * as experiment from '../../../data/test.json'
import { drizzleConnect } from 'drizzle-react'
import PropTypes from 'prop-types'
import Logo from '../basics/Logo'
import { Flex, Box } from '@rebass/grid'
import Text from '../basics/Text'
//import { css } from 'styled-components'
import VBackground from '../basics/VBackground'
import { A} from '../basics/Colors'
import DrizzleContract from '../blocks/DrizzleContract'
import Chart from '../basics/Chart'
import {Themes} from 'react-tradingview-widget'
import WhitepaperIcon from '../../images/notebook.svg'
import TechnicalAppendixIcon from '../../images/appendix.svg'
import CheatSpreadsheetIcon from '../../images/cheat.svg'
import SimulationSheetIcon from '../../images/simulation.svg'
//import * as easings from 'd3-ease'
import { autoBind } from 'react-extras'

class Splash extends Component {

  constructor(props, context) {
    super(props)
    autoBind(this)
    
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
        chartSymbols: ["SP:SPX/CBOE:VIX", "BTCUSD"]
    }


    this.contracts = context.drizzle.contracts
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
    this.drizzle = context.drizzle
    console.log(props)
    console.log(context)
  }
  
  openWhitepaper() {
      console.log("Opened whitepaper")
      // TODO
  }
  
  openTechnicalAppendix() {
      console.log("Opened technical appendix")
      // TODO
  }
  
  openCheatSpreadsheet() {
      console.log("Opened cheat spreadsheet")
      // TODO
  }
  
  openSimulationSheet() {
      console.log("Opened simulation sheet")
      // TODO
  }
  
  openContract(id) {
    console.log("Opened contract", id)
    // TODO
  }

  render() {
    return (
    <div>
        <VBackground/>
        <Flex
        width={1}
        pt={30}
        px={30}>
            <Flex width={1} flexWrap="wrap">
                <Flex width={1} justifyContent="space-between">
                    <Box>
                        <Logo/>
                    </Box>
                    <Flex mt="5px">
                        <Box mr="20px"><a href="#documentation" style={{all: "unset", cursor: "pointer"}}><Text size="20px">Documentation</Text></a></Box>
                    </Flex>
                </Flex>
                
                <Flex
                width={1}
                justifyContent="center"
                alignItems="center"
                style={{
                    height: "calc(100vh - 90px)"
                }}>
                    <Box pb="220px">
                        <Flex justifyContent="center" mb="30px">
                            <Text size="20px" weight="200">Available Contracts</Text>
                        </Flex>
                        <Flex mt="20px" mr="-20px" flexWrap="wrap" width="1200px" justifyContent="center">
                            {this.assets.map( (asset, index) =>
                                <Box mr="20px" mb="20px" key={index}>
                                    <DrizzleContract
                                    onClickTake={() => this.openContract(asset.id)}
                                    onClickProvide={() => this.openContract(asset.id)}
                                    showActions={true}
                                    key={asset.id}
                                    width="350px"
                                    id={asset.id}/>
                                </Box>
                            )}
                        </Flex>
                    </Box>
                </Flex>
                <Flex
                width={1}
                justifyContent="center"
                flexWrap="wrap"
                style={{
                    backgroundColor: A
                }}>
                    <Box
                    width="1200px"
                    id="documentation"
                    mt="50px">
                        <Text size="20px">Documentation</Text>
                        <Flex
                        mt="20px"
                        justifyContent="space-between">
                            <Flex flexWrap="wrap" alignItems="center" onClick={this.openWhitepaper} style={{cursor: "pointer"}}> 
                                <Box mr="20px"><a href={process.env.PUBLIC_URL + '/docs/OracleSwap.pdf'} ><img role="presentation" src={WhitepaperIcon}/></a></Box>
                                <Box mt="-10px"><Text size="14px">   Whitepaper</Text></Box>
                            </Flex>
                            <Flex flexWrap="wrap" alignItems="center" onClick={this.openTechnicalAppendix} style={{cursor: "pointer"}}>
                                <Box mr="20px"><a href={process.env.PUBLIC_URL + '/docs/OSTechAppend.pdf'} ><img role="presentation" src={TechnicalAppendixIcon}/></a></Box>
                                <Box mt="-10px"><Text size="14px">Technical<br/>Appendix</Text></Box>
                            </Flex>
                            <Flex flexWrap="wrap" alignItems="center" onClick={this.openCheatSpreadsheet} style={{cursor: "pointer"}}>
                                <Box mr="20px"><a href={process.env.PUBLIC_URL + '/docs/OracleSwapData.xlsx'} ><img role="presentation" src={CheatSpreadsheetIcon}/></a></Box>
                                <Box mt="-10px"><Text size="14px">Long Term<br/>Strategy</Text></Box>
                            </Flex>
                            <Flex flexWrap="wrap" alignItems="center" onClick={this.openSimulationSheet} style={{cursor: "pointer"}}>
                                <Box mr="20px"><img role="presentation" src={SimulationSheetIcon}/></Box>
                                <Box mt="-10px"><Text size="14px">Simulation<br/>Sheet</Text></Box>
                            </Flex>
                        </Flex>
                    </Box>
                    
                    <Box
                    width="1200px"
                    id="charts"
                    mt="50px"
                    mb="100px">
                        <Box>
                            <Text size="20px">Oracle Price Asset History</Text>
                            <br/>
                            <a href="/data">Download Oracle Data</a>
                            <br/>
                            <a href="/oraclehist">View Oracle History</a>
                            <br/>
                            <a href="/burns">View Burn History</a>
                            <br/>
                            <a href="/faqs">View FAQS</a>
                            <br/>
                            <a href="winkdex.com">View Winkdex</a>
                            <br/>
                            {
                                this.state.chartSymbols.map((symbol, index) =>
                                    <Box spacing="4px" mt="20px" key={index}>
                                        <Chart
                                        symbol={symbol}
                                        toolbar_bg="rgba(0, 0, 0, 1)"
                                        theme={Themes.DARK}
                                        key={index}
                                        width="100%"
                                        height="300px"/>
                                    </Box>
                                )
                            }
                        </Box>
                    </Box>
                </Flex>
            </Flex>
        </Flex>
      </div>
    )
  }
}

Splash.contextTypes = {
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

export default drizzleConnect(Splash, mapStateToProps)
