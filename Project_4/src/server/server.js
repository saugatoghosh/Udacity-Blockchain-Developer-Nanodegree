import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json'; 
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json'; 
import Config from './config.json'; 
import Web3 from 'web3'; 
import express from 'express'; 
let config = Config['localhost']; 
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws'))); 
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress); 
let flightSuretyData = new web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);

let oracles = [];

// Flight status codees
const STATUS_CODE_UNKNOWN = 0;
const STATUS_CODE_ON_TIME = 10;
const STATUS_CODE_LATE_AIRLINE = 20;
const STATUS_CODE_LATE_WEATHER = 30;
const STATUS_CODE_LATE_TECHNICAL = 40;
const STATUS_CODE_LATE_OTHER = 50;

const statuscodes = [
  STATUS_CODE_UNKNOWN,
  STATUS_CODE_ON_TIME,
  STATUS_CODE_LATE_AIRLINE,
  STATUS_CODE_LATE_WEATHER,
  STATUS_CODE_LATE_TECHNICAL,
  STATUS_CODE_LATE_OTHER 
]

let oracleaddresses = [];
var ORACLES_COUNT = 20, FIRST_ORACLE_ADDRESS, LAST_ORACLE_ADDRESS;

web3.eth.getAccounts().then(accounts => {
  // Make sure there enough accounts to support your oracles
  if(accounts.length < ORACLES_COUNT) 
  {
    console.log('\nServer Error - Not enough accounts to support oracles...\n'+
                'You need at least ' + ORACLES_COUNT + ' to power up the oracles server.');
    return; //abort server
  }
  // Register 20 oracles
  FIRST_ORACLE_ADDRESS = accounts.length - ORACLES_COUNT -1; //Last set of accounts are used for the oracles--to avoid using contract accounts
  LAST_ORACLE_ADDRESS = ORACLES_COUNT + FIRST_ORACLE_ADDRESS;
  console.log('Ganache returned '+accounts.length+' accounts.');
  console.log('Server will use only '+ORACLES_COUNT+' of these accounts for oracles.');
  console.log('Starting from accounts['+FIRST_ORACLE_ADDRESS+'] for the first oracle.');
  console.log('Ending at accounts['+LAST_ORACLE_ADDRESS+'] for the last oracle.');

  // Initialize oracles addresses and indexes with smart contract
  flightSuretyApp.methods.REGISTRATION_FEE().call({
    "from": accounts[0],
    "gas": 4712388,
    "gasPrice": 100000000000
  }).then(fee => { 
    console.log('Smart Contract requires ('+fee+') wei to fund oracle registration.');
    for(var a = FIRST_ORACLE_ADDRESS;a < LAST_ORACLE_ADDRESS; a++)
    {
      let account = accounts[a];
      oracleaddresses.push(account); //To keep the server updated with oracles addresses 
                                  //Because sometimes the oracle is already registered in the contract from before, 
                                  //so it reverts when the server tries to register it again.
      console.log('About to register oracle: '+account);
      flightSuretyApp.methods.registerOracle().send({
            "from": account,
            "value": fee,
            "gas": 4712388,
            "gasPrice": 100000000000
      }).then(result => {
          //oracle created;
          console.log('Registered: '+account);
      }).catch(err => {
          // oracle errored
          console.log('Could not create oracle at address: '+account+'\n\tbecause: '+err);
      })
    } //end for loop

     // Display oracles addresses and indexes previously retrieved from smart contract
  oracleaddresses.forEach(oracle => {
   flightSuretyApp.methods
        .getMyIndexes().call({
          "from": oracle,
          "gas": 4712388,
          "gasPrice": 100000000000
        }).then(result => {
          console.log('Assigned Indices: '+result[0]+', '+result[1]+', '+result[2]+'\tfor oracle: '+oracle);

        }).catch(error => {
          console.log('Could not retrieve oracle indices because: '+error);
        })

  }); //end forEach oracle*/

  //console.log('Oracles server all set-up...\nOracles registered and assigned addresses...');
  //console.log('Listening to a request event...');

//Listen for oracle request event
 flightSuretyApp.events.OracleRequest({ 
    fromBlock: "latest" }, function (error, event) { 
        if (error) { 
            console.log(error); 
        } 
        console.log('Caught an event: ');
        let eventResult = event['returnValues'];
        console.log(eventResult);
        let index = eventResult['index'];
        let airline = eventResult['airline'];
        let flight = eventResult['flight'];
        let timestamp = eventResult['timestamp']; 
        //let found = false;
        console.log('Only the oracles with index '+index+' should respond to the request.');

        /*
        let selectedCode = STATUS_CODES[1];
        let scheduledTime = (timestamp * 1000);
        console.log(`Flight scheduled to: ${new Date(scheduledTime)}`);
        if (scheduledTime < Date.now()) {
            selectedCode = STATUS_CODES[2];
        }
        */

       oracleaddresses.forEach(oracle => {
        flightSuretyApp.methods
            .getMyIndexes().call({
              "from": oracle,
              "gas": 4712388,
              "gasPrice": 100000000000
            }).then(result => {
              //console.log('Indices: '+result[0]+', '+result[1]+', '+result[2]+'\tfor oracle: '+oracle);
              if(result[0]==index || result[1]==index || result[2]==index) //matching oracle -> respond with random status
              {
                //let flightStatus = 20; // for testing only          
                let flightStatus = 20; 
                                                                 
                console.log('HIT- Responding with random flight status: '+flightStatus+' from oracle: '+oracle);                                                    
                //Reply back to smart contract with the determined status code
                flightSuretyApp.methods
                .submitOracleResponse(index, airline,flight, timestamp, flightStatus).send({
                  "from": oracle,
                  "gas": 4712388,
                  "gasPrice": 100000000000
                }).then(result => {
                  console.log('Oracle ['+oracle+'] response submitted successfully with status code '+flightStatus) 
                }).catch(error=>{
                  console.log('Could not submit oracle response because: '+error)
                });//end submitOracleResponse*/
              }//forEach oracle
  
            }).catch(error => {
              console.log('Could not retrieve oracle indices because: '+error);
            })
  
      }); //end forEach oracle
    });
  //*/

  }).catch(err=>{console.log('Could not retrieve registration fee. '+err)});//end REGISTRATION_FEE 
});//end getAccounts

        

const app = express(); 
app.get('/api', (req, res) => { 
    res.send({
      message: 'An API for use with your Dapp!' 
    })
})

export default app;