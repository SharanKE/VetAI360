"""
VetAI 360 — Visual Screening Model (v2)
=======================================
Architecture: MobileNetV2 (ImageNet pre-trained) + custom classification head.
              Transfer learning gives meaningful feature extraction even on
              synthetic data, and generalises far better to real animal photos
              than a scratch CNN trained on coloured blobs.

Synthetic data (default / demo mode):
  Each disease class is rendered with texture, colour variation, multiple
  lesion morphologies, and random augmentation so the model learns
  visually-discriminative features rather than trivial colour patches.

Real data mode (recommended for production):
  Place vet-reviewed photos under:
      training/real_data/<species>/<disease>/*.{jpg,jpeg,png}
  Example:
      training/real_data/cattle/lumpy_skin_disease/photo_001.jpg
      training/real_data/cattle/healthy_skin/photo_002.jpg
  Then run:
      USE_REAL_DATA=1 python training/train_image_model.py

Minimum: 30 images per species/disease combination.
More data = better accuracy. 200+ per class is ideal for clinical use.
"""

import json
import os
import random
from collections import Counter

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

random.seed(42)
np.random.seed(42)

IMG_SIZE = 224          # MobileNetV2 native input size
SAMPLES_PER_CLASS = 600 # more samples → better generalisation
IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".bmp", ".webp")

DEFAULT_CLASSES = [
    "Healthy Skin",
    "Lumpy Skin Disease",
    "Mange / Ringworm",
    "FMD Blister Lesion",
]

RECOMMENDATIONS = {
    "Healthy Skin": (
        "No visible skin lesion pattern detected. Continue routine grooming "
        "and monitoring. A photo cannot rule out internal illness."
    ),
    "Lumpy Skin Disease": (
        "Visual pattern consistent with nodular skin lesions. Isolate the "
        "animal immediately, control biting insects, and contact a veterinarian "
        "— Lumpy Skin Disease is a notifiable disease in many regions."
    ),
    "Mange / Ringworm": (
        "Visual pattern consistent with patchy hair loss or skin infection. "
        "Arrange a vet visit for skin scraping and microscopic confirmation. "
        "Anti-parasitic or antifungal treatment is typically required."
    ),
    "FMD Blister Lesion": (
        "Visual pattern consistent with blister-type lesions around the mouth, "
        "feet, or teats. Isolate the animal immediately and notify a veterinarian "
        "— Foot and Mouth Disease is highly contagious and often notifiable."
    ),
}

# ── Realistic texture helpers ─────────────────────────────────────────────────

def _noise(shape, scale=12):
    """Add Gaussian noise to simulate fur/skin texture."""
    return np.random.normal(0, scale, shape).astype(np.int16)


def _fur_texture(base_color, size=IMG_SIZE):
    """Generate a base skin/fur patch with natural colour variation."""
    arr = np.full((size, size, 3), base_color, dtype=np.int16)
    arr += _noise((size, size, 3), scale=18)
    # Add streaky fur lines
    for _ in range(random.randint(30, 60)):
        x = random.randint(0, size - 1)
        length = random.randint(20, size)
        direction = random.choice(["v", "h", "d"])
        color_shift = random.randint(-25, 25)
        for i in range(length):
            if direction == "v" and x + i < size:
                arr[x + i, x % size] += color_shift
            elif direction == "h" and x + i < size:
                arr[x % size, x + i] += color_shift
    arr = np.clip(arr, 0, 255).astype(np.uint8)
    img = Image.fromarray(arr)
    # Slight blur to blend streaks
    img = img.filter(ImageFilter.GaussianBlur(radius=random.uniform(0.4, 1.2)))
    # Random brightness/contrast variation
    img = ImageEnhance.Brightness(img).enhance(random.uniform(0.75, 1.25))
    img = ImageEnhance.Contrast(img).enhance(random.uniform(0.8, 1.3))
    return img


def _random_fur_color():
    """Return a realistic cattle/goat/sheep skin base colour."""
    palettes = [
        (160, 120, 85),   # tan brown
        (100, 75, 55),    # dark brown
        (195, 175, 145),  # light fawn
        (65, 50, 38),     # very dark brown
        (220, 200, 170),  # cream/white
        (140, 105, 78),   # reddish brown
        (80, 65, 52),     # charcoal brown
    ]
    base = list(random.choice(palettes))
    return tuple(max(0, min(255, c + random.randint(-15, 15))) for c in base)


# ── Per-class synthetic renderers ─────────────────────────────────────────────

