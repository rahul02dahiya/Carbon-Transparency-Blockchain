# Technology Stack & Architecture

## 1. Sensor & Data Layer
- **Source:** Simulated IoT Sensors (tracking CO2, NOX, and SOX).
- **Role:** Real-time data gathering from industrial assets with local edge boundary checks (Eq. 1).

## 2. Blockchain Layer (Backend Ledger)
- **Platform:** Ethereum (Standard for M.Tech research frameworks).
- **Smart Contract Language:** Solidity (0.8.19) for automated carbon credit calculation and minting (Eq. 4).
- **Consensus:** Proof of Stake (PoS) / Proof-of-Sensor (PoS) scoring (Eq. 5).

## 3. Application & Middleware Layer (Core: Java)
- **Language:** Java (JDK 17+) – primary M.Tech thesis research focus.
- **Framework:** Spring Boot 3.x (enterprise middleware for high-velocity IoT ingestion, REST APIs).
- **Data Processing:** Native Java implementation for statistical Z-score anomaly filtering (Eq. 3) and weighted data aggregation (Eq. 2).
- **Blockchain Integration:** Web3j (native Java library for Ethereum EVM smart contract interaction and event listening).
- **Off-Chain Storage:** MongoDB (NoSQL persistence for high-volume raw sensor metadata and audit trails).

## 4. Business & Presentation Layer
- **Frontend / Dashboard:** React / Web UI (visualizing product carbon journeys, facility compliance alerts, and audit records).