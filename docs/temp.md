## AI-BASED DETECTION OF SUSPICIOUS LOGIN BEHAVIOUR IN CLOUD SYSTEMS

### **ABSTRACT**

Cloud computing environments provide flexible, on-demand access to critical data and services across distributed network perimeters [2, 3]. However, modern cloud identity and access management (IAM) systems suffer from a fundamental security vulnerability: traditional authentication mechanisms evaluate valid credentials (usernames, passwords, multi-factor tokens) at the entry gate, but fail to continuously evaluate whether user behaviour *after* or *during* authentication aligns with legitimate historical patterns [1, 2]. Consequently, credential theft via phishing, password reuse, session hijacking, or brute-force compromise allows unauthorized actors to bypass perimeter defenses while maintaining the appearance of legitimate access [2, 4].

To resolve this limitation, this M.Tech research proposes a comprehensive **AI-Based Behavioural Authentication and Risk-Scoring Framework for Cloud Systems**. Building upon the foundational principles of continuous behavioural profiling and non-intrusive second-level verification established by **Garabato et al. (2022)** [1], this project extends behavioural monitoring from local pointer dynamics to enterprise cloud login telemetry [1, 2]. The proposed system ingests high-velocity authentication logs containing temporal, spatial, network, device, and behavioral attributes [2]. Raw telemetry is transformed through a robust feature engineering pipeline that extracts time deviations, IP novelty, geolocation drift, device/browser/OS shifts, and login frequency metrics [2]. 

Multiple machine learning models—including **Logistic Regression, Decision Trees, Random Forests, Support Vector Machines (SVM), XGBoost**, and **Isolation Forests**—are systematically evaluated for binary classification [2]. To overcome the limitations of binary decisions in security operations, the framework introduces an **Adaptive Risk-Scoring Engine** that synthesizes ML output probabilities ($P_m$) with contextual anomaly factors to produce a continuous, normalized risk score ($R \in [0, 100]$) categorized into **Low, Moderate, High, and Very High** risk levels [2]. Furthermore, **SHapley Additive exPlanations (SHAP)** are integrated to provide explainable AI (XAI) feature-attribution graphs for security analysts [2]. Finally, an automated security policy engine executes differentiated responses ranging from step-up MFA to immediate session termination [2].

---

### **TABLE OF CONTENTS**

1. **Chapter 1: Introduction & Background**
   * 1.1 Cloud Security Landscape & Perimeter Deficits
   * 1.2 Limitations of Credential-Only Authentication
   * 1.3 Role of Artificial Intelligence & Behavioural Biometrics
   * 1.4 Research Problem Statement
   * 1.5 Research Objectives & Guiding Questions
   * 1.6 Research Scope & Delimitations
2. **Chapter 2: Literature Review & Research Gap Analysis**
   * 2.1 Overview of Base Paper: Garabato et al. (2022)
   * 2.2 Survey of Cloud Authentication & Anomaly Detection
   * 2.3 Comparative Matrix of Existing ML Authentication Approaches
   * 2.4 Detailed Research Gap Identification
   * 2.5 Proposed Technical Position & Novelty
3. **Chapter 3: Proposed Methodology & System Architecture**
   * 3.1 End-to-End System Architecture
   * 3.2 Telemetry Ingestion & Data Preprocessing
   * 3.3 Behavioural Feature Engineering
   * 3.4 Machine Learning Classification Layer
   * 3.5 Dynamic Risk-Scoring Engine
   * 3.6 Explainable AI (SHAP) Integration Layer
   * 3.7 Automated Security Response Mechanism
4. **Chapter 4: Mathematical Formulations & Algorithmic Design**
   * 4.1 Feature Transformation & Normalization Equations
   * 4.2 Machine Learning Formulations (XGBoost, SVM, Isolation Forest)
   * 4.3 Multi-Factor Risk Score Equation
   * 4.4 SHAP Value Calculation Model
5. **Chapter 5: Experimental Setup, Performance Evaluation & Work Plan**
   * 5.1 Dataset Specifications & Distribution
   * 5.2 Evaluation Metrics (Precision, Recall, F1, ROC-AUC, Cost Matrix)
   * 5.3 Hardware & Software Environment
6. **References & Bibliography**

---

### **CHAPTER 1: INTRODUCTION & BACKGROUND**

