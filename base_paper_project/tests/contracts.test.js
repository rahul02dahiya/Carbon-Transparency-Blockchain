/**
 * Unit Tests for Base Paper Smart Contracts
 * Paper: "Blockchain IoT Integration for Automated Carbon Credit Trading and Environmental Monitoring"
 * Reference: IJFMR, Vol 7, Issue 5, 2025 (Singh et al., Section 3.1.3 & 3.2)
 */

import { expect } from "chai";
import hardhat from "hardhat";
const { ethers } = hardhat;

describe("Base Paper Smart Contracts Verification", function () {
  let authority, sensor1, sensor2, unauthorizedUser, recipient;
  let SensorRegistry, sensorRegistry;
  let DataStorage, dataStorage;
  let CreditGeneration, creditGeneration;

  const BASELINE_EMISSION = 1200; // 1200 kg CO2 / hour historical baseline
  const CONVERSION_FACTOR = 1;    // 1 credit per metric ton (1000 kg) avoided

  beforeEach(async function () {
    [authority, sensor1, sensor2, unauthorizedUser, recipient] = await ethers.getSigners();

    // 1. Deploy SensorRegistry
    SensorRegistry = await ethers.getContractFactory("SensorRegistry");
    sensorRegistry = await SensorRegistry.deploy();
    await sensorRegistry.deployed();

    // 2. Deploy DataStorage
    DataStorage = await ethers.getContractFactory("DataStorage");
    dataStorage = await DataStorage.deploy(sensorRegistry.address);
    await dataStorage.deployed();

    // 3. Deploy CreditGeneration
    CreditGeneration = await ethers.getContractFactory("CreditGeneration");
    creditGeneration = await CreditGeneration.deploy(
      dataStorage.address,
      BASELINE_EMISSION,
      CONVERSION_FACTOR
    );
    await creditGeneration.deployed();
  });

  describe("1. SensorRegistry Contract (Section 3.1.3)", function () {
    it("should allow authority to register valid IoT sensor nodes", async function () {
      const lat = 24817000; // 24.8170 * 1e6
      const lon = 93936800; // 93.9368 * 1e6
      
      await expect(sensorRegistry.registerSensor(sensor1.address, "NDIR-CO2-DHT22", lat, lon))
        .to.emit(sensorRegistry, "SensorRegistered")
        .withArgs(sensor1.address, "NDIR-CO2-DHT22", lat, lon, (await ethers.provider.getBlock("latest")).timestamp + 1);

      expect(await sensorRegistry.isAuthorizedSensor(sensor1.address)).to.equal(true);
      expect(await sensorRegistry.activeSensorCount()).to.equal(1);
    });

    it("should reject sensor registration from non-authority callers", async function () {
      await expect(
        sensorRegistry.connect(unauthorizedUser).registerSensor(sensor1.address, "NDIR", 0, 0)
      ).to.be.revertedWith("SensorRegistry: Caller is not the authorized regulatory entity");
    });

    it("should allow authority to update reliability score (Eq. 2 w_i)", async function () {
      await sensorRegistry.registerSensor(sensor1.address, "NDIR", 0, 0);
      await sensorRegistry.updateReliability(sensor1.address, 9500); // 95%
      expect(await sensorRegistry.getSensorReliability(sensor1.address)).to.equal(9500);
    });
  });

  describe("2. DataStorage Contract (Section 3.1.3 & Section 3.3)", function () {
    beforeEach(async function () {
      await sensorRegistry.registerSensor(sensor1.address, "NDIR-CO2", 24817000, 93936800);
    });

    it("should store telemetry when consensus score is above threshold (>= 8500)", async function () {
      const epochTimestamp = Math.floor(Date.now() / 1000);
      const co2Agg = 45000; // 450.00 ppm * 100
      const temp = 2500;    // 25.00 °C * 100
      const hum = 6000;     // 60.00 % * 100
      const telemetryHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("epoch_1_telemetry"));
      const consensusScore = 9200; // 0.92

      await expect(
        dataStorage.connect(sensor1).storeTelemetry(epochTimestamp, co2Agg, temp, hum, telemetryHash, consensusScore)
      ).to.emit(dataStorage, "TelemetryCommitted");

      expect(await dataStorage.getRecordCount()).to.equal(1);
      const record = await dataStorage.getRecord(epochTimestamp);
      expect(record.co2Aggregated).to.equal(co2Agg);
      expect(record.consensusScore).to.equal(consensusScore);
    });

    it("should reject telemetry when consensus score is below threshold (< 8500)", async function () {
      const epochTimestamp = Math.floor(Date.now() / 1000);
      const telemetryHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("low_consensus"));
      const lowConsensus = 7800; // 0.78 < 0.85

      await expect(
        dataStorage.connect(sensor1).storeTelemetry(epochTimestamp, 45000, 2500, 6000, telemetryHash, lowConsensus)
      ).to.be.revertedWith("DataStorage: Telemetry rejected - consensus score below threshold");
    });

    it("should reject unauthorized callers (Table 5: Sybil attack resistance)", async function () {
      const epochTimestamp = Math.floor(Date.now() / 1000);
      const telemetryHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("unauthorized"));

      await expect(
        dataStorage.connect(unauthorizedUser).storeTelemetry(epochTimestamp, 45000, 2500, 6000, telemetryHash, 9000)
      ).to.be.revertedWith("DataStorage: Caller is not an authorized sensor or regulatory gateway");
    });

    it("should prevent replay attacks with duplicate telemetry hashes (Table 5: 100% protection)", async function () {
      const epochTimestamp1 = 1000000;
      const epochTimestamp2 = 1000060;
      const duplicateHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("replay_payload"));

      // First submission succeeds
      await dataStorage.connect(sensor1).storeTelemetry(epochTimestamp1, 45000, 2500, 6000, duplicateHash, 9000);

      // Second submission with identical telemetry hash fails
      await expect(
        dataStorage.connect(sensor1).storeTelemetry(epochTimestamp2, 45000, 2500, 6000, duplicateHash, 9000)
      ).to.be.revertedWith("DataStorage: Replay attack detected - telemetry hash already committed");
    });
  });

  describe("3. CreditGeneration Contract (Section 3.2, Eq. 4)", function () {
    it("should accurately calculate and mint credits based on Equation 4", async function () {
      // Baseline = 1200 kg/hr, Measured = 800 kg/hr, T = 24 hours, CF = 1 credit / 1000 kg
      // Credits = ((1200 - 800) * 24 * 1) / 1000 = (400 * 24) / 1000 = 9600 / 1000 = 9.6 credits
      const measured = 800;
      const hours = 24;
      const epochId = 101;

      await creditGeneration.calculateAndIssueCredits(recipient.address, epochId, measured, hours);

      const balance = await creditGeneration.creditBalances(recipient.address);
      const expectedCreditsWei = ethers.utils.parseEther("9.6"); // 9.6 * 1e18
      expect(balance).to.equal(expectedCreditsWei);
    });

    it("should mint 0 credits and emit warning when emissions exceed baseline", async function () {
      const measured = 1350; // > baseline (1200)
      const epochId = 102;

      await expect(creditGeneration.calculateAndIssueCredits(recipient.address, epochId, measured, 24))
        .to.emit(creditGeneration, "BaselineExceeded")
        .withArgs(recipient.address, epochId, measured, BASELINE_EMISSION);

      const balance = await creditGeneration.creditBalances(recipient.address);
      expect(balance).to.equal(0);
    });

    it("should prevent double spending of the same epoch (Table 5: 100% prevention)", async function () {
      const epochId = 103;
      await creditGeneration.calculateAndIssueCredits(recipient.address, epochId, 900, 24);

      // Re-claiming the same epoch is strictly reverted
      await expect(
        creditGeneration.calculateAndIssueCredits(recipient.address, epochId, 900, 24)
      ).to.be.revertedWith("CreditGeneration: Double spending prevented - epoch already processed");
    });
  });
});
