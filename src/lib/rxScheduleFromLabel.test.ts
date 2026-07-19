import { describe, expect, it } from "vitest";
import { inferRxScheduleFromLabel } from "@/lib/rxScheduleFromLabel";

describe("inferRxScheduleFromLabel", () => {
  it("detects three-times-daily antibiotic SIG", () => {
    const s = inferRxScheduleFromLabel(
      "Take 1 capsule by mouth three times daily for 10 days",
    );
    expect(s.dosesPerDay).toBe(3);
    expect(s.pillsPerDose).toBe(1);
    expect(s.doseTimes).toHaveLength(3);
    // 10 inclusive days → end is start + 9
    const [ys, ms, ds] = s.startDate.split("-").map(Number);
    const start = new Date(ys, ms - 1, ds);
    start.setDate(start.getDate() + 9);
    const end = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
    expect(s.endDate).toBe(end);
  });

  it("detects twice daily and pill count", () => {
    const s = inferRxScheduleFromLabel("Take 2 tablets twice daily");
    expect(s.dosesPerDay).toBe(2);
    expect(s.pillsPerDose).toBe(2);
  });

  it("defaults to once daily for 30 days when text is empty", () => {
    const s = inferRxScheduleFromLabel(null);
    expect(s.dosesPerDay).toBe(1);
    expect(s.pillsPerDose).toBe(1);
    expect(s.doseTimes).toEqual(["08:00"]);
  });
});
