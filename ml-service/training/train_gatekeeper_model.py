"""
VetAI 360 — Gatekeeper / Input-Validation Model
================================================
Binary classifier: "animal skin / fur / mucosa" vs "not an animal".

This model runs BEFORE the disease model. If the image does not look like
animal skin, fur, a wound, or mucosal tissue it is rejected immediately
with a clear error — no disease result is shown.

"Not animal" covers: circuit boards, mechanical parts, plants, food,
documents, text, sky, buildings, human faces, solid colour fills, etc.

Synthetic rendering strategy
-----------------------------
Animal class  : fur patches with realistic colour, texture, noise, and the
                same morphologies used in the disease model so the gate
                learns "animal skin texture" not just "one colour".
Not-animal class: diverse synthetic images that look nothing like fur:
  - Grid / PCB patterns  (circuits, screens)
  - Linear stripes        (fabric, text lines, cables)
  - Geometric shapes      (rectangles, circles — UI / objects)
  - Gradient fills        (sky, smooth backgrounds)
  - Random noise          (static, interference)
  - Mixed colour blocks   (Mondrian-style — packaging, signage)
"""

import json
import os
import random
import math

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

random.seed(7)
np.random.seed(7)

IMG_SIZE = 224
SAMPLES_PER_CLASS = 800   # more non-animal variety = harder to fool

# ── Animal-skin renderer (same as disease model to share feature space) ───────

def _noise(shape, scale=14):
    return np.random.normal(0, scale, shape).astype(np.int16)

def _random_fur_color():
    palettes = [
        (160,120,85),(100,75,55),(195,175,145),(65,50,38),
        (220,200,170),(140,105,78),(80,65,52),(210,185,155),
        (55,40,30),(175,140,100),
    ]
    base = list(random.choice(palettes))
    return tuple(max(0,min(255,c+random.randint(-20,20))) for c in base)

def render_animal_skin():
    """Realistic fur / skin patch — may include lesion-like marks."""
    base = _random_fur_color()
    arr = np.full((IMG_SIZE,IMG_SIZE,3), base, dtype=np.int16)
    arr += _noise((IMG_SIZE,IMG_SIZE,3), scale=20)
    # Fur streaks
    for _ in range(random.randint(25,55)):
        x = random.randint(0, IMG_SIZE-1)
        length = random.randint(15, IMG_SIZE)
        shift = random.randint(-30,30)
        for i in range(length):
            xi = min(x+i, IMG_SIZE-1)
            arr[xi, x % IMG_SIZE] = np.clip(arr[xi, x % IMG_SIZE]+shift, 0, 255)
    arr = np.clip(arr, 0, 255).astype(np.uint8)
    img = Image.fromarray(arr)
    img = img.filter(ImageFilter.GaussianBlur(radius=random.uniform(0.3,1.0)))
    img = ImageEnhance.Brightness(img).enhance(random.uniform(0.7,1.3))
    img = ImageEnhance.Contrast(img).enhance(random.uniform(0.8,1.4))
    # Random chance of a lesion-like mark (still an animal, just possibly sick)
    if random.random() < 0.55:
        draw = ImageDraw.Draw(img)
        for _ in range(random.randint(1,6)):
            x,y = random.randint(10,IMG_SIZE-20), random.randint(10,IMG_SIZE-20)
            r = random.randint(5,22)
            c = tuple(max(0,min(255,b+random.randint(-70,40))) for b in base)
            draw.ellipse([x-r,y-r,x+r,y+r], fill=c)
    return img

# ── Non-animal renderers ───────────────────────────────────────────────────────

