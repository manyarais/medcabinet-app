import { describe, expect, it } from "vitest";
import { matchOtcCabinetMeds, type CabinetMedForMatch } from "@/lib/symptomMatch";

function med(partial: Partial<CabinetMedForMatch> & Pick<CabinetMedForMatch, "id" | "brandName" | "productType">): CabinetMedForMatch {
  return {
    compartment: 1,
    outOfCabinet: false,
    purpose: null,
    indications: "",
    ...partial,
  };
}

describe("matchOtcCabinetMeds (T1.1 safety)", () => {
  it("excludes PRESCRIPTION meds even when label text mentions the symptom", () => {
    const matches = matchOtcCabinetMeds(
      [
        med({
          id: 1,
          brandName: "Amoxicillin",
          productType: "PRESCRIPTION",
          indications: "Used for infection; may mention headache as a side effect",
        }),
      ],
      "headache",
    );
    expect(matches).toEqual([]);
  });

  it("includes OTC meds whose purpose/indications mention the symptom", () => {
    const matches = matchOtcCabinetMeds(
      [
        med({
          id: 2,
          brandName: "Tylenol",
          productType: "OTC",
          purpose: "Temporarily relieves minor aches and pains due to headache",
          indications: "Pain reliever",
        }),
      ],
      "headache",
    );
    expect(matches).toHaveLength(1);
    expect(matches[0]?.brandName).toBe("Tylenol");
    expect(matches[0]?.productType).toBe("OTC");
  });

  it("returns only OTC from a mixed cabinet", () => {
    const matches = matchOtcCabinetMeds(
      [
        med({
          id: 1,
          brandName: "Amoxicillin",
          productType: "PRESCRIPTION",
          indications: "headache related note",
        }),
        med({
          id: 2,
          brandName: "Advil",
          productType: "OTC",
          indications: "Relieves headache and fever",
        }),
        med({
          id: 3,
          brandName: "Mystery",
          productType: "UNKNOWN",
          indications: "For headache",
        }),
      ],
      "headache",
    );
    expect(matches.map((m) => m.brandName)).toEqual(["Advil"]);
  });
});
