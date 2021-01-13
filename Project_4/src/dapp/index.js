import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


(async() => {

    let result = null;

    let contract = new Contract('localhost', () => {

        // Read transaction
        contract.isOperational((error, result) => {
            console.log(error,result);
            display('DAPP Logs', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
        });
        
        contract.airlines.forEach(airline => {
            displayListAirline(airline, DOM.elid("airlines"));
        });
        
        contract.passengers.forEach(passenger => {
            displayListPassenger(passenger, DOM.elid("passengers"));
        }); 

        contract.flights.forEach(flight => {
            displayListFlight(flight, DOM.elid("flights"));
        });

        // User-submitted transaction

        DOM.elid('register-airline').addEventListener('click', async() => {
            let address = DOM.elid('airline-address').value;
            //let name = DOM.elid('airline-name').value;
            //let sender = DOM.elid('selected-airline-address').value;

            // Write transaction
            contract.registerAirline(address, (error, result) => {
                display('', 'New airline address:', [ { label: 'Registered Airline', error: error, value: result.message} ]);
                if(error){
                    console.log(error);
                } else if (result.registered == true) {
                    displayListAirline(address, DOM.elid("airlines"));
                }
            });
        })
        
        
        DOM.elid('fund-airline').addEventListener('click', async() => {
            let airline = DOM.elid('airlines').value;
            let fund = DOM.elid('airline-fund').value;
            contract.fundAirline(airline, fund, (error, result) => {
                display('', `Funds added`, [ { label: 'Funds added to airline: ', error: error, value: result.funds+" wei"} ]);
                display('', '', [ { label: 'Airline is active: ', value: result.active} ]);
    
            }); 
        });

        DOM.elid('register-flight').addEventListener('click', async() => {
            let airline = DOM.elid('airlineaddress').value;
            let flight = DOM.elid('flightnumber').value;
            let deptime = DOM.elid('timestamp').value;
            
            // Write transaction
            contract.registerFlight(airline, flight, deptime, (error, result) => {
                let status = '';
                switch(result.statuscode)
                {
                    case '0': status = 'Unkown';  break;
                    case '10': status = 'On Time'; break;
                    case '20': status = 'Late- airline'; break;
                    case '30': status = 'Late- Weather'; break;
                    case '40': status = 'Late- Technical'; break;
                    case '50': status = 'Late- Other';
                }
                
                display('', 'Registered new flight', [ { label: 'Info:', error: error, value: 'Flight code: '+ result.flightnumber + ' StatusCode: ' + status} ]);
                if (result.registered == true) {
                    displayListFlight(result, DOM.elid("registeredflights"));
                }
            });
        })

        DOM.elid('purchase-insurance').addEventListener('click', async() => {
            let passenger = DOM.elid('passengers').value;
            let airline = DOM.elid('airlineaddress').value;
            let flight = DOM.elid('flightnumber').value;
            let deptime = DOM.elid('timestamp').value;
            let insurance = DOM.elid('insurance').value;
            contract.buy(passenger, insurance, airline, flight, deptime, (error, result) => {
                display('', 'Bought a new flight insurance', [ { label: 'Insurance info', error: error, value: 'Flight: '+ result.flightnumber + ' Paid: ' + result.premium + ' wei' +  ' Passenger: ' + result.passenger} ]);
            });
                
        });

        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let airline = DOM.elid('airlineaddress2').value;
            let flight = DOM.elid('flightcode').value;
            let deptime = DOM.elid('timestamp2').value;
            // Write transaction
            contract.fetchFlightStatus(airline, flight, deptime,(error, result) => {
                /* Flight status codes
                STATUS_CODE_UNKNOWN = 0; 
                STATUS_CODE_ON_TIME = 10;
                STATUS_CODE_LATE_AIRLINE = 20;
                STATUS_CODE_LATE_WEATHER = 30;
                STATUS_CODE_LATE_TECHNICAL = 40;
                STATUS_CODE_LATE_OTHER = 50;*/
                
                let status = '';
                switch(result)
                {
                    case '0': status = 'Unkown';  break;
                    case '10': status = 'On Time'; break;
                    case '20': status = 'Late- airline'; break;
                    case '30': status = 'Late- Weather'; break;
                    case '40': status = 'Late- Technical'; break;
                    case '50': status = 'Late- Other';
                }
                
                
                display('', 'Triggered oracles', [ { label: 'Fetch Flight Status', error: error, value: status} ]);
            });
        });

        DOM.elid('claim-insurance').addEventListener('click', async() => {
            let passenger = DOM.elid('passengers').value;
            let airline = DOM.elid('airlineaddress2').value;
            let flight = DOM.elid('flightcode').value;
            let timestamp = DOM.elid('timestamp2').value;
            contract.claim(passenger, airline, flight, timestamp, (error, result) => {
                display('', `Insurance  Credited`, [ { label: 'Credit: ', error: error, value: result.insurance+" wei credited to Passenger: " +result.passenger} ]);
            });
                
        });

        DOM.elid('withdraw-insurance').addEventListener('click', async() => {
            let passenger = DOM.elid('passengers').value;
            contract.withdraw(passenger, (error, result) => {
                display('', `Insurance  Withdrawn`, [ { label: 'Withdrawal Info: ', error: error, value: "Insurance amount withdrawn by Passenger: " + result.passenger} ]);
            });
                
        });


        /*
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight = DOM.elid('registeredflights').value;
            // Write transaction
            contract.fetchFlightStatus(flight, (error, result) => {
                display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
            });
        })
        */
        
        DOM.elid('airlines').addEventListener('change', () => {
            return contract.airlines;
        });
        
        
        DOM.elid('passengers').addEventListener('change', () => {
            return contract.passengers;
        });

        DOM.elid('flights').addEventListener('change', () => {
            //console.log("Hello" + contract.flights);
            return contract.flights;
        });
        
        /*
        DOM.elid('registeredflights').addEventListener('change', () => {
            //console.log("Hello" + contract.flights);
            return contract.flights;
        });
        */
    
    });
    

})();

function displayListAirline(airline, parentEl) {
    let el = document.createElement("option");
    el.text = airline;
    el.value = airline;
    parentEl.add(el);
}

function displayListFlight(flight, parentEl) {
    console.log(flight);
    console.log(parentEl);
    let el = document.createElement("option");
    el.text = `${flight.flightnumber}`;
    el.value = JSON.stringify(flight);
    parentEl.add(el);
}

function displayListPassenger(passenger, parentEl) {
    let el = document.createElement("option");
    el.text = passenger;
    el.value = passenger;
    parentEl.add(el);
}


function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className:'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);

}