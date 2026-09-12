/**
 * Proof-of-Sensor (PoS) Consensus Engine
 * Paper: "Blockchain IoT Integration for Automated Carbon Credit Trading and Environmental Monitoring"
 * Reference: IJFMR, Vol 7, Issue 5, 2025 (Singh et al., Section 3.3, Eq. 5)
 * 
 * Mathematical Formulation:
 * Consensus_score = alpha * Accuracy + beta * Reliability + gamma * Geographic_diversity
 * Where alpha + beta + gamma = 1.0
 */

export class ProofOfSensorConsensus {
  /**
   * @param {number} alpha Weight for Accuracy metric (default 0.4)
   * @param {number} beta Weight for Reliability metric (default 0.4)
   * @param {number} gamma Weight for Geographic Diversity metric (default 0.2)
   */
  constructor(alpha = 0.4, beta = 0.4, gamma = 0.2) {
    if (Math.abs(alpha + beta + gamma - 1.0) > 0.001) {
      throw new Error("Consensus weights (alpha, beta, gamma) must sum to 1.0");
    }
    this.alpha = alpha;
    this.beta = beta;
    this.gamma = gamma;
  }

  /**
   * Calculate Geographic Diversity across the 10 km² virtual industrial facility grid.
   * Partitions the facility into 1 km² grid cells and checks the distribution ratio.
   * @param {Array<{latitude: number, longitude: number}>} activeSensors
   */
  calculateGeographicDiversity(activeSensors) {
    if (activeSensors.length === 0) return 0;

    const cellSet = new Set();
    for (const sensor of activeSensors) {
      // 0.01 degree ~ 1.1 km cell quantization
      const cellX = Math.floor(sensor.latitude * 100);
      const cellY = Math.floor(sensor.longitude * 100);
      cellSet.add(`${cellX}:${cellY}`);
    }

    // Normalized geographic coverage ratio (up to 10 unique spatial zones)
    const expectedZones = 10;
    return Math.min(1.0, cellSet.size / expectedZones);
  }

  /**
   * Calculate composite Accuracy metric for the epoch
   * @param {number} retainedCount Count of readings passing statistical boundary & Z-score checks
   * @param {number} totalCount Total readings evaluated
   */
  calculateAccuracy(retainedCount, totalCount) {
    if (totalCount === 0) return 0;
    return retainedCount / totalCount;
  }

  /**
   * Calculate composite Reliability metric based on nodes' historical uptime
   * @param {Array<{reliabilityScore: number}>} sensors
   */
  calculateReliability(sensors) {
    if (sensors.length === 0) return 0;
    const avgReliability = sensors.reduce((acc, s) => acc + s.reliabilityScore, 0) / sensors.length;
    return avgReliability;
  }

  /**
   * Calculate Proof-of-Sensor (PoS) Consensus Score (Eq. 5)
   * @param {object} processedResult Output from DataProcessor
   * @param {Array<object>} rawReadings Original array of sensor readings
   * @returns {{ consensusScore: number, scoreBasisPoints: number, accuracy: number, reliability: number, geographicDiversity: number, isConsensusReached: boolean }}
   */
  evaluateConsensus(processedResult, rawReadings) {
    const accuracy = this.calculateAccuracy(processedResult.retainedNodes, processedResult.totalNodes);
    const reliability = this.calculateReliability(rawReadings);
    const geographicDiversity = this.calculateGeographicDiversity(rawReadings);

    // Eq. 5: Consensus_score = alpha * Accuracy + beta * Reliability + gamma * Geographic_diversity
    const consensusScore = (this.alpha * accuracy) + (this.beta * reliability) + (this.gamma * geographicDiversity);

    // Represent score in integer basis points for Solidity contract (0 - 10000)
    const scoreBasisPoints = Math.round(consensusScore * 10000);

    // Threshold of 0.85 (8500 basis points) required for commitment to blockchain (Section 3.3)
    const isConsensusReached = scoreBasisPoints >= 8500;

    return {
      consensusScore: Number(consensusScore.toFixed(4)),
      scoreBasisPoints,
      accuracy: Number(accuracy.toFixed(4)),
      reliability: Number(reliability.toFixed(4)),
      geographicDiversity: Number(geographicDiversity.toFixed(4)),
      isConsensusReached
    };
  }
}
