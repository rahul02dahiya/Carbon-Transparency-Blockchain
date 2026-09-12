// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

/**
 * @title SensorRegistry
 * @dev Replicates the SensorRegistry Smart Contract from:
 *      "Blockchain IoT Integration for Automated Carbon Credit Trading and Environmental Monitoring"
 *      Singh et al., IJFMR, Vol 7, Issue 5, 2025. Section 3.1.3 & 3.4.
 * 
 * Purpose:
 * - Manages registration and authentication of 50 distributed IoT sensor nodes.
 * - Stores node identity, geographic coordinates (GPS), sensor specifications, and reliability score.
 * - Mitigates Sybil and unauthorized data injection attacks (Table 5: Sybil Attack 98.7% protection).
 */
contract SensorRegistry {
    // Owner / Environmental Regulatory Authority
    address public authority;

    // Struct representing an IoT sensor node deployed in the industrial facility
    struct SensorNode {
        address nodeAddress;       // Ethereum address / public key of the sensor node's Secure Element (HSM)
        string sensorType;         // e.g., "NDIR-CO2-DHT22" (Section 4.1, Table 1)
        int256 latitude;           // Scaled GPS latitude (e.g. lat * 1e6 for micro-degrees precision)
        int256 longitude;          // Scaled GPS longitude (e.g. lon * 1e6 for micro-degrees precision)
        uint256 registrationTime;  // Unix timestamp of registration
        uint256 reliabilityScore;  // Reliability score w_i in basis points (10000 = 1.00 weight, Eq. 2)
        bool isActive;             // Authorization status for data submission
    }

    // Mapping from sensor Ethereum address to SensorNode details
    mapping(address => SensorNode) public sensors;

    // List of all registered sensor addresses for iteration
    address[] public registeredSensorsList;

    // Total count of active registered sensors
    uint256 public activeSensorCount;

    // Events for transparent audit logging
    event SensorRegistered(address indexed nodeAddress, string sensorType, int256 latitude, int256 longitude, uint256 timestamp);
    event SensorStatusUpdated(address indexed nodeAddress, bool isActive);
    event ReliabilityScoreUpdated(address indexed nodeAddress, uint256 oldScore, uint256 newScore);

    // Modifier to restrict access to the regulatory authority
    modifier onlyAuthority() {
        require(msg.sender == authority, "SensorRegistry: Caller is not the authorized regulatory entity");
        _;
    }

    constructor() {
        authority = msg.sender;
    }

    /**
     * @notice Register a new IoT sensor node after physical verification and Secure Element pairing.
     * @param _node Address derived from sensor's onboard cryptographic key
     * @param _sensorType Sensor description and model
     * @param _lat GPS Latitude scaled by 1e6
     * @param _lon GPS Longitude scaled by 1e6
     */
    function registerSensor(
        address _node,
        string memory _sensorType,
        int256 _lat,
        int256 _lon
    ) external onlyAuthority {
        require(_node != address(0), "SensorRegistry: Invalid zero address");
        require(!sensors[_node].isActive, "SensorRegistry: Sensor node already active");

        // If newly registered, append to list
        if (sensors[_node].registrationTime == 0) {
            registeredSensorsList.push(_node);
        }

        // Initialize sensor node with default 100% reliability score (10,000 basis points)
        sensors[_node] = SensorNode({
            nodeAddress: _node,
            sensorType: _sensorType,
            latitude: _lat,
            longitude: _lon,
            registrationTime: block.timestamp,
            reliabilityScore: 10000,
            isActive: true
        });

        activeSensorCount++;

        emit SensorRegistered(_node, _sensorType, _lat, _lon, block.timestamp);
    }

    /**
     * @notice Update the reliability weight (w_i) of a sensor node based on historical uptime and anomaly rate (Eq. 2)
     * @param _node Sensor node address
     * @param _newScore New reliability score (in basis points, max 10000)
     */
    function updateReliability(address _node, uint256 _newScore) external onlyAuthority {
        require(sensors[_node].isActive, "SensorRegistry: Sensor is not active");
        require(_newScore <= 10000, "SensorRegistry: Score exceeds maximum 10000 (100%)");

        uint256 oldScore = sensors[_node].reliabilityScore;
        sensors[_node].reliabilityScore = _newScore;

        emit ReliabilityScoreUpdated(_node, oldScore, _newScore);
    }

    /**
     * @notice Revoke or reactivate a sensor's access (e.g. if tampering or severe sensor drift is detected)
     * @param _node Sensor node address
     * @param _isActive New status
     */
    function setSensorStatus(address _node, bool _isActive) external onlyAuthority {
        require(sensors[_node].registrationTime != 0, "SensorRegistry: Sensor was never registered");
        if (sensors[_node].isActive != _isActive) {
            sensors[_node].isActive = _isActive;
            if (_isActive) {
                activeSensorCount++;
            } else {
                activeSensorCount--;
            }
            emit SensorStatusUpdated(_node, _isActive);
        }
    }

    /**
     * @notice Check whether a sensor is registered and currently authorized to submit telemetry
     * @param _node Sensor node address to query
     * @return bool True if active and authorized
     */
    function isAuthorizedSensor(address _node) external view returns (bool) {
        return sensors[_node].isActive;
    }

    /**
     * @notice Get sensor's reliability score for weighted aggregation (Eq. 2)
     * @param _node Sensor node address
     * @return uint256 Reliability score in basis points (10000 = 1.0)
     */
    function getSensorReliability(address _node) external view returns (uint256) {
        require(sensors[_node].isActive, "SensorRegistry: Sensor inactive");
        return sensors[_node].reliabilityScore;
    }

    /**
     * @notice Get total number of registered sensors
     */
    function getRegisteredSensorCount() external view returns (uint256) {
        return registeredSensorsList.length;
    }
}
