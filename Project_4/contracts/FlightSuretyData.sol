pragma solidity ^0.4.24;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    struct Airline {
        // Airline property
        //string name;
        bool isRegistered;
        bool isFunded;
        uint256 funds;
        address airline;
    }

    struct Passenger {
        bool isInsured;
        bool isPaid;
        uint256 premium;
        uint256 insurance;
    }

    address private contractOwner; // Account used to deploy contract
    bool private operational = true; // Blocks all state changes throughout the contract if false
    uint256 private numRegisteredAirlines = 0;
    //uint256 private constant AUTHORIZED = 1;
    //bool authorized = false;

    // consensus of registered airlines
    address[] public multiCalls = new address[](0);

    mapping(address => uint256) authorizedContracts;
    mapping(address => Airline) private airlines;
    address[] private registeredAirlines;
    //mapping(address => uint256) airlineBalances; //balance for each airline.
    mapping(bytes32 => address[]) private flightPassengers;
    mapping(address => Passenger) private passengers;
    //mapping(address => uint256) private deposit;

    // the contract holds balance of insurance
    uint256 private balance = 0;
    mapping(bytes32 => uint256) private flightInsuranceTotalAmount;
    mapping(address => uint256) private insurancePayment;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/

    /**
     * @dev Constructor
     *      The deploying account becomes contractOwner
     */
    constructor(address firstAirline) public {
        contractOwner = msg.sender;
        airlines[firstAirline] = Airline({ //name: name,
            isRegistered: true,
            isFunded: false,
            funds: 0,
            airline: firstAirline
        });
        registeredAirlines.push(firstAirline);
        numRegisteredAirlines++;
    }

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
     * @dev check if the caller was authorized
     */
    modifier requireIsAuthorized() {
        require(
            authorizedContracts[msg.sender] == 1,
            "Caller is not authorized"
        );
        _;
    }

    /**
     * @dev Modifier that requires the airline was registered
     */
    modifier requireAirlineIsRegistered(address _airline) {
        require(isAirlineRegistered(_airline) == true);
        _;
    }

    /**
     * @dev Modifier that requires the airline invested seed capital
     */
    modifier requireAirlineIsFunded(address _airline) {
        require(isAirlineFunded(_airline) == true);
        _;
    }

    /**
     * @dev Re-entrancy Guard
     */
    uint256 private counter = 1;

    modifier entrancyGuard() {
        counter = counter + 1;
        uint256 guard = counter;
        _;
        require(guard == counter, "That is not allowed");
    }

    /**
     * @dev check value to refund
     */
    modifier checkValue(uint256 due) {
        _;
        uint256 amountToRefund = msg.value.sub(due);
        msg.sender.transfer(amountToRefund);
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
     * @dev Get operating status of contract
     *
     * @return A bool that is the current operating status
     */

    function isOperational() public view returns (bool) {
        return operational;
    }

    /**
     * @dev Sets contract operations on/off
     *
     * When operational mode is disabled, all write transactions except for this one will fail
     */

    function setOperatingStatus(bool mode) external requireContractOwner {
        require(operational != mode, "Contract is already in this state");
        operational = mode;
    }

    /**
     * @dev authorize contract
     */

    function authorizeContract(address Contract) external requireContractOwner {
        authorizedContracts[Contract] = 1;
        //authorized = true;
    }

    /**
     * @dev deauthorize contract
     */

    function deauthorizeContract(address Contract)
        external
        requireContractOwner
    {
        delete authorizedContracts[Contract];
        //authorized = false;
    }

    /**
     * @dev check if contract authorized
     */
    function checkAuthorizeContract(address Contract)
        external
        view
        requireContractOwner
        returns (uint256)
    {
        return authorizedContracts[Contract];
    }

    /**
     * @dev get contract address
     *
     * @return address
     */
    function getContractAddress() external view returns (address) {
        return address(this);
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
     *      Can only be called from FlightSuretyApp contract
     *
     */

    function registerAirline(address airline)
        public
        requireIsOperational
    //requireIsAuthorized
    {
        require(
            !airlines[airline].isRegistered,
            "Airline is already registered."
        );

        airlines[airline] = Airline({ //name: name,
            isRegistered: true,
            isFunded: false,
            funds: 0,
            airline: airline
        });
        registeredAirlines.push(airline);
        numRegisteredAirlines++;
    }

    /**
     * @dev Initial funding for the insurance. Unless there are too many delayed flights
     * resulting in insurance payouts, the contract should be self-sustaining.
     * This is the method freshly joined airlines would call to pay their fee after they have been vetted in
     */

    function fund(address airline)
        public
        payable
        //requireIsAuthorized
        requireIsOperational
    {
        airlines[airline].isFunded = true;
        airlines[airline].funds = msg.value;
        //balance = balance.add(msg.value);
    }

    /**
     * @dev Add an airline to the registration queue
     *
     */
    function getAirlineInfo(address airline)
        external
        view
        requireIsOperational
        requireIsAuthorized
        returns (
            //string memory name,
            bool isRegistered,
            bool isFunded,
            uint256 funds
        )
    {
        //name = airlines[airline].name;
        isRegistered = airlines[airline].isRegistered;
        isFunded = airlines[airline].isFunded;
        funds = airlines[airline].funds;
    }

    /**
     * @dev Check if the airline was registered
     */
    function isAirlineRegistered(address _airline)
        public
        view
        requireIsOperational
        returns (bool)
    {
        return airlines[_airline].isRegistered;
    }

    /**
     * @dev Check if the airline invested capital
     */
    function isAirlineFunded(address _airline)
        public
        view
        requireIsOperational
        returns (bool)
    {
        return airlines[_airline].isFunded;
    }

    function getBalanceOfAirline(address _airline)
        external
        view
        requireIsOperational
        returns (uint256)
    {
        return airlines[_airline].funds;
    }

    /**
     * @dev Get number of registered  airlines
     *
     */
    function getnumRegisteredAirlines()
        external
        view
        requireIsOperational
        returns (uint256)
    {
        return numRegisteredAirlines;
    }

    function getRegisteredAirlines()
        public
        view
        requireIsOperational
        returns (address[] memory)
    {
        return registeredAirlines;
    }

    function getMultiCallsLength() public view returns (uint256) {
        return multiCalls.length;
    }

    function getMultiCallsItem(uint256 _i) public view returns (address) {
        return multiCalls[_i];
    }

    function setMultiCallsItem(address _address) public {
        multiCalls.push(_address);
    }

    function clearMultiCalls() public {
        multiCalls = new address[](0);
    }

    /**
     * @dev Buy insurance for a flight
     *
     */

    function buy(address passenger, bytes32 flightKey)
        public
        payable
        requireIsOperational
    {
        //Checks
        //require(msg.sender == tx.origin, "Contracts not allowed");
        //require(timestamp > now, "Only purchase not boarding flights"); //block.timestamp
        require(
            passengers[passenger].isInsured == false,
            "This flight is already insured by customer."
        );
        passengers[passenger] = Passenger({
            isInsured: true,
            isPaid: false,
            premium: msg.value,
            insurance: 0
        });
        flightPassengers[flightKey].push(passenger);
        //balance = balance.add(msg.value);
        flightInsuranceTotalAmount[flightKey] = flightInsuranceTotalAmount[
            flightKey
        ]
            .add(msg.value);
    }

    /**
     * @dev Check premium for a passenger
     */
    function checkPremium(address passenger)
        external
        view
        requireIsOperational
        returns (uint256)
    {
        return passengers[passenger].premium;
    }

    /**
     *  @dev Credits payouts to insurees
     */

    function creditInsuree(address _passenger, uint256 _credit)
        external
        requireIsOperational
    {
        passengers[_passenger] = Passenger({
            isInsured: false,
            isPaid: true,
            premium: 0,
            insurance: _credit
        });
    }

    /**
     * @dev Check insurance credit for a passenger
     */
    function checkInsuranceCredit(address passenger)
        external
        view
        requireIsOperational
        returns (uint256)
    {
        return passengers[passenger].insurance;
    }

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
     */

    function pay()
        public
        //entrancyGuard
        requireIsOperational
    {
        require(msg.sender == tx.origin, "Contracts not allowed");
        require(passengers[msg.sender].insurance > 0, "No credit available.");

        uint256 initialBalance = address(this).balance;
        uint256 credit = passengers[msg.sender].insurance;
        require(
            initialBalance > credit,
            "The contract does not have enough funds to pay the credit"
        );
        passengers[msg.sender].insurance = 0;
        msg.sender.transfer(credit);
    }

    /**
     * @dev get contract balance
     */
    function balanceOf() public view returns (uint256) {
        return balance;
    }

    function subtractBalance(uint256 funds) external requireIsOperational {
        balance = balance.sub(funds);
    }

    function getFlightKey(
        address airline,
        string memory flight,
        uint256 timestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
     * @dev Fallback function for funding smart contract.
     *
     */
    function() external payable {
        balance = balance.add(msg.value);
    }
}