def render_pcb():
    """Circuit board / electronic component pattern."""
    bg = random.choice([(0,100,0),(0,80,20),(20,60,10),(180,140,80),(30,30,30)])
    img = Image.new("RGB",(IMG_SIZE,IMG_SIZE), bg)
    draw = ImageDraw.Draw(img)
    # Traces
    for _ in range(random.randint(15,35)):
        x1,y1 = random.randint(0,IMG_SIZE),random.randint(0,IMG_SIZE)
        x2,y2 = random.randint(0,IMG_SIZE),random.randint(0,IMG_SIZE)
        col = random.choice([(200,180,0),(220,200,10),(255,215,0),(180,160,0)])
        draw.line([x1,y1,x2,y2], fill=col, width=random.randint(1,3))
    # Pads / vias
    for _ in range(random.randint(8,20)):
        x,y = random.randint(5,IMG_SIZE-5),random.randint(5,IMG_SIZE-5)
        r = random.randint(2,7)
        draw.ellipse([x-r,y-r,x+r,y+r], fill=(220,200,0), outline=(0,0,0))
    # IC body
    if random.random() < 0.6:
        x,y = random.randint(30,IMG_SIZE-60),random.randint(30,IMG_SIZE-60)
        w,h = random.randint(40,80),random.randint(30,60)
        draw.rectangle([x,y,x+w,y+h], fill=(20,20,20), outline=(180,180,180))
    return img.filter(ImageFilter.SMOOTH)

