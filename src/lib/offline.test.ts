import { describe, expect, it } from "vitest";
import { searchCabinetLocally } from "@/lib/cabinetLocal";
import { formatLastSyncLabel } from "@/lib/offline";

describe("cabinetLocal offline helpers", () => {
  it("filters active meds by brand/generic substring", () => {
    const meds = [
      {
        id: 1,
        brandName: "Advil",
        genericName: "ibuprofen",
        productType: "OTC",
        purpose: null,
        compartment: 1,
        outOfCabinet: false,
        status: "active",
      },
      {
        id: 2,
        brandName: "Old Rx",
        genericName: null,
        productType: "PRESCRIPTION",
        purpose: null,
        compartment: 2,
        outOfCabinet: false,
        status: "removed",
      },
    ];
    expect(searchCabinetLocally(meds, "ibup").map((m) => m.id)).toEqual([1]);
    expect(searchCabinetLocally(meds, "adv").map((m) => m.id)).toEqual([1]);
    expect(searchCabinetLocally(meds, "old")).toEqual([]);
  });
});

describe("offline sync label", () => {
  it("formats a timestamp", () => {
    const label = formatLastSyncLabel(Date.UTC(2026, 6, 20, 21, 30));
    expect(label.length).toBeGreaterThan(4);
    expect(formatLastSyncLabel(null)).toBe("your last visit");
  });
});
