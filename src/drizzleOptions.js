import ComplexStorage from './../build/contracts/ComplexStorage.json'
import SimpleStorage from './../build/contracts/SimpleStorage.json'
import TutorialToken from './../build/contracts/TutorialToken.json'
import SwapMarket from './../build/contracts/SwapMarket.json'
import MuliOracle from './../build/contracts/MultiOracle.json'

const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

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
    {
      contractName: 'SPXSwap',
      web3Contract: new web3.eth.Contract(SwapMarket.abi, '0xc1d7e6a13813eeb5aa771ad648a3d8e2febe175a')
    },
    {
      contractName: 'BTCSwap',
      web3Contract: new web3.eth.Contract(SwapMarket.abi, '0xf04cfecf064ce1774563099574e7ae75e159fa0e')
    },
    {
      contractName: 'ETHBTCSwap',
      web3Contract: new web3.eth.Contract(SwapMarket.abi, '0x192a38cc49a1b008fc5b2829cbd499737945b340')
    },
    {
      contractName: 'SwapMarket',
      web3Contract: new web3.eth.Contract(SwapMarket.abi, '0xc1d7e6a13813eeb5aa771ad648a3d8e2febe175a')
    },
  ],
  events: {
    SimpleStorage: ['StorageSet'],
    SwapMarket: [
      'OrderTaken',
      'OpenMargin'
    ]
  },
  polls: {
    accounts: 1500
  }
}

export default drizzleOptions