import { describe, expect, it } from "vitest";
import {
  effectiveExpiryForMedication,
  expiryStatusFor,
  SOON_DAYS,
} from "@/lib/expiration";

describe("expiration buckets", () => {
  it("uses a 90-day soon window", () => {
    expect(SOON_DAYS).toBe(90);
  });

  it("marks a date ~70 days out as soon", () => {
    const d = new Date();
    d.setDate(d.getDate() + 70);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    expect(expiryStatusFor(`${y}-${m}-${day}`)).toBe("soon");
  });

  it("for Rx prefers earlier prescription end over distant label expiry", () => {
    const result = effectiveExpiryForMedication({
      expirationDate: "2028-12",
      productType: "PRESCRIPTION",
      prescriptionEndDates: ["2026-08-01"],
    });
    expect(result.status).toBe("soon");
    expect(result.displayDate).toBe("2026-08-01");
  });

  it("for OTC ignores prescription end dates", () => {
    const result = effectiveExpiryForMedication({
      expirationDate: "2028-12",
      productType: "OTC",
      prescriptionEndDates: ["2026-08-01"],
    });
    expect(result.status).toBe("ok");
  });
});
