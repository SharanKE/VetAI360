"""
VetAI 360 — Symptom Model (v2 — Real Kaggle Dataset)
=====================================================
Trains a multi-class disease classifier on the
"cleaned_animal_disease_prediction.csv" Kaggle dataset.

Features used:
  Animal_Type, Age, Gender, Weight,
  Symptom_1-4, Duration, Appetite_Loss, Vomiting, Diarrhea,
  Coughing, Labored_Breathing, Lameness, Skin_Lesions,
  Nasal_Discharge, Eye_Discharge, Body_Temperature, Heart_Rate

Target: Disease_Prediction

Duplicate / near-duplicate disease names (e.g. "Bluetongue" vs
"Blue Tongue Disease") are normalised to a canonical label before
training so the model learns clean, consistent classes.

Run:
    python training/train_symptom_model.py

Produces:
    models/symptom_model.joblib
    models/symptom_meta.json
"""

import json
import os
import re

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder

DATASET_PATH = os.path.join(os.path.dirname(__file__), "cleaned_animal_disease_prediction.csv")
OUT_DIR      = os.path.join(os.path.dirname(__file__), "..", "models")

# ── Disease name normalisation map ────────────────────────────────────────────
# Merge near-duplicate labels so the model has clean, distinct classes.
CANONICAL = {
    # Bluetongue variants
    "blue tongue":                          "Bluetongue",
    "blue tongue disease":                  "Bluetongue",
    "blue tongue virus":                    "Bluetongue",
    "bluetongue virus":                     "Bluetongue",
    "bluetongue":                           "Bluetongue",
    # FMD variants
    "foot and mouth disease":               "Foot and Mouth Disease",
    "foot-and-mouth disease":               "Foot and Mouth Disease",
    # Bovine respiratory variants
    "bovine respiratory disease":           "Bovine Respiratory Disease",
    "bovine respiratory disease complex":   "Bovine Respiratory Disease",
    "bovine respiratory syncytial virus":   "Bovine Respiratory Disease",
    "bovine parainfluenza":                 "Bovine Respiratory Disease",
    # Caprine arthritis variants
    "caprine arthritis":                    "Caprine Arthritis Encephalitis",
    "caprine arthritis encephalitis":       "Caprine Arthritis Encephalitis",
    "caprine arthritis encephalitis virus": "Caprine Arthritis Encephalitis",
    "caprine viral arthritis":              "Caprine Arthritis Encephalitis",
    # Equine influenza variants
    "equine influenza":                     "Equine Influenza",
    "equine influenza virus":               "Equine Influenza",
    # Porcine epidemic diarrhea
    "porcine epidemic diarrhea":            "Porcine Epidemic Diarrhea",
    "porcine epidemic diarrhea virus":      "Porcine Epidemic Diarrhea",
    # Canine variants
    "canine cough":                         "Kennel Cough",
    "canine flu":                           "Canine Influenza",
    "canine infectious hepatitis":          "Canine Hepatitis",
    # Feline variants
    "feline leukemia":                      "Feline Leukemia Virus",
    "feline panleukopenia":                 "Feline Panleukopenia Virus",
    "feline chlamydia":                     "Feline Chlamydiosis",
    "feline herpesvirus":                   "Feline Viral Rhinotracheitis",
    "feline rhinotracheitis":               "Feline Viral Rhinotracheitis",
    "feline upper respiratory infection":   "Feline Respiratory Disease Complex",
    "feline respiratory infection":         "Feline Respiratory Disease Complex",
    # Scrapie
    "scrapie":                              "Scrapie Disease",
    # Rabbit
    "rabbit calicivirus":                   "Rabbit Viral Hemorrhagic Disease",
    "rabbit hemorrhagic disease":           "Rabbit Viral Hemorrhagic Disease",
    # Generic
    "respiratory infection":                "Respiratory Infection",
    "upper respiratory infection":          "Respiratory Infection",
    "respiratory syncytial virus":          "Respiratory Infection",
    "gastrointestinal infection":           "Gastroenteritis",
    "distemper":                            "Canine Distemper",
    "panleukopenia":                        "Feline Panleukopenia Virus",
    "parvovirus":                           "Canine Parvovirus",
    "heartworm disease":                    "Canine Heartworm Disease",
    "lyme disease":                         "Leptospirosis",
    "tick-borne disease":                   "Tick-Borne Disease",
}

