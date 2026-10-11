
### **1. Overview of the New Thesis**
In cloud environments, traditional Identity and Access Management (IAM) systems verify credentials (passwords, OTPs, or MFA tokens) at the moment of entry. However, if an attacker steals valid credentials via phishing, credential dumps, or session hijacking, traditional IAM lets them in without question. 

Your thesis builds an **AI-driven behavioural monitoring system** that continuously evaluates *how*, *when*, *where*, and *from what device* a login occurs.

---

### **2. What the Base Paper Lacks (The Gaps & Limitations)**

Primary base paper is **Garabato et al. (2022)** (*"AI-based user authentication reinforcement by continuous extraction of behavioral interaction features"*, published in *Neural Computing and Applications*). 

While Garabato et al. established strong early concepts for continuous authentication, their model has several major limitations in an enterprise cloud environment:

1. **Restricted to Local Mouse Dynamics:**
   * **Base Paper Limitation:** Garabato et al. rely almost exclusively on low-level pointer dynamics (mouse speed, acceleration, angles, and scroll clicks) collected from desktop screens. 
   * **The Gap:** Mouse movements do not exist when users log in from mobile devices, tablets, touchscreens, API tokens, or serverless cloud consoles.
2. **Missing Network & Geographical Context:**
   * **Base Paper Limitation:** The base paper ignores critical contextual signals surrounding cloud logins.
   * **The Gap:** It does not evaluate time deviations, impossible travel velocity (e.g., logging in from London 10 minutes after New York), IP address novelty, or browser/OS drift.
3. **Rigid Binary Decisions (Allow/Block):**
   * **Base Paper Limitation:** Garabato et al. use a sliding window threshold that outputs a strict binary decision—either "legitimate" or "impostor".
   * **The Gap:** A rigid binary trigger causes user frustration (false positives block legitimate users) or security vulnerabilities (false negatives let attackers slip through).
4. **"Black-Box" ML Models (No Interpretability):**
   * **Base Paper Limitation:** The base paper trains neural networks (MLP, CNN, LSTM) and SVMs, but provides **no explanation** for why a session was flagged.
   * **The Gap:** Security Operations Center (SOC) analysts cannot inspect why a user was rejected, reducing institutional trust in the AI.

---

### **3. What Problems Our Project Resolves**

Your thesis solves these exact limitations through a **4-tier cloud security framework**:

1. **Multi-Attribute Feature Engineering:**
   * **Solution:** Instead of relying only on mouse movements, our framework extracts 11 cloud contextual features: time deviation (\\(\Delta T\\)), impossible travel velocity, geolocation distance, new IP novelty, new device indicators, OS/browser change, and recent failed attempt accumulators.
2. **Comparative Machine Learning Evaluation:**
   * **Solution:** Evaluates a suite of classifiers (Logistic Regression, Decision Trees, Random Forests, SVM, XGBoost, and Isolation Forests) to select the best model for tabular cloud logs. (In draft tests, **XGBoost achieved 97.10% accuracy**).
3. **Dynamic Risk-Scoring Engine (0–1 Score):**
   * **Solution:** Replaces binary blocking with a continuous risk score categorized into four actionable tiers:
     * **Low Risk (\\(R < 25\\)):** Seamless access granted.
     * **Moderate Risk (\\(25 \le R < 50\\)):** Increased logging & monitoring.
     * **High Risk (\\(50 \le R < 75\\)):** Triggers step-up Multi-Factor Authentication (MFA).
     * **Very High Risk (\\(R \ge 75\\)):** Blocks session & alerts SOC analysts.
4. **Explainable AI via SHAP (XAI):**
   * **Solution:** Incorporates SHAP (Shapley Additive exPlanations) to break down exact feature contributions. For example, a SOC analyst can see: *"+0.21 risk from 6 failed attempts, +0.17 from New Device, +0.15 from Location Deviation"*.

---

### **Summary Comparison Table for Your Defense**

| Feature / Dimension | Base Paper: Garabato et al. (2022) | Your M.Tech Thesis Project |
| :--- | :--- | :--- |
| **Primary Data Source** | Mouse pointer dynamics (speed, acceleration, angles) | Cloud identity logs & network telemetry |
| **Contextual Signals** | None (focused on physical screen interaction) | Time deviation, IP novelty, location drift, failed attempts |
| **Device Flexibility** | Desktop pointing devices only | Mobile, desktop, API, and cloud web consoles |
| **Decision Output** | Binary (Allow / Block via sliding window) | Normalized Risk Score (Low, Moderate, High, Very High) |
| **Explainability (XAI)** | None ("Black-box" predictions) | **SHAP explanations** showing exact feature contributions |
| **Security Response** | Hard re-authentication trigger | Adaptive risk policies (MFA step-up, logging, account lock) |

---