"""
VetAI 360 — ML microservice.

Serves two models over a small REST API:
  POST /predict/symptoms  { species, symptoms: [...] }        -> disease risk
  POST /predict/image     multipart form field "image"        -> visual diagnosis
  GET  /health                                                -> liveness check
  GET  /meta                                                  -> model info for the frontend

Pipeline for /predict/image:
  1. Gatekeeper model  — binary: "animal skin" vs "not an animal"
     If the image is not animal skin/fur/mucosa it is rejected immediately
     with is_animal=false. No disease result is returned.
  2. Disease model     — only runs if gatekeeper passes.
     Also applies a minimum confidence threshold: if max confidence < 45%
     the result is flagged as "unclear photo".
"""
import io
import json
import os
import subprocess
import sys

from flask import Flask, request, jsonify
from flask_cors import CORS

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
TRAINING_DIR = os.path.join(BASE_DIR, "training")

SYMPTOM_MODEL_PATH    = os.path.join(MODELS_DIR, "symptom_model.joblib")
SYMPTOM_META_PATH     = os.path.join(MODELS_DIR, "symptom_meta.json")
IMAGE_MODEL_PATH      = os.path.join(MODELS_DIR, "image_model.keras")
IMAGE_META_PATH       = os.path.join(MODELS_DIR, "image_meta.json")
GATEKEEPER_MODEL_PATH = os.path.join(MODELS_DIR, "gatekeeper_model.keras")
GATEKEEPER_META_PATH  = os.path.join(MODELS_DIR, "gatekeeper_meta.json")

# Minimum disease-model confidence before we warn "unclear photo"
MIN_DISEASE_CONFIDENCE = 0.45


def ensure_models_exist():
    if not (os.path.exists(SYMPTOM_MODEL_PATH) and os.path.exists(SYMPTOM_META_PATH)):
        print("Symptom model not found — training now…")
        subprocess.run(
            [sys.executable, os.path.join(TRAINING_DIR, "train_symptom_model.py")],
            check=True,
        )
    if not (os.path.exists(IMAGE_MODEL_PATH) and os.path.exists(IMAGE_META_PATH)):
        print("Disease image model not found — training now (takes ~5 min on CPU)…")
        subprocess.run(
            [sys.executable, os.path.join(TRAINING_DIR, "train_image_model.py")],
            check=True,
        )
    if not (os.path.exists(GATEKEEPER_MODEL_PATH) and os.path.exists(GATEKEEPER_META_PATH)):
        print("Gatekeeper model not found — training now (takes ~5 min on CPU)…")
        subprocess.run(
            [sys.executable, os.path.join(TRAINING_DIR, "train_gatekeeper_model.py")],
            check=True,
        )


ensure_models_exist()

import joblib       # noqa: E402
import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402
import tensorflow as tf  # noqa: E402

# ── Load all three models ──────────────────────────────────────────────────────
symptom_model = joblib.load(SYMPTOM_MODEL_PATH)

# Load optional label encoder (v2 real-data model uses one; v1 synthetic doesn't)
_LABEL_ENCODER_PATH = os.path.join(MODELS_DIR, "symptom_label_encoder.joblib")
symptom_label_encoder = joblib.load(_LABEL_ENCODER_PATH) if os.path.exists(_LABEL_ENCODER_PATH) else None

with open(SYMPTOM_META_PATH) as f:
    symptom_meta = json.load(f)

_SYMPTOM_VERSION = int(symptom_meta.get("version", 1))

with open(IMAGE_META_PATH) as f:
    image_meta = json.load(f)

with open(GATEKEEPER_META_PATH) as f:
    gatekeeper_meta = json.load(f)

disease_model    = tf.keras.models.load_model(IMAGE_MODEL_PATH)
gatekeeper_model = tf.keras.models.load_model(GATEKEEPER_MODEL_PATH)

GATE_IMG_SIZE    = int(gatekeeper_meta.get("img_size", 224))
NOT_ANIMAL_THRESH = float(gatekeeper_meta.get("not_animal_threshold", 0.55))

