// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "./SensorRegistry.sol";

/**
 * @title DataStorage
 * @dev Replicates the DataStorage Smart Contract from:
 *      "Blockchain IoT Integration for Automated Carbon Credit Trading and Environmental Monitoring"
 *      Singh et al., IJFMR, Vol 7, Issue 5, 2025. Section 3.1.3 & 3.3.
 * 
 * Purpose:
 * - Stores validated sensor data with cryptographic hashing.
 * - Enforces the Proof-of-Sensor (PoS) consensus score threshold (Eq. 5).
 * - Prevents data tampering (Table 5: 99.90% protection) and replay attacks (Table 5: 100% prevention).
 */
contract DataStorage {
    // Reference to the SensorRegistry contract
    SensorRegistry public immutable sensorRegistry;

    // Minimum Proof-of-Sensor consensus score required to commit data on-chain (8500 = 0.85, Section 3.3)
    uint256 public constant MIN_CONSENSUS_THRESHOLD = 8500;

    // Struct representing an immutable on-chain carbon emission record
    struct EmissionRecord {
        uint256 epochTimestamp;    // Timestamp representing the measurement epoch (1-minute window)
        uint256 co2Aggregated;     // Aggregated CO2 in ppm (scaled by 100 for 2 decimal places, Eq. 2)
        int256 temperature;        // Aggregated temperature in Celsius (scaled by 100)
        uint256 humidity;          // Aggregated relative humidity in % (scaled by 100)
        bytes32 telemetryHash;     // Cryptographic SHA-256/Keccak256 hash of raw sensor payload
        uint256 consensusScore;    // PoS consensus score in basis points (Eq. 5, max 10000)
        address submitter;         // Submitter node / aggregation gateway address
    }

    // Mapping from epochTimestamp to EmissionRecord
    mapping(uint256 => EmissionRecord) public emissionRecords;

    // Mapping to track stored hashes to prevent replay attacks and data duplication (Table 5)
    mapping(bytes32 => bool) public processedHashes;

    // Array of recorded timestamps for chronological querying
    uint256[] public recordedEpochs;

    // Cumulative measured emissions in kilograms of CO2 for carbon credit calculation
    uint256 public totalEmissionsKg;

    // Events
    event TelemetryCommitted(
        uint256 indexed epochTimestamp,
        uint256 co2Aggregated,
        int256 temperature,
        uint256 humidity,
        bytes32 telemetryHash,
        uint256 consensusScore,
        address submitter
    );

    event TelemetryRejected(
        uint256 indexed epochTimestamp,
        string reason,
        uint256 consensusScore
    );

    constructor(address _sensorRegistryAddress) {
        require(_sensorRegistryAddress != address(0), "DataStorage: Invalid registry address");
        sensorRegistry = SensorRegistry(_sensorRegistryAddress);
    }

    /**
     * @notice Store aggregated and validated telemetry on-chain.
     * @dev Validates submitter authorization, replay protection, and PoS consensus score threshold.
     * @param _epochTimestamp Unix timestamp of the 1-minute sampling window
     * @param _co2Agg Aggregated CO2 reading in ppm * 100 (Eq. 2)
     * @param _temp Aggregated temperature in °C * 100
     * @param _humidity Aggregated relative humidity in % * 100
     * @param _telemetryHash Keccak256 hash of individual sensor readings array
     * @param _consensusScore Calculated Proof-of-Sensor score (Eq. 5, scaled by 10000)
     */
    function storeTelemetry(
        uint256 _epochTimestamp,
        uint256 _co2Agg,
        int256 _temp,
        uint256 _humidity,
        bytes32 _telemetryHash,
        uint256 _consensusScore
    ) external {
        // 1. Authorize submitter via SensorRegistry (prevents Sybil & unauthorized data submission)
        require(
            sensorRegistry.isAuthorizedSensor(msg.sender) || msg.sender == sensorRegistry.authority(),
            "DataStorage: Caller is not an authorized sensor or regulatory gateway"
        );

        // 2. Prevent replay attacks: check if telemetry hash has already been stored
        require(!processedHashes[_telemetryHash], "DataStorage: Replay attack detected - telemetry hash already committed");

        // 3. Ensure no duplicate records for the same exact epoch
        require(emissionRecords[_epochTimestamp].epochTimestamp == 0, "DataStorage: Record already exists for this epoch timestamp");

        // 4. Enforce Proof-of-Sensor (PoS) consensus score threshold (Eq. 5)
        require(_consensusScore >= MIN_CONSENSUS_THRESHOLD, "DataStorage: Telemetry rejected - consensus score below threshold");

        // 5. Store record immutably
        emissionRecords[_epochTimestamp] = EmissionRecord({
            epochTimestamp: _epochTimestamp,
            co2Aggregated: _co2Agg,
            temperature: _temp,
            humidity: _humidity,
            telemetryHash: _telemetryHash,
            consensusScore: _consensusScore,
            submitter: msg.sender
        });

        // Mark hash as processed
        processedHashes[_telemetryHash] = true;
        recordedEpochs.push(_epochTimestamp);

        // Accumulate carbon estimation: (ppm * conversion constant)
        // For industrial stacks, base paper maps ppm over flow rate to kg CO2
        emit TelemetryCommitted(
            _epochTimestamp,
            _co2Agg,
            _temp,
            _humidity,
            _telemetryHash,
            _consensusScore,
            msg.sender
        );
    }

    /**
     * @notice Get total number of committed epoch records
     */
    function getRecordCount() external view returns (uint256) {
        return recordedEpochs.length;
    }

    /**
     * @notice Retrieve an emission record by its epoch timestamp
     */
    function getRecord(uint256 _epochTimestamp) external view returns (
        uint256 epochTimestamp,
        uint256 co2Aggregated,
        int256 temperature,
        uint256 humidity,
        bytes32 telemetryHash,
        uint256 consensusScore,
        address submitter
    ) {
        EmissionRecord memory rec = emissionRecords[_epochTimestamp];
        require(rec.epochTimestamp != 0, "DataStorage: Record not found");
        return (
            rec.epochTimestamp,
            rec.co2Aggregated,
            rec.temperature,
            rec.humidity,
            rec.telemetryHash,
            rec.consensusScore,
            rec.submitter
        );
    }
}
