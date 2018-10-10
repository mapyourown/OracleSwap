import ComplexStorage from './../build/contracts/ComplexStorage.json'
import SimpleStorage from './../build/contracts/SimpleStorage.json'
import TutorialToken from './../build/contracts/TutorialToken.json'
import SwapMarket from './../build/contracts/SwapMarket.json'
import MuliOracle from './../build/contracts/MultiOracle.json'

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