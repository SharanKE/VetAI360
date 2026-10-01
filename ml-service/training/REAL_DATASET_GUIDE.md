# Real Dataset Guide — VetAI 360 Image Model

Adding real vet-reviewed photos is the single most effective way to improve
image diagnosis accuracy. The demo model uses synthetic patterns and gives
rough results on real photos. With real data, you can expect 85–95%+ accuracy.

---

## Folder Structure

Place photos under `training/real_data/` using this exact layout:

```
training/real_data/
├── cattle/
│   ├── healthy_skin/
│   │   ├── img_001.jpg
│   │   ├── img_002.jpg
│   │   └── ...
│   ├── lumpy_skin_disease/
│   ├── mange_ringworm/
│   └── fmd_blister_lesion/
├── goat/
│   ├── healthy_skin/
│   ├── lumpy_skin_disease/
│   ├── mange_ringworm/
│   └── fmd_blister_lesion/
└── sheep/
    ├── healthy_skin/
    ├── mange_ringworm/
    └── ...
```

- **Species folders**: `cattle`, `goat`, `sheep`, `buffalo`, `poultry` — any name works
- **Disease folders**: any name — it becomes the display label (underscores → spaces, title-cased)
- **Minimum**: 30 images per species/disease folder
- **Recommended**: 100–300+ images per folder for clinical-grade accuracy
- **Supported formats**: `.jpg`, `.jpeg`, `.png`, `.bmp`, `.webp`

---

## Photo Quality Guidelines

| Do | Don't |
|----|-------|
| Natural daylight | Flash glare |
| Close-up of the affected area | Full body shot from far away |
| Clean, debris-free skin | Mud-covered areas |
| Sharp, in-focus | Blurry or shaky |
| Multiple angles per lesion | Single angle only |
| Multiple animals per class | Same animal repeated many times |

---

## Disease Visual Characteristics

### Lumpy Skin Disease
- Multiple firm, round nodules 2–5 cm diameter
- Nodules darker than surrounding skin
- May have crusted centre
- Common on neck, back, limbs

### Mange / Ringworm
- Circular or irregular patches of hair loss
- Crusty, scaly skin at patch edges
- Reddish raw skin exposed at centre
- Common on face, ears, neck

### FMD Blister Lesion
- Fluid-filled vesicles (blisters) that may be ruptured
- Pale yellow/white blisters on pink mucosal tissue
- Common around mouth, gums, tongue, feet, and teats
- Animal may be drooling or lame

### Healthy Skin
- Uniform coat with no lesions, patches, or blisters
- Normal skin colour for the species
- Include variety: different lighting, coat colours, ages

---

## Free / Open Datasets

These public datasets contain relevant images you can use after reviewing
them with a veterinarian to confirm labels:

| Dataset | Diseases | URL |
|---------|----------|-----|
| Kaggle — Lumpy Skin Disease | LSD, Healthy | https://www.kaggle.com/search?q=lumpy+skin+disease |
| Kaggle — Cattle Disease | Multiple | https://www.kaggle.com/search?q=cattle+disease+detection |
| ICAR / FAO image libraries | FMD, various | https://www.fao.org/animal-disease-information |
| PlantVillage (transfer technique) | — | https://github.com/spMohanty/PlantVillage-Dataset |

> **Always verify labels with a licensed veterinarian before using any
> downloaded dataset for training a clinical tool.**

---

## Training with Real Data

Once you have at least 30 images per class:

```powershell
# From the ml-service directory
$env:USE_REAL_DATA = "1"
python training/train_image_model.py
```

Or for more epochs:

```powershell
$env:USE_REAL_DATA = "1"
$env:PHASE1_EPOCHS = "15"
$env:PHASE2_EPOCHS = "12"
python training/train_image_model.py
```

Then restart the ML service to load the new model:

```powershell
# Stop and restart the python app.py process
python app.py
```

---

## Expected Accuracy

| Data type | Expected val. accuracy |
|-----------|----------------------|
| Synthetic only (demo) | ~85–92% on synthetic, poor on real photos |
| 30 real images/class | ~70–80% on real photos |
| 100 real images/class | ~82–88% on real photos |
| 300+ real images/class | ~88–95%+ on real photos |

The MobileNetV2 backbone is pre-trained on ImageNet, so it already
understands textures, edges, and colour patterns — a small real dataset
goes a long way.
