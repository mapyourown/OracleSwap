import ComplexStorage from './../build/contracts/ComplexStorage.json'
import SimpleStorage from './../build/contracts/SimpleStorage.json'
import TutorialToken from './../build/contracts/TutorialToken.json'
import SwapMarket from './../build/contracts/SwapMarket.json'
import MuliOracle from './../build/contracts/MultiOracle.json'
//const web3 = new Web3(Web3.givenProvider || "http://localhost:8545");

/*var eth_address = '0xf2f9490c019d8f5e21c58fb45ed87a34d3585d6f'
var vix_address = '0x7cf532fa803a194b641b46340a2e33e9c40facdb'
var spx_address = '0x6e97844bb668cde82ef38c74d4793743489afc73'
var btc_address = '0x4d21c0dbc4f0ca5fb42102afc64c1a81b7e8ab54'*/


const drizzleOptions = {
  web3: {
    block: false,
    fallback: {
      type: 'ws',
      url: 'ws://127.0.0.1:8545'
    }
  },
  contracts: [
    ComplexStorage,
    SimpleStorage,
    TutorialToken,
    MuliOracle,
    SwapMarket
    /*{
      contractName: 'ETH_Oracle',
      web3Contract: new web3.eth.Contract(Oracle.abi, eth_address)
    },
    {
      contractName: 'VIX_Oracle',
      web3Contract: new web3.eth.Contract(Oracle.abi, vix_address)
    },
    {
      contractName: 'SPX_Oracle',
      web3Contract: new web3.eth.Contract(Oracle.abi, spx_address)
    },
    {
      contractName: 'BTC_Oracle',
      web3Contract: new web3.eth.Contract(Oracle.abi, btc_address)
    }*/

  ],
  events: {
    SimpleStorage: ['StorageSet'],
    SwapMarket: [
      'OrderTaken',
      'OpenMargin'
    ]
    //Oracle: ['PriceUpdated']
  },
  polls: {
    accounts: 1500
  }
}

export default drizzleOptions