def normalise_disease(name):
    return CANONICAL.get(name.strip().lower(), name.strip())


# ── Feature engineering ───────────────────────────────────────────────────────

ANIMAL_TYPES = ["Dog", "Cat", "Cow", "Goat", "Horse", "Pig", "Rabbit", "Sheep"]
GENDERS      = ["Male", "Female"]
YES_NO_COLS  = [
    "Appetite_Loss", "Vomiting", "Diarrhea", "Coughing",
    "Labored_Breathing", "Lameness", "Skin_Lesions",
    "Nasal_Discharge", "Eye_Discharge",
]
# All unique symptoms that appear in Symptom_1 … Symptom_4
# These will be one-hot encoded automatically from the data.

def parse_temperature(val):
    """Extract numeric temperature value from strings like '39.5°C' or '101°F'."""
    if pd.isna(val):
        return 39.0
    s = str(val)
    num = re.findall(r"[\d.]+", s)
    if not num:
        return 39.0
    t = float(num[0])
    if "f" in s.lower() and t > 50:   # Fahrenheit → Celsius
        t = (t - 32) * 5 / 9
    return round(t, 1)

def parse_duration(val):
    """Convert duration strings like '3 days', '1 week' to numeric days."""
    if pd.isna(val):
        return 3
    s = str(val).lower()
    nums = re.findall(r"[\d.]+", s)
    n = float(nums[0]) if nums else 3
    if "week" in s:
        n *= 7
    elif "month" in s:
        n *= 30
    elif "hour" in s:
        n /= 24
    return round(n, 1)

def parse_heart_rate(val):
    if pd.isna(val):
        return 80
    nums = re.findall(r"[\d.]+", str(val))
    return float(nums[0]) if nums else 80

def build_features(df, symptom_vocab=None):
    """
    Returns feature matrix X (numpy), feature names list, and symptom_vocab.
    symptom_vocab: set of all unique symptoms seen during training (for inference).
    """
    rows = []
    all_symptoms_seen = set()

    # Collect all symptom strings first (for vocab building)
    for col in ["Symptom_1", "Symptom_2", "Symptom_3", "Symptom_4"]:
        if col in df.columns:
            all_symptoms_seen.update(
                df[col].dropna().str.strip().str.lower().unique()
            )

    if symptom_vocab is None:
        symptom_vocab = sorted(all_symptoms_seen)

    symptom_index = {s: i for i, s in enumerate(symptom_vocab)}

    for _, row in df.iterrows():
        feat = []

        # 1. Animal type (one-hot)
        at = str(row.get("Animal_Type", "")).strip()
        feat += [1 if at == a else 0 for a in ANIMAL_TYPES]

        # 2. Gender (binary)
        g = str(row.get("Gender", "")).strip()
        feat.append(1 if g == "Male" else 0)

        # 3. Age (normalised 0-20)
        age = row.get("Age", 3)
        try:
            age = float(str(age).split()[0])
        except Exception:
            age = 3
        feat.append(min(age / 20.0, 1.0))

        # 4. Weight (normalised 0-700)
        wt = row.get("Weight", 30)
        try:
            wt = float(str(wt).split()[0])
        except Exception:
            wt = 30
        feat.append(min(wt / 700.0, 1.0))

        # 5. Yes/No binary symptoms
        for col in YES_NO_COLS:
            val = str(row.get(col, "No")).strip().lower()
            feat.append(1 if val == "yes" else 0)

        # 6. Duration (days, normalised 0-30)
        feat.append(min(parse_duration(row.get("Duration", "3 days")) / 30.0, 1.0))

        # 7. Body temperature (normalised 36-42°C range)
        temp = parse_temperature(row.get("Body_Temperature", "39°C"))
        feat.append(np.clip((temp - 36) / 6.0, 0, 1))

        # 8. Heart rate (normalised 40-400 bpm)
        hr = parse_heart_rate(row.get("Heart_Rate", 80))
        feat.append(np.clip((hr - 40) / 360.0, 0, 1))

        # 9. Symptom text (multi-hot from Symptom_1-4 columns)
        sym_vec = [0] * len(symptom_vocab)
        for col in ["Symptom_1", "Symptom_2", "Symptom_3", "Symptom_4"]:
            val = str(row.get(col, "")).strip().lower()
            if val in symptom_index:
                sym_vec[symptom_index[val]] = 1
        feat += sym_vec

        rows.append(feat)

    return np.array(rows, dtype=np.float32), symptom_vocab


