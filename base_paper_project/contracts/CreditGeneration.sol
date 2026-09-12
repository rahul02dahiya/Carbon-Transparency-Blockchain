// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "./DataStorage.sol";

/**
 * @title CreditGeneration
 * @dev Replicates the CreditGeneration Smart Contract from:
 *      "Blockchain IoT Integration for Automated Carbon Credit Trading and Environmental Monitoring"
 *      Singh et al., IJFMR, Vol 7, Issue 5, 2025. Section 3.1.3 & Section 3.2 (Eq. 4).
 * 
 * Purpose:
 * - Programmatically calculates and issues verified carbon credits based on real-time emission reductions.
 * - Implements Equation (4):
 *      Credits = ((E_baseline - E_measured) * T * CF) / 1000
 * - Completely prevents double spending (Table 5: Double Spending 100% prevented).
 * - Tracks credit balances and transfer capabilities for trading.
 */
contract CreditGeneration {
    // Environmental Regulatory Authority / Contract Owner
    address public immutable authority;

    // Associated DataStorage contract
    DataStorage public immutable dataStorage;

    // Baseline emission in kg CO2 per hour (E_baseline in Eq. 4)
    uint256 public baselineEmissionKgPerHour;

    // Conversion factor (CF in Eq. 4): e.g. 1 credit per 1000 kg (1 metric ton) of avoided CO2
    uint256 public conversionFactor;

    // Total carbon credits minted across the platform
    uint256 public totalCreditsMinted;

    // Balances of tokenized carbon credits: account => balance (scaled by 1e18 for standard decimal token representation)
    mapping(address => uint256) public creditBalances;

    // Mapping to verify that an evaluation epoch has only been credited once (prevents double-spending)
    mapping(uint256 => bool) public epochClaimed;

    // Events
    event CarbonCreditsIssued(
        address indexed recipient,
        uint256 indexed epochId,
        uint256 measuredEmissionKgPerHour,
        uint256 baselineEmissionKgPerHour,
        uint256 creditsMinted,
        uint256 timestamp
    );

    event BaselineExceeded(
        address indexed entity,
        uint256 indexed epochId,
        uint256 measuredEmissionKgPerHour,
        uint256 baselineEmissionKgPerHour
    );

    event CreditsTransferred(
        address indexed from,
        address indexed to,
        uint256 amount
    );

    modifier onlyAuthority() {
        require(msg.sender == authority, "CreditGeneration: Only regulatory authority can invoke");
        _;
    }

    /**
     * @param _dataStorage Address of the deployed DataStorage contract
     * @param _baselineKgPerHour Historical baseline emissions (kg CO2/hour)
     * @param _conversionFactor Conversion factor CF (credits per ton CO2)
     */
    constructor(
        address _dataStorage,
        uint256 _baselineKgPerHour,
        uint256 _conversionFactor
    ) {
        require(_dataStorage != address(0), "CreditGeneration: Invalid DataStorage address");
        require(_baselineKgPerHour > 0, "CreditGeneration: Baseline must be greater than 0");
        require(_conversionFactor > 0, "CreditGeneration: Conversion factor must be greater than 0");

        authority = msg.sender;
        dataStorage = DataStorage(_dataStorage);
        baselineEmissionKgPerHour = _baselineKgPerHour;
        conversionFactor = _conversionFactor;
    }

    /**
     * @notice Calculate and issue carbon credits based on verified emission reductions (Section 3.2, Eq. 4).
     * @dev Credits = ((E_baseline - E_measured) * T * CF) / 1000
     * @param _recipient The industrial entity / facility account earning the credits
     * @param _epochId Unique identifier for the tracking epoch (e.g. start timestamp)
     * @param _measuredEmissionKgPerHour Measured average emissions during epoch (kg CO2/hour)
     * @param _timePeriodHours Time period of the epoch in hours (T in Eq. 4)
     * @return credits The number of credits minted (in standard 18-decimal fixed-point units)
     */
    function calculateAndIssueCredits(
        address _recipient,
        uint256 _epochId,
        uint256 _measuredEmissionKgPerHour,
        uint256 _timePeriodHours
    ) external onlyAuthority returns (uint256 credits) {
        require(_recipient != address(0), "CreditGeneration: Invalid recipient address");
        require(_timePeriodHours > 0, "CreditGeneration: Epoch duration must be > 0");
        
        // Table 5: 100% Double spending prevention
        require(!epochClaimed[_epochId], "CreditGeneration: Double spending prevented - epoch already processed");

        // Mark epoch as processed to prevent re-issuance
        epochClaimed[_epochId] = true;

        // If emissions exceeded or equaled baseline, no credits are generated
        if (_measuredEmissionKgPerHour >= baselineEmissionKgPerHour) {
            emit BaselineExceeded(_recipient, _epochId, _measuredEmissionKgPerHour, baselineEmissionKgPerHour);
            return 0;
        }

        // Calculate avoided emissions: E_baseline - E_measured (kg CO2 / hour)
        uint256 avoidedEmissionKgPerHour = baselineEmissionKgPerHour - _measuredEmissionKgPerHour;

        // Apply Equation 4: Credits = ((E_baseline - E_measured) * T * CF) / 1000
        // We scale by 1e18 to provide standard 18 decimal precision for fractional credits
        // (avoidedEmission * T * CF * 1e18) / 1000
        credits = (avoidedEmissionKgPerHour * _timePeriodHours * conversionFactor * 1e18) / 1000;

        creditBalances[_recipient] += credits;
        totalCreditsMinted += credits;

        emit CarbonCreditsIssued(
            _recipient,
            _epochId,
            _measuredEmissionKgPerHour,
            baselineEmissionKgPerHour,
            credits,
            block.timestamp
        );

        return credits;
    }

    /**
     * @notice Transfer carbon credits between market participants
     * @param _to Recipient address
     * @param _amount Number of credits to transfer
     */
    function transferCredits(address _to, uint256 _amount) external returns (bool) {
        require(_to != address(0), "CreditGeneration: Invalid recipient address");
        require(creditBalances[msg.sender] >= _amount, "CreditGeneration: Insufficient credit balance");

        creditBalances[msg.sender] -= _amount;
        creditBalances[_to] += _amount;

        emit CreditsTransferred(msg.sender, _to, _amount);
        return true;
    }

    /**
     * @notice Update the baseline emission target as environmental regulations tighten
     * @param _newBaseline New baseline in kg CO2/hour
     */
    function updateBaseline(uint256 _newBaseline) external onlyAuthority {
        require(_newBaseline > 0, "CreditGeneration: Baseline must be > 0");
        baselineEmissionKgPerHour = _newBaseline;
    }
}
