// Persist scan photos so the confirmation screen (and the medication record)
// can show exactly what the camera saw. Files land in public/scan-photos/ and
// are served statically at /scan-photos/<name>.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const PHOTO_DIR = path.join(process.cwd(), "public", "scan-photos");

export async function saveScanPhotos(photos: Buffer[]): Promise<string[]> {
  await mkdir(PHOTO_DIR, { recursive: true });
  const stamp = Date.now();
  const urls: string[] = [];
  for (let i = 0; i < photos.length; i++) {
    const name = `${stamp}-${i}.jpg`;
    await writeFile(path.join(PHOTO_DIR, name), photos[i]);
    urls.push(`/scan-photos/${name}`);
  }
  return urls;
}

export function parsePhotoPaths(photoPaths: string | null | undefined): string[] {
  if (!photoPaths) return [];
  try {
    const parsed = JSON.parse(photoPaths) as unknown;
    return Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === "string") : [];
  } catch {
    return [];
  }
}