#### **1.1 Cloud Security Landscape & Perimeter Deficits**
Cloud computing platforms (IaaS, PaaS, SaaS) have transformed corporate IT infrastructure by enabling flexible, remote access to organizational resources [2, 3]. However, moving the security perimeter from well-defined physical networks to distributed cloud identity providers (IdPs) dramatically expands the threat surface [2]. In a cloud environment, logins originate from diverse geographic locations, dynamic IP addresses, personal mobile devices, and heterogeneous operating systems [2].

#### **1.2 Limitations of Credential-Only Authentication**
Conventional Identity and Access Management (IAM) systems operate on static, single-point verification [1, 2]. Once a user submits valid primary credentials (e.g., username, password, or an initial OTP), the IAM system grants unrestricted session access [2]. This creates a critical security blind spot:
* **Credential Compromise:** Adversaries acquiring valid credentials via phishing, credential stuffing, or dark-web leaks can authenticate without triggering traditional alarms [2].
* **Session Hijacking:** Legitimate active sessions can be hijacked after initial authentication, leaving the system completely unaware of the imposter [1, 2].
* **Lack of Contextual Awareness:** Standard login portals evaluate *what the user knows* (password) rather than *how, when, and where the user operates* [1, 2].

#### **1.3 Role of Artificial Intelligence & Behavioural Biometrics**
Artificial Intelligence (AI) and Machine Learning (ML) enable continuous, context-aware authentication by learning the historical behavioral baseline of each legitimate user [1, 2]. By evaluating contextual metadata (login timing, device fingerprint, geographic velocity, network reputation) alongside behavioral biometrics, ML classifiers can estimate the probability ($P_m$) that a login event represents an anomaly or hijacked session [1, 2].

#### **1.4 Research Problem Statement**
The central research problem addressed in this thesis is:  
> *"How can cloud authentication infrastructure continuously detect, quantify, and explain suspicious login behaviour in real-time by synthesizing heterogeneous contextual telemetry, machine learning models, dynamic risk scoring, and explainable AI?"* [1, 2]

#### **1.5 Research Objectives & Guiding Questions**
To address the research problem, this project defines six specific objectives:
1. **Objective 1:** Design a multi-attribute behavioural feature engineering pipeline that extracts temporal deviations, spatial velocity, device novelty, and network reputation from raw cloud authentication logs [2].
2. **Objective 2:** Implement and conduct comparative benchmark evaluations across supervised (Logistic Regression, Decision Trees, Random Forests, SVM, XGBoost) and unsupervised (Isolation Forest) machine learning algorithms [2].
3. **Objective 3:** Construct a dynamic, multi-factor **Risk-Scoring Engine** that translates classification probabilities into a normalized risk score ($R \in [0, 100]$) tied to operational risk categories (Low, Moderate, High, Very High) [2].
4. **Objective 4:** Integrate **Explainable AI (SHAP)** to generate human-interpretable feature attribution charts for Security Operations Center (SOC) analysts [2].
5. **Objective 5:** Develop an automated security response matrix that triggers proportional countermeasures (e.g., step-up MFA, session restriction, account lock) based on risk thresholds [2].
6. **Objective 6:** Resolve the "Oracle Problem" and static evaluation limitations identified in the primary base paper (**Garabato et al., 2022**) by extending continuous authentication from local pointer dynamics to enterprise cloud identity telemetry [1, 2].

---

### **CHAPTER 2: LITERATURE REVIEW & RESEARCH GAP ANALYSIS**

#### **2.1 Overview of Base Paper: Garabato et al. (2022)**
The primary foundation for this thesis is the benchmark research conducted by **Garabato et al. (2022)**, published in *Neural Computing and Applications* [1]. Garabato et al. addressed second-level continuous authentication by capturing non-intrusive pointer/mouse dynamics (velocity, tangential acceleration, jerk, curvature, distance from origin) [1]. 

* **Methodology of Base Paper:** The authors segmented raw mouse events into time-based (1s, 2s, 5s) and size-based (100, 200, 500 events) chunks [1]. They extracted 31 custom features and trained Support Vector Machines (SVM), Multi-Layer Perceptrons (MLP), and Deep Learning architectures (CNN, LSTM) [1]. To perform real-time continuous authentication, they proposed a **Weighted Sliding Window** algorithm that averaged predictions across consecutive chunks, triggering alerts when an imposter hijacked a legitimate session [1].
* **Key Findings of Base Paper:** Deep Learning and MLP models achieved high accuracy (ROC-AUC $> 0.95$) and successfully detected session takeover within 20–50 chunks [1].

