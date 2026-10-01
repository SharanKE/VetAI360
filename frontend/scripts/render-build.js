import { execSync } from "node:child_process";

const backendUrl = (process.env.VITE_BACKEND_URL || "").replace(/\/$/, "");

if (backendUrl) {
  process.env.VITE_API_URL = `${backendUrl}/api`;
  process.env.VITE_SOCKET_URL = backendUrl;
  console.log("Cloud build — API:", process.env.VITE_API_URL);
  console.log("Cloud build — Socket:", process.env.VITE_SOCKET_URL);
} else {
  console.warn("VITE_BACKEND_URL not set — using Vite defaults from .env");
}

execSync("vite build", { stdio: "inherit", env: process.env });
