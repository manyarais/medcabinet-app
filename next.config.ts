import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the phone / Expo WebView to load /_next JS when opening via LAN IP.
  // Without this, Next.js 16 blocks those chunks (403) and client search never runs.
  // Update this if your machine's IP changes (same value as pillio-mobile/App.js).
  allowedDevOrigins: ["172.20.10.2"],
};

export default nextConfig;
