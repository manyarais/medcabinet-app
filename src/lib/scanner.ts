// Phase 4 hardware scanner integration.
// Drives the ESP32 camera scanner (burst photos on a servo turntable, then an
// AI vision read of the label) and turns the transcript into a Medication row.
// The transcript looks like:  PATIENT: Jane Doe\nNAME: Tylenol PM\nSTRENGTH: ...

import { lookupDrugs } from "@/lib/drugs";
import { prisma } from "@/lib/db";
import { TOTAL_COMPARTMENTS } from "@/lib/compartments";
import { flashCompartment } from "@/lib/cabinetBoard";
import type { Medication } from "@/generated/prisma";

// Where the scanner might live — DEVICE_URL first (comma-separated ok), then
// the known addresses on campus WiFi and the phone-hotspot fallback. The scan
// probes each and uses the first that answers, so switching networks needs no
// config change.
const DEVICE_URL_CANDIDATES = [
  ...(process.env.DEVICE_URL ?? "").split(",").map((u) => u.trim()).filter(Boolean),
  "http://10.103.209.24", // AirPennNet-Device
  // iPhone hotspot hands out 172.20.10.x; probe the usual few. The cabinet
  // board may hold one of these, but it 404s /apikey so it can't win the probe.
  "http://172.20.10.2",
  "http://172.20.10.3",
  "http://172.20.10.4",
];
// 4 shots spread across the servo's 0-180 sweep. More shots read the label
// more completely but each costs ~2s on the device plus AI-read time.
const SHOTS = 4;

// Last address that answered — tried first so repeat scans skip the probe.
let knownDeviceUrl: string | null = null;

async function probeDevice(base: string, timeoutMs: number): Promise<string> {
  const res = await fetch(`${base}/apikey`, {
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`scanner probe got HTTP ${res.status}`);
  return base;
}

async function findDevice(): Promise<string> {
  if (knownDeviceUrl) {
    try {
      return await probeDevice(knownDeviceUrl, 2000);
    } catch {
      knownDeviceUrl = null; // moved networks — fall through to a full probe
    }
  }
  const candidates = [...new Set(DEVICE_URL_CANDIDATES)];
  try {
    // All candidates in parallel; first to answer wins, dead IPs cost nothing.
    knownDeviceUrl = await Promise.any(candidates.map((base) => probeDevice(base, 3000)));
    return knownDeviceUrl;
  } catch {
    throw new Error(`Scanner not reachable (tried ${candidates.join(", ")}).`);
  }
}

// Same transcript format the ESP32's on-board reader uses, so parseTranscript
// works for both read paths.
const READ_PROMPT =
  "These photos show the same pill/medicine bottle, rotated between shots by a turntable. " +
  "The photos are from a low-quality camera, so read as much as you can - partial results " +
  "are valuable. Always report whatever you CAN make out, even if it is only the brand name, " +
  "and merge every photo into ONE transcript with nothing repeated. Output plain text lines " +
  "in this order, skipping ones you cannot see, each starting with the exact uppercase " +
  "keyword and a colon: PATIENT (the persons name printed on a prescription label, if any), " +
  "NAME, GENERIC (generic/chemical name), STRENGTH, FORM (tablets, capsules, liquid, etc.), " +
  "ACTIVE INGREDIENTS, USES, DIRECTIONS, WARNINGS, EXPIRY, PRESCRIBER (the doctor on a " +
  "prescription label), PHARMACY (the pharmacy name), RX NUMBER, REFILLS, OTHER (lot, count, " +
  "manufacturer). Mark uncertain words with [?]. " +
  "Only if you cannot make out a single word or brand in any photo, reply with exactly: UNREADABLE";

export type ScanFields = {
  name: string;
  genericName?: string | null;
  dosageStrength?: string | null;
  expirationDate?: string | null;
  personName?: string | null;
  rawLabelText?: string | null;
  form?: string | null;
  prescriber?: string | null;
  pharmacy?: string | null;
  rxNumber?: string | null;
  refills?: string | null;
};

// Ask the ESP32 to take the 6 turntable photos, then read the label with AI.
// Slow by nature (~45s): the turntable glides between shots.
//
// Two read paths:
//  - OPENAI_API_KEY set (recommended): this server fetches the photos off the
//    device and calls OpenAI itself. Needed on campus WiFi, where the device's
//    own big uploads get dropped; also faster.
//  - No key: fall back to the device's on-board reader (POST /read), which
//    works on home/hotspot networks.
export async function runDeviceScan(): Promise<{
  transcript: string;
  deviceUrl: string;
  photos: Buffer[];
}> {
  const deviceUrl = await findDevice();
  // Each /jpg response IS the photo, so keep the bytes — refetching them from
  // the device later would double the (slow on campus) device traffic.
  const photos: Buffer[] = [];
  // store=0: when this server does the AI read, the device needn't save the
  // photos to its (slow) flash — we already have the bytes.
  const store = process.env.OPENAI_API_KEY ? "&store=0" : "";
  for (let i = 0; i < SHOTS; i++) {
    const deg = Math.round((i * 180) / (SHOTS - 1));
    const url = `${deviceUrl}/jpg?res=hd&slot=${i}&deg=${deg}${i ? "&fast=1" : ""}${store}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Scanner photo ${i + 1}/${SHOTS} failed (HTTP ${res.status})`);
    }
    photos.push(Buffer.from(await res.arrayBuffer()));
  }

  // Park the turntable now that all photos are taken, so the next scan starts
  // at 0deg instead of spending its first ~2s gliding back. Fire-and-forget;
  // on the no-key path the device just handles /read right after it.
  void fetch(`${deviceUrl}/servo?deg=0`, { cache: "no-store" }).catch(() => {});

  if (process.env.OPENAI_API_KEY) {
    const transcript = await readPhotosWithOpenAI(process.env.OPENAI_API_KEY, photos);
    return { transcript, deviceUrl, photos };
  }

  const read = await fetch(`${deviceUrl}/read?n=${SHOTS}`, { method: "POST" });
  const transcript = (await read.text()).trim();
  if (!read.ok) {
    throw new Error(`Scanner AI read failed: ${transcript}`);
  }
  return { transcript, deviceUrl, photos };
}