#### **2.2 Survey of Cloud Authentication & Anomaly Detection Literature**

| Research Focus | Key Authors / Standards | Core Contributions | Identified Limitations |
| :--- | :--- | :--- | :--- |
| **Mouse/Pointer Biometrics** | Garabato et al. (2022) [1] | Continuous 2nd-level authentication using mouse dynamics, CNN/LSTM, and sliding windows | Limited to desktop mouse movement; lacks cloud contextual attributes (IP, Geolocation, Device ID); binary output without risk scoring [1]. |
| **Cloud Intrusion Detection** | Procedia Computer Science (2023) [3] | Attack profiling and threat prevention in cloud environments | Focuses on network packet inspection rather than user-level login behavioral context [2, 3]. |
| **ML Cloud Security** | IJCAC (2026) [4] | Hybrid ML and IDS integration for cloud application safety | Lacks post-authentication explainability (XAI) and adaptive risk-proportionate responses [2, 4]. |
| **Explainable AI in Security** | Lundberg & Lee (2017) [5] | Framework for SHAP value computation in complex tabular models | General ML interpretability framework; not integrated into automated cloud login response pipelines [2, 5]. |

#### **2.3 Comparative Analysis: Base Paper vs. Proposed Thesis**

```
+-----------------------------------------------------------------------------------+
|                        COMPARATIVE ARCHITECTURAL POSITION                         |
+-----------------------------------------------------------------------------------+
| Metric / Feature      | Base Paper: Garabato et al. (2022) | Proposed M.Tech Thesis     |
+-----------------------+------------------------------------+------------------------------+
| Application Domain    | Local Desktop / Pointer Dynamics   | Enterprise Cloud Systems     |
| Data Telemetry        | Mouse Coordinates (x, y, t)        | Contextual Login Telemetry   |
| Feature Space         | Kinematic Features (Jerk, Velocity)| Spatial, Temporal, Device ID |
| Classification Scope  | Binary (User vs. Imposter)         | Supervised + Unsupervised ML |
| Severity Output       | Hard Threshold Cutoff (0.5)        | Dynamic Risk Score (0-100)   |
| Interpretability      | None (Black-box Neural Net)        | SHAP Feature Attribution     |
| Security Countermeasure| Generic Re-authentication Prompt  | Tiered Automated Policy Engine|
+-----------------------------------------------------------------------------------+
```

#### **2.4 Detailed Research Gap Identification**
Synthesizing the literature [1–5] reveals three major research gaps:
1. **The Contextual Telemetry Gap:** Existing continuous authentication models (such as Garabato et al. [1]) focus heavily on single-modality biometrics (like keystrokes or mouse dynamics). They fail to incorporate multi-attribute cloud telemetry such as IP subnet changes, impossible travel velocity, and browser/OS switching [1, 2].
2. **The Binary Decision Limitation:** Most anomaly detection systems output a rigid binary classification (Normal vs. Suspicious) [1, 2]. In enterprise cloud operations, binary outputs cause alert fatigue (high false positives) or catastrophic misses [2]. A continuous **Risk Score** is required to drive proportional responses [2].
3. **The Black-Box & Interpretability Gap:** Security Operations Center (SOC) teams reject automated AI blocks if the model cannot explain *why* a login was flagged [2, 5]. Existing cloud authentication research lacks integration with Explainable AI (SHAP) [2].

#### **2.5 Proposed Technical Position & Novelty**
This thesis resolves these gaps by establishing an integrated, multi-stage pipeline [2]:
$$\text{Raw Telemetry} \longrightarrow \text{Feature Engineering} \longrightarrow \text{ML Ensemble} \longrightarrow \text{Risk Engine} \longrightarrow \text{SHAP XAI} \longrightarrow \text{Automated Response}$$

---

### **CHAPTER 3: PROPOSED METHODOLOGY & SYSTEM ARCHITECTURE**

#### **3.1 End-to-End System Architecture**
The proposed system architecture consists of five interconnected modules:

