// Talking to the CabinetLights ESP32 (8 strip/switch units) and probing
// device health. Compartment N in the app = board unit N-1.

const CABINET_URL_CANDIDATES = [
  ...(process.env.CABINET_URL ?? "").split(",").map((u) => u.trim()).filter(Boolean),
  "http://172.20.10.2",    // its spot on the iPhone hotspot
  "http://10.103.210.34",  // its spot on AirPennNet-Device
  "http://cabinet.local",
];

// Last address that answered, tried first on subsequent calls.
let knownCabinetUrl: string | null = null;

async function tryCabinet(path: string, timeoutMs = 3000): Promise<boolean> {
  const bases = knownCabinetUrl
    ? [knownCabinetUrl, ...CABINET_URL_CANDIDATES.filter((b) => b !== knownCabinetUrl)]
    : [...new Set(CABINET_URL_CANDIDATES)];
  for (const base of bases) {
    try {
      const res = await fetch(`${base}${path}`, {
        method: "POST",
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.ok) {
        knownCabinetUrl = base;
        return true;
      }
    } catch {
      // not at this address — try the next one
    }
  }
  return false;
}

/** Blink a compartment's strip until its switch is pressed. */
export async function flashCompartment(compartment: number): Promise<boolean> {
  return tryCabinet(`/flash?unit=${compartment - 1}`);
}

/** Reset every strip to solid red (empty) — used when the cabinet is cleared. */
export async function resetAllLights(units = 8): Promise<void> {
  for (let unit = 0; unit < units; unit++) {
    await tryCabinet(`/off?unit=${unit}`, 2000);
  }
}

/** Is the cabinet board reachable right now? */
export async function probeCabinetBoard(timeoutMs = 2500): Promise<boolean> {
  for (const base of [...new Set(CABINET_URL_CANDIDATES)]) {
    try {
      const res = await fetch(`${base}/status`, {
        cache: "no-store",
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.ok) {
        knownCabinetUrl = base;
        return true;
      }
    } catch {
      // keep probing
    }
  }
  return false;
}
