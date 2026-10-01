const Alert = require("../models/Alert");

/**
 * Species-aware "normal range" reference values. These are simplified,
 * commonly cited veterinary reference ranges intended for demonstration —
 * a production deployment should source these from a licensed veterinary
 * database and let vets tune them per-animal.
 */
const REFERENCE_RANGES = {
  Cattle: { temp: [38.0, 39.3], hr: [48, 84] },
  Buffalo: { temp: [37.5, 39.0], hr: [45, 80] },
  Goat: { temp: [38.5, 40.5], hr: [70, 95] },
  Sheep: { temp: [38.5, 40.0], hr: [70, 90] },
  Poultry: { temp: [40.6, 43.0], hr: [250, 400] },
  Other: { temp: [37.5, 40.0], hr: [50, 120] },
};

function getRange(species) {
  return REFERENCE_RANGES[species] || REFERENCE_RANGES.Other;
}

/**
 * Evaluate a single sensor reading against reference ranges and raise
 * alerts (deduplicated within a 60 minute window per type) when out of range.
 * Returns the list of newly created alerts (may be empty).
 */
async function evaluateReading(animal, reading) {
  const { temp, hr } = getRange(animal.species);
  const created = [];

  const maybeCreate = async (type, severity, message) => {
    const existing = await Promise.resolve(Alert.recentUnresolvedOfType(animal.id, type, 60));
    if (existing) return;
    created.push(await Promise.resolve(Alert.create({ animalId: animal.id, type, severity, message })));
  };

  if (reading.temperature_c >= temp[1] + 1.5) {
    await maybeCreate(
      "fever",
      "critical",
      `${animal.name}'s temperature is ${reading.temperature_c.toFixed(1)}°C — well above the normal range (${temp[0]}–${temp[1]}°C). Possible infection or heat stress.`
    );
  } else if (reading.temperature_c >= temp[1]) {
    await maybeCreate(
      "fever",
      "medium",
      `${animal.name}'s temperature is ${reading.temperature_c.toFixed(1)}°C — slightly above the normal range (${temp[0]}–${temp[1]}°C).`
    );
  } else if (reading.temperature_c <= temp[0] - 1) {
    await maybeCreate(
      "hypothermia",
      "high",
      `${animal.name}'s temperature is ${reading.temperature_c.toFixed(1)}°C — below the normal range (${temp[0]}–${temp[1]}°C).`
    );
  }

  if (reading.heart_rate_bpm >= hr[1] + 20) {
    await maybeCreate(
      "tachycardia",
      "high",
      `${animal.name}'s heart rate is ${reading.heart_rate_bpm} bpm — significantly above normal (${hr[0]}–${hr[1]} bpm). Could indicate pain, stress, or shock.`
    );
  }

  if (reading.activity_level <= 15) {
    await maybeCreate(
      "low_activity",
      "medium",
      `${animal.name} has shown very low activity (${reading.activity_level.toFixed(0)}/100). Reduced movement can be an early sign of illness or injury.`
    );
  }

  return created;
}

module.exports = { evaluateReading, getRange, REFERENCE_RANGES };
