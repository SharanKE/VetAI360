const path = require("path");
const fs = require("fs");

const backendEnv = path.join(__dirname, ".env");
if (fs.existsSync(backendEnv)) {
  require("dotenv").config({ path: backendEnv });
} else {
  require("dotenv").config();
}
const express = require("express");
const http = require("http");
const cors = require("cors");
const morgan = require("morgan");
const fileUpload = require("express-fileupload");
const { Server } = require("socket.io");

if (process.env.DB_TYPE === "mongo") {
  // Models load here; connection happens in boot()
  require("./config/mongo");
} else {
  require("./config/db");
}

const { attachSocketHandlers } = require("./services/socket");
const sensorSimulator = require("./services/sensorSimulator");
const vaccinationReminder = require("./services/vaccinationReminder");

const authRoutes = require("./routes/auth");
const animalRoutes = require("./routes/animals");
const vaccinationRoutes = require("./routes/vaccinations");
const sensorRoutes = require("./routes/sensors");
const alertRoutes = require("./routes/alerts");
const predictRoutes = require("./routes/predict");
const appointmentRoutes = require("./routes/appointments");
const adminRoutes = require("./routes/admin");

const app = express();
const server = http.createServer(app);

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

function parseAllowedOrigins() {
  const raw = process.env.CLIENT_ORIGIN || "http://localhost:5173";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const allowedOrigins = parseAllowedOrigins();

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (process.env.ALLOW_RENDER_ORIGINS === "true" && origin.endsWith(".onrender.com")) return true;
  // Allow any localhost origin during development
  if (process.env.NODE_ENV !== "production" && origin.startsWith("http://localhost")) return true;
  return false;
}

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
};

const io = new Server(server, { cors: corsOptions });
app.set("io", io);

app.use(cors(corsOptions));
app.use(express.json());
app.use(fileUpload({ limits: { fileSize: 8 * 1024 * 1024 } }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/api/health", async (req, res) => {
  const payload = {
    status: "ok",
    service: "vetai360-backend",
    db: process.env.DB_TYPE || "sqlite",
    time: new Date().toISOString(),
  };

  if (process.env.DB_TYPE === "mongo") {
    const { mongoHealth } = require("./config/mongo");
    const mongo = await mongoHealth();
    payload.mongodb = mongo.ok ? "connected" : "disconnected";
    if (!mongo.ok) {
      return res.status(503).json({ ...payload, status: "degraded", mongoError: mongo.error });
    }
  }

  res.json(payload);
});

app.use("/api/auth", authRoutes);
app.use("/api/animals", animalRoutes);
app.use("/api/vaccinations", vaccinationRoutes);
app.use("/api/sensors", sensorRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/predict", predictRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/admin", adminRoutes);

// Serve production static frontend if built
const frontendDist = path.join(__dirname, "../frontend/dist");
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

app.use((req, res) => {
  res.status(404).json({ error: "Route not found." });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  if (err.message?.includes("not allowed by CORS")) {
    return res.status(403).json({ error: "Origin not allowed." });
  }
  res.status(500).json({ error: "Something went wrong on the server." });
});

attachSocketHandlers(io);

const PORT = process.env.PORT || 5000;

async function boot() {
  if (process.env.DB_TYPE === "mongo") {
    const { connectMongo } = require("./config/mongo");
    await connectMongo();
  }

  // Auto-seed demo accounts on initial boot if empty
  try {
    const User = require("./models/User");
    const adminUser = await User.findByEmail("admin@vetai360.dev");
    if (!adminUser) {
      console.log("Database empty — auto-seeding demo accounts & livestock data...");
      const bcrypt = require("bcryptjs");
      const Animal = require("./models/Animal");
      const Vaccination = require("./models/Vaccination");
      const HealthRecord = require("./models/HealthRecord");
      const { toId } = require("./utils/id");

      const admin = await User.create({ name: "Platform Admin", email: "admin@vetai360.dev", passwordHash: bcrypt.hashSync("admin123", 10), role: "admin", phone: "+91 90000 00001" });
      const farmer = await User.create({ name: "Ramesh Gowda", email: "farmer@vetai360.dev", passwordHash: bcrypt.hashSync("farmer123", 10), role: "farmer", phone: "+91 90000 00002" });
      const vet = await User.create({ name: "Dr. Arpitha J C", email: "vet@vetai360.dev", passwordHash: bcrypt.hashSync("vet123", 10), role: "vet", phone: "+91 90000 00003", specialty: "Large Animal Medicine" });
      
      const farmerId = toId(farmer.id ?? farmer._id);
      const vetId = toId(vet.id ?? vet._id);
      await User.setVerified(vetId, true);

      const cow = await Animal.create({ ownerId: farmerId, name: "Ganga", species: "Cattle", breed: "Gir", gender: "Female", ageMonths: 40, tagId: "IN-KA-0192" });
      const goat = await Animal.create({ ownerId: farmerId, name: "Motu", species: "Goat", breed: "Osmanabadi", gender: "Male", ageMonths: 14, tagId: "IN-KA-0193" });

      const cowId = toId(cow.id);
      const goatId = toId(goat.id);
      await Vaccination.create({ animalId: cowId, vaccineName: "Foot and Mouth Disease (FMD)", dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0,10) });
      await Vaccination.create({ animalId: goatId, vaccineName: "PPR Vaccine", dueDate: new Date(Date.now() - 2 * 86400000).toISOString().slice(0,10) });
      await HealthRecord.create({ animalId: cowId, vetId, diagnosis: "Routine checkup — healthy", treatment: "None", notes: "Good body condition score.", source: "manual" });
      console.log("Auto-seeding complete!");
    }
  } catch (seedErr) {
    console.warn("Auto-seed check notice:", seedErr.message);
  }

  const HOST = "0.0.0.0";
  server.listen(PORT, HOST, () => {
    console.log(`\nVetAI 360 API listening on ${HOST}:${PORT} (${process.env.NODE_ENV || "development"})`);
    sensorSimulator.start(io);
    vaccinationReminder.start(io);
  });
}

boot().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
