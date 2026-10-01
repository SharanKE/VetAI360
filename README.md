# VetAI 360 — Integrated AI-Based Smart Veterinary Healthcare System

A full-stack implementation of the VetAI 360 concept: IoT livestock vitals
monitoring, AI symptom & image-based disease screening, vaccination
scheduling, real-time alerts, and vet telemedicine — for farmers, vets, and
admins.

## What's inside

| Folder | Stack | Purpose |
|---|---|---|
| `backend/` | Node.js, Express, SQLite or MongoDB, Socket.IO | REST API, auth, real-time alerts/chat, IoT sensor simulator, vaccination reminders |
| `ml-service/` | Python, Flask, scikit-learn, TensorFlow/Keras | Symptom-based disease prediction (RandomForest) and photo-based visual diagnosis (CNN) |
| `frontend/` | React, Vite, Tailwind CSS, Recharts, Socket.IO client | Farmer / Vet / Admin dashboards |

No cloud account or API key is required for local development — SQLite is a
local file and both AI models train themselves automatically on first run if
missing.

For production deployments, use `docker compose up` with MongoDB (see below).
Set `DB_TYPE=mongo` and `MONGODB_URI` in `backend/.env` when running MongoDB manually.

**Honesty about the AI models:** the symptom model is trained on a
synthetic-but-veterinary-informed dataset (see
`ml-service/training/train_symptom_model.py`), and the image model is
trained on procedurally rendered placeholder images (see
`ml-service/training/train_image_model.py`) because no licensed veterinary
dataset is bundled with this project. Both pipelines are real and fully
functional end-to-end — swap in a real labeled dataset later without
touching the API or frontend. This is called out again in-app on the image
diagnosis result.

## Prerequisites

- Node.js 18+
- Python 3.10–3.12 (for the ML service)
- VS Code (recommended: install the "ES7+ React" and "Python" extensions)

Optional for production-style deployment:

- Docker Desktop (runs MongoDB + all services together)

## Quick start (local development)

From the repo root, install everything, seed demo data, and run all three services:

```bash
npm run install:all
npm run seed
npm run dev
```

This starts:

- Backend API at http://localhost:5000
- Frontend at http://localhost:5173
- ML service at http://localhost:8000

The backend defaults to **SQLite** (`DB_TYPE=sqlite`) — no external database required.

## Production-style deployment (Docker)

Run the full stack with MongoDB, backend, ML service, and frontend:

```bash
docker compose up --build
```

Then open http://localhost:5173. Demo accounts are seeded automatically on first boot.

Set a strong `JWT_SECRET` in production:

```bash
JWT_SECRET=your-long-random-secret docker compose up --build
```

## Cloud deployment (MongoDB Atlas + Render)

For a real-world cloud deployment with a managed MongoDB database:

1. **MongoDB Atlas** — free M0 cluster for production data
2. **Render.com** — hosts frontend, API, and ML service

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the full step-by-step guide including:
- Atlas cluster setup and connection string
- One-click Render Blueprint deploy (`render.yaml`)
- Environment variables, troubleshooting, and custom domains

Quick Atlas test (after setting `MONGODB_URI` in `backend/.env`):

```bash
npm run setup:atlas        # verify connection
npm run setup:atlas:seed   # seed demo data to Atlas
```

## 1. Backend setup

```bash
cd backend
npm install
cp .env.example .env
npm run seed      # creates demo accounts + demo animals
npm run dev        # http://localhost:5000
```

Demo accounts created by `npm run seed`:

| Role | Email | Password |
|---|---|---|
| Farmer | farmer@vetai360.dev | farmer123 |
| Vet | vet@vetai360.dev | vet123 |
| Admin | admin@vetai360.dev | admin123 |

## 2. ML service setup

```bash
cd ml-service
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python app.py                     # http://localhost:8000
```

The first run trains and saves both models to `ml-service/models/`
(takes under a minute on a laptop CPU). Subsequent runs load the saved
models instantly. Delete the `models/` folder to force retraining.

### Train the photo model with your own animal images

The bundled visual model is a demo and must not be used as a veterinary
diagnosis. To train it with real photos, organize veterinarian-confirmed images
as `ml-service/training/real_data/<species>/<disease>/image.jpg`, then run:

```powershell
cd ml-service
$env:USE_REAL_DATA = "1"
python training/train_image_model.py
```

