import AssetSwap from './../build/contracts/AssetSwap.json'
import Oracle from './../build/contracts/Oracle.json'

const Web3 = require('web3');

const drizzleOptions = {
  web3: {
    block: false,
    fallback: {
      type: 'ws',
      url: 'wss://mainnet.infura.io/ws/v3/30a3fd3439754a74aa30ffae717d5d4c'
    }
  },
  contracts: [
    Oracle,
  ],
  events: {
    AssetSwap: [
      'OrderTaken',
      'FirstPrice',
      'LPFundedMargin',
      'Burn'
    ],
    Oracle: [
      'PriceUpdated',
      'SettlePrice',
      'PriceCorrected'
    ]
  },
  polls: {
    accounts: 1500
  }
}

export default drizzleOptions