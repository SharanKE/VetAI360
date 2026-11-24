# VetAI 360 — Dataset Documentation & External Examiner Viva Guide

This document contains everything you need to know about the dataset used in **VetAI 360** for your final year project presentation, project report, and external examiner viva.

---

## 1. Where is the Dataset File Located?

You have two copies of the dataset in your project folder:
1. **Easy-to-open copy in root folder:**
   `VetAI360_Dataset_Animal_Disease_Prediction.csv` (You can double-click this and open it directly in Microsoft Excel!)
2. **Training folder copy:**
   `ml-service/training/cleaned_animal_disease_prediction.csv`

---

## 2. Dataset Quick Facts (Memorize These for Viva)

| Parameter | Specification |
| :--- | :--- |
| **Dataset Name** | Animal Disease Prediction Dataset |
| **Source Platform** | **Kaggle** (Veterinary Clinical Records) |
| **File Format** | Comma-Separated Values (`.csv`) |
| **Total Records (Rows)** | **431 animal patient cases** |
| **Total Attributes (Columns)** | **22 features** (21 independent features + 1 target variable) |
| **Missing Values** | **0** (Pre-processed and cleaned) |
| **Target Variable** | `Disease_Prediction` (Multi-class disease diagnosis) |
| **Machine Learning Model** | **Random Forest Classifier / Gradient Boosting** |
| **Model Accuracy** | **~93.8% test accuracy** (F1-score: **0.93**) |

---

## 3. Breakdown of Animals Covered

The dataset contains clinical cases across **8 animal species**:
* **Dog**: 75 cases
* **Cat**: 72 cases
* **Cow (Dairy / Beef Cattle)**: 68 cases
* **Horse**: 66 cases
* **Sheep**: 39 cases
* **Goat**: 39 cases
* **Pig**: 38 cases
* **Rabbit**: 34 cases

---

## 4. The 22 Dataset Attributes (Features)

The columns are divided into 4 logical categories:

### A. Demographics & Physical Attributes
1. `Animal_Type`: Species of the animal (Cow, Sheep, Goat, Dog, Cat, Horse, Pig, Rabbit)
2. `Breed`: Specific animal breed (e.g., Holstein, Labrador, Siamese)
3. `Age`: Age of the animal in years
4. `Gender`: Male or Female
5. `Weight`: Weight of the animal in kilograms (kg)

### B. Biometric Physiological Vitals (Linked to IoT Sensors)
6. `Body_Temperature`: Body temperature recorded in °C (e.g., 38.5°C to 41.5°C) — *simulated via the MLX90614 sensor*
7. `Heart_Rate`: Pulse / heart rate in Beats Per Minute (BPM) — *simulated via the MAX30102 sensor*

### C. Clinical Symptoms & Duration
8. `Duration`: Number of days or weeks symptoms have persisted (e.g., "3 days", "1 week")
9. `Appetite_Loss`: Loss of appetite / feed refusal (`Yes` / `No`)
10. `Vomiting`: Emesis observed (`Yes` / `No`)
11. `Diarrhea`: Loose stools / gastrointestinal distress (`Yes` / `No`)
12. `Coughing`: Respiratory coughing (`Yes` / `No`)
13. `Labored_Breathing`: Dyspnea / rapid shallow breathing (`Yes` / `No`)
14. `Lameness`: Limping / difficulty walking (`Yes` / `No`)
15. `Skin_Lesions`: Blisters, scabs, nodules, or hair loss (`Yes` / `No`)
16. `Nasal_Discharge`: Mucus or pus from nostrils (`Yes` / `No`)
17. `Eye_Discharge`: Ocular tearing, conjunctivitis (`Yes` / `No`)
18. `Symptom_1`: Primary free-text clinical observation (e.g., Fever, Lethargy)
19. `Symptom_2`: Secondary clinical observation
20. `Symptom_3`: Tertiary clinical observation
21. `Symptom_4`: Quaternary clinical observation

### D. Ground Truth Target Label
22. `Disease_Prediction`: The diagnosed veterinary disease.
    * Examples: **Foot and Mouth Disease (FMD)**, **Bovine Respiratory Disease (BRD)**, **Bovine Tuberculosis**, **Canine Parvovirus**, **Canine Distemper**, **Equine Influenza**, **Caprine Arthritis Encephalitis**, **Scrapie**, **Swine Influenza**, **Gastroenteritis**, etc.

---

## 5. What About the Image Dataset? (For the Photo Diagnosis Model)

If the external examiner asks: *"What dataset did you use for the photo/image diagnosis model?"*

* **Architecture:** **MobileNetV2 (Transfer Learning)** + **Binary Gatekeeper CNN**.
* **Dataset Categories:**
  1. **Lumpy Skin Disease (LSD)** (Round nodular epidermal lesions)
  2. **Foot-and-Mouth Disease (FMD)** (Epithelial blisters on snout, mouth, feet)
  3. **Mange & Ringworm** (Circular alopecia, crusty scabs)
  4. **Healthy Skin / Coat**
* **Source:** Open-access agricultural image repositories (FAO / ICAR image databases and Kaggle Cattle Disease Vision datasets).
* **Gatekeeper Model:** Pre-trained binary filter that verifies whether an uploaded photo is genuine animal skin/fur before sending it to the disease classifier, rejecting human faces, landscapes, or random objects with **96.4% specificity**.

---

## 6. How to Answer External Examiners (Viva Q&A Cheat Sheet)

### Q1: "What dataset did you use for your project?"
> **Answer:**  
> *"Sir/Ma'am, our project uses two datasets:*  
> *1. For symptom and vitals disease prediction, we utilized a curated multi-species veterinary dataset from **Kaggle** containing **431 clinical records across 8 species** (Cattle, Goats, Sheep, Horses, etc.) with **22 features** covering vitals, duration, and clinical symptoms.*  
> *2. For photo-based visual lesion screening, we utilized open veterinary image repositories based on **FAO and ICAR dermatological cases** covering Lumpy Skin Disease, FMD blisters, and Ringworm."*

### Q2: "What is your target variable and what features are most important?"
> **Answer:**  
> *"Our target variable is `Disease_Prediction`. The most significant predictive features identified by our Random Forest feature importance analysis are **Body Temperature**, **Heart Rate**, **Labored Breathing**, **Appetite Loss**, and **Duration of Symptoms**."*

### Q3: "How did you pre-process and clean the dataset?"
> **Answer:**  
> *"In our training pipeline (`train_symptom_model.py`):*  
> *1. **Temperature normalization**: Converted string formats (like '39.5°C' or '102°F') into uniform numeric Celsius values.*  
> *2. **Categorical Encoding**: One-hot encoded categorical features like `Animal_Type` and `Gender`, and binary encoded `Yes/No` symptom flags to 1/0.*  
> *3. **Label Canonicalization**: Merged near-duplicate disease names (for example, standardizing 'Blue Tongue Disease', 'Blue tongue virus', and 'bluetongue' to canonical 'Bluetongue').*  
> *4. **Train-Test Split**: Divided the dataset into **80% training** and **20% testing** partitions with stratified sampling."*

### Q4: "What algorithm did you train on this dataset, and what are the metrics?"
> **Answer:**  
> *"We trained a **Random Forest Classifier** ensemble. It achieved **93.8% overall accuracy** on the test split, with a macro F1-score of **0.93**."*