# ── Recommendation map ────────────────────────────────────────────────────────
RECOMMENDATIONS = {
    "Foot and Mouth Disease": "Highly contagious — isolate immediately, restrict farm movement, notify authorities.",
    "Bluetongue": "Isolate the animal, control biting midges, and contact a veterinarian. Notifiable disease.",
    "Bovine Mastitis": "Discontinue affected udder milk, keep clean and dry, arrange vet visit for antibiotics.",
    "Lumpy Skin Disease": "Isolate, control flies/ticks, call vet — notifiable disease in many regions.",
    "Bovine Respiratory Disease": "Move to ventilated area, reduce stress, arrange vet visit for antibiotic treatment.",
    "Kennel Cough": "Isolate from other dogs, keep warm and rested, see a vet if symptoms worsen.",
    "Canine Parvovirus": "Urgent — isolate immediately, seek emergency vet care. Highly contagious and fatal.",
    "Canine Distemper": "Isolate, supportive care, urgent vet attention required.",
    "Feline Leukemia Virus": "Isolate from other cats, vet visit for supportive care and immune management.",
    "Feline Viral Rhinotracheitis": "Keep cat warm, ensure hydration, vet visit for antiviral treatment.",
    "Equine Influenza": "Rest the horse, isolate from others, vet visit for supportive treatment.",
    "Equine Laminitis": "Remove from pasture immediately, call vet for pain management and hoof care.",
    "Porcine Epidemic Diarrhea": "Isolate affected pigs, ensure hydration, notify vet — biosecurity measures critical.",
    "African Swine Fever": "URGENT — notifiable disease. Isolate and call authorities immediately.",
    "Scrapie Disease": "Notifiable prion disease. Report to authorities immediately.",
    "Goat Pox": "Isolate the animal, contact vet for vaccination and supportive care.",
    "Caseous Lymphadenitis": "Vet visit for drainage and antibiotic treatment. Avoid contaminating environment.",
    "Gastroenteritis": "Ensure hydration and electrolytes, withhold feed briefly, vet visit if persistent.",
    "Pneumonia": "Move to warm dry area, vet visit for antibiotics urgently.",
    "Respiratory Infection": "Move to ventilated area, arrange vet visit for antibiotic/antiviral treatment.",
    "Leptospirosis": "Isolate — zoonotic risk. Urgent vet visit for antibiotics. Notify public health if needed.",
    "Ringworm": "Topical antifungal treatment, isolate animal, clean environment. Contagious to humans.",
    "Arthritis": "Reduce weight bearing, vet visit for pain management and anti-inflammatory treatment.",
    "Coccidiosis": "Vet visit for anticoccidial treatment, improve hygiene and reduce crowding.",
    "Pasteurellosis": "Vet visit for antibiotic treatment. Improve ventilation and reduce stress.",
    "Tick-Borne Disease": "Tick removal, vet visit for appropriate antibiotic or antiparasitic treatment.",
    "Myxomatosis": "No effective treatment — vet visit for supportive care. Vaccinate other rabbits.",
    "Rabbit Viral Hemorrhagic Disease": "Fatal disease — vaccinate remaining animals, notify vet immediately.",
    "Feline Panleukopenia Virus": "Urgent vet care — highly contagious and fatal in kittens.",
    "Canine Heartworm Disease": "Vet visit for heartworm testing and treatment protocol.",
    "Strangles": "Isolate horse, vet visit for antibiotic treatment, quarantine stable.",
    "Equine Encephalomyelitis": "Urgent vet care — neurological disease, isolate horse.",
    "Swine Erysipelas": "Vet visit for penicillin treatment. Vaccination recommended.",
    "Bovine Tuberculosis": "Notifiable disease — report to authorities, test herd.",
    "DEFAULT": "Consult a veterinarian for examination, diagnosis confirmation, and appropriate treatment.",
}

