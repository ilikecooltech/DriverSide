import { describe, it, expect } from "vitest";
import { C_HEX, C_DARK, D } from "../../src/theme.js";
import { screenTitle } from "../../src/lib/screen.js";

/* Color pairs the app actually uses, checked against WCAG 2.2 AA:
   4.5:1 for text, 3:1 for control edges and focus rings (1.4.3, 1.4.11).
   A token change that breaks one fails here instead of in a showroom. */
const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };

describe("text contrast, 4.5:1", () => {
  const text = ["ink", "inkSoft", "accentText", "green", "red", "amberDark"];
  for (const [name, set] of [["light", C_HEX], ["dark", C_DARK]]) {
    for (const t of text) {
      if (!set[t]) continue;
      it(`${name} ${t} on paper`, () => expect(ratio(set[t], set.paper)).toBeGreaterThanOrEqual(4.5));
      it(`${name} ${t} on card`, () => expect(ratio(set[t], set.card)).toBeGreaterThanOrEqual(4.5));
    }
  }
  it("dealer soft ink on dealer background", () => expect(ratio(D.ink2, D.bg)).toBeGreaterThanOrEqual(4.5));
});

describe("control edges and focus rings, 3:1", () => {
  it("light control edge on paper and card", () => {
    expect(ratio(C_HEX.control, C_HEX.paper)).toBeGreaterThanOrEqual(3);
    expect(ratio(C_HEX.control, C_HEX.card)).toBeGreaterThanOrEqual(3);
  });
  it("dark control edge on dealer background and card", () => {
    expect(ratio(C_DARK.control, C_DARK.paper)).toBeGreaterThanOrEqual(3);
    expect(ratio(D.control, D.card)).toBeGreaterThanOrEqual(3);
  });
  it("light focus ring on paper; dark focus ring on dealer navy and the deal strip", () => {
    expect(ratio("#2B5A87", C_HEX.paper)).toBeGreaterThanOrEqual(3);
    expect(ratio("#8DB4DC", D.bg)).toBeGreaterThanOrEqual(3);
    expect(ratio("#8DB4DC", D.card)).toBeGreaterThanOrEqual(3);
    expect(ratio("#8DB4DC", "#16233B")).toBeGreaterThanOrEqual(3);
  });
});

describe("page titles", () => {
  it("names the screen, then the app", () => {
    expect(screenTitle("Shop")).toBe("Shop · DriverSide");
    expect(screenTitle("2021 Honda CR-V EX")).toBe("2021 Honda CR-V EX · DriverSide");
  });
  it("falls back to the full name with nothing to name", () => {
    expect(screenTitle("")).toMatch(/^DriverSide/);
  });
});
