const express = require("express");
const Animal = require("../models/Animal");
const HealthRecord = require("../models/HealthRecord");
const Vaccination = require("../models/Vaccination");
const SensorReading = require("../models/SensorReading");
const { authenticate, requireRole } = require("../middleware/auth");
const { sameId, toId } = require("../utils/id");

const router = express.Router();
router.use(authenticate);

function canAccessAnimal(req, animal) {
  if (!animal) return false;
  if (req.user.role === "admin" || req.user.role === "vet") return true;
  return sameId(animal.owner_id, req.user.id);
}

router.get("/", async (req, res) => {
  if (req.user.role === "farmer") {
    return res.json({ animals: await Promise.resolve(Animal.listByOwner(req.user.id)) });
  }
  // vets and admins can see the full registry to support consultations
  return res.json({ animals: await Promise.resolve(Animal.listAll()) });
});

router.post("/", requireRole("farmer"), async (req, res) => {
  const { name, species, breed, gender, ageMonths, tagId, photoUrl, monitoringEnabled } = req.body;
  if (!name || !species) {
    return res.status(400).json({ error: "Animal name and species are required." });
  }
  const animal = await Promise.resolve(
    Animal.create({
      ownerId: req.user.id,
      name,
      species,
      breed,
      gender,
      ageMonths,
      tagId,
      photoUrl,
      monitoringEnabled,
    })
  );
  res.status(201).json({ animal });
});

router.get("/:id", async (req, res) => {
  const animal = await Promise.resolve(Animal.findById(req.params.id));
  if (!canAccessAnimal(req, animal)) return res.status(404).json({ error: "Animal not found." });
  res.json({
    animal,
    healthRecords: await Promise.resolve(HealthRecord.listByAnimal(animal.id)),
    vaccinations: await Promise.resolve(Vaccination.listByAnimal(animal.id)),
    latestReading: await Promise.resolve(SensorReading.latestForAnimal(animal.id)),
  });
});

router.put("/:id", async (req, res) => {
  const animal = await Promise.resolve(Animal.findById(req.params.id));
  if (!animal || (req.user.role === "farmer" && !sameId(animal.owner_id, req.user.id))) {
    return res.status(404).json({ error: "Animal not found." });
  }
  const fields = {};
  ["name", "species", "breed", "gender", "tag_id", "photo_url"].forEach((k) => {
    if (req.body[k] !== undefined) fields[k] = req.body[k];
  });
  if (req.body.ageMonths !== undefined) fields.age_months = req.body.ageMonths;
  if (req.body.monitoringEnabled !== undefined) {
    fields.monitoring_enabled = process.env.DB_TYPE === "mongo" ? !!req.body.monitoringEnabled : req.body.monitoringEnabled ? 1 : 0;
  }
  const updated = await Promise.resolve(Animal.update(animal.id, fields));
  res.json({ animal: updated });
});

router.put("/:id/geofence", async (req, res) => {
  const animal = await Promise.resolve(Animal.findById(req.params.id));
  if (!animal || (req.user.role === "farmer" && !sameId(animal.owner_id, req.user.id))) {
    return res.status(404).json({ error: "Animal not found." });
  }
  const { centerLat, centerLng, radiusM } = req.body;
  if (centerLat === undefined || centerLng === undefined || radiusM === undefined) {
    return res.status(400).json({ error: "centerLat, centerLng, and radiusM are required." });
  }
  const updated = await Promise.resolve(
    Animal.updateGeofence(animal.id, {
      lat: Number(centerLat),
      lng: Number(centerLng),
      radius: Number(radiusM),
    })
  );
  res.json({ animal: updated });
});

router.delete("/:id", async (req, res) => {
  const animal = await Promise.resolve(Animal.findById(req.params.id));
  if (!animal || (req.user.role === "farmer" && !sameId(animal.owner_id, req.user.id))) {
    return res.status(404).json({ error: "Animal not found." });
  }
  await Promise.resolve(Animal.remove(animal.id));
  res.json({ success: true });
});

// --- Health records -------------------------------------------------------
router.post("/:id/health-records", requireRole("vet", "farmer"), async (req, res) => {
  const animal = await Promise.resolve(Animal.findById(req.params.id));
  if (!canAccessAnimal(req, animal)) return res.status(404).json({ error: "Animal not found." });
  const { diagnosis, treatment, notes } = req.body;
  if (!diagnosis) return res.status(400).json({ error: "Diagnosis is required." });
  const record = await Promise.resolve(
    HealthRecord.create({
      animalId: animal.id,
      vetId: req.user.role === "vet" ? req.user.id : null,
      diagnosis,
      treatment,
      notes,
      source: "manual",
    })
  );
  res.status(201).json({ record });
});

// --- Vaccinations -----------------------------------------------------------
router.post("/:id/vaccinations", async (req, res) => {
  const animal = await Promise.resolve(Animal.findById(req.params.id));
  if (!canAccessAnimal(req, animal)) return res.status(404).json({ error: "Animal not found." });
  const { vaccineName, dueDate, notes } = req.body;
  if (!vaccineName || !dueDate) return res.status(400).json({ error: "Vaccine name and due date are required." });
  const record = await Promise.resolve(Vaccination.create({ animalId: animal.id, vaccineName, dueDate, notes }));
  res.status(201).json({ vaccination: record });
});

module.exports = router;
