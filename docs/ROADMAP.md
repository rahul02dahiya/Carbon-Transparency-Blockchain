# M.Tech Thesis Implementation Roadmap

This roadmap breaks down the entire project into small, step-by-step micro-tasks. You can follow this guide sequentially to build, test, and verify each part of the system.

---

## Progress Overview

| Phase | Description | Status |
| :--- | :--- | :--- |
| **Phase 0** | Base Paper Replication (Solidity 0.8.19 + JavaScript + Hardhat) | **Completed** |
| **Phase 1** | Enterprise Java Middleware (Spring Boot 3.x + Web3j + MongoDB) | **Current Focus** |
| **Phase 2** | System Benchmarking, Comparative Evaluation & Thesis Defense | **Upcoming** |

---

## Phase 0: Base Paper Replication (Status: COMPLETED)

All baseline deliverables from Singh et al. (*IJFMR 2025*) are implemented and verified inside `base_paper_project/`:

- [x] **0.1 Local Blockchain Testnet:** Configured Hardhat EVM (Chain ID 1337, 12s block time, 30M gas limit).
- [x] **0.2 Smart Contract Trio (Solidity 0.8.19):**
  - [x] `contracts/SensorRegistry.sol` (Node registration, GPS, and reliability weights $w_i$).
  - [x] `contracts/DataStorage.sol` (Hash verification and Proof-of-Sensor consensus gate $\ge 85\%$).
  - [x] `contracts/CreditGeneration.sol` (Equation 4 credit calculation and double-spending protection).
- [x] **0.3 Math & Simulation Engine:**
  - [x] Equation 1 boundary checks in `simulation/sensor_node.js`.
  - [x] Equation 2 weighted aggregation in `simulation/data_processor.js`.
  - [x] Equation 3 Z-score outlier filtering in `simulation/data_processor.js`.
  - [x] Equation 5 Proof-of-Sensor scoring in `simulation/consensus_engine.js`.
- [x] **0.4 Baseline Reproduction Suite:**
  - [x] Contract assertion suite: 10/10 passed (`tests/contracts_runner.js`).
  - [x] Security suite: 1,000 trials across 6 attack vectors (`tests/security_suite.js`).
  - [x] Performance benchmarks matching Table 3 & Table 4 (`tests/benchmarks_suite.js`).
- [x] **0.5 Real-World Dataset Validation:**
  - [x] Parsed `AirQualityUCI.csv`, filtered `-200` error codes, and committed 21 daily batches on-chain (`run_uci_pipeline.js`).
  - [x] Generated user manual: `base_paper_project/MANUAL.md`.

---

## Phase 1: Enterprise Java Middleware & Web3j Bridge (Status: CURRENT FOCUS)

This phase replaces the lightweight test scripts with an enterprise-grade **Java Spring Boot 3.x** backend.

```
                    ┌─────────────────────────┐
                    │ 1. Telemetry Ingestion  │ (REST API & Real-World UCI Feeder)
                    └───────────┬─────────────┘
                                │
                    ┌───────────v─────────────┐
                    │ 2. Data Cleaning Layer  │ (Eq. 1 Boundary Filter & UCI Sanitizer)
                    └───────────┬─────────────┘
                                │
                    ┌───────────v─────────────┐
                    │ 3. Anomaly Detection    │ (Eq. 3 Z-Score Rolling Buffer)
                    └───────────┬─────────────┘
                                │
                    ┌───────────v─────────────┐
                    │ 4. Batch Aggregation    │ (Eq. 2 Weighted Aggregation)
                    └───────────┬─────────────┘
                                │
        ┌───────────────────────┴───────────────────────┐
        ▼                                               ▼
┌───────────────────────────────┐       ┌───────────────────────────────┐
│     MongoDB (Off-Chain)       │       │    Web3j Bridge (On-Chain)    │
│  - Raw Sensor Logs            │       │  - DataStorage.sol            │
│  - Flagged Anomaly Records    │       │  - CreditGeneration.sol       │
│  - Blockchain Audit Receipts  │       │  - SensorRegistry.sol         │
└───────────────────────────────┘       └───────────────────────────────┘
```

---

### Sprint 1: Java Project Foundation & MongoDB Setup

*Goal: Scaffold a clean Spring Boot project connected to MongoDB.*

- [ ] **Task 1.1: Project Initialization**
  - Create directory: `middleware/`.
  - Configure `pom.xml` with:
    - Java 17+
    - Spring Boot `3.3.x`
    - `spring-boot-starter-web`
    - `spring-boot-starter-data-mongodb`
    - `spring-boot-starter-validation`
    - `org.web3j:core:4.10.3`
    - `org.projectlombok:lombok`
    - `spring-boot-starter-test` & `testcontainers`