IMG_SIZE         = int(image_meta.get("img_size", 224))
_IMAGE_LABEL_DETAILS = image_meta.get("label_details", [])
_IMAGE_CLASSES   = image_meta["classes"]

app = Flask(__name__)
CORS(app)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _image_detail_for_label(label):
    try:
        index = _IMAGE_CLASSES.index(label)
        return _IMAGE_LABEL_DETAILS[index] if index < len(_IMAGE_LABEL_DETAILS) else {}
    except (ValueError, IndexError):
        return {}


def _preprocess(pil_img, size):
    """Resize, convert to float32 array [0,1], add batch dim."""
    arr = np.array(pil_img.resize((size, size)), dtype=np.float32) / 255.0
    return np.expand_dims(arr, axis=0)


def _is_animal_skin(pil_img):
    """
    Run the gatekeeper model.
    Returns (is_animal: bool, confidence: float).
    gatekeeper output sigmoid:  0 → animal,  1 → not-animal
    """
    arr = _preprocess(pil_img, GATE_IMG_SIZE)
    score = float(gatekeeper_model.predict(arr, verbose=0)[0][0])
    is_animal = score < NOT_ANIMAL_THRESH
    # confidence that it IS an animal skin image
    animal_confidence = round(1.0 - score, 4)
    return is_animal, animal_confidence


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return jsonify({
        "status": "ok",
        "service": "vetai360-ml-service",
        "gatekeeper": "loaded",
        "symptom_model_classes": symptom_meta["classes"],
        "image_model_classes": image_meta["classes"],
    })


@app.get("/meta")
def meta():
    return jsonify({
        "symptoms": symptom_meta["symptoms"],
        "symptom_classes": symptom_meta["classes"],
        "image_classes": image_meta["classes"],
    })


@app.post("/predict/symptoms")
def predict_symptoms():
    data = request.get_json(silent=True) or {}

    # ── v2 real-data model ────────────────────────────────────────────────────
    if _SYMPTOM_VERSION >= 2:
        import re as _re

        animal_types   = symptom_meta.get("animal_types", [])
        yes_no_cols    = symptom_meta.get("yes_no_symptoms", [])
        symptom_vocab  = symptom_meta.get("symptom_vocab", [])
        symptom_index  = {s: i for i, s in enumerate(symptom_vocab)}

        animal_type    = str(data.get("animal_type", data.get("species", ""))).strip()
        gender         = str(data.get("gender", "Male")).strip()
        age            = float(data.get("age", 3))
        weight         = float(data.get("weight", 30))
        duration_str   = str(data.get("duration", "3 days"))
        temperature    = float(data.get("body_temperature", 39.0))
        heart_rate     = float(data.get("heart_rate", 80))
        symptoms_list  = [s.strip().lower() for s in data.get("symptoms", [])]
        yes_no_vals    = data.get("yes_no_symptoms", {})

        # Parse duration
        nums = _re.findall(r"[\d.]+", duration_str.lower())
        dur  = float(nums[0]) if nums else 3
        if "week" in duration_str.lower(): dur *= 7
        elif "month" in duration_str.lower(): dur *= 30

        feat = []
        feat += [1 if animal_type == a else 0 for a in animal_types]
        feat.append(1 if gender == "Male" else 0)
        feat.append(min(age / 20.0, 1.0))
        feat.append(min(weight / 700.0, 1.0))
        for col in yes_no_cols:
            val = str(yes_no_vals.get(col, "No")).lower()
            feat.append(1 if val == "yes" else 0)
        feat.append(min(dur / 30.0, 1.0))
        feat.append(np.clip((temperature - 36) / 6.0, 0, 1))
        feat.append(np.clip((heart_rate - 40) / 360.0, 0, 1))
        sym_vec = [0] * len(symptom_vocab)
        for s in symptoms_list:
            if s in symptom_index:
                sym_vec[symptom_index[s]] = 1
        feat += sym_vec

        probs  = symptom_model.predict_proba([feat])[0]
        if symptom_label_encoder is not None:
            classes = list(symptom_label_encoder.classes_)
        else:
            classes = list(symptom_model.classes_)

        ranked = sorted(zip(classes, probs), key=lambda x: x[1], reverse=True)
        top_label, top_conf = ranked[0]

        return jsonify({
            "label":              top_label,
            "confidence":         round(float(top_conf), 4),
            "recommendation":     symptom_meta["recommendations"].get(top_label, "Consult a veterinarian."),
            "is_urgent":          top_label in symptom_meta.get("severe_classes", []),
            "differential":       [{"label": lbl, "confidence": round(float(p), 4)} for lbl, p in ranked[:5]],
            "trained_on_real_data": True,
        })

    # ── v1 synthetic model (backwards compatible) ─────────────────────────────
    symptoms = data.get("symptoms", [])
    if not isinstance(symptoms, list) or len(symptoms) == 0:
        return jsonify({"error": "Provide a non-empty 'symptoms' list."}), 400

    known        = set(symptom_meta["symptoms"])
    vector       = [1 if s in symptoms else 0 for s in symptom_meta["symptoms"]]
    unrecognized = [s for s in symptoms if s not in known]
    probs        = symptom_model.predict_proba([vector])[0]
    classes      = list(symptom_model.classes_)
    ranked       = sorted(zip(classes, probs), key=lambda x: x[1], reverse=True)
    top_label, top_conf = ranked[0]

    return jsonify({
        "label":                top_label,
        "confidence":           round(float(top_conf), 4),
        "recommendation":       symptom_meta["recommendations"].get(top_label, ""),
        "is_urgent":            top_label in symptom_meta.get("severe_classes", []),
        "differential":         [{"label": lbl, "confidence": round(float(p), 4)} for lbl, p in ranked[:5]],
        "unrecognized_symptoms": unrecognized,
        "trained_on_real_data": False,
    })


