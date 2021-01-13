
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

const truffleAssert = require('truffle-assertions');

contract('Flight Surety Tests', async (accounts) => {
   
  
  let newAirline2 = accounts[2];
  let newAirline3 = accounts[3];
  let newAirline4 = accounts[4];
  let newAirline5 = accounts[5];
  let passenger = accounts[6];

  const paymentfund = web3.utils.toWei("10","ether");
  const insurancefund = web3.utils.toWei("1", "ether");

  let FIRST_ORACLE_ADDRESS = 7;
  const TEST_ORACLES_COUNT = 20;
  let LAST_ORACLE_ADDRESS = FIRST_ORACLE_ADDRESS + TEST_ORACLES_COUNT;
  let oracleIndexes = [];

  const STATUS_CODE_UNKNOWN = 0;
  const STATUS_CODE_ON_TIME = 10;
  const STATUS_CODE_LATE_AIRLINE = 20;
  const STATUS_CODE_LATE_WEATHER = 30;
  const STATUS_CODE_LATE_TECHNICAL = 40;
  const STATUS_CODE_LATE_OTHER = 50;

  let settingStatus;
  
  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeContract(config.flightSuretyApp.address, {from: config.owner});
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () {

    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");

  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

      // Ensure that access is denied for non-Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
            
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

      // Ensure that access is allowed for Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false, {from: config.owner});
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
      await config.flightSuretyData.setOperatingStatus(true);
      
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

      await config.flightSuretyData.setOperatingStatus(false);

      let reverted = false;
      try 
      {
          await config.flightSuretyData.setTestingMode(true);
      }
      catch(e) {
          reverted = true;
      }
      assert.equal(reverted, true, "Access not blocked for requireIsOperational");      

      // Set it back for other tests to work
      await config.flightSuretyData.setOperatingStatus(true);

  });

  it('(airline) First airline is registered when the contract is deployed', async () => {
      let result = await config.flightSuretyData.isAirlineRegistered.call(config.firstAirline);
       // ASSERT
      assert.equal(result, true, "First airline is not registered when contract is deployed");
  });


  it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {
  
    // ACT
    try {
        await config.flightSuretyApp.registerAirline(newAirline2, {from: config.firstAirline});
    }
    catch(e) {

    }
    let result = await config.flightSuretyData.isAirlineRegistered.call(newAirline2); 

    // ASSERT
    assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");
    

  });

  it('(airline) Able to submit funding', async () => {

    // ACT
    await config.flightSuretyApp.fundAirline({from: config.firstAirline, value: paymentfund});

    let result_1 = await config.flightSuretyData.isAirlineFunded.call(config.firstAirline);
    let result_2 = await config.flightSuretyData.getBalanceOfAirline.call(config.firstAirline);
    


    // ASSERT
    assert.equal(result_1, true, "Airline is not able to submit funding");
    assert.equal(result_2, paymentfund, "Airline is not able to submit funding of 10 ether");

});
  
  it('(airline) only existing airline may register a new airline until there are four airlines registered', async () => {


    try{
      await config.flightSuretyApp.registerAirline(newAirline3,{from: newAirline2});
    }
    catch(e) {

    }
    let result_1 = await config.flightSuretyData.isAirlineRegistered(newAirline3);
 
    await config.flightSuretyApp.registerAirline(newAirline2, {from: config.firstAirline});
    await config.flightSuretyApp.registerAirline(newAirline3, {from: config.firstAirline});
    await config.flightSuretyApp.registerAirline(newAirline4, {from: config.firstAirline});

    let result_2 = await config.flightSuretyData.isAirlineRegistered(newAirline2);
    let result_3 = await config.flightSuretyData.isAirlineRegistered(newAirline3);
    let result_4 = await config.flightSuretyData.isAirlineRegistered(newAirline4);

    assert.equal(result_1, false, "Airline was registered by an invalid airline.");
    assert.equal(result_2, true, "Airline was not registered but it should.");
    assert.equal(result_3, true, "Airline was not registered but it should.");
    assert.equal(result_4, true, "Airline was not registered but it should.");

  });

  it('(airline) Registration of fifth and subsequent airlines requires multiparty consensus of 50% of registered airlines', async () => {

    
    await config.flightSuretyApp.registerAirline(newAirline5, {from: config.firstAirline});

    let result_1 = await config.flightSuretyData.isAirlineRegistered(newAirline5);

    await config.flightSuretyApp.fundAirline({from: newAirline2, value: paymentfund});
    await config.flightSuretyApp.registerAirline(newAirline5, {from: newAirline2});
    
    let result_2 = await config.flightSuretyData.isAirlineRegistered(newAirline5);

    assert.equal(result_1, false, "Multiparty call failed.");
    assert.equal(result_2, true, "Fifth airline not registered through multiparty call");

  });

  it('Passengers can pay up to 1 ether for purchasing flight insurance', async function () {
    //let fund =  await config.flightSuretyData.MIN_INSURED_VALUE.call();
    let reverted = false;

    let airline = newAirline2;
    let flight = "SK806";
    let timestamp = "2019090115350";
    await config.flightSuretyApp.registerFlight(airline, flight, timestamp);
    try{
        await config.flightSuretyApp.buyInsurance(
                                            airline,
                                            flight,
                                            timestamp,
                                            {from: passenger , value: insurancefund});
        let premium = await config.flightSuretyData.checkPremium(passenger);
        assert.equal(insurancefund, premium, "Insurance didn't equal payment");
    }
    catch(e) {
        console.error(e);
        reverted = true;
    }
    // ASSERT
    assert.equal(reverted, false, "Can't buy insurance ,Operation Failed");
  });

  it('can register oracles', async () => {

    let reverted = false;
    try
    {
      // ARRANGE
      let fee = await config.flightSuretyApp.REGISTRATION_FEE.call();
      // ACT
      for(let a=FIRST_ORACLE_ADDRESS; a<=LAST_ORACLE_ADDRESS; a++) {
          await config.flightSuretyApp.registerOracle({from: accounts[a], value: fee});
          let result = await config.flightSuretyApp.getMyIndexes.call({from: accounts[a]});
          console.log(`Oracle Registered: ${result[0]}, ${result[1]}, ${result[2]}`);

          oracleIndexes.push({
                    address: accounts[a],
                    indexes: [
                        new BigNumber(result[0]).toString(),
                        new BigNumber(result[1]).toString(),
                        new BigNumber(result[2]).toString()
                      ]
                });
            }
      // Check balance
      //let dataBalance = await config.flightSuretyData.balanceOf();
      //console.log(`flightSuretyData contract balance: ${dataBalance}`);
    }
    catch(e) {
      console.error(e);
      reverted = true;
    }
    assert.equal(reverted, false, "cann't register oracles");

  });

  it('can request flight status', async function () {

    let airline = newAirline2;
    let flight = "SK806";
    let timestamp = "2019090115350";

    let resOracles=[];
    let reqIndex;

    settingStatus = STATUS_CODE_LATE_AIRLINE;

    let fetchTx = await config.flightSuretyApp.fetchFlightStatus(airline,flight,timestamp);

    truffleAssert.eventEmitted(fetchTx, 'OracleRequest', (ev) => {

        reqIndex = new BigNumber(ev.index).toString();

        resOracles = oracleIndexes.filter((oracles)=>{
            return (oracles.indexes[0] === reqIndex||oracles.indexes[1] === reqIndex||oracles.indexes[2] === reqIndex)
        });
        return true;
    });

    for (const oracle of resOracles){
         await config.flightSuretyApp.submitOracleResponse(
                                    reqIndex,
                                    airline,
                                    flight,
                                    timestamp,
                                    settingStatus,
                                    {from: oracle.address});
        }
    console.log(`Respond with random status code, now flight's status is ${settingStatus}`);
  });

  it('If Flight status is 20, the passenger receives credit of 1.5X the amount .Otherwise can not', async function () {

    let reverted = false;
    let airline = newAirline2;
    let flight = "SK806";
    let timestamp = "2019090115350";
    //let flightKey = await config.flightSuretyApp.getFlightKey(airline,flight,timestamp);


    try{
        let premium = await config.flightSuretyData.checkPremium(passenger);
        // ASSERT
        await config.flightSuretyApp.claimInsurance(airline,flight,timestamp,{from: passenger});

        let credit =  await config.flightSuretyData.checkInsuranceCredit(passenger);
        assert.equal(new BigNumber(premium).toNumber()*1.5,  new BigNumber(credit).toNumber(), "Can't get credit of 1.5X the amount of insurance");
    }
    catch(e) {
        console.error(e);
        reverted = true;
    }

    // ASSERT
    assert.equal(reverted, false, "Can't credit insurance ,Operation Failed");

  });

  it('If Flight status is 20, the passenger can withdraw any funds owed to them as a result of receiving credit for insurance payout. Otherwise can not', async function () {
    let reverted = false;
    
    let creditToPay = await config.flightSuretyData.checkInsuranceCredit(passenger);
    let passengerOriginalBalance = await web3.eth.getBalance(passenger);
    let receipt = await config.flightSuretyData.pay({from: passenger});
    let passengerFinalBalance = await web3.eth.getBalance(passenger);

    // Obtain total gas cost
    const gasUsed = Number(receipt.receipt.gasUsed);
    const tx = await web3.eth.getTransaction(receipt.tx);
    const gasPrice = Number(tx.gasPrice);

    let creditLeft = await config.flightSuretyData.checkInsuranceCredit(passenger);

    if(settingStatus === STATUS_CODE_LATE_AIRLINE){
      // ASSERT
      assert.equal(creditLeft.toString(), 0, "Passenger didn't transfer ethers to wallet.");
      assert.equal(Number(passengerOriginalBalance) + Number(creditToPay) - (gasPrice * gasUsed), Number(passengerFinalBalance), "Passengers balance did not increase by the amount credited");

      assert.equal(reverted, false, "Can't withdraw ,Operation Failed");

    }else{
      assert.equal(reverted, true, "The Flight status isn't STATUS_CODE_LATE_AIRLINE");
    }
    
  });
 
 

});