- [ ] **Task 1.2: Application Configuration**
  - Create `src/main/resources/application.yml`:
    - Configure server port (`8080`).
    - Configure MongoDB connection URI (`mongodb://localhost:27017/carbon_tracker`).
    - Configure blockchain RPC endpoint (`http://127.0.0.1:8545`).
    - Configure environmental baseline constants ($E_{\text{baseline}} = 2.5\text{ mg/m}^3$).
- [ ] **Task 1.3: Core Domain Documents (MongoDB)**
  - Create `model/RawTelemetryDocument.java`:
    - Fields: `id`, `sensorId`, `timestamp`, `co`, `temperature`, `humidity`, `latitude`, `longitude`, `signature`, `receivedAt`.
  - Create `model/CleanedTelemetryDocument.java`:
    - Fields: `id`, `epochTimestamp`, `coAgg`, `tempAgg`, `humAgg`, `consensusScore`, `anomaliesCount`, `batchHash`, `status`.
  - Create `model/BlockchainTransactionDocument.java`:
    - Fields: `id`, `epochTimestamp`, `txHash`, `blockNumber`, `gasUsed`, `creditsMinted`, `status`, `confirmedAt`.
- [ ] **Task 1.4: Repository Interfaces**
  - Create `repository/RawTelemetryRepository.java` (query by `sensorId`, `timestamp` range).
  - Create `repository/CleanedTelemetryRepository.java` (query by `epochTimestamp`, `status`).
  - Create `repository/BlockchainTransactionRepository.java`.
- [ ] **Task 1.5: Health Check & Smoke Test**
  - Create `controller/HealthController.java` (`GET /api/v1/health`).
  - Write test `HealthControllerTest.java` to verify the Spring context loads properly.

*Verification Checkpoint 1:*
```bash
cd middleware && ./mvnw clean test
```

---

### Sprint 2: Telemetry Ingestion Layer (REST API)

*Goal: Build endpoints that receive sensor readings, validate inputs, and save raw records to MongoDB.*

- [ ] **Task 2.1: Ingestion Data Transfer Objects (DTOs)**
  - Create `dto/SensorReadingRequest.java`:
    - Validate with annotations: `@NotBlank sensorId`, `@NotNull timestamp`, `@NotNull co`, `@NotNull temperature`, `@NotNull humidity`.
  - Create `dto/BatchIngestRequest.java` (list of sensor reading objects).
  - Create `dto/ApiResponse.java` (standard JSON wrapper: `status`, `message`, `data`, `timestamp`).
- [ ] **Task 2.2: Telemetry Ingestion Service**
  - Create `service/TelemetryIngestionService.java`:
    - Method: `saveRawReading(SensorReadingRequest request)`
    - Method: `saveBatchReadings(List<SensorReadingRequest> batch)`
    - Asynchronously pass records into the cleaning queue.
- [ ] **Task 2.3: Ingestion REST Controller**
  - Create `controller/TelemetryIngestionController.java`:
    - `POST /api/v1/telemetry/single` (accepts single reading).
    - `POST /api/v1/telemetry/batch` (accepts multi-sensor batch).
    - Add global exception handling (`GlobalExceptionHandler.java`) for bad request formats (`400 Bad Request`).
- [ ] **Task 2.4: Integration Tests**
  - Write `TelemetryIngestionControllerTest.java`:
    - Test valid payload submission (`200 OK`).
    - Test missing required field rejection (`400 Bad Request`).
    - Verify document persistence in MongoDB.

*Verification Checkpoint 2:*
```bash
curl -X POST http://localhost:8080/api/v1/telemetry/single \
  -H "Content-Type: application/json" \
  -d '{"sensorId":"NODE-01","timestamp":1710000000,"co":2.1,"temperature":24.5,"humidity":55.0}'
```

---

### Sprint 3: Data Cleaning & Preprocessing Engine (Equations 1 & 2)

*Goal: Filter broken sensor values, enforce physical limits, and compute weighted averages in Java.*

- [ ] **Task 3.1: Boundary Validation Filter (Equation 1)**
  - Create `service/cleaning/BoundaryFilterService.java`:
    - Implement physical limits:
      - Temperature: $-40^\circ\text{C} \le T \le +85^\circ\text{C}$
      - Humidity: $0\% \le H \le 100\%$
      - Carbon concentration: $CO > 0$
      - Delta check: $|CO_t - CO_{t-1}| \le \Delta_{\max}$
    - Returns `boolean isValid(SensorReading reading)`.
- [ ] **Task 3.2: UCI Dataset Noise Cleaner**
  - In `BoundaryFilterService.java`:
    - Explicitly catch and drop UCI missing/corrupted markers (`-200`).
    - Log dropped records to MongoDB with flag `CORRUPTED_SENSOR_DROPPED`.
