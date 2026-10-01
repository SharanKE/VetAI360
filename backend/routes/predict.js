const express = require("express");
const Animal = require("../models/Animal");
const Prediction = require("../models/Prediction");
const HealthRecord = require("../models/HealthRecord");
const { predictFromSymptoms, predictFromImage } = require("../services/mlClient");
const { analyzeVoiceQuery, LANGUAGE_NAMES } = require("../services/voiceAssistantEngine");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

const ML_DOWN_MESSAGE =
  "The AI diagnosis service isn't reachable right now. Make sure the ml-service (Python/Flask) is running on the port set in ML_SERVICE_URL, then try again.";

router.post("/symptoms", async (req, res) => {
  const { animalId, species, symptoms, animal_type, gender, age, weight,
          duration, body_temperature, heart_rate, yes_no_symptoms } = req.body;

  // v2 real-data model needs animal_type; fall back to species for v1
  if (!animal_type && !species) {
    return res.status(400).json({ error: "animal_type (or species) is required." });
  }
  if (!Array.isArray(symptoms)) {
    return res.status(400).json({ error: "symptoms array is required." });
  }

  let result;
  try {
    result = await predictFromSymptoms({
      animal_type: animal_type || species,
      species:     species     || animal_type,
      gender:      gender      || "Male",
      age:         age         || 3,
      weight:      weight      || 30,
      duration:    duration    || "3 days",
      body_temperature: body_temperature || 39.0,
      heart_rate:  heart_rate  || 80,
      yes_no_symptoms: yes_no_symptoms || {},
      symptoms,
    });
  } catch (err) {
    console.error("ML symptom prediction failed:", err.message);
    return res.status(502).json({ error: ML_DOWN_MESSAGE });
  }

  const prediction = await Promise.resolve(
    Prediction.create({
      animalId: animalId || null,
      requestedBy: req.user.id,
      type: "symptom",
      inputSummary: symptoms.join(", "),
      resultLabel: result.label,
      confidence: result.confidence,
      recommendation: result.recommendation,
    })
  );

  if (animalId) {
    const animal = await Promise.resolve(Animal.findById(animalId));
    if (animal) {
      await Promise.resolve(
        HealthRecord.create({
          animalId: animal.id,
          diagnosis: `AI symptom screen: ${result.label}`,
          notes: `Confidence ${(result.confidence * 100).toFixed(0)}%. Symptoms reported: ${symptoms.join(", ")}.`,
          source: "symptom_ai",
          confidence: result.confidence,
        })
      );
    }
  }

  res.json({ prediction, raw: result });
});

router.post("/image", async (req, res) => {
  if (!req.files || !req.files.image) {
    return res.status(400).json({ error: "Attach an image file under the field name 'image'." });
  }
  const { animalId } = req.body;
  const file = req.files.image;

  let result;
  try {
    result = await predictFromImage(file.data, file.name, file.mimetype);
  } catch (err) {
    // Gatekeeper rejected the image (is_animal: false) — forward that body
    // to the client with the same 400 status so the frontend can handle it.
    if (err.mlStatus === 400 && err.mlBody) {
      return res.status(400).json(err.mlBody);
    }
    console.error("ML image prediction failed:", err.message);
    return res.status(502).json({ error: ML_DOWN_MESSAGE });
  }

  // Only save a prediction record if the image passed the gatekeeper
  // and is_animal is true (normal disease result).
  if (!result.is_animal) {
    return res.status(400).json(result);
  }

  const prediction = await Promise.resolve(
    Prediction.create({
      animalId: animalId || null,
      requestedBy: req.user.id,
      type: "image",
      inputSummary: file.name,
      resultLabel: result.label,
      confidence: result.confidence,
      recommendation: result.recommendation,
    })
  );

  if (animalId) {
    const animal = await Promise.resolve(Animal.findById(animalId));
    if (animal) {
      await Promise.resolve(
        HealthRecord.create({
          animalId: animal.id,
          diagnosis: `AI image screen: ${result.label}`,
          notes: `Confidence ${(result.confidence * 100).toFixed(0)}% from uploaded photo (${file.name}).`,
          source: "image_ai",
          confidence: result.confidence,
        })
      );
    }
  }

  res.json({ prediction, raw: result });
});

router.post("/voice-assistant", async (req, res) => {
  const { transcript, language, animalId } = req.body;
  if (!transcript || !transcript.trim()) {
    return res.status(400).json({ error: "Voice transcript is required." });
  }

  let animal = null;
  if (animalId) {
    animal = await Promise.resolve(Animal.findById(animalId));
  }

  try {
    const analysis = await analyzeVoiceQuery({
      transcript: transcript.trim(),
      language: language || "kn-IN",
      animalName: animal?.name,
      species: animal?.species,
    });

    const prediction = await Promise.resolve(
      Prediction.create({
        animalId: animalId || null,
        requestedBy: req.user.id,
        type: "voice",
        inputSummary: `[${analysis.language || language}] ${transcript.slice(0, 100)}`,
        resultLabel: analysis.primary_diagnosis,
        confidence: analysis.confidence,
        recommendation: analysis.spoken_response_english || analysis.spoken_response_native,
      })
    );

    if (animal) {
      await Promise.resolve(
        HealthRecord.create({
          animalId: animal.id,
          diagnosis: `Voice AI: ${analysis.primary_diagnosis}`,
          notes: `Confidence ${(analysis.confidence * 100).toFixed(0)}%. Symptoms: ${(analysis.detected_symptoms || []).join(", ")}. Spoken query: "${transcript}"`,
          source: "voice_ai",
          confidence: analysis.confidence,
        })
      );
    }

    res.json({ analysis, prediction });
  } catch (err) {
    console.error("Voice assistant analysis failed:", err);
    res.status(500).json({ error: err.message || "Failed to process voice query." });
  }
});

router.get("/history/:animalId", async (req, res) => {
  res.json({ predictions: await Promise.resolve(Prediction.listByAnimal(req.params.animalId)) });
});

module.exports = router;
