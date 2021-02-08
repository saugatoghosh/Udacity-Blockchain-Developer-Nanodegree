// migrating the appropriate contracts
var Verifier = artifacts.require("./Verifier.sol");
var SolnSquareVerifier = artifacts.require("./SolnSquareVerifier.sol");

module.exports = function(deployer) {
  //deployer.deploy(ERC721Mintable);
  deployer.deploy(Verifier)
    .then(() => {
        return deployer.deploy(SolnSquareVerifier, Verifier.address);
    });
};