def render_healthy():
    """Clean, unblemished skin/fur — no lesions."""
    img = _fur_texture(_random_fur_color())
    # Occasional natural markings (not lesions)
    if random.random() < 0.3:
        draw = ImageDraw.Draw(img)
        x, y = random.randint(20, IMG_SIZE - 40), random.randint(20, IMG_SIZE - 40)
        w, h = random.randint(10, 25), random.randint(10, 25)
        base = _random_fur_color()
        draw.ellipse([x, y, x + w, y + h],
                     fill=tuple(max(0, c - 15) for c in base))
    return img.filter(ImageFilter.SMOOTH)


def render_lumpy():
    """
    Lumpy Skin Disease: multiple firm, round, raised nodules (2-5 cm).
    Nodules are darker/redder than surrounding skin, with defined edges.
    """
    base = _random_fur_color()
    img = _fur_texture(base)
    draw = ImageDraw.Draw(img)
    n_nodules = random.randint(6, 18)
    for _ in range(n_nodules):
        x = random.randint(10, IMG_SIZE - 25)
        y = random.randint(10, IMG_SIZE - 25)
        r = random.randint(8, 22)
        # Nodule: darker, with reddish centre
        nodule_color = (
            max(0, base[0] - random.randint(40, 80)),
            max(0, base[1] - random.randint(50, 90)),
            max(0, base[2] - random.randint(20, 40)),
        )
        centre_color = (
            min(255, nodule_color[0] + random.randint(30, 60)),
            max(0, nodule_color[1] - 20),
            max(0, nodule_color[2] - 20),
        )
        draw.ellipse([x - r, y - r, x + r, y + r], fill=nodule_color)
        draw.ellipse([x - r // 2, y - r // 2, x + r // 2, y + r // 2],
                     fill=centre_color)
    return img.filter(ImageFilter.SMOOTH_MORE)


def render_mange():
    """
    Mange / Ringworm: irregular patches of hair loss, crusty/scaly skin,
    redness at patch edges, often with raw-looking exposed skin.
    """
    base = _random_fur_color()
    img = _fur_texture(base)
    draw = ImageDraw.Draw(img)
    n_patches = random.randint(3, 8)
    for _ in range(n_patches):
        cx = random.randint(20, IMG_SIZE - 20)
        cy = random.randint(20, IMG_SIZE - 20)
        w = random.randint(20, 55)
        h = random.randint(20, 55)
        # Raw exposed skin: pinkish-red
        exposed = (
            min(255, base[0] + random.randint(20, 60)),
            max(0, base[1] - random.randint(30, 60)),
            max(0, base[2] - random.randint(20, 40)),
        )
        draw.ellipse([cx - w, cy - h, cx + w, cy + h], fill=exposed)
        # Crusty border ring
        crust = (
            min(255, base[0] + random.randint(40, 80)),
            min(255, base[1] + random.randint(10, 30)),
            max(0, base[2] - random.randint(10, 30)),
        )
        for _ in range(random.randint(8, 18)):
            bx = cx + random.randint(-w - 5, w + 5)
            by = cy + random.randint(-h - 5, h + 5)
            br = random.randint(2, 6)
            draw.ellipse([bx - br, by - br, bx + br, by + br], fill=crust)
    return img.filter(ImageFilter.SMOOTH)


def render_fmd():
    """
    FMD Blister Lesion: fluid-filled vesicles / ruptured blisters around
    mouth, gums, feet. Pale yellow/white raised blisters on pink tissue.
    """
    # FMD typically seen on mucosa — pinkish wet tissue base
    mucosal_base = (
        random.randint(180, 220),
        random.randint(110, 150),
        random.randint(100, 140),
    )
    img = _fur_texture(mucosal_base)
    draw = ImageDraw.Draw(img)
    # Add inflamed red background patches
    for _ in range(random.randint(2, 5)):
        x, y = random.randint(0, IMG_SIZE), random.randint(0, IMG_SIZE)
        r = random.randint(20, 50)
        draw.ellipse([x - r, y - r, x + r, y + r],
                     fill=(min(255, mucosal_base[0] - 20),
                           max(0, mucosal_base[1] - 40),
                           max(0, mucosal_base[2] - 40)),
                     outline=None)
    # Blisters: pale yellow/white raised circles with darker rim
    n_blisters = random.randint(4, 12)
    for _ in range(n_blisters):
        x = random.randint(15, IMG_SIZE - 15)
        y = random.randint(15, IMG_SIZE - 15)
        r = random.randint(6, 16)
        blister_fill = (
            random.randint(220, 255),
            random.randint(215, 250),
            random.randint(180, 220),
        )
        rim = (
            random.randint(160, 200),
            random.randint(80, 110),
            random.randint(60, 90),
        )
        draw.ellipse([x - r, y - r, x + r, y + r], fill=rim)
        draw.ellipse([x - r + 3, y - r + 3, x + r - 3, y + r - 3],
                     fill=blister_fill)
    return img.filter(ImageFilter.SMOOTH)


RENDERERS = {
    "Healthy Skin": render_healthy,
    "Lumpy Skin Disease": render_lumpy,
    "Mange / Ringworm": render_mange,
    "FMD Blister Lesion": render_fmd,
}


# ── Dataset builders ──────────────────────────────────────────────────────────

def build_demo_dataset(samples_per_class=SAMPLES_PER_CLASS):
    X, y = [], []
    for idx, label in enumerate(DEFAULT_CLASSES):
        print(f"  Rendering {samples_per_class} synthetic images for: {label}")
        for _ in range(samples_per_class):
            img = RENDERERS[label]()
            arr = np.asarray(img.resize((IMG_SIZE, IMG_SIZE)),
                             dtype=np.float32) / 255.0
            X.append(arr)
            y.append(idx)
    return np.asarray(X), np.asarray(y), [("Unknown", lbl) for lbl in DEFAULT_CLASSES]


def display_name(value):
    return value.replace("_", " ").replace("-", " ").strip().title()


def load_real_dataset(root):
    records = []
    for current_root, _, files in os.walk(root):
        rel = os.path.relpath(current_root, root)
        parts = [] if rel == "." else rel.split(os.sep)
        if not files or not parts:
            continue
        species = display_name(parts[-2]) if len(parts) >= 2 else "Unknown"
        disease = display_name(parts[-1])
        records.extend(
            (os.path.join(current_root, f), species, disease)
            for f in files if f.lower().endswith(IMAGE_EXTENSIONS)
        )
    if not records:
        raise ValueError(
            f"No images found under {root}.\n"
            "Expected layout: real_data/<species>/<disease>/photo.jpg"
        )
    counts = Counter((s, d) for _, s, d in records)
    undersized = [
        f"{s}/{d} ({n} images — need ≥30)"
        for (s, d), n in counts.items() if n < 30
    ]
    if undersized:
        raise ValueError(
            "These folders need at least 30 images each:\n  " +
            "\n  ".join(undersized)
        )
    labels = sorted(counts)
    label_index = {label: i for i, label in enumerate(labels)}
    X, y = [], []
    for path, species, disease in records:
        try:
            img = (Image.open(path)
                   .convert("RGB")
                   .resize((IMG_SIZE, IMG_SIZE)))
            X.append(np.asarray(img, dtype=np.float32) / 255.0)
            y.append(label_index[(species, disease)])
        except Exception as exc:
            print(f"  Skipping unreadable image {path}: {exc}")
    if len(set(y)) < 2:
        raise ValueError("At least 2 labeled species/disease groups are required.")
    return np.asarray(X), np.asarray(y), labels


# ── Model builder ─────────────────────────────────────────────────────────────

def build_model(num_classes, fine_tune=True):
    """
    MobileNetV2 backbone (ImageNet weights) + custom head.
    - Phase 1: train only the head (backbone frozen) — fast convergence
    - Phase 2: fine-tune the top 40 layers of MobileNetV2 — better accuracy
    """
    import tensorflow as tf
    from tensorflow.keras import layers, models, optimizers

    base = tf.keras.applications.MobileNetV2(
        input_shape=(IMG_SIZE, IMG_SIZE, 3),
        include_top=False,
        weights="imagenet",
    )
    base.trainable = False  # Phase 1: freeze backbone

    inputs = tf.keras.Input(shape=(IMG_SIZE, IMG_SIZE, 3))
    # MobileNetV2 expects inputs in [-1, 1]
    x = tf.keras.applications.mobilenet_v2.preprocess_input(inputs * 255.0)
    x = base(x, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dropout(0.35)(x)
    x = layers.Dense(128, activation="relu")(x)
    x = layers.Dropout(0.25)(x)
    outputs = layers.Dense(num_classes, activation="softmax")(x)

    model = models.Model(inputs, outputs)
    model.compile(
        optimizer=optimizers.Adam(1e-3),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model, base


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    import tensorflow as tf
    from sklearn.model_selection import train_test_split
    from tensorflow.keras import optimizers, callbacks

    print("\n=== VetAI 360 — Image Model Training (v2 MobileNetV2) ===\n")

    real_data_root = os.environ.get(
        "REAL_DATA_DIR",
        os.path.join(os.path.dirname(__file__), "real_data"),
    )
    using_real_data = os.environ.get("USE_REAL_DATA") == "1"

    if using_real_data:
        print(f"Loading real images from: {real_data_root}")
        X, y, labels = load_real_dataset(real_data_root)
        print(f"Loaded {len(X)} images across {len(labels)} classes.")
    else:
        print("Demo mode: generating realistic synthetic images.")
        print("For clinical accuracy, add real photos — see training/REAL_DATASET_GUIDE.md\n")
        X, y, labels = build_demo_dataset()

    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.15, random_state=42, stratify=y
    )
    print(f"\nTrain: {len(X_train)} | Val: {len(X_val)} | Classes: {len(labels)}\n")

    num_classes = len(labels)
    model, base_model = build_model(num_classes)

    # ── Phase 1: train head only ──────────────────────────────────────────────
    phase1_epochs = int(os.environ.get("PHASE1_EPOCHS", "10"))
    print(f"Phase 1: Training classification head ({phase1_epochs} epochs)…")

    augmentation = tf.keras.Sequential([
        tf.keras.layers.RandomFlip("horizontal_and_vertical"),
        tf.keras.layers.RandomRotation(0.15),
        tf.keras.layers.RandomZoom(0.15),
        tf.keras.layers.RandomBrightness(0.15),
        tf.keras.layers.RandomContrast(0.15),
    ])

    # Apply augmentation to training data
    X_train_aug = np.array([
        np.clip(
            np.array(
                augmentation(
                    tf.expand_dims(img, 0), training=True
                )[0]
            ),
            0.0, 1.0
        )
        for img in X_train
    ], dtype=np.float32)

    early_stop = callbacks.EarlyStopping(
        monitor="val_accuracy", patience=4, restore_best_weights=True
    )

    history1 = model.fit(
        X_train_aug, y_train,
        validation_data=(X_val, y_val),
        epochs=phase1_epochs,
        batch_size=32,
        callbacks=[early_stop],
        verbose=2,
    )

    # ── Phase 2: fine-tune top layers of MobileNetV2 ─────────────────────────
    phase2_epochs = int(os.environ.get("PHASE2_EPOCHS", "8"))
    print(f"\nPhase 2: Fine-tuning top MobileNetV2 layers ({phase2_epochs} epochs)…")

    base_model.trainable = True
    # Freeze all layers except the last 40
    for layer in base_model.layers[:-40]:
        layer.trainable = False

    model.compile(
        optimizer=optimizers.Adam(1e-4),  # lower LR for fine-tuning
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )

    early_stop2 = callbacks.EarlyStopping(
        monitor="val_accuracy", patience=5, restore_best_weights=True
    )

    history2 = model.fit(
        X_train_aug, y_train,
        validation_data=(X_val, y_val),
        epochs=phase2_epochs,
        batch_size=16,
        callbacks=[early_stop2],
        verbose=2,
    )

    val_acc = max(
        max(history1.history["val_accuracy"]),
        max(history2.history["val_accuracy"]),
    )
    print(f"\nBest validation accuracy: {val_acc:.3f}")

    # ── Save ──────────────────────────────────────────────────────────────────
    out_dir = os.path.join(os.path.dirname(__file__), "..", "models")
    os.makedirs(out_dir, exist_ok=True)

    model.save(os.path.join(out_dir, "image_model.keras"))

    class_names = [
        f"{s} | {d}" if s != "Unknown" else d
        for s, d in labels
    ]
    label_details = [{"species": s, "disease": d} for s, d in labels]

    meta = {
        "format_version": 3,
        "classes": class_names,
        "label_details": label_details,
        "img_size": IMG_SIZE,
        "recommendations": RECOMMENDATIONS,
        "validation_accuracy": round(float(val_acc), 4),
        "trained_on_real_data": using_real_data,
        "model_architecture": "MobileNetV2 transfer learning",
        "note": (
            "Trained on vet-reviewed real photos."
            if using_real_data else
            "Demo model: MobileNetV2 fine-tuned on synthetic disease patterns. "
            "Add real animal photos for clinical-grade accuracy. "
            "See training/REAL_DATASET_GUIDE.md"
        ),
    }

    with open(os.path.join(out_dir, "image_meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    print(f"Saved model + metadata → {out_dir}")
    print(f"Classes: {class_names}")
    print(
        "\nTo improve accuracy significantly, add real animal photos:\n"
        "  training/real_data/<species>/<disease>/*.jpg\n"
        "  Then run: USE_REAL_DATA=1 python training/train_image_model.py\n"
    )


if __name__ == "__main__":
    main()