- [ ] **Task 3.3: Weighted Data Aggregation (Equation 2)**
  - Create `service/cleaning/WeightedAggregationService.java`:
    - Implements Equation 2:
      $$CO_{2\text{agg}} = \frac{\sum_{i=1}^{n} w_i \cdot CO_{2i}}{\sum_{i=1}^{n} w_i}$$
    - Pulls sensor reliability weights $w_i$ from memory/cache.
    - Aggregates temperature, humidity, and gas concentrations.
- [ ] **Task 3.4: Unit Tests for Cleaning & Aggregation**
  - Write `BoundaryFilterServiceTest.java` (test boundary drops on `-200`, extreme temperatures, negative values).
  - Write `WeightedAggregationServiceTest.java` (test weighted mathematical calculation).

*Verification Checkpoint 3:*
```bash
./mvnw test -Dtest=BoundaryFilterServiceTest,WeightedAggregationServiceTest
```

---

### Sprint 4: Statistical Z-Score Anomaly Detection (Equation 3)

*Goal: Build a rolling statistical buffer that detects and isolates gas spikes.*

- [ ] **Task 4.1: Sliding Window Statistical Buffer**
  - Create `service/anomaly/SlidingWindowBuffer.java`:
    - Thread-safe ring buffer keeping the last $N$ valid readings (default $N = 60$).
    - Method: `double calculateMean()`
    - Method: `double calculateStdDev()`
- [ ] **Task 4.2: Z-Score Anomaly Detector (Equation 3)**
  - Create `service/anomaly/ZScoreAnomalyDetector.java`:
    - Implements Equation 3:
      $$Z_i = \frac{x_i - \mu}{\sigma}$$
    - Configurable threshold (default: $|Z_i| > 2.5$).
    - Method: `AnomalyEvaluationResult evaluate(SensorReading reading)`.
- [ ] **Task 4.3: Anomaly Persistence & Audit Event**
  - Flagged anomalies are saved to MongoDB with:
    - Calculated Z-score.
    - Reference rolling mean and standard deviation.
    - Timestamp and sensor ID.
    - Flag: `EXCLUDED_FROM_AGGREGATION`.
- [ ] **Task 4.4: Detector Unit Tests**
  - Write `ZScoreAnomalyDetectorTest.java`:
    - Feed 50 normal readings (e.g., $CO \approx 2.0\text{ mg/m}^3$).
    - Inject an intentional spike ($CO = 8.5\text{ mg/m}^3$).
    - Assert that the spike is flagged ($|Z| > 2.5$) and excluded from the average.

*Verification Checkpoint 4:*
```bash
./mvnw test -Dtest=ZScoreAnomalyDetectorTest
```

---

### Sprint 5: Real-World Dataset Feeder & IoT Simulator

*Goal: Provide two data sources: streaming real `AirQualityUCI.csv` records and running a 50-node synthetic simulator.*

- [ ] **Task 5.1: UCI CSV Streamer Service**
  - Create `service/feeder/UciDatasetFeederService.java`:
    - Reads `base_paper_project/AirQualityUCI.csv`.
    - Handles European comma numbers (`2,6` $\rightarrow$ `2.6`).
    - Streams rows into the ingestion pipeline in timed intervals or fast-batch mode.
- [ ] **Task 5.2: Synthetic 50-Node Simulator Service**
  - Create `service/feeder/SyntheticSensorSimulatorService.java`:
    - Models 50 virtual ARM Cortex-M4 nodes across a 10 km² virtual grid.
    - Generates Gaussian sensor noise matching Table 1 ($\pm 2\text{ ppm}$ NDIR).
    - Uses Spring `@Scheduled` to emit simulated readings every minute.
- [ ] **Task 5.3: Feeder Control Endpoints**
  - Create `controller/SimulationController.java`:
    - `POST /api/v1/simulation/start-uci` (starts streaming real UCI data).
    - `POST /api/v1/simulation/start-synthetic` (starts 50-node simulation).
    - `POST /api/v1/simulation/stop` (stops streaming).
    - `POST /api/v1/simulation/inject-spike` (manually triggers an anomaly spike for live testing).

*Verification Checkpoint 5:*
```bash
curl -X POST http://localhost:8080/api/v1/simulation/start-uci?records=100
```

---

### Sprint 6: Web3j Smart Contract Binding & Bridge

*Goal: Generate Java wrappers for the Solidity contracts and execute on-chain transactions from Spring Boot.*

- [ ] **Task 6.1: Web3j Wrapper Generation**
  - Run Web3j CLI / Maven plugin to compile contract ABIs from `base_paper_project/artifacts/`:
    - Generate `SensorRegistry.java`
    - Generate `DataStorage.java`
    - Generate `CreditGeneration.java`
  - Place wrappers in `contract/wrapper/`.
