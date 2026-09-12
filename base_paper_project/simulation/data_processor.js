/**
 * Data Processing Layer Simulator
 * Paper: "Blockchain IoT Integration for Automated Carbon Credit Trading and Environmental Monitoring"
 * Reference: IJFMR, Vol 7, Issue 5, 2025 (Singh et al., Section 3.1.2)
 * 
 * Functions:
 * 1. Anomaly Detection via Z-score method (Eq. 3):
 *    Z_i = (CO2_i - mu) / sigma
 *    Data points with |Z_i| > 2.5 are flagged for manual review / excluded.
 * 2. Weighted Data Aggregation (Eq. 2):
 *    CO2_agg = sum(w_i * CO2_i) / sum(w_i)
 *    Where w_i is the reliability weight score of sensor node i.
 */

export class DataProcessor {
  constructor(zThreshold = 2.5) {
    this.zThreshold = zThreshold;
    this.historicalWindow = []; // Sliding historical window of recent readings for baseline mu & sigma
    this.maxWindowSize = 120;   // 2 hours of rolling 1-minute historical data
  }

  /**
   * Calculate mean and standard deviation of an array of numeric values
   * @param {number[]} values
   */
  calculateMeanAndStdDev(values) {
    if (values.length === 0) return { mean: 0, stdDev: 1 };
    if (values.length === 1) return { mean: values[0], stdDev: 1 };

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1);
    const stdDev = Math.sqrt(variance);

    return { mean, stdDev: stdDev === 0 ? 1 : stdDev };
  }

  /**
   * Process a batch of sensor readings from the distributed network for a single epoch.
   * Performs Z-score outlier pruning (Eq. 3) followed by weighted averaging (Eq. 2).
   * 
   * @param {Array<{sensorId: number, co2: number, temperature: number, humidity: number, reliabilityScore: number, isValid: boolean}>} readings
   */
  processEpoch(readings) {
    // 1. Filter out physically invalid readings caught by Eq. 1 edge checks
    const physicallyValid = readings.filter(r => r.isValid);

    // 2. Compute reference mu and sigma for the current epoch distribution + historical buffer
    const allRecentCo2 = [...this.historicalWindow, ...physicallyValid.map(r => r.co2)];
    const { mean, stdDev } = this.calculateMeanAndStdDev(allRecentCo2);

    const normalReadings = [];
    const flaggedAnomalies = [];

    // 3. Statistical Anomaly Detection using Z-Score (Section 3.1.2, Eq. 3)
    for (const reading of physicallyValid) {
      const zScore = (reading.co2 - mean) / stdDev;
      const readingWithZ = { ...reading, zScore: Number(zScore.toFixed(3)) };

      if (Math.abs(zScore) > this.zThreshold) {
        // Flagged for manual review (Eq. 3: |Z_i| > 2.5)
        flaggedAnomalies.push(readingWithZ);
      } else {
        normalReadings.push(readingWithZ);
      }
    }

    // Update historical sliding window with validated readings
    for (const r of normalReadings) {
      this.historicalWindow.push(r.co2);
    }
    if (this.historicalWindow.length > this.maxWindowSize) {
      this.historicalWindow = this.historicalWindow.slice(-this.maxWindowSize);
    }

    // 4. Weighted Data Aggregation (Section 3.1.2, Eq. 2)
    // CO2_agg = sum(w_i * CO2_i) / sum(w_i)
    let sumWeightedCo2 = 0;
    let sumWeights = 0;
    let sumWeightedTemp = 0;
    let sumWeightedHumidity = 0;

    const aggregationCandidates = normalReadings.length > 0 ? normalReadings : physicallyValid;

    for (const r of aggregationCandidates) {
      const weight = Math.max(0.1, r.reliabilityScore); // minimum baseline weight
      sumWeightedCo2 += weight * r.co2;
      sumWeightedTemp += weight * r.temperature;
      sumWeightedHumidity += weight * r.humidity;
      sumWeights += weight;
    }

    const co2Agg = sumWeights > 0 ? sumWeightedCo2 / sumWeights : 0;
    const tempAgg = sumWeights > 0 ? sumWeightedTemp / sumWeights : 0;
    const humAgg = sumWeights > 0 ? sumWeightedHumidity / sumWeights : 0;

    return {
      co2Agg: Number(co2Agg.toFixed(2)),
      tempAgg: Number(tempAgg.toFixed(2)),
      humAgg: Number(humAgg.toFixed(2)),
      totalNodes: readings.length,
      validNodes: physicallyValid.length,
      retainedNodes: normalReadings.length,
      anomaliesCount: flaggedAnomalies.length,
      flaggedAnomalies,
      mean: Number(mean.toFixed(2)),
      stdDev: Number(stdDev.toFixed(2))
    };
  }
}
