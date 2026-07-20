import type { NextConfig } from "next";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Absolute project root (not process.cwd / not inferred src/app).
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

// On Evan's laptop node_modules is a junction into %LOCALAPPDATA% (keeps
// OneDrive from gutting it), which sits outside the project root and makes
// Turbopack panic. Widen the root only when that junction is present, so
// Vercel and other machines keep the normal project root.
const nodeModules = path.join(projectRoot, "node_modules");
const nodeModulesIsLink =
  fs.existsSync(nodeModules) && fs.lstatSync(nodeModules).isSymbolicLink();
const homeRoot = path.resolve(projectRoot, "..", "..", "..", "..");

const nextConfig: NextConfig = {
  turbopack: {
    root: nodeModulesIsLink ? homeRoot : projectRoot,
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