// Lowest compartment (1..8) with no medication assigned, or null when the
// cabinet is full. The DB is the source of truth, so the app's cabinet grid
// and the physical lights stay in step (compartment N = board unit N-1).
export async function nextFreeCompartment(householdId: string): Promise<number | null> {
  const occupied = await prisma.medication.findMany({
    where: { householdId, compartment: { not: null } },
    select: { compartment: true },
  });
  const taken = new Set(occupied.map((med) => med.compartment));
  for (let c = 1; c <= TOTAL_COMPARTMENTS; c++) {
    if (!taken.has(c)) return c;
  }
  return null;
}

// Blink a compartment's strip until the user presses its switch. Falls back
// to the scanner's own /flash (2 strip units) if the cabinet board isn't
// reachable, so the demo still lights up mid-rewiring.
export async function notifyScanDone(
  deviceUrl: string | null,
  compartment: number | null,
): Promise<void> {
  if (compartment == null) return; // nothing assigned — nothing to flash
  const flashed = await flashCompartment(compartment);
  // Phone-camera scans have no scanner device to fall back to.
  if (!flashed && deviceUrl) {
    fetch(`${deviceUrl}/flash?unit=${(compartment - 1) % 2}`, { method: "POST" }).catch(() => {});
  }
}

// Ask OpenAI vision to read the label across all the burst photos.
// Used by both scan paths: the ESP32 turntable burst and photos taken with
// the phone camera (user rotates the bottle by hand between shots).
export async function readPhotosWithOpenAI(apiKey: string, photos: Buffer[]): Promise<string> {
  const images = photos.map((jpeg) => ({
    type: "image_url" as const,
    image_url: { url: `data:image/jpeg;base64,${jpeg.toString("base64")}`, detail: "high" },
  }));

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "user", content: [{ type: "text", text: READ_PROMPT }, ...images] },
      ],
    }),
  });

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(`OpenAI error: ${data.error?.message ?? response.status}`);
  }
  return (data.choices?.[0]?.message?.content ?? "").trim();
}