```
[ Cloud Identity Provider / API Gateway ]
                   │
                   ▼
  +---------------------------------+
  | 1. DATA INGESTION & PREPROCESS  |
  |    - Pseudonymization (User ID) |
  |    - Missing Value Handling     |
  |    - Categorical One-Hot / Label|
  +---------------------------------+
                   │
                   ▼
  +---------------------------------+
  | 2. BEHAVIOURAL FEATURE ENGINE   |
  |    - Time & Location Deviation  |
  |    - IP Novelty & Device Drift  |
  |    - Failed Attempt Accumulator |
  +---------------------------------+
                   │
                   ▼
  +---------------------------------+
  | 3. ML CLASSIFICATION LAYER      |
  |    - XGBoost / Random Forest    |
  |    - SVM / Logistic Regression  |
  |    - Isolation Forest Baseline  |
  +---------------------------------+
                   │
                   ▼
  +---------------------------------+
  | 4. DYNAMIC RISK-SCORING ENGINE  |
  |    - Weighted Risk Formula (R)  |
  |    - Tiering: Low, Med, Hi, V.Hi|
  +---------------------------------+
         │                   │
         ▼                   ▼
+-----------------+ +-------------------+
| 5. SHAP EXPLAIN | | 6. POLICY ENGINE  |
|    - Local XAI  | |    - Step-up MFA  |
|    - Feature    | |    - Session Kill |
|      Waterfall  | |    - Account Lock |
+-----------------+ +-------------------+
```

#### **3.2 Telemetry Ingestion & Data Preprocessing**
Each cloud login event $E_i$ captures the following fields [2]:
$$E_i = \{\text{user\_id}, \text{timestamp}, \text{ip\_address}, \text{location}, \text{device\_id}, \text{browser}, \text{os}, \text{failed\_attempts}, \text{session\_duration}\}$$
* **Pseudonymization:** User identifiers are hashed using SHA-256 for privacy compliance [2].
* **Normalization:** Numerical values ($\text{failed\_attempts}$, $\text{session\_duration}$) are scaled using Min-Max or Z-score normalization [2].
* **Categorical Encoding:** Categorical attributes ($\text{browser}, \text{os}$) are encoded via One-Hot or Target Encoding [2].

#### **3.3 Behavioural Feature Engineering**
The system computes six primary contextual risk indicators for each login event [2]:
1. **Time Deviation ($\Delta T$):** Absolute difference in minutes between the current login time and the user's historical median login time [2].
2. **Location Deviation ($\Delta L$):** Geodesic distance (in km) calculated via the Haversine formula between the current IP location and the previous login location [2].
3. **Impossible Travel Velocity ($V_{travel}$):** Geodesic distance divided by time elapsed since last login ($\text{km/h}$). Velocities exceeding commercial air travel ($>900\text{ km/h}$) indicate credential sharing or proxy usage [2].
4. **IP Address Novelty ($N_{IP}$):** Binary flag ($1$ if the IP/subnet has never been used by the user in the last 90 days; $0$ otherwise) [2].
5. **Device / OS / Browser Drift ($N_{dev}$):** Binary flag ($1$ if new device fingerprint or operating system combination detected) [2].
6. **Failed Attempt Accumulator ($F_{count}$):** Integer count of consecutive failed authentication attempts preceding the current successful entry [2].

#### **3.4 Machine Learning Classification Layer**
The engineered feature vector $\mathbf{x}_i$ is passed to an ensemble of supervised models (XGBoost, Random Forest, SVM) and an unsupervised baseline (Isolation Forest) [2]. The models output a continuous anomaly probability $P_m \in [0, 1]$ [2].

#### **3.5 Dynamic Risk-Scoring Engine**
Rather than relying solely on $P_m$, the Risk Engine computes a holistic Risk Score $R \in [0, 100]$ using a multi-factor weighted sum [2]:
$$R = 100 \times \left( w_1 \cdot P_m + w_2 \cdot \text{Risk}_{device} + w_3 \cdot \text{Risk}_{location} + w_4 \cdot \text{Risk}_{failure} + w_5 \cdot \text{Risk}_{time} \right)$$
where $\sum_{k=1}^5 w_k = 1.0$.

```
+-----------------------------------------------------------------------------------+
|                          RISK CATEGORIZATION & RESPONSE                           |
+-----------------------------------------------------------------------------------+
| Risk Category   | Risk Score Range (R) | Security Countermeasure Action           |
+-----------------+----------------------+------------------------------------------+
| Low Risk        | 0 <= R < 25          | Grant Access; Log Audit Event            |
| Moderate Risk   | 25 <= R < 50         | Prompt Step-up MFA (FIDO2 / TOTP)        |
| High Risk       | 50 <= R < 75         | Restrict Sensitive Access + Alert Admin   |
| Very High Risk  | 75 <= R <= 100       | Terminate Session + Temporary Lockout    |
+-----------------------------------------------------------------------------------+
```

