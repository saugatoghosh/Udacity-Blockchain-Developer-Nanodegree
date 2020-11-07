const HDWalletProvider = require('truffle-hdwallet-provider');
const infuraKey = "218e28b329ba4d47bf70300e42008b80";

const mnemonic = "wood glad edge six upgrade target pond wear unhappy shuffle recycle angle";

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*" // Match any network id
    },

    rinkeby: {
      provider: () => new HDWalletProvider(mnemonic, `https://rinkeby.infura.io/v3/${infuraKey}`),
      network_id: 4,       // Rinkeby's id
      gas: 4500000, // Rinkeby has a lower block limit than mainnet
      gasPrice: 10000000000
      }
      
  },

  compilers: {
    solc: {
      version: "^0.4.24"    // Fetch exact version from solc-bin (default: truffle's version)
      // docker: true,        // Use "0.5.1" you've installed locally with docker (default: false)
      // settings: {          // See the solidity docs for advice about optimization and evmVersion
      //  optimizer: {
      //    enabled: false,
      //    runs: 200
      //  },
      //  evmVersion: "byzantium"
      // }
    }
  }
};

