import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Absolute project root (not process.cwd / not inferred src/app).
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  // Allow the phone / Expo WebView to load /_next JS when opening via LAN IP.
  // Without this, Next.js 16 blocks those chunks (403) and client search never runs.
  // Entries are hostnames only (no scheme/port) — Next compares Origin hostname.
  // Update this if your machine's IP changes.
  allowedDevOrigins: [
    "172.20.10.2",
    "172.20.10.3",
    "172.20.10.4",
    "172.20.10.5",
    "172.20.10.6",
    "10.103.31.167",
    "10.103.35.203",
  ],
};

export default nextConfig;
