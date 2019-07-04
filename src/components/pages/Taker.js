import React, { Component } from 'react'
import * as testData from '../../../data/snapshot.json'
//import * as experiment from '../../../data/test.json'
import { drizzleConnect } from 'drizzle-react'
import PropTypes from 'prop-types'
import Split from '../layout/Split'
import { Box } from '@rebass/grid'
import Logo from '../basics/Logo'
import Text from '../basics/Text'
import { D} from '../basics/Colors'
//import IndicatorB from '../basics/IndicatorB'
//import LabeledText from '../basics/LabeledText'
import {autoBind} from 'react-extras'
import Triangle from '../basics/Triangle'
import SubcontractRow from '../blocks/SubcontractRow.js'
import DrizzleSubcontractRow from '../blocks/DrizzleSubcontractRow.js'
import TruncatedAddress from '../basics/TruncatedAddress.js'

class TakerInfo extends Component {

  constructor(props, context) {
    super(props)
    autoBind(this)
    
    console.log(props)
    console.log(context)
    console.log('data:', testData)

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
    this.currentTaker = this.props.routeParams.address;
    console.log(this.currentContract)
    console.log(this.currentTaker)

    this.contracts = context.drizzle.contracts
    this.drizzle = context.drizzle

    this.takeKeys = {}

    this.state = {
      contractID: 1,

      name: '',
      lps: {},

      takerAddress: props.params.address /* From URL /taker/:address */,
      takerContracts: [],
      
      subcontracts: [
        {
            address: "0x8976a846ef2b46b07af60d744f7bb120e82666f2",
            bookAddress: "0x8976a846ef2b46b07af60d744f7bb120e82666f2",
            marginRate: 30,
            takerMargin: 31,
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
      ]
    }

  }
  
  openSubcontract(id) {
      console.log("Opened subcontract", id)
      
      const lp = this.takeKeys[id]['lp']
      console.log(this.takeKeys)
      console.log(lp)
      const url = '/' + this.currentContract + '/lp/'
       + lp + '/subcontract/' + id;
      window.open(url, '_blank');
  }

  componentDidMount() {
    this.findValues(this.state.contractID)
  }

  lookupName(id) {
    this.setState({ name:testData[id]["name"]})
    //this.assetKey = this.contracts.MultiOracle.methods.assets.cacheCall(id)
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

  findTakerInfo() {
    var contracts = testData[this.state.contractID]["takers"][this.state.takerAddress]
    for (var i in contracts) {
      var lp = contracts[i].lpAddress
      var subid = contracts[i].subcontractId
      contracts[i]['requiredMargin'] = testData[this.state.contractID]["lps"][lp]["book"][subid]["ReqMargin"]
      contracts[i]['takerMargin'] = testData[this.state.contractID]["lps"][lp]["book"][subid]["TakerMargin"]
      contracts[i]['side'] = testData[this.state.contractID]["lps"][lp]["book"][subid]["Side"]
      contracts[i]['isCancelled'] = testData[this.state.contractID]["lps"][lp]["book"][subid]["isCancelled"]
      contracts[i]['isBurned'] = testData[this.state.contractID]["lps"][lp]["book"][subid]["isBurned"]
    }
    this.setState({takerContracts: contracts})
  }

  getAllTakes() {
    const web3 = this.context.drizzle.web3
    const swap = this.drizzle.contracts[this.contractDict[this.currentContract]]
    const contractweb3 = new web3.eth.Contract(swap.abi, swap.address);
    var takes = {};
    contractweb3.getPastEvents(
      'OrderTaken', 
      {
        filter: {taker: this.currentTaker},
        fromBlock: 0,
        toBlock: 'latest'
      }
    ).then(function(events) { 
      events.forEach(function(element) {
        takes[element.returnValues.id] =
        {
          "data": this.contracts[this.contractDict[this.currentContract]].methods.getSubcontractData.cacheCall(element.returnValues.lp, element.returnValues.id),
          "status": this.contracts[this.contractDict[this.currentContract]].methods.getSubcontractStatus.cacheCall(element.returnValues.lp, element.returnValues.id),
          "lp": element.returnValues.lp
        }
      }, this);
      this.takeKeys = takes
    }.bind(this));
  }

  findValues(id) {
    this.lookupName(id)
    this.getAllTakes()
  }

  render() {

    let subcontracts = {}
    Object.keys(this.takeKeys).forEach(function(id) {
      if (this.takeKeys[id]['data'] in this.props.contracts[this.contractDict[this.currentContract]].getSubcontractData &&
        this.takeKeys[id]['status'] in this.props.contracts[this.contractDict[this.currentContract]].getSubcontractStatus)
      {
        let data = this.props.contracts[this.contractDict[this.currentContract]].getSubcontractData[this.takeKeys[id]['data']].value
        let status = this.props.contracts[this.contractDict[this.currentContract]].getSubcontractStatus[this.takeKeys[id]['status']].value
        //subcontracts[id] = {data: data, status: status}
        subcontracts[id] = {...data, ...status}
      }
    }, this);

    return (
        <Split
        side={
            <Box mt="30px" ml="25px" mr="35px">
                <Logo/>
                <Box mt="30px">
                    <Text size="22px" weight="400">Taker</Text>
                </Box>
                
                <Box
                mb="15px"
                mt="15px">
                    <TruncatedAddress label="Address" addr={this.currentTaker} start="8" end="6" transform="uppercase" spacing="1px"/>
                </Box>
                
                
            </Box>
        }>
            
        <Box mt="36px" mx="30px">
            <Box>
                <Triangle margin="15px" scale={1.8} color="#D55757" rotation="180deg"/> <Text>All taker positions</Text>
                <Box
                  mt="20px"
                  style={{
                      borderTop: `thin solid ${D}`
                  }}>
                    {Object.keys(subcontracts).map((id, index) =>
                        <DrizzleSubcontractRow
                        key={index}
                        onOpenDetail={() => this.openSubcontract(id)}
                        id = {id}
                        fields={subcontracts[id]}/>
                    )}
                </Box>
            </Box>
        </Box>
        
        </Split>
    )
  }
}

function DisplayTakenContracts(props) {
  const listitems = props.contracts.map( function(contract) {
    return(
      <tr key={contract['subcontractId'].toString()}>
        <td><a href="/subcontract">{contract['subcontractId']}</a></td>
        <td>{contract['lpAddress']}</td>
        <td>{contract['requiredMargin']/1e18}</td>
        <td>{contract['takerMargin']/1e18}</td>
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
          <th>Taker Margin</th>
          <th>Side</th>
          <th>Is Cancelled?</th>
          <th>Is Burned?</th>
        </tr>
        {listitems}
      </tbody>
    </table>
    
  )
}


TakerInfo.contextTypes = {
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

export default drizzleConnect(TakerInfo, mapStateToProps)
