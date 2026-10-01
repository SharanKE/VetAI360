const Animal = require("../models/Animal");
const SensorReading = require("../models/SensorReading");
const Alert = require("../models/Alert");
const { getRange } = require("./alertEngine");
const { evaluateReading } = require("./alertEngine");

function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const animalState = new Map();

function initState(animal) {
  const { temp, hr } = getRange(animal.species);
  const centerLat = Number(animal.geofence_center_lat || 12.9716);
  const centerLng = Number(animal.geofence_center_lng || 77.5946);
  return {
    temperature: (temp[0] + temp[1]) / 2,
    heartRate: (hr[0] + hr[1]) / 2,
    activity: 55,
    rumination: animal.species === "Cattle" || animal.species === "Buffalo" ? 45 : null,
    anomalyTicksRemaining: 0,
    lat: centerLat + (Math.random() - 0.5) * 0.0015,
    lng: centerLng + (Math.random() - 0.5) * 0.0015,
    battery: 95 - Math.floor(Math.random() * 10),
    escapeSimulation: false,
  };
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function stepReading(animal) {
  const { temp, hr } = getRange(animal.species);
  if (!animalState.has(animal.id)) animalState.set(animal.id, initState(animal));
  const state = animalState.get(animal.id);

  if (state.anomalyTicksRemaining <= 0 && Math.random() < 0.03) {
    state.anomalyTicksRemaining = 4 + Math.floor(Math.random() * 4);
  }

  const drift = () => (Math.random() - 0.5) * 0.3;
  const anomalyBoost = state.anomalyTicksRemaining > 0 ? 1 : 0;
  if (anomalyBoost) state.anomalyTicksRemaining -= 1;

  state.temperature = clamp(
    state.temperature + drift() + anomalyBoost * 0.35,
    temp[0] - 1.5,
    temp[1] + 3
  );
  state.heartRate = clamp(
    state.heartRate + (Math.random() - 0.5) * 3 + anomalyBoost * 8,
    hr[0] - 10,
    hr[1] + 35
  );
  state.activity = clamp(
    state.activity + (Math.random() - 0.5) * 8 - anomalyBoost * 18,
    0,
    100
  );
  if (state.rumination !== null) {
    state.rumination = clamp(state.rumination + (Math.random() - 0.5) * 4 - anomalyBoost * 6, 5, 70);
  }

  const centerLat = Number(animal.geofence_center_lat || 12.9716);
  const centerLng = Number(animal.geofence_center_lng || 77.5946);
  const radiusM = Number(animal.geofence_radius_m || 500);

  // GPS Movement Simulation
  if (state.escapeSimulation) {
    state.lat += 0.001;
    state.lng += 0.001;
  } else {
    state.lat += (Math.random() - 0.5) * 0.00015;
    state.lng += (Math.random() - 0.5) * 0.00015;
  }

  if (Math.random() < 0.05 && state.battery > 5) {
    state.battery -= 1;
  }

  const distance = haversineDistanceMeters(centerLat, centerLng, state.lat, state.lng);
  const isOutOfBounds = distance > radiusM;

  return {
    animalId: animal.id,
    temperatureC: Math.round(state.temperature * 10) / 10,
    heartRateBpm: Math.round(state.heartRate),
    activityLevel: Math.round(state.activity),
    ruminationMin: state.rumination !== null ? Math.round(state.rumination) : null,
    latitude: Math.round(state.lat * 1000000) / 1000000,
    longitude: Math.round(state.lng * 1000000) / 1000000,
    batteryPct: state.battery,
    isOutOfBounds: isOutOfBounds,
    distanceFromBase: Math.round(distance),
  };
}

function triggerEscapeSimulation(animalId, isEscaping = true) {
  if (!animalState.has(animalId)) {
    animalState.set(animalId, {
      temperature: 38.8,
      heartRate: 75,
      activity: 70,
      rumination: 40,
      anomalyTicksRemaining: 0,
      lat: 12.9716,
      lng: 77.5946,
      battery: 90,
      escapeSimulation: false,
    });
  }
  const s = animalState.get(animalId);
  s.escapeSimulation = isEscaping;
  if (isEscaping) {
    s.lat += 0.0065; // ~700m away (beyond typical 500m geofence)
    s.lng += 0.0065;
    s.heartRate += 30; // elevated heart rate during escape
    s.activity = 95;
  } else {
    s.lat = 12.9716 + (Math.random() - 0.5) * 0.001;
    s.lng = 77.5946 + (Math.random() - 0.5) * 0.001;
  }
}

function start(io) {
  const intervalMs = Number(process.env.SENSOR_SIMULATION_INTERVAL_MS || 8000);

  setInterval(async () => {
    const monitored = await Promise.resolve(Animal.listMonitored());
    for (const animal of monitored) {
      const generated = stepReading(animal);
      const reading = await Promise.resolve(SensorReading.create(generated));
      await Promise.resolve(Animal.updateLocation(animal.id, generated.latitude, generated.longitude));

      io.to(`animal:${animal.id}`).emit("sensor:update", { animalId: animal.id, reading });
      io.to(`owner:${animal.owner_id}`).emit("sensor:update", { animalId: animal.id, reading });

      // Check standard vitals alerts
      const newAlerts = await evaluateReading(animal, reading);
      for (const alert of newAlerts) {
        io.to(`owner:${animal.owner_id}`).emit("alert:new", alert);
      }

      // Check Geofence breach
      if (generated.isOutOfBounds) {
        const recentAlerts = await Promise.resolve(Alert.listByAnimal(animal.id));
        const hasActiveBreach = recentAlerts?.some(
          (a) => a.type === "geofence_breach" && !a.resolved
        );
        if (!hasActiveBreach) {
          const alert = await Promise.resolve(
            Alert.create({
              animalId: animal.id,
              type: "geofence_breach",
              severity: "critical",
              message: `🚨 Boundary Breach Alert: ${animal.name} has crossed the safe grazing perimeter (${generated.distanceFromBase}m from farm base)!`,
            })
          );
          io.to(`owner:${animal.owner_id}`).emit("alert:new", alert);
        }
      }
    }
  }, intervalMs);

  console.log(`IoT sensor simulator running (GPS & Vitals) — emitting readings every ${intervalMs}ms.`);
}

module.exports = { start, triggerEscapeSimulation, haversineDistanceMeters };