def render_stripes():
    """Striped pattern — fabric, screen scanlines, cables, text lines."""
    arr = np.zeros((IMG_SIZE,IMG_SIZE,3), dtype=np.uint8)
    n = random.randint(6,30)
    stripe_w = IMG_SIZE // n
    angle = random.choice(["h","v","d"])
    c1 = tuple(random.randint(0,255) for _ in range(3))
    c2 = tuple(random.randint(0,255) for _ in range(3))
    for i in range(n*2):
        color = np.array(c1 if i%2==0 else c2, dtype=np.uint8)
        if angle == "h":
            y1,y2 = i*stripe_w, min((i+1)*stripe_w, IMG_SIZE)
            arr[y1:y2,:] = color
        elif angle == "v":
            x1,x2 = i*stripe_w, min((i+1)*stripe_w, IMG_SIZE)
            arr[:,x1:x2] = color
        else:
            for y in range(IMG_SIZE):
                for x in range(IMG_SIZE):
                    if ((x+y)//stripe_w)%2==0:
                        arr[y,x] = np.array(c1, dtype=np.uint8)
                    else:
                        arr[y,x] = np.array(c2, dtype=np.uint8)
    img = Image.fromarray(arr)
    img = ImageEnhance.Brightness(img).enhance(random.uniform(0.7,1.3))
    return img

def render_geometric():
    """Geometric shapes — UI elements, packaging, signage, objects."""
    bg = tuple(random.randint(200,255) for _ in range(3))
    img = Image.new("RGB",(IMG_SIZE,IMG_SIZE), bg)
    draw = ImageDraw.Draw(img)
    for _ in range(random.randint(4,14)):
        shape = random.choice(["rect","circle","triangle","line"])
        col = tuple(random.randint(0,220) for _ in range(3))
        x,y = random.randint(0,IMG_SIZE-10),random.randint(0,IMG_SIZE-10)
        w,h = random.randint(10,IMG_SIZE//2),random.randint(10,IMG_SIZE//2)
        if shape == "rect":
            draw.rectangle([x,y,x+w,y+h], fill=col, outline=(0,0,0))
        elif shape == "circle":
            r = min(w,h)//2
            draw.ellipse([x,y,x+r*2,y+r*2], fill=col, outline=(0,0,0))
        elif shape == "triangle":
            draw.polygon([(x,y+h),(x+w//2,y),(x+w,y+h)], fill=col)
        else:
            draw.line([x,y,x+w,y+h], fill=col, width=random.randint(1,5))
    return img

def render_gradient():
    """Smooth gradient — sky, background blur, studio backdrops."""
    c1 = np.array([random.randint(0,255) for _ in range(3)], dtype=np.float32)
    c2 = np.array([random.randint(0,255) for _ in range(3)], dtype=np.float32)
    direction = random.choice(["h","v","radial"])
    arr = np.zeros((IMG_SIZE,IMG_SIZE,3), dtype=np.float32)
    for y in range(IMG_SIZE):
        for x in range(IMG_SIZE):
            if direction == "v":
                t = y / IMG_SIZE
            elif direction == "h":
                t = x / IMG_SIZE
            else:
                cx,cy = IMG_SIZE//2,IMG_SIZE//2
                t = min(math.sqrt((x-cx)**2+(y-cy)**2)/(IMG_SIZE*0.7),1.0)
            arr[y,x] = c1*(1-t)+c2*t
    return Image.fromarray(arr.astype(np.uint8))

def render_noise_static():
    """Pure noise / static — interference, blank sensors."""
    arr = np.random.randint(0,256,(IMG_SIZE,IMG_SIZE,3),dtype=np.uint8)
    img = Image.fromarray(arr)
    if random.random() < 0.5:
        img = img.filter(ImageFilter.GaussianBlur(radius=random.uniform(1,4)))
    return img

def render_colour_blocks():
    """Colour block grid — packaging, Mondrian, flags, UI cards."""
    img = Image.new("RGB",(IMG_SIZE,IMG_SIZE),(255,255,255))
    draw = ImageDraw.Draw(img)
    rows = random.randint(2,6)
    cols = random.randint(2,6)
    for r in range(rows):
        for c in range(cols):
            x1 = c * (IMG_SIZE//cols)
            y1 = r * (IMG_SIZE//rows)
            x2 = x1 + (IMG_SIZE//cols)
            y2 = y1 + (IMG_SIZE//rows)
            col = tuple(random.randint(0,255) for _ in range(3))
            draw.rectangle([x1,y1,x2,y2], fill=col)
    return img

def render_text_like():
    """Regular grid of dots/dashes — simulates text, QR, barcodes."""
    bg = random.choice([(255,255,255),(240,240,240),(0,0,0)])
    fg = (0,0,0) if bg[0]>128 else (255,255,255)
    img = Image.new("RGB",(IMG_SIZE,IMG_SIZE),bg)
    draw = ImageDraw.Draw(img)
    line_h = random.randint(6,18)
    for y in range(0,IMG_SIZE,line_h*2):
        # simulate a line of text (dashes of varying lengths)
        x = random.randint(5,20)
        while x < IMG_SIZE-10:
            w = random.randint(4,25)
            draw.rectangle([x,y+2,x+w,y+line_h-2], fill=fg)
            x += w + random.randint(3,10)
    return img

def render_nature_non_skin():
    """Leaf/grass texture — nature but NOT animal skin."""
    greens = [(34,100,34),(56,120,20),(80,140,40),(100,160,50),(20,80,20)]
    base = random.choice(greens)
    arr = np.full((IMG_SIZE,IMG_SIZE,3), base, dtype=np.int16)
    arr += _noise((IMG_SIZE,IMG_SIZE,3), scale=15)
    arr = np.clip(arr,0,255).astype(np.uint8)
    img = Image.fromarray(arr)
    draw = ImageDraw.Draw(img)
    # Veins / blades
    for _ in range(random.randint(10,30)):
        x1,y1 = random.randint(0,IMG_SIZE),random.randint(0,IMG_SIZE)
        x2,y2 = x1+random.randint(-60,60),y1+random.randint(-60,60)
        shade = tuple(max(0,min(255,c-random.randint(20,50))) for c in base)
        draw.line([x1,y1,x2,y2], fill=shade, width=random.randint(1,2))
    return img.filter(ImageFilter.GaussianBlur(radius=0.6))

NON_ANIMAL_RENDERERS = [
    render_pcb,
    render_stripes,
    render_geometric,
    render_gradient,
    render_noise_static,
    render_colour_blocks,
    render_text_like,
    render_nature_non_skin,
]

# ── Dataset builder ────────────────────────────────────────────────────────────

def build_gatekeeper_dataset(samples_per_class=SAMPLES_PER_CLASS):
    """
    Returns X (float32 0-1), y (0=animal, 1=not_animal), IMG_SIZE already applied.
    """
    X, y = [], []
    print(f"  Rendering {samples_per_class} animal-skin images…")
    for _ in range(samples_per_class):
        img = render_animal_skin().resize((IMG_SIZE,IMG_SIZE))
        X.append(np.asarray(img, dtype=np.float32)/255.0)
        y.append(0)  # 0 = animal

    print(f"  Rendering {samples_per_class} non-animal images…")
    for i in range(samples_per_class):
        renderer = NON_ANIMAL_RENDERERS[i % len(NON_ANIMAL_RENDERERS)]
        img = renderer().resize((IMG_SIZE,IMG_SIZE))
        X.append(np.asarray(img, dtype=np.float32)/255.0)
        y.append(1)  # 1 = not_animal

    idx = list(range(len(X)))
    random.shuffle(idx)
    return np.array([X[i] for i in idx], dtype=np.float32), \
           np.array([y[i] for i in idx], dtype=np.int32)

# ── Model builder ──────────────────────────────────────────────────────────────

def build_gatekeeper_model():
    import tensorflow as tf
    base = tf.keras.applications.MobileNetV2(
        input_shape=(IMG_SIZE,IMG_SIZE,3), include_top=False, weights="imagenet"
    )
    base.trainable = False
    inputs = tf.keras.Input(shape=(IMG_SIZE,IMG_SIZE,3))
    x = tf.keras.applications.mobilenet_v2.preprocess_input(inputs*255.0)
    x = base(x, training=False)
    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    x = tf.keras.layers.Dropout(0.3)(x)
    x = tf.keras.layers.Dense(64, activation="relu")(x)
    outputs = tf.keras.layers.Dense(1, activation="sigmoid")(x)
    model = tf.keras.Model(inputs, outputs)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(1e-3),
        loss="binary_crossentropy",
        metrics=["accuracy"],
    )
    return model, base

# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    import tensorflow as tf
    from sklearn.model_selection import train_test_split
    from tensorflow.keras import callbacks

    print("\n=== VetAI 360 — Gatekeeper Model Training ===\n")
    print("Building animal-skin vs not-animal dataset…")
    X, y = build_gatekeeper_dataset()

    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.15, random_state=42, stratify=y
    )
    print(f"Train: {len(X_train)} | Val: {len(X_val)}\n")

    model, base = build_gatekeeper_model()

    early_stop = callbacks.EarlyStopping(
        monitor="val_accuracy", patience=4, restore_best_weights=True
    )

    # Phase 1 — head only
    print("Phase 1: training head (10 epochs)…")
    h1 = model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=10, batch_size=32,
        callbacks=[early_stop], verbose=2,
    )

    # Phase 2 — fine-tune top 30 layers
    print("\nPhase 2: fine-tuning top MobileNetV2 layers (6 epochs)…")
    base.trainable = True
    for layer in base.layers[:-30]:
        layer.trainable = False
    model.compile(
        optimizer=tf.keras.optimizers.Adam(1e-4),
        loss="binary_crossentropy",
        metrics=["accuracy"],
    )
    early_stop2 = callbacks.EarlyStopping(
        monitor="val_accuracy", patience=4, restore_best_weights=True
    )
    h2 = model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=6, batch_size=16,
        callbacks=[early_stop2], verbose=2,
    )

    best_acc = max(
        max(h1.history["val_accuracy"]),
        max(h2.history["val_accuracy"]),
    )
    print(f"\nBest validation accuracy: {best_acc:.3f}")

    out_dir = os.path.join(os.path.dirname(__file__), "..", "models")
    os.makedirs(out_dir, exist_ok=True)
    model.save(os.path.join(out_dir, "gatekeeper_model.keras"))

    meta = {
        "img_size": IMG_SIZE,
        "label_0": "animal",
        "label_1": "not_animal",
        "not_animal_threshold": 0.55,
        "validation_accuracy": round(float(best_acc), 4),
    }
    with open(os.path.join(out_dir, "gatekeeper_meta.json"), "w") as f:
        json.dump(meta, f, indent=2)

    print(f"Saved gatekeeper model → {out_dir}/gatekeeper_model.keras")


if __name__ == "__main__":
    main()
