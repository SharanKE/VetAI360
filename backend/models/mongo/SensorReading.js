const mongoose = require('mongoose');

const SensorSchema = new mongoose.Schema({
  animal_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Animal', required: true },
  temperature_c: { type: Number, required: true },
  heart_rate_bpm: { type: Number, required: true },
  activity_level: { type: Number, required: true },
  rumination_min: Number,
  latitude: { type: Number, default: 12.9716 },
  longitude: { type: Number, default: 77.5946 },
  battery_pct: { type: Number, default: 100 },
  is_out_of_bounds: { type: Boolean, default: false },
  recorded_at: { type: Date, default: Date.now },
});

const Model = mongoose.model('SensorReading', SensorSchema);

function map(doc){ if(!doc) return null; const o = typeof doc.toObject==='function'?doc.toObject():doc; o.id = o._id.toString(); return o; }

module.exports = {
  create: async ({ animalId, temperatureC, heartRateBpm, activityLevel, ruminationMin, latitude, longitude, batteryPct, isOutOfBounds }) => {
    const r = await Model.create({
      animal_id: animalId,
      temperature_c: temperatureC,
      heart_rate_bpm: heartRateBpm,
      activity_level: activityLevel,
      rumination_min: ruminationMin ?? null,
      latitude: latitude ?? 12.9716,
      longitude: longitude ?? 77.5946,
      battery_pct: batteryPct ?? 100,
      is_out_of_bounds: !!isOutOfBounds,
    });
    return map(r);
  },

  latestForAnimal: async (animalId) => map(await Model.findOne({ animal_id: animalId }).sort({ recorded_at: -1 }).lean()),

  history: async (animalId, limit = 50) => (await Model.find({ animal_id: animalId }).sort({ recorded_at: -1 }).limit(limit).lean()).reverse().map(map),

  gpsHistory: async (animalId, limit = 100) => (await Model.find({ animal_id: animalId, latitude: { $ne: null } }).select('_id latitude longitude battery_pct is_out_of_bounds recorded_at').sort({ recorded_at: -1 }).limit(limit).lean()).reverse().map(map),
};