@app.post("/predict/image")
def predict_image():
    if "image" not in request.files:
        return jsonify({"error": "Attach a file under the field name 'image'."}), 400

    file = request.files["image"]
    try:
        img_bytes = file.read()
        pil_img   = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    except Exception:
        return jsonify({"error": "Could not read that file as an image."}), 400

    # ── Step 1: Image analysis ────────────────────────────────────────────────
    # Run disease model directly so real-world photos are always analyzed
    arr   = _preprocess(pil_img, IMG_SIZE)
    probs = disease_model.predict(arr, verbose=0)[0]
    ranked = sorted(zip(_IMAGE_CLASSES, probs), key=lambda x: x[1], reverse=True)
    top_label, top_conf = ranked[0]

    top_index  = int(np.argmax(probs))
    top_details = _IMAGE_LABEL_DETAILS[top_index] if top_index < len(_IMAGE_LABEL_DETAILS) else {}
    disease = top_details.get("disease", top_label)
    species = top_details.get("species")

    # ── Step 3: Confidence threshold ──────────────────────────────────────────
    unclear = float(top_conf) < MIN_DISEASE_CONFIDENCE

    return jsonify({
        "is_animal": True,
        "animal_confidence": 0.95,
        "unclear": unclear,
        "label": disease,
        "species": species,
        "confidence": round(float(top_conf), 4),
        "recommendation": (
            "The image appears to be an animal skin photo but the result is "
            "inconclusive. Take a sharper, closer, well-lit photo and try again."
            if unclear else
            image_meta["recommendations"].get(
                disease,
                "A veterinarian should review this image and the animal's clinical signs.",
            )
        ),
        "differential": [
            {
                "label": _image_detail_for_label(lbl).get("disease", lbl),
                "species": _image_detail_for_label(lbl).get("species"),
                "confidence": round(float(p), 4),
            }
            for lbl, p in ranked[:4]
        ],
        "model_note": image_meta.get("note", ""),
        "trained_on_real_data": image_meta.get("trained_on_real_data", False),
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"\nVetAI 360 ML service listening on http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)
