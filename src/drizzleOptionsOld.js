import ComplexStorage from './../build/contracts/ComplexStorage.json'
import SimpleStorage from './../build/contracts/SimpleStorage.json'

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