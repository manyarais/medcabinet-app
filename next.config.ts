import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the phone / Expo WebView to load /_next JS when opening via LAN IP.
  // Without this, Next.js 16 blocks those chunks (403) and client search never runs.
  // Entries are hostnames only (no scheme/port) — Next compares Origin hostname.
  // Update this if your machine's IP changes (same host as pillio-mobile/App.js).
  // Covers every "Iphone 9" hotspot lease the laptop tends to get, plus Penn WiFi.
  allowedDevOrigins: [
    "172.20.10.2",
    "172.20.10.3",
    "172.20.10.4",
    "172.20.10.5",
    "172.20.10.6",
    "10.103.35.203",
  ],
  // node_modules is a junction into %LOCALAPPDATA% (keeps OneDrive from gutting it);
  // widen Turbopack's root so it accepts the junction target.
  turbopack: {
    root: "C:\\Users\\evanq",
  },
};

export default nextConfig;
