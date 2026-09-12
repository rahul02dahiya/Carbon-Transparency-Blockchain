/**
 * IoT Sensor Node Simulator
 * Paper: "Blockchain IoT Integration for Automated Carbon Credit Trading and Environmental Monitoring"
 * Reference: IJFMR, Vol 7, Issue 5, 2025 (Singh et al., Section 3.1.1, 4.1 & 5.5)
 * 
 * Hardware Profile (Table 1):
 * - Microcontroller: ARM Cortex-M4, 32-bit, 80 MHz
 * - CO2 Sensor: NDIR, 0-5000 ppm, ±2 ppm accuracy
 * - Temperature Sensor: Digital, -40°C to +85°C, ±0.5°C
 * - Humidity Sensor: Capacitive, 0-100% RH, ±2%
 * - GPS Module: u-blox M8, 2.5m accuracy
 * - Communication: LoRaWAN Class A, 915 MHz
 * - Power: Solar + Li-ion battery, 5000 mAh
 */

import { ethers } from "ethers";

// Box-Muller transform to generate Gaussian distributed sensor noise
function randomGaussian(mean = 0, stdDev = 1) {
  let u1 = Math.random();
  let u2 = Math.random();
  while (u1 === 0) u1 = Math.random();
  let z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * stdDev + mean;
}

export class SensorNode {
  /**
   * @param {number} id Unique identifier for the sensor node (1 to 50)
   * @param {number} latitude Latitude in degrees (e.g. 24.8170 + offset)
   * @param {number} longitude Longitude in degrees (e.g. 93.9368 + offset)
   * @param {ethers.Wallet} wallet Cryptographic wallet representing the onboard Secure Element (HSM)
   */
  constructor(id, latitude, longitude, wallet = ethers.Wallet.createRandom()) {
    this.id = id;
    this.latitude = latitude;
    this.longitude = longitude;
    this.wallet = wallet;
    this.address = wallet.address;

    // Previous reading for delta check (Eq. 1)
    this.prevCo2 = null;

    // Reliability score w_i (Section 3.1.2, Eq. 2), default 1.0
    this.reliabilityScore = 1.0;
    this.totalReadings = 0;
    this.validReadings = 0;

    // Power consumption parameters (Section 5.5, Eq. 7)
    // Psensing = 45 mW, Pcommunication = 120 mW, Psleep = 0.5 mW
    this.powerProfile = {
      pSensing: 45.0,        // mW
      tActive: 2.0 / 60.0,   // 2 minutes per hour in hours (0.0333 h)
      pComm: 120.0,          // mW
      tComm: 0.5 / 60.0,     // 30 seconds per hour in hours (0.00833 h)
      pSleep: 0.5,           // mW
      tSleep: 57.5 / 60.0    // 57.5 minutes per hour in hours (0.95833 h)
    };
  }

  /**
   * Calculate hourly average energy consumption (Section 5.5, Eq. 7)
   * E_consumption = Psensing * Tactive + Pcommunication * Tcomm + Psleep * Tsleep
   * Expected: 2.0 mW
   */
  calculateAveragePowerConsumption() {
    const { pSensing, tActive, pComm, tComm, pSleep, tSleep } = this.powerProfile;
    return (pSensing * tActive) + (pComm * tComm) + (pSleep * tSleep);
  }

  /**
   * Sample environment with physical noise (NDIR ±2 ppm, Temp ±0.5°C, Humidity ±2%)
   * @param {number} trueCo2 Ground truth CO2 in ppm
   * @param {number} trueTemp Ground truth Temperature in °C
   * @param {number} trueHumidity Ground truth Humidity in %
   */
  sample(trueCo2, trueTemp, trueHumidity) {
    this.totalReadings++;

    // Add physical sensor noise
    const co2Noise = randomGaussian(0, 2.0);      // NDIR ±2 ppm accuracy (Table 1)
    const tempNoise = randomGaussian(0, 0.5);     // DHT22 ±0.5°C (Table 1)
    const humNoise = randomGaussian(0, 2.0);      // Capacitive ±2% (Table 1)

    const measuredCo2 = Math.max(0, Math.min(5000, trueCo2 + co2Noise));
    const measuredTemp = Math.max(-40, Math.min(85, trueTemp + tempNoise));
    const measuredHumidity = Math.max(0, Math.min(100, trueHumidity + humNoise));

    // Local edge validation algorithm (Section 3.1.1, Eq. 1):
    // Reading is valid if |CO2 - CO2_prev| <= Delta_max and T in [T_min, T_max] and H in [H_min, H_max]
    const deltaMax = 500.0; // ppm/min max allowable surge under ordinary operation
    const tMin = -40.0;
    const tMax = 85.0;
    const hMin = 0.0;
    const hMax = 100.0;

    let isValid = true;
    if (this.prevCo2 !== null) {
      if (Math.abs(measuredCo2 - this.prevCo2) > deltaMax) {
        isValid = false;
      }
    }

    if (measuredTemp < tMin || measuredTemp > tMax) {
      isValid = false;
    }

    if (measuredHumidity < hMin || measuredHumidity > hMax) {
      isValid = false;
    }

    if (isValid) {
      this.validReadings++;
      this.prevCo2 = measuredCo2;
    }

    // Update dynamic reliability score w_i based on validity ratio
    this.reliabilityScore = this.validReadings / this.totalReadings;

    return {
      sensorId: this.id,
      address: this.address,
      timestamp: Math.floor(Date.now() / 1000),
      co2: Number(measuredCo2.toFixed(2)),
      temperature: Number(measuredTemp.toFixed(2)),
      humidity: Number(measuredHumidity.toFixed(2)),
      latitude: this.latitude,
      longitude: this.longitude,
      isValid: isValid,
      reliabilityScore: this.reliabilityScore
    };
  }

  /**
   * Cryptographically sign sensor payload using the node's Secure Element (HSM)
   * Prevents Man-in-the-Middle and data tampering (Table 5: 99.5% - 99.9% protection)
   * @param {object} payload Reading data packet
   */
  async signPayload(payload) {
    const message = JSON.stringify({
      sensorId: payload.sensorId,
      timestamp: payload.timestamp,
      co2: payload.co2,
      temperature: payload.temperature,
      humidity: payload.humidity,
      lat: payload.latitude,
      lon: payload.longitude
    });
    const messageHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(message));
    const signature = await this.wallet.signMessage(ethers.utils.arrayify(messageHash));
    return {
      messageHash,
      signature
    };
  }
}
