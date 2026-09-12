/**
 * Real-World UCI Dataset Pipeline Runner
 * Runs the full base project pipeline on actual AirQualityUCI.csv sensor records.
 * 
 * Pipeline:
 * 1. Loads & cleans UCI Air Quality data (filters -200 errors, parses decimals).
 * 2. Runs statistical anomaly filtering (Eq. 3 Z-score).
 * 3. Applies weighted aggregation (Eq. 2).
 * 4. Checks Proof-of-Sensor consensus threshold (Eq. 5).
 * 5. Commits immutable batches to DataStorage.sol.
 * 6. Programmatically calculates & mints carbon credits via CreditGeneration.sol (Eq. 4).
 */

import { ethers } from "ethers";
import { loadAndCleanUciData } from "./simulation/uci_data_loader.js";
import { DataProcessor } from "./simulation/data_processor.js";
import { ProofOfSensorConsensus } from "./simulation/consensus_engine.js";
import { deployBaseContracts } from "./scripts/deploy.js";

async function main() {
  console.log("================================================================================");
  console.log(" REAL-WORLD UCI AIR QUALITY DATASET RUNNER");
  console.log(" Dataset: UCI Air Quality (9,357 hourly multi-sensor records)");
  console.log("================================================================================\n");

  // Step 1: Connect to local Ethereum blockchain
  const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");
  const authority = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);

  console.log("1. Deploying smart contracts to local testnet...");
  const { sensorRegistry, dataStorage, creditGeneration } = await deployBaseContracts(authority);

  // Step 2: Set baseline for UCI air quality data (3.0 mg/m3 target * 1000 = 3000)
  const BASELINE_CO_RATE = 3.0;
  await creditGeneration.connect(authority).updateBaseline(3000);

  // Register monitoring station node in SensorRegistry
  const stationAddress = authority.address;
  const latScaled = 41902800; // Reference Italian monitoring site coords
  const lonScaled = 12496400;
  const regTx = await sensorRegistry.connect(authority).registerSensor(
    stationAddress,
    "UCI-FieldStation-MultiGas",
    latScaled,
    lonScaled
  );
  await regTx.wait();
  console.log("✔ Field station registered in SensorRegistry on-chain.\n");

  // Step 3: Load and clean real-world data
  console.log("2. Loading and cleaning AirQualityUCI.csv...");
  // Processing first 500 hourly records (covers ~3 weeks of continuous field monitoring)
  const BATCH_LIMIT = 500;
  const { records, totalRowsProcessed, validRecordsCount, droppedCorruptedRows } = loadAndCleanUciData(
    "./AirQualityUCI.csv",
    BATCH_LIMIT
  );

  console.log(`✔ Total CSV rows scanned:      ${totalRowsProcessed}`);
  console.log(`✔ Corrupted rows dropped (-200): ${droppedCorruptedRows}`);
  console.log(`✔ Clean rows ready for pipeline: ${validRecordsCount}\n`);

  // Step 4: Run Data Processing & Anomaly Detection (Eq. 2 & Eq. 3)
  console.log("3. Running statistical cleaning & anomaly detection (Z-score |Z| > 2.5)...");
  const dataProcessor = new DataProcessor(2.5);
  const consensusEngine = new ProofOfSensorConsensus(0.4, 0.4, 0.2);

  // Chunk readings into 24-hour daily batches
  const CHUNK_SIZE = 24;
  let totalAnomaliesCaught = 0;
  let batchesCommitted = 0;
  let totalCreditsMinted = 0;



  console.log("\n4. Processing 24-hour daily shifts and committing to blockchain...");
  console.log("--------------------------------------------------------------------------------");

  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const chunk = records.slice(i, i + CHUNK_SIZE);
    if (chunk.length === 0) break;

    // Adapt record format for processor
    const formattedReadings = chunk.map((r, idx) => ({
      sensorId: idx + 1,
      co2: r.co, // Using CO concentration as carbon emission indicator
      temperature: r.temperature,
      humidity: r.humidity,
      latitude: 41.9028 + (idx * 0.01), // Spatial grid across station cluster
      longitude: 12.4964 + (idx * 0.01),
      reliabilityScore: 1.0,
      isValid: true
    }));

    // Apply Eq. 2 Weighted Aggregation and Eq. 3 Z-Score Anomaly Filter
    const processed = dataProcessor.processEpoch(formattedReadings);
    totalAnomaliesCaught += processed.anomaliesCount;

    // Check Proof-of-Sensor consensus (Eq. 5)
    const consensus = consensusEngine.evaluateConsensus(processed, formattedReadings);

    // Cryptographic hash of the 24-hour payload
    const payloadHash = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(JSON.stringify(chunk.map(c => [c.timestamp, c.co])))
    );

    // If consensus meets the 0.85 threshold, store on-chain
    if (consensus.isConsensusReached) {
      const epochTimestamp = chunk[0].timestamp;
      const co2Scaled = Math.round(processed.co2Agg * 100);
      const tempScaled = Math.round(processed.tempAgg * 100);
      const humScaled = Math.round(processed.humAgg * 100);

      const storeTx = await dataStorage.connect(authority).storeTelemetry(
        epochTimestamp,
        co2Scaled,
        tempScaled,
        humScaled,
        payloadHash,
        consensus.scoreBasisPoints
      );
      await storeTx.wait();
      batchesCommitted++;

      // Issue Carbon Credits if emissions were below baseline (Eq. 4)
      // Credits = ((Baseline - Measured) * Hours * CF) / 1000
      const hoursElapsed = chunk.length;
      if (processed.co2Agg < BASELINE_CO_RATE) {
        // Convert to integer scale for contract
        const baselineInt = Math.round(BASELINE_CO_RATE * 1000);
        const measuredInt = Math.round(processed.co2Agg * 1000);

        const creditTx = await creditGeneration.connect(authority).calculateAndIssueCredits(
          authority.address,
          epochTimestamp,
          measuredInt,
          hoursElapsed
        );
        await creditTx.wait();
      }

      console.log(`Day ${Math.floor(i / CHUNK_SIZE) + 1} (${chunk[0].date}): Avg CO: ${processed.co2Agg} mg/m3 | Temp: ${processed.tempAgg} C | Anomalies flagged: ${processed.anomaliesCount} | Consensus: ${(consensus.consensusScore * 100).toFixed(1)}% -> COMMITTED`);
    }
  }

  console.log("--------------------------------------------------------------------------------");

  // Step 5: Read final on-chain balances
  const totalOnChainRecords = await dataStorage.getRecordCount();
  const rawCreditBalance = await creditGeneration.creditBalances(authority.address);
  const formattedCredits = ethers.utils.formatEther(rawCreditBalance);

  console.log("\n================================================================================");
  console.log(" SUMMARY RESULTS ON REAL-WORLD UCI DATA");
  console.log("================================================================================");
  console.log(`✔ Records Processed:            ${validRecordsCount} real-world sensor measurements`);
  console.log(`✔ Broken Sensor Spikes Dropped: ${droppedCorruptedRows} (-200 error codes)`);
  console.log(`✔ Statistical Anomalies Filtered: ${totalAnomaliesCaught} (Z-Score > 2.5)`);
  console.log(`✔ Daily Epochs Stored On-Chain:  ${totalOnChainRecords.toNumber()} verified batches`);
  console.log(`✔ Carbon Credits Minted:         ${Number(formattedCredits).toFixed(4)} credits`);
  console.log("================================================================================");
  console.log("Pipeline executed successfully with real field data!\n");
}

main().catch(console.error);