// Pull the structured lines (NAME:, PATIENT:, ...) out of the AI transcript.
// Returns null when the label was unreadable.
export function parseTranscript(transcript: string): ScanFields | null {
  if (!transcript || transcript === "UNREADABLE") return null;

  const fields: Record<string, string> = {};
  for (const line of transcript.split("\n")) {
    const match = line.match(/^([A-Z ]+):\s*(.+)$/);
    if (match) fields[match[1].trim()] = match[2].trim();
  }

  const name = fields["NAME"];
  if (!name) return null;

  return {
    name,
    genericName: fields["GENERIC"] ?? null,
    dosageStrength: fields["STRENGTH"] ?? null,
    expirationDate: fields["EXPIRY"] ?? null,
    personName: fields["PATIENT"] ?? null,
    rawLabelText: transcript,
    form: fields["FORM"] ?? null,
    prescriber: fields["PRESCRIBER"] ?? null,
    pharmacy: fields["PHARMACY"] ?? null,
    rxNumber: fields["RX NUMBER"] ?? null,
    refills: fields["REFILLS"] ?? null,
  };
}

export type ScanIntakeResult = {
  medication: Medication;
  matched: boolean; // did openFDA recognize the name?
  updatedExisting: boolean; // rescan of a bottle already in this person's library
};

// Save a scan: normalize the name (RxNorm) and enrich from openFDA, preferring
// values read off the physical bottle (dosage, expiry) over database values.
//
// New bottles are saved as `pending_review` with NO compartment — the user
// checks the extracted fields against the label photos on /scan, edits
// anything the AI got wrong, and only then does confirmation assign a
// compartment and flash its light. Rescanning a bottle already in this
// person's library updates the row in place (no re-review needed) and keeps
// its compartment so the flash guides the bottle back to its usual spot.
export async function intakeScan(
  householdId: string,
  fields: ScanFields,
  photoUrls: string[] = [],
): Promise<ScanIntakeResult> {
  const cleanName = fields.name.replace(/\[\?\]/g, "").trim();
  const personName = fields.personName?.replace(/\[\?\]/g, "").trim() || null;

  let match = null;
  try {
    const lookup = await lookupDrugs(cleanName);
    match = lookup.results[0] ?? null;
  } catch {
    // openFDA being down should never lose a scan — save what the label said.
  }

  const brandName = match?.brandName ?? cleanName;

  // Case-insensitive duplicate check in JS (SQLite/Prisma has no insensitive
  // mode) — same approach as the cabinet add route.
  const samePerson = await prisma.medication.findMany({ where: { householdId, personName } });
  const existing = samePerson.find(
    (med) => med.brandName.toLowerCase() === brandName.toLowerCase(),
  );

  const scannedValues = {
    genericName: fields.genericName?.trim() || match?.genericName || null,
    dosage: fields.dosageStrength?.trim() || match?.dosage || null,
    expirationDate: fields.expirationDate?.trim() || null,
    rawLabelText: fields.rawLabelText ?? null,
    personName,
    form: fields.form?.trim() || null,
    prescriber: fields.prescriber?.trim() || null,
    pharmacy: fields.pharmacy?.trim() || null,
    rxNumber: fields.rxNumber?.trim() || null,
    refills: fields.refills?.trim() || null,
    ...(photoUrls.length > 0 ? { photoPaths: JSON.stringify(photoUrls) } : {}),
  };

  if (existing && existing.status !== "disposed") {
    const medication = await prisma.medication.update({
      where: { id: existing.id },
      data: scannedValues,
    });
    return { medication, matched: Boolean(match), updatedExisting: true };
  }

  const medication = await prisma.medication.create({
    data: {
      householdId,
      brandName,
      productType: match?.productType ?? "UNKNOWN",
      indications: match?.indications ?? "",
      purpose: match?.purpose ?? null,
      warnings: match?.warnings ?? null,
      compartment: null, // assigned at confirmation
      status: "pending_review",
      ...scannedValues,
    },
  });
  return { medication, matched: Boolean(match), updatedExisting: false };
}
