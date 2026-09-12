/**
 * Automated Contract Verification Runner
 * Paper: "Blockchain IoT Integration for Automated Carbon Credit Trading and Environmental Monitoring"
 * Reference: IJFMR, Vol 7, Issue 5, 2025 (Singh et al., Section 3.1.3 & 3.2)
 */

import { ethers } from "ethers";
import { deployBaseContracts } from "../scripts/deploy.js";

export async function runContractTests() {
  console.log("\n========================================================");
  console.log("RUNNING BASE CONTRACT LOGIC VERIFICATION TESTS");
  console.log("========================================================");

  const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");
  const accounts = [
    new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider), // Authority
    new ethers.Wallet("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", provider), // Sensor 1
    new ethers.Wallet("0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a", provider), // Sensor 2
    new ethers.Wallet("0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6", provider), // Rogue Node
    new ethers.Wallet("0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a", provider)  // Facility Owner
  ];

  const [authority, sensor1, sensor2, rogueNode, facilityOwner] = accounts;

  const { sensorRegistry, dataStorage, creditGeneration } = await deployBaseContracts(authority);

  let testsPassed = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  [PASS] ${message}`);
      testsPassed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // --- Test 1: Sensor Registration by Authority ---
  console.log("\n1. Testing SensorRegistry (Section 3.1.3):");
  const tx1 = await sensorRegistry.connect(authority).registerSensor(
    sensor1.address,
    "NDIR-CO2-DHT22",
    24817000,
    93936800
  );
  await tx1.wait();
  const isAuth1 = await sensorRegistry.isAuthorizedSensor(sensor1.address);
  assert(isAuth1 === true, "Authorized sensor registered successfully");

  // --- Test 2: Reject Unregistered / Rogue Node ---
  const isAuthRogue = await sensorRegistry.isAuthorizedSensor(rogueNode.address);
  assert(isAuthRogue === false, "Unregistered node correctly identified as unauthorized");

  // --- Test 3: Authority Restrictions ---
  let unauthorizedReverted = false;
  try {
    await sensorRegistry.connect(rogueNode).registerSensor(sensor2.address, "NDIR", 0, 0);
  } catch (err) {
    unauthorizedReverted = true;
  }
  assert(unauthorizedReverted, "Non-authority caller prohibited from registering sensors");

  // --- Test 4: Reliability Weight Update (Eq. 2 w_i) ---
  const txRel = await sensorRegistry.connect(authority).updateReliability(sensor1.address, 9800);
  await txRel.wait();
  const relScore = await sensorRegistry.getSensorReliability(sensor1.address);
  assert(relScore.toNumber() === 9800, "Reliability score w_i updated to 98.0%");

  // --- Test 5: DataStorage Proof-of-Sensor (PoS) Threshold Enforcement ---
  console.log("\n2. Testing DataStorage Consensus & Immutability (Section 3.1.3 & 3.3):");
  const epochTimestamp1 = Math.floor(Date.now() / 1000);
  const hash1 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("telemetry_payload_1"));
  
  // Attempt with consensus score below threshold (7500 < 8500)
  let lowConsensusReverted = false;
  try {
    await dataStorage.connect(sensor1).storeTelemetry(
      epochTimestamp1,
      45000, // 450.00 ppm
      2500,  // 25.00 C
      6000,  // 60.00 %
      hash1,
      7500   // 0.75 < 0.85
    );
  } catch (err) {
    lowConsensusReverted = true;
  }
  assert(lowConsensusReverted, "Rejected telemetry with consensus score below 0.85 threshold (Eq. 5)");

  // Submit with consensus score above threshold (9150 >= 8500)
  const txStore = await dataStorage.connect(sensor1).storeTelemetry(
    epochTimestamp1,
    45000,
    2500,
    6000,
    hash1,
    9150
  );
  await txStore.wait();
  const recordCount = await dataStorage.getRecordCount();
  assert(recordCount.toNumber() === 1, "Committed valid telemetry with consensus score >= 0.85");

  // --- Test 6: Replay Attack Protection (Table 5: 100% prevention) ---
  let replayReverted = false;
  try {
    // Attempt re-submitting identical hash1
    await dataStorage.connect(sensor1).storeTelemetry(
      epochTimestamp1 + 60,
      45000,
      2500,
      6000,
      hash1,
      9200
    );
  } catch (err) {
    replayReverted = true;
  }
  assert(replayReverted, "Replay attack prevented: duplicate telemetry hash rejected (Table 5)");

  // --- Test 7: Automated Credit Calculation (Section 3.2, Eq. 4) ---
  console.log("\n3. Testing CreditGeneration Equation (4):");
  // Baseline = 1200 kg CO2/hr, Measured = 750 kg CO2/hr, T = 24 hours, CF = 1 credit / 1000 kg
  // Credits = ((1200 - 750) * 24 * 1) / 1000 = (450 * 24) / 1000 = 10.8 credits
  const epochId1 = 2001;
  const measuredRate = 750;
  const hours = 24;
  const txCredit = await creditGeneration.connect(authority).calculateAndIssueCredits(
    facilityOwner.address,
    epochId1,
    measuredRate,
    hours
  );
  await txCredit.wait();
  const ownerCredits = await creditGeneration.creditBalances(facilityOwner.address);
  const expectedCredits = ethers.utils.parseEther("10.8");
  assert(ownerCredits.toString() === expectedCredits.toString(), "Eq. 4 Carbon credits minted exactly: 10.8 credits for 450 kg/h avoided over 24h");

  // --- Test 8: Double-Spending Prevention on Credits (Table 5: 100% prevention) ---
  let doubleSpendReverted = false;
  try {
    await creditGeneration.connect(authority).calculateAndIssueCredits(
      facilityOwner.address,
      epochId1, // Same epoch
      measuredRate,
      hours
    );
  } catch (err) {
    doubleSpendReverted = true;
  }
  assert(doubleSpendReverted, "Double-spending prevented: identical epoch cannot be credited twice (Table 5)");

  // --- Test 9: Zero Credit Issuance when Exceeding Baseline ---
  const epochId2 = 2002;
  const highEmission = 1300; // > 1200 baseline
  await creditGeneration.connect(authority).calculateAndIssueCredits(
    facilityOwner.address,
    epochId2,
    highEmission,
    hours
  );
  const updatedCredits = await creditGeneration.creditBalances(facilityOwner.address);
  assert(updatedCredits.toString() === expectedCredits.toString(), "0 credits minted when emission exceeds baseline (penalty boundary)");

  console.log(`\nResults: ${testsPassed} / ${totalTests} tests passed successfully!`);
  return { testsPassed, totalTests };
}

if (process.argv[1].endsWith("contracts_runner.js")) {
  runContractTests().catch(console.error);
}
