pragma solidity ^0.4.24;

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./FlightSuretyData.sol";

/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp {
    using SafeMath for uint256; // Allow SafeMath functions to be called for all uint256 types (similar to "prototype" in Javascript)
    FlightSuretyData flightsuretydata;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    // Flight status codees
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    uint256 public constant REGISTRATION_FUND = 10 ether; // fund to be paid when registering new airline
    uint256 public constant MIN_INSURED_VALUE = 1 ether;
    uint256 private CONSENSUS = 4; //max number of airlines without consensus rule
    //uint256 private CONSENSUS_RULE = 5; // proportion of airlines to vote for consensus
    uint8 private INSURANCE_MULTIPLIER = 15;

    address private contractOwner; // Account used to deploy contract
    //address private dataContractAddress;
    bool private operational = true;

    //event AirlineRegistered(address indexed airline, string name);
    //event AirlineFunded(address indexed airline, uint256 value);

    struct Flight {
        bool isRegistered;
        uint8 statusCode;
        uint256 updatedTimestamp;
        address airline;
        string flight;
    }

    mapping(bytes32 => Flight) private flights;

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
     * @dev Modifier that requires the "operational" boolean variable to be "true"
     *      This is used on all state changing functions to pause the contract in
     *      the event there is an issue that needs to be fixed
     */
    modifier requireIsOperational() {
        // Modify to call data contract's status
        require(operational, "Contract is currently not operational");
        _; // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
     * @dev Modifier that requires the "ContractOwner" account to be the function caller
     */
    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    /**
     * @dev Modifier that requires the airline was registered
     */

    modifier requireAirlineIsRegistered(address _airline) {
        bool success = flightsuretydata.isAirlineRegistered(_airline);
        require(success, "The airline wasn't registered");
        _;
    }

    modifier requireMinimumFee(uint256 fee) {
        require(msg.value >= fee, "Minimum fee is required");
        _;
    }

    /**
     * @dev Modifier that requires the airline invested capital
     */

    modifier requireAirlineIsFunded(address _airline) {
        bool success = flightsuretydata.isAirlineFunded(_airline);
        require(success, "The airline wasn't registered");
        _;
    }

    /**
     * @dev Modifier that requires the flight to be registered
     */

    modifier requireFlightIsRegistered(
        address _airline,
        string memory _flight,
        uint256 _time
    ) {
        bytes32 key = getFlightKey(_airline, _flight, _time);
        bool success = flights[key].isRegistered;
        require(success, "The flight isn't registered");
        _;
    }

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    /**
     * @dev Contract constructor
     *
     */
    constructor(address _dataContract) public {
        contractOwner = msg.sender;
        flightsuretydata = FlightSuretyData(_dataContract);
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function isOperational() public view returns (bool) {
        return operational; // Modify to call data contract's status
    }

    /**
     * @dev get contract address
     *
     * @return address
     */
    function getContractAddress() external view returns (address) {
        return address(this);
    }

    function setOperatingStatus(bool mode) external requireContractOwner {
        require(mode != operational, "Contract is already in this state");
        operational = mode;
    }

    /**
     * @dev For testing
     * can block access to functions using requireIsOperational when operating status is false
     */
    function setTestingMode(bool mode)
        external
        view
        requireIsOperational
        returns (bool)
    {
        bool testMode = mode;
        return testMode;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    /**
     * @dev Add an airline to the registration queue
     *
     */

    function registerAirline(address _airline)
        public
        requireIsOperational
        requireAirlineIsRegistered(msg.sender)
        requireAirlineIsFunded(msg.sender)
        returns (bool success, uint256 votes)
    {
        require(
            !flightsuretydata.isAirlineRegistered(_airline),
            "Airline is already registered."
        );
        uint256 noOfRegisteredAirlines =
            flightsuretydata.getnumRegisteredAirlines();

        if (noOfRegisteredAirlines >= CONSENSUS) {
            bool isDuplicate = false;
            for (
                uint256 c = 0;
                c < flightsuretydata.getMultiCallsLength();
                c++
            ) {
                if (flightsuretydata.getMultiCallsItem(c) == msg.sender) {
                    isDuplicate = true;
                    break;
                }
            }
            require(!isDuplicate, "Caller has already called this function.");

            flightsuretydata.setMultiCallsItem(msg.sender);

            if (
                flightsuretydata.getMultiCallsLength() >=
                noOfRegisteredAirlines.div(2) //50%
            ) {
                flightsuretydata.registerAirline(_airline);
                flightsuretydata.clearMultiCalls();
                success = true;
                votes = noOfRegisteredAirlines.div(2);
            }
        } else {
            flightsuretydata.registerAirline(_airline);
            success = true;
            votes = 0;
        }

        return (success, votes);
    }

    /**
     * @dev Send fee to fund the airline
     *
     */

    function fundAirline()
        public
        payable
        requireIsOperational
        requireAirlineIsRegistered(msg.sender)
        requireMinimumFee(REGISTRATION_FUND)
    {
        require(
            !flightsuretydata.isAirlineFunded(msg.sender),
            "Airline is already funded!"
        );
        flightsuretydata.fund.value(msg.value)(msg.sender);
        //emit AirlineFunded(msg.sender, msg.value);
    }

    function getRegisteredAirlines() external view returns (address[] memory) {
        return flightsuretydata.getRegisteredAirlines();
    }

    /**
     * @dev Register a future flight for insuring.
     *
     */

    function registerFlight(
        address _airline,
        string memory _flight,
        uint256 _timestamp
    ) public requireAirlineIsRegistered(_airline) requireIsOperational {
        bytes32 key = getFlightKey(_airline, _flight, _timestamp);
        require(
            flights[key].isRegistered == false,
            "This flight is already registered"
        );
        flights[key] = Flight({
            isRegistered: true,
            statusCode: STATUS_CODE_UNKNOWN,
            updatedTimestamp: _timestamp,
            airline: _airline,
            flight: _flight
        });
    }

    function getFlightInfo(
        address _airline,
        string memory _flight,
        uint256 _timestamp
    )
        public
        view
        requireIsOperational
        returns (
            //string memory name,
            bool isRegistered,
            uint8 statusCode
        )
    {
        bytes32 key = getFlightKey(_airline, _flight, _timestamp);
        isRegistered = flights[key].isRegistered;
        statusCode = flights[key].statusCode;
    }

    /**
     * @dev Buy insurance for a flight.
     *
     */

    function buyInsurance(
        //uint256 _insurancePrice,
        address _airline,
        string memory _flight,
        uint256 _timestamp
    ) public payable requireFlightIsRegistered(_airline, _flight, _timestamp) {
        require(
            msg.value <= MIN_INSURED_VALUE,
            "The buyer cannot pay more than 1 eth."
        );

        bytes32 _flightKey = getFlightKey(_airline, _flight, _timestamp);
        flightsuretydata.buy.value(msg.value)(msg.sender, _flightKey);
    }

    /**
     * @dev Called after oracle has updated flight status
     *
     */

    function processFlightStatus(
        address airline,
        string memory flight,
        uint256 timestamp,
        uint8 statusCode
    ) internal requireFlightIsRegistered(airline, flight, timestamp) {
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);

        flights[flightKey] = Flight({
            isRegistered: true,
            statusCode: statusCode,
            updatedTimestamp: timestamp,
            airline: airline,
            flight: flight
        });
    }

    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus(
        address airline,
        string memory flight,
        uint256 timestamp
    ) public {
        uint8 index = getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        bytes32 key =
            keccak256(abi.encodePacked(index, airline, flight, timestamp));
        oracleResponses[key] = ResponseInfo({
            requester: msg.sender,
            isOpen: true
        });

        emit OracleRequest(index, airline, flight, timestamp);
    }

    /*
    function viewFlightStatus(
        address airline,
        string memory flight,
        uint256 timestamp
    ) public view returns (uint8) {
        bytes32 key = getFlightKey(airline, flight, timestamp);
        return flights[key].statusCode;
    }
    */
    //Claim insurance
    function claimInsurance(
        address _airline,
        string memory _flight,
        uint256 _timestamp
    )
        public
        requireIsOperational
        requireFlightIsRegistered(_airline, _flight, _timestamp)
    {
        bytes32 _flightKey = getFlightKey(_airline, _flight, _timestamp);
        require(
            flights[_flightKey].statusCode == STATUS_CODE_LATE_AIRLINE,
            "Cannot claim insurance for this flight."
        );
        uint256 purchase = flightsuretydata.checkPremium(msg.sender);
        require(purchase > 0, "Did not buy insurance.");
        uint256 credit = purchase.mul(3).div(2);
        flightsuretydata.creditInsuree(msg.sender, credit);
    }

    //Withdraw insurance amount
    /*
    function withdrawInsurance(uint256 amount) external payable {
        uint256 credit = flightsuretydata.checkInsuranceCredit(msg.sender);
        flightsuretydata.subtractBalance(amount);
        flightsuretydata.pay(amount);
    }
    */

    // region ORACLE MANAGEMENT

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;

    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester; // Account that requested status
        bool isOpen; // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses; // Mapping key is the status code reported
        // This lets us group responses and identify
        // the response that majority of the oracles
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(
        address airline,
        string flight,
        uint256 timestamp,
        uint8 status
    );

    event OracleReport(
        address airline,
        string flight,
        uint256 timestamp,
        uint8 status
    );

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(
        uint8 index,
        address airline,
        string flight,
        uint256 timestamp
    );

    // Register an oracle with the contract
    function registerOracle() external payable {
        // Require registration fee
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({isRegistered: true, indexes: indexes});
    }

    function getMyIndexes() external view returns (uint8[3] memory) {
        require(
            oracles[msg.sender].isRegistered,
            "Not registered as an oracle"
        );

        return oracles[msg.sender].indexes;
    }

    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse(
        uint8 index,
        address airline,
        string memory flight,
        uint256 timestamp,
        uint8 statusCode
    ) public {
        require(
            (oracles[msg.sender].indexes[0] == index) ||
                (oracles[msg.sender].indexes[1] == index) ||
                (oracles[msg.sender].indexes[2] == index),
            "Index does not match oracle request"
        );

        bytes32 key =
            keccak256(abi.encodePacked(index, airline, flight, timestamp));
        require(
            oracleResponses[key].isOpen,
            "Flight or timestamp do not match oracle request"
        );

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flight, timestamp, statusCode);
        if (
            oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES
        ) {
            emit FlightStatusInfo(airline, flight, timestamp, statusCode);

            // Handle flight status as appropriate
            processFlightStatus(airline, flight, timestamp, statusCode);
        }
    }

    function getFlightKey(
        address airline,
        string memory flight,
        uint256 timestamp
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes(address account)
        internal
        returns (uint8[3] memory)
    {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);

        indexes[1] = indexes[0];
        while (indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while ((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex(address account) internal returns (uint8) {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random =
            uint8(
                uint256(
                    keccak256(
                        abi.encodePacked(
                            blockhash(block.number - nonce++),
                            account
                        )
                    )
                ) % maxValue
            );

        if (nonce > 250) {
            nonce = 0; // Can only fetch blockhashes for last 256 blocks so we adapt
        }

        return random;
    }

    // endregion
}
