#!/usr/bin/env node
/**
 * Verify MongoDB Atlas connection and optionally seed demo data.
 *
 * Usage:
 *   node scripts/setup-atlas.js              # test connection only
 *   node scripts/setup-atlas.js --seed       # connect + seed demo accounts
 *
 * Requires MONGODB_URI in backend/.env or environment.
 */
require("../backend/node_modules/dotenv").config({
  path: require("path").join(__dirname, "..", "backend", ".env"),
});

process.env.DB_TYPE = "mongo";

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error("\n❌  MONGODB_URI is not set.");
    console.error("    Add it to backend/.env or export it in your shell.");
    console.error("    Example: mongodb+srv://user:pass@cluster.mongodb.net/vetai360\n");
    process.exit(1);
  }

  const masked = uri.replace(/:([^:@/]+)@/, ":****@");
  console.log("\n🔌  Connecting to:", masked);

  const { connectMongo, mongoHealth } = require("../backend/config/mongo");
  await connectMongo();

  const health = await mongoHealth();
  if (!health.ok) {
    console.error("\n❌  MongoDB ping failed:", health.error || "unknown error");
    process.exit(1);
  }

  console.log("✅  MongoDB Atlas connection successful!");
  console.log("    Database:", process.env.MONGO_DB_NAME || "vetai360");

  if (process.argv.includes("--seed")) {
    console.log("\n🌱  Seeding demo data...");
    const { spawnSync } = require("child_process");
    const backendDir = require("path").join(__dirname, "..", "backend");
    const result = spawnSync("node", ["utils/seed.js"], {
      cwd: backendDir,
      env: { ...process.env, DB_TYPE: "mongo" },
      stdio: "inherit",
    });
    if (result.status !== 0) process.exit(result.status || 1);
  } else {
    console.log("\n    Run with --seed to create demo accounts and animals.\n");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("\n❌  Setup failed:", err.message);
  if (err.message.includes("authentication failed")) {
    console.error("    Check your Atlas username/password in the connection string.");
  }
  if (err.message.includes("ENOTFOUND") || err.message.includes("querySrv")) {
    console.error("    Check the cluster hostname and that your IP is whitelisted in Atlas.");
  }
  process.exit(1);
});
