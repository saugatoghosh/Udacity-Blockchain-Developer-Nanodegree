import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';
/*
function randomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}
*/
export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        
        this.web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);
        this.appAddress = config.appAddress;
        this.initialize(callback);
        this.owner = null;
        this.firstAirline = null;
        this.airlines = [];
        this.passengers = [];
        this.flights = [];
    }

    initialize(callback) {

        this.web3.eth.getAccounts(async (error, accts) => {
           
            this.owner = accts[0];
            this.firstAirline = accts[1];
            //this.airlines.push(this.firstAirline);
            
            this.airlines = await this.flightSuretyApp.methods.getRegisteredAirlines().call({ from: self.owner});
         
            if (!this.airlines || !this.airlines.length) {
                alert("There is no airline available");

            }

            this.passengers.push(accts[5])


            //create 5 flights to display

            this.flights.push({
                airline: accts[1],
                flightnumber: "SK806",
                timestamp: Math.floor(Date.now() / 1000),
                destination: "EWR"
            });

            this.flights.push({
                airline: accts[2],
                flightnumber: "SU2583",
                timestamp: Math.floor(Date.now() / 1000),
                destination: "LHR"
            });

            this.flights.push({
                airline: accts[3],
                flightnumber: "U23151",
                timestamp: Math.floor(Date.now() / 1000),
                destination: "CDG"
            });

            this.flights.push({
                airline: accts[4],
                flightnumber: "CA788",
                timestamp: Math.floor(Date.now() / 1000),
                destination: "JFK"
            });

            callback();
        });
    }

    async registerAirline(address, callback) {
        let self = this;
        let payload = {
            airlineAddress: address
        }
        await this.web3.eth.getAccounts((error, accts) => {
            payload.sender = accts[1];
        });
        await self.flightSuretyApp.methods
            .registerAirline(payload.airlineAddress)
            .send({ from: payload.sender,
                gas: 5000000,
                gasPrice: 20000000
            }, (error, result) => {
                if (error) {
                    console.log(error);
                    callback(error, payload);
                } else {
                    self.flightSuretyData.methods.
                    isAirlineRegistered(payload.airlineAddress).call({ from: payload.sender}, (error, result) => {
                        if (error || result.toString() == 'false') {
                            payload.message = 'New airline needs at least 2 votes to get registered.';
                            payload.registered = false;
                            callback(error, payload);
                        } else {
                            payload.message = 'Registered ' + payload.airlineAddress;
                            payload.registered = true;
                            callback(error, payload);
                        }
                    });
                }
            });
    }

    

   async fundAirline(airline, funds, callback) {
    let self = this;
    let value = this.web3.utils.toWei(funds.toString(), "ether");
    let payload = {
        funds: value,
        funder: airline,
        active: "false"
    } 
    //await this.web3.eth.getAccounts((error, accts) => {
        //payload.funder = accts[0];
    await self.flightSuretyApp.methods.fundAirline().send({ from: payload.funder, value: value}, (error, result) => {
            if (!error){
                self.flightSuretyData.methods.
                isAirlineFunded(airline).call({ from: payload.funder}, (error, result) => {
                    if(!error){
                        payload.active = result;
                    }
                    callback(error, payload);
                });
            }
        });
    }


    async registerFlight(airline, flight, timestamp, callback) {
        let self = this;
        let payload = {
            airline:airline,
            flightnumber: flight,
            timestamp: timestamp,
            registered:false
        }
        await self.flightSuretyApp.methods
            .registerFlight(payload.airline, payload.flightnumber, payload.timestamp)
            .send({ from: self.owner,
                gas: 5000000,
                gasPrice: 20000000}, (error, result) => {
                if (error) {
                    console.log(error);
                    callback(error, payload);
                } else {
                    self.flightSuretyApp.methods.
                    getFlightInfo(payload.airline, payload.flightnumber, payload.timestamp).call({from: self.owner}, (error, result) =>{
                        if(!error) {
                            payload.registered = result.isRegistered;
                            payload.statuscode = result.statusCode;

                        }
                        callback(error, payload);
                    });
                }
            });
    }


    async buy(passenger, insurance, airline, flight, timestamp, callback){
        let self = this;
        let amount = self.web3.utils.toWei(insurance.toString(), "ether");
        let payload = {
            airline: airline,
            flightnumber: flight,
            timestamp: timestamp,
            price: amount,
            passenger: passenger,
            premium: 0
        } 
        //this.addFunds(passenger, insurance);
        await self.flightSuretyApp.methods.buyInsurance(payload.airline, payload.flightnumber, payload.timestamp).send({ from: payload.passenger, value: payload.price, gas: 500000, gasPrice: 1 }, (error, result) => {
            if (error) {
                console.log(error);
                callback(error, payload);
            } else {
                self.flightSuretyData.methods.
                checkPremium(payload.passenger).call({from: payload.passenger}, (error, result) => {
                    if(!error){
                        payload.premium = result;
                    }
                    callback(error, payload);
                })
            }
            
                   
        });
    }

    async claim(passenger, airline, flight, timestamp, callback){
        let self = this;
        let payload = {
            airline: airline,
            flightnumber: flight,
            timestamp: timestamp,
            passenger: passenger,
            insurance: 0
        } 
        //this.addFunds(passenger, insurance);
        await self.flightSuretyApp.methods.claimInsurance(payload.airline, payload.flightnumber, payload.timestamp).send({ from: payload.passenger, gas: 500000, gasPrice: 1 }, (error, result) => {
            if (error) {
                console.log(error);
                callback(error, payload);
            } else {
                self.flightSuretyData.methods.
                checkInsuranceCredit(payload.passenger).call({from: payload.passenger}, (error, result) => {
                    if(!error){
                        payload.insurance = result;
                    }
                    callback(error, payload);
                })
            }
            
                   
        });
    }

    async withdraw(passenger, callback){
        let self = this;
        let payload = {
            passenger: passenger,
            amount: 0
        } 
        //this.addFunds(passenger, insurance);
        await self.flightSuretyData.methods.pay().send({ from: payload.passenger, gas: 500000, gasPrice: 1 }, (error, result) => {
            if (error) {
                console.log(error);
                callback(error, payload);
            } else {
                payload.amount = result;
            }
                callback(error, payload);
            });
            
    }

    
    isOperational(callback) {
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner}, callback);
    }

    fetchFlightStatus(airlineaddress, flight, deptime, callback) {
        let self = this;
        let payload = {
            airline: airlineaddress,
            flightnumber: flight,
            timestamp: deptime
        } 
        self.flightSuretyApp.methods
                .fetchFlightStatus(payload.airline, payload.flightnumber, payload.timestamp)
                .send({ from: self.owner});

        let status = '90'; //Oracles did not reach a consensus

        //Listen to request for flight status from oracles event emitted by app contract       
        self.flightSuretyApp.events.OracleRequest({fromBlock: 'latest'}, 
            function(error,event) {
            if(error) console.log(error);
            console.log('Caught an event- Request oracles for flight status: ');
            console.log(event['returnValues']);
            //Wait for 10 seconds to allow all oracles to respond to this event, if not, inform user that the fetch failed
            setTimeout(function(){
                
                if(status == '90') //Oracles did not reach a consensus--i.e. No event fired to indicate status update
                {
                    let error = 'Oracles did not reach a consensus. Sorry! Please try again.';
                    console.log(error);
                    callback(error, status);
                }
            }, 10000, flight );

            //Listen to updated flight status event emitted by app contract       
            self.flightSuretyApp.events.FlightStatusInfo({fromBlock: 'latest'}, 
            function(error,event) {
                if(error) console.log(error);
                console.log('Caught an event- Updated Flight status:');
                let eventValues = event['returnValues'];
                console.log(eventValues);
                status = eventValues['status'];
                callback(null, status);
            });// end FlightStatusInfo
        });// end OracleRequest

    }

    
}