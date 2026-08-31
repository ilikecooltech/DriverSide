import { describe, it, expect } from "vitest";
import { formatFilterValue, FILTER_META } from "../../src/data/shopping.js";

/* A model year rendered as "2,016" reads as a price to someone scanning a
   car listing. Years are bare numbers; miles and dollars are quantities.
   These tests pin that distinction to the filter metadata. */

describe("formatFilterValue", () => {
  it("renders a model year with no thousands separator", () => {
    expect(formatFilterValue(FILTER_META.minYear, 2016)).toBe("2016");
    expect(formatFilterValue(FILTER_META.minYear, 2025)).toBe("2025");
  });

  it("never groups a year anywhere in the filter's own range", () => {
    const m = FILTER_META.minYear;
    for (let y = m.min; y <= m.max; y += m.step) {
      expect(formatFilterValue(m, y)).not.toContain(",");
      expect(formatFilterValue(m, y)).toBe(String(y));
    }
  });

  it("keeps the separator on miles, which really are a count", () => {
    expect(formatFilterValue(FILTER_META.maxMiles, 80000)).toBe("80,000");
  });

  it("still renders money as money", () => {
    expect(formatFilterValue(FILTER_META.maxPrice, 25000)).toBe("$25,000");
  });

  it("groups an unflagged quantity, so the default stays unchanged", () => {
    expect(formatFilterValue(FILTER_META.radius, 250)).toBe("250");
    expect(formatFilterValue({}, 12345)).toBe("12,345");
  });
});

describe("filter metadata", () => {
  it("marks the year filter, and only the year filter, as plain", () => {
    const plain = Object.entries(FILTER_META).filter(([, m]) => m.plain).map(([k]) => k);
    expect(plain).toEqual(["minYear"]);
  });

  it("never marks a filter as both money and plain", () => {
    for (const [k, m] of Object.entries(FILTER_META)) {
      expect(Boolean(m.money && m.plain), `"${k}" is both money and plain`).toBe(false);
    }
  });
});