#### **3.6 Explainable AI (SHAP) Integration Layer**
When a login event triggers a Moderate, High, or Very High risk alert, the system generates SHAP waterfall plots [2, 5]. SHAP calculates the exact marginal contribution $\phi_j$ of each feature $j$ to the prediction outcome, allowing security analysts to inspect *why* a login was flagged (e.g., "+35% risk due to impossible travel velocity of 1200 km/h") [2, 5].

### **CHAPTER 5: EXPERIMENTAL SETUP, EVALUATION & WORK PLAN**

#### **5.1 Dataset Specifications & Distribution**
The experimental evaluation utilizes a benchmark dataset of 20,000 cloud authentication logs.

```
+-----------------------------------------------------------------------------------+
|                              DATASET DISTRIBUTION                                 |
+-----------------------------------------------------------------------------------+
| Category               | Record Count            | Percentage (%)                 |
+------------------------+-------------------------+--------------------------------+
| Normal Logins (Class 0)| 16,000                  | 80.00%                         |
| Suspicious (Class 1)   | 4,000                   | 20.00%                         |
| Total Benchmark Size   | 20,000                  | 100.00%                        |
+-----------------------------------------------------------------------------------+
```

#### **5.2 Evaluation Metrics**
The framework will be evaluated across standard classification and operational metrics:
* **Accuracy:** $\frac{TP + TN}{TP + TN + FP + FN}$ [2]
* **Precision:** $\frac{TP}{TP + FP}$ [2]
* **Recall (Sensitivity):** $\frac{TP}{TP + FN}$ [2]
* **F1-Score:** $2 \cdot \frac{\text{Precision} \cdot \text{Recall}}{\text{Precision} + \text{Recall}}$
* **ROC-AUC:** Area under the Receiver Operating Characteristic curve [2].
* **False Positive Rate (FPR):** Critical operational metric to minimize user friction ($\frac{FP}{FP + TN}$).

#### **5.3 Hardware & Software Environment**
* **Programming Language:** Python 3.12 [2]
* **Libraries:** `scikit-learn`, `xgboost`, `pandas`, `numpy`, `shap`, `matplotlib` 
* **Compute Infrastructure:** 8-core CPU, 16 GB RAM, air-gapped evaluation environment .

---

### **CHAPTER 6: REFERENCES & BIBLIOGRAPHY**

1. **Garabato, D., Dafonte, C., Santoveña, R., Silvelo, A., Nóvoa, F. J., & Manteiga, M. (2022).** Behavioral features for second-level continuous authentication using machine learning. *Neural Computing and Applications*, 34(14), 11691–11705. https://doi.org/10.1007/s00521-022-07061-3
2. **Department of Computer Science and Engineering. (2026).** *A Thesis Synopsis on AI-Based Detection of Suspicious Login Behaviour in Cloud Systems*. Master of Technology (M.Tech) Thesis Report, M.Tech Session 2026–2027.
3. **Procedia Computer Science. (2023).** A Literature Review on Attacks Prevention and Profiling in Cloud Computing. *Procedia Computer Science*, 220, 970–977.
4. **International Journal of Cloud Applications and Computing. (2026).** Integrating Machine Learning and Intrusion Detection for Improved Cloud Security. *IJCAC*, 16(1), 1–18.
5. **Lundberg, S. M., & Lee, S.-I. (2017).** A unified approach to interpreting model predictions. *Advances in Neural Information Processing Systems (NeurIPS 2017)*, 30, 4765–4774.
6. **National Institute of Standards and Technology (NIST). (2020).** *Digital Identity Guidelines: Authentication and Lifecycle Management*. NIST Special Publication 800-63B.
7. **Barkadehi, M. H., et al. (2018).** Authentication systems: A literature review and classification. *Telematics and Informatics*, 35(5), 1491–1511.
8. **Guyon, I., et al. (2002).** Gene selection for cancer classification using support vector machines. *Machine Learning*, 46(1–3), 389–422.
9. **Chen, T., & Guestrin, C. (2016).** XGBoost: A scalable tree boosting system. *Proceedings of the 22nd ACM SIGKDD International Conference on Knowledge Discovery and Data Mining*, 785–774.
10. **Liu, F. T., Ting, K. M., & Zhou, Z. H. (2008).** Isolation forest. *2008 Eighth IEEE International Conference on Data Mining*, 413–422. IEEE.