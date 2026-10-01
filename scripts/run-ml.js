const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");
const mlDir = path.join(rootDir, "ml-service");

const possibleVenvs =
  process.platform === "win32"
    ? [
        path.join(mlDir, ".venv", "Scripts", "python.exe"),
        path.join(rootDir, ".venv", "Scripts", "python.exe"),
      ]
    : [
        path.join(mlDir, ".venv", "bin", "python"),
        path.join(rootDir, ".venv", "bin", "python"),
      ];

let python = possibleVenvs.find((p) => fs.existsSync(p));
if (!python) {
  python = process.platform === "win32" ? "python" : "python3";
}

console.log(`Starting VetAI 360 ML service with Python: ${python}`);

const child = spawn(python, ["app.py"], {
  cwd: mlDir,
  stdio: "inherit",
  shell: process.platform === "win32",
});

child.on("exit", (code) => process.exit(code ?? 0));
