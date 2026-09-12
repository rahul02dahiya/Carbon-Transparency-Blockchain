/**
 * Deployment Script for Base Paper Smart Contracts
 * Paper: "Blockchain IoT Integration for Automated Carbon Credit Trading and Environmental Monitoring"
 * Reference: IJFMR, Vol 7, Issue 5, 2025 (Singh et al., Section 4.2)
 */

import fs from "fs";
import path from "path";
import { ethers } from "ethers";

// Read compiled artifacts
const artifactPath = (contractName) => 
  path.resolve(`./artifacts/contracts/${contractName}.sol/${contractName}.json`);

export async function deployBaseContracts(signer) {
  console.log("----------------------------------------------------------");
  console.log("Deploying Base Paper Smart Contracts (Solidity 0.8.19)...");
  console.log("Authority / Deployer Address:", signer.address);

  // 1. Deploy SensorRegistry
  const sensorRegistryJson = JSON.parse(fs.readFileSync(artifactPath("SensorRegistry"), "utf8"));
  const SensorRegistryFactory = new ethers.ContractFactory(
    sensorRegistryJson.abi,
    sensorRegistryJson.bytecode,
    signer
  );
  const sensorRegistry = await SensorRegistryFactory.deploy();
  await sensorRegistry.deployed();
  console.log("✔ SensorRegistry deployed at:", sensorRegistry.address);

  // 2. Deploy DataStorage
  const dataStorageJson = JSON.parse(fs.readFileSync(artifactPath("DataStorage"), "utf8"));
  const DataStorageFactory = new ethers.ContractFactory(
    dataStorageJson.abi,
    dataStorageJson.bytecode,
    signer
  );
  const dataStorage = await DataStorageFactory.deploy(sensorRegistry.address);
  await dataStorage.deployed();
  console.log("✔ DataStorage deployed at:   ", dataStorage.address);

  // 3. Deploy CreditGeneration
  // Baseline = 1200 kg CO2/hr, CF = 1 credit / metric ton (1000 kg)
  const BASELINE_EMISSION = 1200;
  const CONVERSION_FACTOR = 1;
  const creditGenerationJson = JSON.parse(fs.readFileSync(artifactPath("CreditGeneration"), "utf8"));
  const CreditGenerationFactory = new ethers.ContractFactory(
    creditGenerationJson.abi,
    creditGenerationJson.bytecode,
    signer
  );
  const creditGeneration = await CreditGenerationFactory.deploy(
    dataStorage.address,
    BASELINE_EMISSION,
    CONVERSION_FACTOR
  );
  await creditGeneration.deployed();
  console.log("✔ CreditGeneration deployed at:", creditGeneration.address);
  console.log("----------------------------------------------------------");

  return {
    sensorRegistry,
    dataStorage,
    creditGeneration
  };
}

// If run directly
if (process.argv[1].endsWith("deploy.js")) {
  const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");
  const signer = provider.getSigner(0);
  deployBaseContracts(signer).catch(console.error);
}