- [ ] **Task 6.2: Web3j Spring Configuration Bean**
  - Create `config/Web3jConfig.java`:
    - `Web3j` client connected to `http://127.0.0.1:8545`.
    - `Credentials` loaded from local testnet private key.
    - `ContractGasProvider` configured with 30M gas limit matching base paper.
- [ ] **Task 6.3: Blockchain Bridge Service**
  - Create `service/blockchain/BlockchainBridgeService.java`:
    - Method: `boolean isSensorAuthorized(String sensorAddress)`
    - Method: `String commitTelemetryBatch(CleanedBatch batch)`
    - Method: `String mintCarbonCredits(String recipient, long epochId, long measured, long hours)`
- [ ] **Task 6.4: Blockchain Integration Test**
  - Write `BlockchainBridgeServiceTest.java`:
    - Start local node (`npx hardhat node`).
    - Verify successful on-chain transaction execution and receipt retrieval.

*Verification Checkpoint 6:*
```bash
./mvnw test -Dtest=BlockchainBridgeServiceTest
```

---

### Sprint 7: Automated Carbon Accounting (Equation 4)

*Goal: Aggregate daily batches, verify consensus, and trigger credit minting on the blockchain.*

- [ ] **Task 7.1: Proof-of-Sensor Consensus in Java (Equation 5)**
  - Create `service/consensus/ProofOfSensorService.java`:
    - Calculate Accuracy, Reliability, and Geographic Diversity.
    - Enforce $\text{Score} \ge 0.85$ threshold before sending transaction to blockchain.
- [ ] **Task 7.2: Carbon Credit Calculation Service (Equation 4)**
  - Create `service/accounting/CarbonCreditAccountingService.java`:
    - Implements Equation 4:
      $$\text{Credits} = \frac{(E_{\text{baseline}} - E_{\text{measured}}) \times \text{Hours} \times CF}{1000}$$
    - If $E_{\text{measured}} \ge E_{\text{baseline}}$, mints 0 credits and logs a warning.
- [ ] **Task 7.3: Scheduled Epoch Dispatcher**
  - Create `service/accounting/ScheduledEpochDispatcher.java`:
    - Runs at the end of each 24-hour cycle.
    - Batches validated readings.
    - Submits batch hash to `DataStorage.sol`.
    - Calls `calculateAndIssueCredits` on `CreditGeneration.sol`.
    - Stores transaction receipt in MongoDB.

*Verification Checkpoint 7:*
```bash
curl -X POST http://localhost:8080/api/v1/accounting/trigger-epoch
```

---

### Sprint 8: Monitoring, Reporting & Evaluation APIs

*Goal: Provide REST endpoints for audit logs, compliance status, and research evaluation metrics.*

- [ ] **Task 8.1: Query & Compliance REST Controller**
  - Create `controller/ComplianceController.java`:
    - `GET /api/v1/compliance/summary` (overall emissions, baseline vs actual).
    - `GET /api/v1/compliance/credits` (tokenized credit balances).
    - `GET /api/v1/audit/anomalies` (list of flagged outlier events).
    - `GET /api/v1/audit/transactions` (on-chain transaction hashes with block numbers).
- [ ] **Task 8.2: Benchmark Evaluator Service**
  - Create `service/evaluation/BenchmarkEvaluatorService.java`:
    - Computes end-to-end latency (from sensor reading to block confirmation).
    - Computes anomaly detection accuracy (True Positive / False Positive rates).
    - Compiles gas costs per credit.
- [ ] **Task 8.3: Evaluation Comparison Report**
  - Generate automated comparative report:
    - Compares Phase 0 (Base paper JS scripts) vs Phase 1 (Java Spring Boot middleware).

*Verification Checkpoint 8:*
```bash
curl -s http://localhost:8080/api/v1/compliance/summary | jq .
```

---

## Phase 2: Thesis Compilation & Defense (Status: UPCOMING)

- [ ] **Step 9.1: Architectural Diagrams & Documentation**
  - Export UML component diagram (Sensor $\rightarrow$ Spring Boot $\rightarrow$ Web3j $\rightarrow$ Solidity $\rightarrow$ MongoDB).
  - Sequence diagram for data ingestion and anomaly rejection.
- [ ] **Step 9.2: Results Chapter Preparation**
  - Export comparative tables (Accuracy, Latency, Throughput, Gas economics).
  - Plot baseline vs verified emissions charts.
- [ ] **Step 9.3: Thesis Defense & Presentation Deck**
  - Prepare slides demonstrating the working software, code walkthrough, and benchmark results.