The trained model will return both the learned animal species and the visible
disease pattern. Full data-quality and safety guidance is in
[`ml-service/training/REAL_DATASET_GUIDE.md`](./ml-service/training/REAL_DATASET_GUIDE.md).

## 3. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev        # http://localhost:5173
```

Open http://localhost:5173, sign in with a demo account (or register a new
farmer/vet), and explore.

## Running all three in VS Code

Open the repo root in VS Code, open three integrated terminals (`` Ctrl+` ``
three times), and run one command above in each. Or install the "Run on
Save" / multi-terminal extension of your choice — nothing here requires a
process manager.

## How each PPT requirement maps to this codebase

- **IoT smart collar (MLX90614, MAX30102, MPU6050, NEO-6M GPS, ESP32):**
  `backend/services/sensorSimulator.js` plays the role of the ESP32 +
  sensors, streaming realistic temperature/heart-rate/activity readings
  over Socket.IO every few seconds. Real hardware can be dropped in with
  zero API changes by POSTing readings to `POST /api/sensors/:animalId/readings`.
- **AI disease prediction (XGBoost-style ensemble):** `ml-service` symptom
  model, a RandomForest ensemble classifier served at `POST /predict/symptoms`.
- **Image-based diagnosis (CNN / MobileNetV2-style):** `ml-service` image
  model, a compact CNN served at `POST /predict/image`.
- **Cloud/real-time database (Firebase-style):** Socket.IO rooms push live
  sensor updates, alerts, and chat messages to connected clients instantly.
- **Backend server (FastAPI-style REST + auth + business logic):** Express
  REST API in `backend/routes/*`.
- **Relational database (PostgreSQL-style):** SQLite (default, zero setup) or
  MongoDB (Docker/production). Swapping backends only touches `backend/.env`
  (`DB_TYPE=sqlite` or `DB_TYPE=mongo`).
- **Web dashboard (React.js):** `frontend/`, with farmer, vet, and admin views.
- **Telemedicine / video consultation:** `frontend/src/pages/AppointmentRoom.jsx`
  embeds a Jitsi Meet room (no API key needed) plus a persisted live chat.
- **Vaccination reminders & alerts:** `backend/services/vaccinationReminder.js`
  (daily cron) and `backend/services/alertEngine.js` (threshold-based vitals alerts).

## Real-world problems this addresses

1. **Delayed disease detection** — continuous IoT vitals + threshold alerts
   catch fever, low activity, or abnormal heart rate before a farmer would
   notice visually.
2. **Limited vet access in rural areas** — telemedicine lets a farmer reach
   a verified vet without traveling, with AI screening to triage urgency.
3. **Fragmented health records** — every animal has one longitudinal record:
   vitals history, diagnoses, vaccinations, and AI screening results.
4. **Missed vaccinations** — automatic due/overdue reminders surfaced as
   alerts and on the dashboard.
5. **Disease outbreak risk (e.g. FMD, Lumpy Skin Disease)** — early AI
   flagging plus a recommendation to isolate the animal.

## Project structure

```
vetai360/
├── backend/
│   ├── config/db.js            SQLite schema + connection
│   ├── models/                 Data access layer
│   ├── routes/                 REST endpoints
│   ├── middleware/auth.js      JWT auth + role guards
│   ├── services/                Sensor simulator, alert engine, vaccination
│   │                            reminders, Socket.IO handlers, ML client
│   ├── utils/seed.js           Demo data seeding
│   └── server.js               App entrypoint
├── ml-service/
│   ├── training/                Model training scripts (auto-run if needed)
│   ├── models/                  Saved model artifacts (generated)
│   └── app.py                   Flask API
└── frontend/
    └── src/
        ├── pages/                One file per screen
        ├── components/           Shared UI + charts
        ├── context/               Auth + Socket.IO providers
        └── layouts/DashboardLayout.jsx
```

## Troubleshooting

- **"AI diagnosis service isn't reachable"** — the ml-service isn't running,
  or `ML_SERVICE_URL` in `backend/.env` doesn't match its port.
- **Frontend can't log in** — check `VITE_API_URL` in `frontend/.env` points
  to the running backend, and that you ran `npm run seed`.
- **No live vitals on a new animal** — the simulator only generates data for
  animals with `monitoring_enabled = 1` (the default) and needs a few
  cycles (~8s each) to populate the chart.
