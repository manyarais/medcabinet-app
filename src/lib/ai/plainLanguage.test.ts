import { describe, expect, it } from "vitest";
import { parseSig, renderSig, verifyRewrite } from "@/lib/ai/plainLanguage";

describe("parseSig", () => {
  it("parses a classic twice-daily sig", () => {
    const sig = parseSig("TAKE ONE TABLET BY MOUTH TWICE DAILY WITH MEALS");
    expect(sig).not.toBeNull();
    expect(sig!.quantity).toBe("1");
    expect(sig!.unit).toBe("tablet");
    expect(sig!.frequencyText).toBe("two times each day");
    expect(sig!.mealRelation).toBe("with food");
  });

  it("parses every-6-hours as-needed", () => {
    const sig = parseSig("Take 2 tablets every 6 hours as needed");
    expect(sig!.quantity).toBe("2");
    expect(sig!.frequencyText).toBe("every 6 hours");
    expect(sig!.asNeeded).toBe(true);
  });

  it("parses half-tablet doses", () => {
    const sig = parseSig("Take one-half tablet once daily");
    expect(sig!.quantity).toBe("0.5");
  });

  it("refuses tapering / multi-step instructions", () => {
    expect(parseSig("Take 2 tablets daily for 3 days then 1 tablet daily")).toBeNull();
  });

  it("refuses when leftover words were not understood", () => {
    expect(parseSig("Take 1 tablet daily until INR is therapeutic")).toBeNull();
  });
});

describe("renderSig + verifyRewrite", () => {
  it("keeps all numbers and critical words", () => {
    const original = "TAKE ONE TABLET BY MOUTH TWICE DAILY WITH MEALS";
    const { text } = renderSig(parseSig(original)!);
    expect(verifyRewrite(original, text).ok).toBe(true);
  });

  it("fails a rewrite that drops a number", () => {
    const check = verifyRewrite("Take 2 tablets every 6 hours", "Take tablets regularly");
    expect(check.ok).toBe(false);
  });

  it("fails a rewrite that drops a negation", () => {
    const check = verifyRewrite(
      "Do not take with alcohol",
      "Best taken separately from alcohol",
    );
    expect(check.ok).toBe(false);
  });

  it("accepts a faithful warning restatement", () => {
    const check = verifyRewrite(
      "DO NOT DRIVE OR OPERATE HEAVY MACHINERY.",
      "Do not drive or use heavy machinery.",
    );
    expect(check.ok).toBe(true);
  });
});
