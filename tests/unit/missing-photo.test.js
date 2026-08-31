import { describe, it, expect } from "vitest";
import { missingPhotoLine, MISSING_PHOTO_LINES } from "../../src/components/ui.jsx";

/* The line has to be stable per vehicle: it's picked during render, and a
   random pick would reshuffle on every re-rank and flicker under the
   reader. Hashing the vehicle name keeps it fixed and spreads adjacent
   cards across different lines. */

describe("missingPhotoLine", () => {
  it("always returns one of the real lines", () => {
    for (const seed of ["2021 Mazda CX-5", "", null, undefined, "x", "2019 Ford F-150 XLT"]) {
      expect(MISSING_PHOTO_LINES).toContain(missingPhotoLine(seed));
    }
  });

  it("is stable for the same vehicle across calls", () => {
    const seed = "2022 Toyota RAV4 XLE";
    const first = missingPhotoLine(seed);
    for (let i = 0; i < 25; i++) expect(missingPhotoLine(seed)).toBe(first);
  });

  it("spreads a realistic result set across several different lines", () => {
    const seen = new Set(
      [
        "2021 Mazda CX-5 Touring", "2022 Toyota RAV4 XLE", "2023 Honda CR-V EX-L",
        "2020 Toyota Highlander LE", "2021 Honda Odyssey EX", "2022 Kia Telluride LX",
        "2019 Toyota Camry LE", "2020 Honda Civic EX", "2018 Honda Accord Sport",
      ].map(missingPhotoLine)
    );
    // Not all identical — the page shouldn't read like a stuck record.
    expect(seen.size).toBeGreaterThan(2);
  });

  it("never returns undefined for odd seeds", () => {
    for (const seed of [0, 123, "  ", "é", "🚗", "a".repeat(500)]) {
      expect(typeof missingPhotoLine(seed)).toBe("string");
      expect(missingPhotoLine(seed).length).toBeGreaterThan(0);
    }
  });
});

describe("the copy itself", () => {
  it("keeps every line short enough for a card", () => {
    for (const l of MISSING_PHOTO_LINES) expect(l.length).toBeLessThanOrEqual(44);
  });

  it("has no duplicates", () => {
    expect(new Set(MISSING_PHOTO_LINES).size).toBe(MISSING_PHOTO_LINES.length);
  });

  it("blames the listing, never the shopper", () => {
    // The joke points at the dealer. "You" would make it the buyer's fault.
    for (const l of MISSING_PHOTO_LINES) expect(l.toLowerCase()).not.toMatch(/\byou(r)?\b/);
  });
});
