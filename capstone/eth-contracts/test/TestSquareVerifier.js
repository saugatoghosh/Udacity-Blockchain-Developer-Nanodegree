var Verifier = artifacts.require('Verifier');

//Test verification with correct proof
// - use the contents from proof.json generated from zokrates steps
var Sampleproof = {
	"proof": {
        "a": ["0x2946962b8f8415c1d07dcfdbfb5517d357545ddaced4bae1f4fdbded71b81ed8", "0x1c493b0ed48ffcc329c51e1e67771fd3e56dcd1942f162ba2640841e8ab88065"],
        "b": [["0x1ed1b324dec01a5850736b1170028c67312915c79f3c99eb218fbdee26b038b3", "0x1592f8982093a4e0fd8344a8741cfe73249f46d637fa3410d6daa9530bb8071d"], ["0x286f45fa296c32ecd4b41375be0c23ec45715776a2400d7e5f92a125b6db2c8b", "0x146cc64fdf895beed18294adb36dce45a62ecea4b9569b4cded137f424f3d790"]],
        "c": ["0x1f04bed8b1dcaa8f0435c9e6bb013928b255a1f7c3060c01ca46309ee90ed5f0", "0x1daff906ae42c6cd5be9728c0958aa60c23aec6dbea2306d4b25e4f85ba78455"]
    },
    "inputs": ["0x0000000000000000000000000000000000000000000000000000000000000009", "0x0000000000000000000000000000000000000000000000000000000000000001"]
};

contract('Verifier', accounts => {
    //read first account
    const account = accounts[0];

    const a = Sampleproof["proof"]["a"];
    const b = Sampleproof["proof"]["b"];
    const c = Sampleproof["proof"]["c"];
    const correctProofInput = Sampleproof["inputs"];
    const incorrectProofInput = [1,2];

    describe('Testing Verifier', function () {

      beforeEach(async function () { 
              this.contract = await Verifier.new(accounts);         
      });
      // Test verification with correct proof
      // - use the contents from proof.json generated from zokrates steps
      it('should return true for correct proof', async function () { 
          var result = await this.contract.verifyTx.call(a, b, c, correctProofInput, {from:account});
          assert.equal(result, true, "Failed to verify a true proof");
        
      }); 

      // Test verification with incorrect proof
      it('should return false for incorrect proof', async function () {
          var result = await this.contract.verifyTx.call(a, b, c, incorrectProofInput, {from:account});
          assert.equal(result, false, "Verified an incorrect proof");
      });
    });

});
  