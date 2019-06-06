var HDWalletProvider = require("truffle-hdwallet-provider");
var secrets = require("./secret-mneumonic.js")

module.exports = {
  migrations_directory: "./migrations",
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*" // Match any network id
    },
    testlive: {
      provider: function() {
        // Last param is the account
        return new HDWalletProvider(secrets.mneumonic, "https://mainnet.infura.io/v3/30a3fd3439754a74aa30ffae717d5d4c", 0)
      },
      network_id: '1', // ETH public network
      gasPrice:15000000000,

    },
    ropsten: {
      provider: function() {
        // Last param is the account
        return new HDWalletProvider(secrets.mneumonic, "https://ropsten.infura.io/v3/30a3fd3439754a74aa30ffae717d5d4c", 0)
      },
      network_id: 3
    }  
  },
  solc: {
    optimizer: {
      enabled: true,
      runs: 500
    }
  } 
};
