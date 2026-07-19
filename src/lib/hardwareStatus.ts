// Hardware reachability for Alerts / Home — never treat unpaired cloud-only
// installs as a permanent "offline" alert.

import { probeCabinetBoard } from "@/lib/cabinetBoard";
import { prisma } from "@/lib/db";

export type DeviceLinkStatus = "online" | "offline" | "unpaired";

export type HardwareStatus = {
  scanner: DeviceLinkStatus;
  lights: DeviceLinkStatus;
  /** True when neither device is expected / paired. */
  quietUnpaired: boolean;
};

function envConfigured(name: "DEVICE_URL" | "CABINET_URL"): boolean {
  return Boolean(
    (process.env[name] ?? "")
      .split(",")
      .map((u) => u.trim())
      .filter(Boolean).length,
  );
}

async function hasPriorHardwareActivity(): Promise<boolean> {
  const hit = await prisma.activityEvent.findFirst({
    where: {
      OR: [
        { type: "flash" },
        { detail: { contains: "hardware scan" } },
      ],
    },
    select: { id: true },
  });
  return hit != null;
}

async function probeScanner(): Promise<boolean> {
  const candidates = [
    ...(process.env.DEVICE_URL ?? "").split(",").map((u) => u.trim()).filter(Boolean),
    "http://10.103.209.24",
    "http://172.20.10.3",
  ];
  for (const base of [...new Set(candidates)]) {
    try {
      const res = await fetch(`${base}/apikey`, {
        cache: "no-store",
        signal: AbortSignal.timeout(2500),
      });
      if (res.ok) return true;
    } catch {
      // keep probing
    }
  }
  return false;
}

export async function getHardwareStatus(): Promise<HardwareStatus> {
  const [scannerUp, lightsUp, priorUse] = await Promise.all([
    probeScanner(),
    probeCabinetBoard(),
    hasPriorHardwareActivity(),
  ]);

  const scannerExpected = envConfigured("DEVICE_URL") || priorUse;
  const lightsExpected = envConfigured("CABINET_URL") || priorUse;

  const scanner: DeviceLinkStatus = scannerUp
    ? "online"
    : scannerExpected
      ? "offline"
      : "unpaired";
  const lights: DeviceLinkStatus = lightsUp
    ? "online"
    : lightsExpected
      ? "offline"
      : "unpaired";

  return {
    scanner,
    lights,
    quietUnpaired: scanner === "unpaired" && lights === "unpaired",
  };
}