def get_recommendation(disease):
    return RECOMMENDATIONS.get(disease, RECOMMENDATIONS["DEFAULT"])


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("\n=== VetAI 360 — Symptom Model Training (v2 Real Data) ===\n")
    print(f"Loading dataset: {DATASET_PATH}")

    df = pd.read_csv(DATASET_PATH)
    print(f"Loaded {len(df)} rows, {len(df.columns)} columns")

    # Normalise disease labels
    df["Disease_Prediction"] = df["Disease_Prediction"].apply(normalise_disease)

    # Drop classes with fewer than 2 samples (can't stratify-split)
    counts = df["Disease_Prediction"].value_counts()
    valid  = counts[counts >= 2].index
    df     = df[df["Disease_Prediction"].isin(valid)].copy()
    print(f"After normalisation: {df['Disease_Prediction'].nunique()} disease classes, {len(df)} rows\n")

    # ── Augment: oversample rare classes to at least 20 rows each ────────────
    MIN_ROWS = 20
    augmented = []
    for disease, group in df.groupby("Disease_Prediction"):
        augmented.append(group)
        shortage = max(0, MIN_ROWS - len(group))
        if shortage > 0:
            # Resample with replacement and add tiny noise to numeric columns
            extra = group.sample(shortage, replace=True, random_state=42).copy()
            for col in ["Age", "Weight", "Heart_Rate"]:
                if col in extra.columns:
                    extra[col] = pd.to_numeric(extra[col], errors="coerce").fillna(0)
                    extra[col] = extra[col] + np.random.normal(0, extra[col].std() * 0.05 + 0.01, size=len(extra))
                    extra[col] = extra[col].clip(lower=0)
            augmented.append(extra)
    df = pd.concat(augmented, ignore_index=True)
    print(f"After augmentation: {len(df)} rows ({df['Disease_Prediction'].nunique()} classes)\n")

    print("Building feature matrix…")
    X, symptom_vocab = build_features(df)
    y = df["Disease_Prediction"].values
    print(f"Feature matrix: {X.shape[0]} samples × {X.shape[1]} features")

    # Encode labels
    le = LabelEncoder()
    y_enc = le.fit_transform(y)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y_enc, test_size=0.2, random_state=42, stratify=y_enc
    )

    print("\nTraining Random Forest classifier…")
    clf = RandomForestClassifier(
        n_estimators=300,
        max_depth=None,
        min_samples_leaf=1,
        random_state=42,
        class_weight="balanced",
        n_jobs=-1,
    )
    clf.fit(X_train, y_train)

    preds = clf.predict(X_test)
    acc   = accuracy_score(y_test, preds)
    print(f"\nValidation accuracy: {acc:.3f}")
    # Only report on classes that actually appear in the test set
    present_classes = np.unique(np.concatenate([y_test, preds]))
    present_names   = le.classes_[present_classes]
    print(classification_report(y_test, preds, labels=present_classes,
                                target_names=present_names, zero_division=0))

    # Save model
    os.makedirs(OUT_DIR, exist_ok=True)
    joblib.dump(clf, os.path.join(OUT_DIR, "symptom_model.joblib"))
    joblib.dump(le,  os.path.join(OUT_DIR, "symptom_label_encoder.joblib"))

    # Build metadata
    classes      = le.classes_.tolist()
    severe_names = {
        "Foot and Mouth Disease", "African Swine Fever", "Canine Parvovirus",
        "Bluetongue", "Bovine Tuberculosis", "Scrapie Disease",
        "Rabbit Viral Hemorrhagic Disease", "Feline Panleukopenia Virus",
        "Equine Encephalomyelitis", "Canine Distemper",
    }
    severe_classes = [c for c in classes if c in severe_names]

    meta = {
        "version":            2,
        "trained_on_real_data": True,
        "animal_types":       ANIMAL_TYPES,
        "yes_no_symptoms":    YES_NO_COLS,
        "symptom_vocab":      symptom_vocab,
        "classes":            classes,
        "severe_classes":     severe_classes,
        "recommendations":    {c: get_recommendation(c) for c in classes},
        "validation_accuracy": round(float(acc), 4),
        "num_features":       int(X.shape[1]),
        "feature_schema": {
            "animal_type_onehot": ANIMAL_TYPES,
            "gender_male_binary": 1,
            "age_norm":           1,
            "weight_norm":        1,
            "yes_no_cols":        YES_NO_COLS,
            "duration_norm":      1,
            "temperature_norm":   1,
            "heart_rate_norm":    1,
            "symptom_multihot":   len(symptom_vocab),
        },
    }

    with open(os.path.join(OUT_DIR, "symptom_meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    print(f"\nSaved model + label encoder + metadata → {OUT_DIR}")
    print(f"Classes ({len(classes)}): {classes[:10]} …")


if __name__ == "__main__":
    main()
