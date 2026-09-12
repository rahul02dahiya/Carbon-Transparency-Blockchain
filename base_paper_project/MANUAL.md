# Base Paper Reproduction Manual: Step-by-Step Guide

This guide walks you through the code, explains how the data cleaning and blockchain pipeline works, and shows you how to run everything yourself.

If you are reviewing this repository on GitHub or preparing your thesis presentation, follow the steps below.

---

## 1. How to Read the Code (Recommended Reading Order)

To understand the system without getting overwhelmed, read the files in this specific order:

### Step 1: The Smart Contracts (`contracts/`)
Start here to see the rules enforced on the blockchain:
1. **`contracts/SensorRegistry.sol`**
   * What it does: Acts as the gatekeeper. Only hardware devices registered by the admin can submit readings. It also tracks the reliability score ($w_i$) of each sensor.
2. **`contracts/DataStorage.sol`**
   * What it does: Stores verified emission readings. It verifies the cryptographic hash, prevents replay attacks (you can't submit the same reading twice), and checks that the consensus score is at least 85% before saving.
3. **`contracts/CreditGeneration.sol`**
   * What it does: Calculates and issues carbon credits using Equation 4:
     $$\text{Credits} = \frac{(E_{\text{baseline}} - E_{\text{measured}}) \times \text{Hours} \times CF}{1000}$$
     If emissions exceed the baseline, 0 credits are issued.

### Step 2: The Data Processing & Simulation Logic (`simulation/`)
Next, see how raw sensor data is filtered before hitting the blockchain:
1. **`simulation/uci_data_loader.js`**
   * What it does: Reads `AirQualityUCI.csv`, fixes European comma numbers (`13,6` $\rightarrow$ `13.6`), and drops corrupted `-200` error rows.
2. **`simulation/data_processor.js`**
   * What it does: Implements two core formulas from the paper:
     * **Equation 3 (Z-Score Outlier Filter):** Calculates mean ($\mu$) and standard deviation ($\sigma$). If $|Z_i| > 2.5$, the reading is flagged as an anomaly and excluded.
     * **Equation 2 (Weighted Aggregation):** Combines readings using sensor reliability weights ($w_i$).
3. **`simulation/consensus_engine.js`**
   * What it does: Implements **Equation 5 (Proof-of-Sensor Consensus)**:
     $$\text{Consensus Score} = 0.4 \times \text{Accuracy} + 0.4 \times \text{Reliability} + 0.2 \times \text{Diversity}$$
     Returns whether the batch clears the 85% threshold.

### Step 3: Execution Scripts
Finally, look at how everything ties together:
1. **`scripts/deploy.js`**: Deploys the three contracts to your local Ethereum network.
2. **`run_uci_pipeline.js`**: Takes real data from `AirQualityUCI.csv`, cleans it, runs anomaly detection, and commits verified daily batches to the smart contracts.
3. **`run_reproduction.js`**: Runs the complete paper benchmark suite (accuracy, cost savings, and 1,000 security attack tests).

---

## 2. Understanding the Dataset & Noise Removal

### What is `AirQualityUCI.csv`?
This file contains 9,357 real hourly air quality measurements collected from a chemical sensor device deployed in an Italian city area. 

Key columns we use:
* `Date` and `Time`: Timestamps for each reading.
* `CO(GT)`: True Carbon Monoxide concentration (mg/m³).
* `PT08.S1(CO)`: Raw sensor response.
* `T`: Temperature in °C.
* `RH`: Relative Humidity in %.

### How we clean the noise:
Raw IoT data in the real world is messy. Here is how our pipeline cleans it:

1. **Format Normalization:** European CSVs use commas for decimals (`2,6` instead of `2.6`) and semicolons (`;`) for separators. `uci_data_loader.js` normalizes them into standard numbers.
2. **Dropping Dead Sensor Readings (Equation 1):** In the UCI dataset, broken sensors and telemetry drops are recorded as `-200`. The loader checks boundary limits:
   * Temperature must be between $-40^\circ\text{C}$ and $85^\circ\text{C}$.
   * Relative Humidity must be between $0\%$ and $100\%$.
   * Any row containing `-200` for key readings is automatically dropped before processing.
3. **Statistical Anomaly Filtering (Equation 3):** Sudden temporary gas spikes or sensor miscalibrations are checked against a rolling window. Any value with a Z-score greater than $2.5$ is flagged and removed from the aggregated average.

---

## 3. How to Run the Project (Step-by-Step)

Open your terminal and navigate to the `base_paper_project` directory:

```bash
cd /home/rkbits/Homework/Carbon-Transparency-Blockchain/base_paper_project
```

### Step 1: Install Dependencies
Make sure the required packages are installed:
```bash
npm install --legacy-peer-deps
```

### Step 2: Start Local Ethereum Node
Start a local Hardhat blockchain network. Keep this terminal window open:
```bash
npx hardhat node
```
This starts an Ethereum JSON-RPC testnet at `http://127.0.0.1:8545` with pre-funded accounts.

### Step 3: Run the Real Dataset Pipeline
Open a **second terminal**, go to the same folder, and run:
```bash
node run_uci_pipeline.js
```

**What you will see in the terminal:**
1. Contracts compile and deploy automatically.
2. `AirQualityUCI.csv` is loaded: corrupted `-200` rows are dropped.
3. Data is grouped into 24-hour daily shifts.
4. Z-score anomaly detection runs on each shift.
5. High-consensus shifts get committed to `DataStorage.sol`.
6. `CreditGeneration.sol` checks emissions against the baseline and mints verified carbon credits.
7. A final summary table prints with total records, anomalies filtered, and credits minted.

---

## 4. How to Run the Paper Benchmarks & Tests

If you want to verify that the project matches the published results from Singh et al. (IJFMR 2025):

### Test 1: Smart Contract Unit Tests
Checks access control, replay prevention, and credit calculation:
```bash
node tests/contracts_runner.js
```
*(Expected: 10 / 10 tests passing)*

### Test 2: Security Attack Suite (Table 5)
Simulates 1,000 attack trials across 6 attack types (Tampering, Sybil, Double Spending, Replay, MITM):
```bash
node tests/security_suite.js
```
*(Expected: 99%+ protection matching Table 5)*

### Test 3: Accuracy & Latency Benchmarks (Tables 3 & 4)
Simulates a 50-node network over 120 sampling epochs to measure precision and latency:
```bash
node tests/benchmarks_suite.js
```
*(Expected: 99.2% CO2 accuracy, latency under 15 seconds)*

### Master Script: Run All Benchmarks at Once
Runs all unit tests, security suites, and benchmark calculations, then saves a report:
```bash
node run_reproduction.js
```
This generates `REPRODUCTION_REPORT.md` with full comparison tables.

---
