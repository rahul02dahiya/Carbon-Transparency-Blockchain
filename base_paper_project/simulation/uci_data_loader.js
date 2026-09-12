/**
 * UCI Air Quality Dataset Loader & Preprocessor
 * Reads AirQualityUCI.csv, cleans European commas, removes -200 error flags,
 * and formats sensor readings for the pipeline.
 */

import fs from "fs";
import path from "path";

export function loadAndCleanUciData(csvPath = "./AirQualityUCI.csv", limit = 0) {
  const fullPath = path.resolve(csvPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`CSV file not found at: ${fullPath}`);
  }

  const raw = fs.readFileSync(fullPath, "utf8");
  const lines = raw.split(/\r?\n/);

  const cleanedRecords = [];
  let droppedCorruptedRows = 0;

  // Header line: Date;Time;CO(GT);PT08.S1(CO);NMHC(GT);C6H6(GT);PT08.S2(NMHC);NOx(GT);PT08.S3(NOx);NO2(GT);PT08.S4(NO2);PT08.S5(O3);T;RH;AH;;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith(";;;;")) continue;

    const cols = line.split(";");
    if (cols.length < 15) continue;

    const dateStr = cols[0].trim();
    const timeStr = cols[1].trim();
    if (!dateStr || !timeStr) continue;

    // Helper to parse European formatted floats ("13,6" -> 13.6)
    const parseNum = (val) => {
      if (!val) return -200;
      const normalized = val.trim().replace(",", ".");
      const parsed = parseFloat(normalized);
      return isNaN(parsed) ? -200 : parsed;
    };

    const coGt = parseNum(cols[2]);      // True CO in mg/m3
    const coSensor = parseNum(cols[3]);  // PT08.S1 sensor response
    const nmhc = parseNum(cols[4]);      // NMHC
    const benzene = parseNum(cols[5]);   // C6H6
    const nox = parseNum(cols[7]);       // NOx in ppb
    const no2 = parseNum(cols[9]);       // NO2 in microg/m3
    const temp = parseNum(cols[12]);     // Temperature in C
    const rh = parseNum(cols[13]);       // Relative Humidity %
    const ah = parseNum(cols[14]);       // Absolute Humidity

    // Real-world noise cleaning:
    // UCI dataset uses -200 for broken sensor readings or dropped packets.
    // We apply Equation 1 boundary checks:
    // T must be between -40C and 85C, RH between 0% and 100%, CO > 0
    if (coGt === -200 || temp === -200 || rh === -200 || temp < -40 || temp > 85 || rh < 0 || rh > 100) {
      droppedCorruptedRows++;
      continue;
    }

    // Convert date "DD/MM/YYYY" and time "HH.MM.SS" to Unix timestamp
    const [d, m, y] = dateStr.split("/").map(Number);
    const [hh, mm, ss] = timeStr.split(".").map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d, hh, mm, ss || 0));
    const timestamp = Math.floor(dateObj.getTime() / 1000);

    cleanedRecords.push({
      date: dateStr,
      time: timeStr,
      timestamp,
      co: coGt > 0 ? coGt : Number((coSensor / 500).toFixed(2)), // fallback to sensor ratio if GT is missing
      coSensorRaw: coSensor,
      nox: nox > 0 ? nox : 0,
      no2: no2 > 0 ? no2 : 0,
      benzene: benzene > 0 ? benzene : 0,
      temperature: temp,
      humidity: rh,
      isValid: true
    });

    if (limit > 0 && cleanedRecords.length >= limit) {
      break;
    }
  }

  return {
    records: cleanedRecords,
    totalRowsProcessed: lines.length - 1,
    validRecordsCount: cleanedRecords.length,
    droppedCorruptedRows
  };
}
