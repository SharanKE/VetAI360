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

  server.listen(PORT, () => {
    console.log(`\nVetAI 360 API listening on port ${PORT} (${process.env.NODE_ENV || "development"})`);
    sensorSimulator.start(io);
    vaccinationReminder.start(io);
  });
}

boot().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
