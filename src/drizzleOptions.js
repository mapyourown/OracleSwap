import AssetSwap from './../build/contracts/AssetSwap.json'
import Oracle from './../build/contracts/Oracle.json'

const Web3 = require('web3');

//const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
//const web3 = new Web3(new Web3.providers.WebsocketProvider("wss://mainnet.infura.io/ws/v3/30a3fd3439754a74aa30ffae717d5d4c"));
//const web3 = new Web3(new Web3.providers.HttpProvider("https://mainnet.infura.io/v3/30a3fd3439754a74aa30ffae717d5d4c"));

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
    /*{
      contractName: 'ETHSwap',
      web3Contract: new web3.eth.Contract(AssetSwap.abi, '0xa651c4d689eac3a740cb83c090a72a48dd8764bb')
    },
    {
      contractName: 'SPXSwap',
      web3Contract: new web3.eth.Contract(AssetSwap.abi, '0x08f41c5218dca75e7e93f2fa450f26b09a28dd10')
    },
    {
      contractName: 'BTCSwap',
      web3Contract: new web3.eth.Contract(AssetSwap.abi, '0x4283073a6d8cb0f1b8fec504ca1ca925f7c56fe1')
    },
    {
      contractName: 'BTCETHSwap',
      web3Contract: new web3.eth.Contract(AssetSwap.abi, '0x0363ebf9b059aa6287b4e287447ec0588ca34a73')
    },*/
  ],
  events: {
    AssetSwap: [
      'OrderTaken',
      'FirstPrice',
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