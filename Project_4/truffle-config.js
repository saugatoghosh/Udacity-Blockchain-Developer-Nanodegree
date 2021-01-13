var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = "scene paper column toward number run merit latin donkey extend photo museum";
var NonceTrackerSubprovider = require("web3-provider-engine/subproviders/nonce-tracker")


module.exports = {
  networks: {
    
    
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
      gas: 6721975
    },
  
  
    development2: {
      provider: function() {
        var wallet = new HDWalletProvider(mnemonic, "http://127.0.0.1:8545/", 0, 50);
        var nonceTracker = new NonceTrackerSubprovider()
        wallet.engine._providers.unshift(nonceTracker)
        nonceTracker.setEngine(wallet.engine)
        return wallet
      },
      network_id: '*',
      gas: 6721975
    }
    
    
    
  },
  compilers: {
    solc: {
      version: "^0.4.24"
    }
  }
};