if (process.env.DB_TYPE === 'mongo') {
  module.exports = require('./mongo/SensorReading');
  return;
}

const db = require("../config/db");

const SensorReading = {
  create({ animalId, temperatureC, heartRateBpm, activityLevel, ruminationMin, latitude, longitude, batteryPct, isOutOfBounds }) {
    const info = db
      .prepare(
        `INSERT INTO sensor_readings (animal_id, temperature_c, heart_rate_bpm, activity_level, rumination_min, latitude, longitude, battery_pct, is_out_of_bounds)
         VALUES (@animalId, @temperatureC, @heartRateBpm, @activityLevel, @ruminationMin, @latitude, @longitude, @batteryPct, @isOutOfBounds)`
      )
      .run({
        animalId,
        temperatureC,
        heartRateBpm,
        activityLevel,
        ruminationMin: ruminationMin ?? null,
        latitude: latitude ?? 12.9716,
        longitude: longitude ?? 77.5946,
        batteryPct: batteryPct ?? 100,
        isOutOfBounds: isOutOfBounds ? 1 : 0,
      });
    return db.prepare("SELECT * FROM sensor_readings WHERE id = ?").get(info.lastInsertRowid);
  },

  latestForAnimal(animalId) {
    return db
      .prepare("SELECT * FROM sensor_readings WHERE animal_id = ? ORDER BY recorded_at DESC LIMIT 1")
      .get(animalId);
  },

  history(animalId, limit = 50) {
    return db
      .prepare(
        "SELECT * FROM sensor_readings WHERE animal_id = ? ORDER BY recorded_at DESC LIMIT ?"
      )
      .all(animalId, limit)
      .reverse();
  },

  gpsHistory(animalId, limit = 100) {
    return db
      .prepare(
        "SELECT id, latitude, longitude, battery_pct, is_out_of_bounds, recorded_at FROM sensor_readings WHERE animal_id = ? AND latitude IS NOT NULL ORDER BY recorded_at DESC LIMIT ?"
      )
      .all(animalId, limit)
      .reverse();
  },
};

module.exports = SensorReading;
