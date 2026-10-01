const path = require("path");
const fs = require("fs");
const { DatabaseSync } = require("node:sqlite");

const dbPath = process.env.DB_PATH || "./data/vetai360.db";
const resolvedPath = path.resolve(__dirname, "..", dbPath.replace("./", ""));

// Ensure the data directory exists
fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

const db = new DatabaseSync(resolvedPath);
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

// ---------------------------------------------------------------------------
// Schema. better-sqlite3 runs this synchronously and idempotently
// (CREATE TABLE IF NOT EXISTS) every time the server boots, so there is no
// separate migration step required to get started.
// ---------------------------------------------------------------------------
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('farmer', 'vet', 'admin')),
  phone         TEXT,
  specialty     TEXT,          -- vets only: e.g. "Large Animal Medicine"
  verified      INTEGER NOT NULL DEFAULT 0, -- vets must be verified by an admin
  language      TEXT DEFAULT 'en',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS animals (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  species       TEXT NOT NULL,   -- Cattle, Buffalo, Goat, Sheep, Poultry, Other
  breed         TEXT,
  gender        TEXT,
  age_months    INTEGER,
  tag_id        TEXT,
  photo_url     TEXT,
  monitoring_enabled INTEGER NOT NULL DEFAULT 1,
  geofence_center_lat REAL DEFAULT 12.9716,
  geofence_center_lng REAL DEFAULT 77.5946,
  geofence_radius_m   INTEGER DEFAULT 500,
  last_latitude       REAL DEFAULT 12.9716,
  last_longitude      REAL DEFAULT 77.5946,
  device_id           TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS health_records (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  animal_id   INTEGER NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  vet_id      INTEGER REFERENCES users(id),
  diagnosis   TEXT NOT NULL,
  treatment   TEXT,
  notes       TEXT,
  source      TEXT DEFAULT 'manual', -- manual | symptom_ai | image_ai
  confidence  REAL,
  record_date TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vaccinations (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  animal_id      INTEGER NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  vaccine_name   TEXT NOT NULL,
  due_date       TEXT NOT NULL,
  completed      INTEGER NOT NULL DEFAULT 0,
  completed_date TEXT,
  notes          TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sensor_readings (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  animal_id      INTEGER NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  temperature_c  REAL NOT NULL,
  heart_rate_bpm INTEGER NOT NULL,
  activity_level REAL NOT NULL, -- 0-100 relative activity index
  rumination_min REAL,          -- minutes of rumination per hour (cattle-specific)
  latitude       REAL DEFAULT 12.9716,
  longitude      REAL DEFAULT 77.5946,
  battery_pct    INTEGER DEFAULT 100,
  is_out_of_bounds INTEGER DEFAULT 0,
  recorded_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS alerts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  animal_id   INTEGER NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,     -- fever, tachycardia, low_activity, vaccination_due, ai_disease_risk, geofence_breach
  severity    TEXT NOT NULL,     -- low, medium, high, critical
  message     TEXT NOT NULL,
  resolved    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS appointments (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  farmer_id      INTEGER NOT NULL REFERENCES users(id),
  vet_id         INTEGER NOT NULL REFERENCES users(id),
  animal_id      INTEGER REFERENCES animals(id),
  reason         TEXT,
  scheduled_time TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, completed, cancelled
  meeting_room   TEXT NOT NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_id INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  sender_id      INTEGER NOT NULL REFERENCES users(id),
  message        TEXT NOT NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS predictions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  animal_id    INTEGER REFERENCES animals(id) ON DELETE CASCADE,
  requested_by INTEGER REFERENCES users(id),
  type         TEXT NOT NULL, -- symptom | image
  input_summary TEXT,
  result_label  TEXT NOT NULL,
  confidence    REAL NOT NULL,
  recommendation TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sensor_animal_time ON sensor_readings(animal_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_alerts_animal ON alerts(animal_id, resolved);
CREATE INDEX IF NOT EXISTS idx_animals_owner ON animals(owner_id);
`);

// Safe column migrations for existing SQLite databases
const migrations = [
  "ALTER TABLE animals ADD COLUMN geofence_center_lat REAL DEFAULT 12.9716",
  "ALTER TABLE animals ADD COLUMN geofence_center_lng REAL DEFAULT 77.5946",
  "ALTER TABLE animals ADD COLUMN geofence_radius_m INTEGER DEFAULT 500",
  "ALTER TABLE animals ADD COLUMN last_latitude REAL DEFAULT 12.9716",
  "ALTER TABLE animals ADD COLUMN last_longitude REAL DEFAULT 77.5946",
  "ALTER TABLE animals ADD COLUMN device_id TEXT",
  "ALTER TABLE sensor_readings ADD COLUMN latitude REAL DEFAULT 12.9716",
  "ALTER TABLE sensor_readings ADD COLUMN longitude REAL DEFAULT 77.5946",
  "ALTER TABLE sensor_readings ADD COLUMN battery_pct INTEGER DEFAULT 100",
  "ALTER TABLE sensor_readings ADD COLUMN is_out_of_bounds INTEGER DEFAULT 0",
];

for (const sql of migrations) {
  try {
    db.exec(sql);
  } catch {
    // Column already exists, safe to ignore
  }
}

module.exports = db;
