const express = require("express");
const Animal = require("../models/Animal");
const SensorReading = require("../models/SensorReading");
const Alert = require("../models/Alert");
const { evaluateReading, getRange } = require("../services/alertEngine");
const { triggerEscapeSimulation, haversineDistanceMeters } = require("../services/sensorSimulator");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

// Get live GPS coordinates & geofence status for all animals
router.get("/locations", async (req, res) => {
  let animals;
  if (req.user.role === "farmer") {
    animals = await Promise.resolve(Animal.listByOwner(req.user.id));
  } else {
    animals = await Promise.resolve(Animal.listAll());
  }

  const monitored = animals.filter((a) => a.monitoring_enabled);
  const data = await Promise.all(
    monitored.map(async (animal) => {
      const latest = await Promise.resolve(SensorReading.latestForAnimal(animal.id));
      const centerLat = Number(animal.geofence_center_lat || 12.9716);
      const centerLng = Number(animal.geofence_center_lng || 77.5946);
      const radiusM = Number(animal.geofence_radius_m || 500);

      const lat = latest?.latitude || animal.last_latitude || centerLat;
      const lng = latest?.longitude || animal.last_longitude || centerLng;
      const dist = haversineDistanceMeters(centerLat, centerLng, lat, lng);

      return {
        animal,
        latestReading: latest,
        currentLocation: {
          latitude: lat,
          longitude: lng,
          batteryPct: latest?.battery_pct ?? 95,
          isOutOfBounds: dist > radiusM,
          distanceFromBase: Math.round(dist),
          recordedAt: latest?.recorded_at || animal.created_at,
        },
        geofence: {
          centerLat,
          centerLng,
          radiusM,
        },
      };
    })
  );

  res.json({ locations: data });
});

router.get("/:animalId/history", async (req, res) => {
  const animal = await Promise.resolve(Animal.findById(req.params.animalId));
  if (!animal) return res.status(404).json({ error: "Animal not found." });
  const limit = Number(req.query.limit || 50);
  res.json({
    referenceRange: getRange(animal.species),
    history: await Promise.resolve(SensorReading.history(animal.id, limit)),
  });
});

// Get historical GPS coordinates for breadcrumb trail
router.get("/:animalId/gps-history", async (req, res) => {
  const animal = await Promise.resolve(Animal.findById(req.params.animalId));
  if (!animal) return res.status(404).json({ error: "Animal not found." });
  const limit = Number(req.query.limit || 100);
  const breadcrumbs = await Promise.resolve(SensorReading.gpsHistory(animal.id, limit));
  res.json({ breadcrumbs });
});

// Trigger boundary breach simulation for live demos
router.post("/:animalId/simulate-escape", async (req, res) => {
  const animal = await Promise.resolve(Animal.findById(req.params.animalId));
  if (!animal) return res.status(404).json({ error: "Animal not found." });

  const isEscaping = req.body.isEscaping !== false;
  triggerEscapeSimulation(animal.id, isEscaping);

  res.json({
    success: true,
    message: isEscaping
      ? `Simulating boundary breach / escape for ${animal.name}. Live alert will be emitted on next tick.`
      : `Returned ${animal.name} to safe perimeter.`,
  });
});

// Endpoint for real IoT hardware (ESP32 / Arduino / MQTT bridge)
router.post("/:animalId/readings", async (req, res) => {
  const animal = await Promise.resolve(Animal.findById(req.params.animalId));
  if (!animal) return res.status(404).json({ error: "Animal not found." });

  const {
    temperatureC,
    heartRateBpm,
    activityLevel,
    ruminationMin,
    latitude,
    longitude,
    batteryPct,
  } = req.body;

  if (temperatureC === undefined || heartRateBpm === undefined || activityLevel === undefined) {
    return res.status(400).json({ error: "temperatureC, heartRateBpm, and activityLevel are required." });
  }

  const centerLat = Number(animal.geofence_center_lat || 12.9716);
  const centerLng = Number(animal.geofence_center_lng || 77.5946);
  const radiusM = Number(animal.geofence_radius_m || 500);

  const curLat = latitude ?? centerLat;
  const curLng = longitude ?? centerLng;
  const dist = haversineDistanceMeters(centerLat, centerLng, curLat, curLng);
  const isOutOfBounds = dist > radiusM;

  const reading = await Promise.resolve(
    SensorReading.create({
      animalId: animal.id,
      temperatureC,
      heartRateBpm,
      activityLevel,
      ruminationMin,
      latitude: curLat,
      longitude: curLng,
      batteryPct: batteryPct ?? 100,
      isOutOfBounds,
    })
  );

  await Promise.resolve(Animal.updateLocation(animal.id, curLat, curLng));

  const newAlerts = await evaluateReading(animal, reading);

  if (isOutOfBounds) {
    const breachAlert = await Promise.resolve(
      Alert.create({
        animalId: animal.id,
        type: "geofence_breach",
        severity: "critical",
        message: `🚨 Boundary Breach Alert: ${animal.name} has crossed the safe grazing perimeter (${Math.round(dist)}m from base)!`,
      })
    );
    newAlerts.push(breachAlert);
  }

  const io = req.app.get("io");
  if (io) {
    io.to(`animal:${animal.id}`).emit("sensor:update", { animalId: animal.id, reading });
    io.to(`owner:${animal.owner_id}`).emit("sensor:update", { animalId: animal.id, reading });
    for (const alert of newAlerts) {
      io.to(`owner:${animal.owner_id}`).emit("alert:new", alert);
    }
  }

  res.status(201).json({ reading, alertsRaised: newAlerts, distanceFromBase: Math.round(dist) });
});

module.exports = router;
