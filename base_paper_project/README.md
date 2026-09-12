# Base Paper Project Replication

This directory contains the complete, faithful replication of the foundational base paper for this M.Tech Thesis:

> **Paper Title:** *Blockchain IoT Integration for Automated Carbon Credit Trading and Environmental Monitoring*  
> **Authors:** Ningthoujam Chidananda Singh, Thoudam Basanta Singh, Mutum Bidyarani Devi  
> **Journal:** *International Journal for Multidisciplinary Research (IJFMR)*, Volume 7, Issue 5, September-October 2025  
> **Paper ID:** `IJFMR250556211` | **E-ISSN:** 2582-2160  
> **NotebookLLM Source ID:** `eb5b9496-77e0-46e6-8775-e1639a2e7589`

---

## 1. Directory Structure

```
base_paper_project/
├── contracts/
│   ├── SensorRegistry.sol      # Manages sensor registration, GPS, and reliability weights (w_i)
│   ├── DataStorage.sol         # Stores validated sensor data with cryptographic hashing & PoS consensus
│   └── CreditGeneration.sol    # Calculates & mints carbon credits via Equation 4
├── simulation/
│   ├── sensor_node.js          # ARM Cortex-M4 NDIR CO2, Temp, Humidity node simulator (Eq. 1 & 7)
│   ├── data_processor.js       # Eq. 2 Weighted Aggregation & Eq. 3 Z-Score Anomaly Filtering
│   ├── consensus_engine.js     # Eq. 5 Proof-of-Sensor (PoS) Consensus Scoring
│   └── network_simulator.js    # 50-node IoT network simulator across 10 km² industrial area
├── scripts/
│   └── deploy.js               # Contract deployment script
├── tests/
│   ├── contracts_runner.js     # Logic assertions for all 3 smart contracts
│   ├── security_suite.js       # Replicates Table 5 (Tampering, Sybil, Replay, MITM, Double-Spend)
│   └── benchmarks_suite.js     # Replicates Table 3 (Accuracy), Table 4 (Costs), Eq. 6 (TPS), Eq. 7 (Power)
├── hardhat.config.js           # Hardhat configuration (Solidity 0.8.19)
├── run_reproduction.js         # Master execution pipeline
└── REPRODUCTION_REPORT.md      # Auto-generated verification report
```

---

## 2. Mathematical Equations Implemented

*   **Equation 1 (Edge Boundary Check):**
    $$|CO_{2,t} - CO_{2,t-1}| \le \Delta_{\max} \quad (500\text{ ppm/min}), \quad T \in [-40^\circ\text{C}, 85^\circ\text{C}], \quad H \in [0\%, 100\%]$$
*   **Equation 2 (Weighted Aggregation):**
    $$CO_{2\text{agg}} = \frac{\sum_{i=1}^{n} w_i \cdot CO_{2i}}{\sum_{i=1}^{n} w_i}$$
*   **Equation 3 (Z-Score Anomaly Detection):**
    $$Z_i = \frac{CO_{2i} - \mu}{\sigma}, \quad \text{flagged if } |Z_i| > 2.5$$
*   **Equation 4 (Automated Carbon Credit Generation):**
    $$\text{Credits} = \frac{(E_{\text{baseline}} - E_{\text{measured}}) \times T \times CF}{1000}$$
*   **Equation 5 (Proof-of-Sensor Consensus Score):**
    $$\text{Consensus}_{\text{score}} = \alpha \cdot \text{Accuracy} + \beta \cdot \text{Reliability} + \gamma \cdot \text{Geographic}_{\text{diversity}}$$
*   **Equation 6 (Transaction Throughput):**
    $$TPS_{\text{effective}} = \frac{N_{\text{sensors}} \times F_{\text{sampling}}}{T_{\text{block}} \times E_{\text{compression}}} = 10.6\text{ TPS}$$
*   **Equation 7 (Energy Consumption):**
    $$E_{\text{consumption}} = P_{\text{sensing}} \times T_{\text{active}} + P_{\text{comm}} \times T_{\text{comm}} + P_{\text{sleep}} \times T_{\text{sleep}} \approx 2.0 - 3.0\text{ mW}$$

---

## 3. How to Run the Reproduction Pipeline

Ensure the local Ethereum node is running:
```bash
npx hardhat node
```

In another terminal, run the master reproduction pipeline:
```bash
node run_reproduction.js
```
This runs all contract tests, executes 1000 security attack simulations, evaluates measurement accuracy across 50 nodes over 120 sampling epochs, and generates `REPRODUCTION_REPORT.md`.
