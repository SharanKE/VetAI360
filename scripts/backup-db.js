const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");
const dbPath = path.join(rootDir, "backend", "data", "vetai360.db");
const backupDir = path.join(rootDir, "backups");

const action = process.argv[2] || "backup";

if (action === "backup") {
  if (!fs.existsSync(dbPath)) {
    console.error("❌ Database file not found at:", dbPath);
    process.exit(1);
  }

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const targetPath = path.join(backupDir, `vetai360_backup_${timestamp}.db`);

  fs.copyFileSync(dbPath, targetPath);
  console.log("✅ Database successfully backed up to:");
  console.log("  ", targetPath);
} else if (action === "restore") {
  if (!fs.existsSync(backupDir)) {
    console.error("❌ No backups folder found.");
    process.exit(1);
  }

  const files = fs
    .readdirSync(backupDir)
    .filter((f) => f.endsWith(".db"))
    .sort()
    .reverse();

  if (files.length === 0) {
    console.error("❌ No backup .db files found in:", backupDir);
    process.exit(1);
  }

  const latestBackup = path.join(backupDir, files[0]);
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.copyFileSync(latestBackup, dbPath);
  console.log("✅ Database successfully restored from latest backup:");
  console.log("  ", latestBackup);
  console.log("➡️ Restored to:", dbPath);
} else {
  console.log("Usage: node scripts/backup-db.js [backup|restore]");
}
