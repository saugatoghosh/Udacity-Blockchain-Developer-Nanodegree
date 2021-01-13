var Web3 = require('web3');

const FlightSuretyApp = artifacts.require("FlightSuretyApp");
const FlightSuretyData = artifacts.require("FlightSuretyData");
const fs = require('fs');

module.exports = function(deployer) {

    let firstAirline = '0xb39C823E75BFa4592B9F28Db71CeA5926817e4D4';
    let owner = '0x55E5BcfE92369F70620850D02F7aBa8637Dc4421';
    deployer.deploy(FlightSuretyData, firstAirline)
    .then(() => {
        return deployer.deploy(FlightSuretyApp, FlightSuretyData.address)
                .then(async() => {
                    let config = {
                        localhost: {
                            url: 'http://localhost:8545',
                            dataAddress: FlightSuretyData.address,
                            appAddress: FlightSuretyApp.address
                        }
                    }
                    await fs.writeFileSync(__dirname + '/../src/dapp/config.json',JSON.stringify(config, null, '\t'), 'utf-8');
                    await fs.writeFileSync(__dirname + '/../src/server/config.json',JSON.stringify(config, null, '\t'), 'utf-8');
                    accounts = await web3.eth.getAccounts();
                    let flightSuretyData = await FlightSuretyData.new(firstAirline);
                    let flightSuretyApp = await  FlightSuretyApp.new(FlightSuretyData.address);
                    await flightSuretyData.authorizeContract(flightSuretyApp.address, {from: owner});
                    
                    
                    

                    
                });
    });
}