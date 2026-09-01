import { describe, it, expect } from "vitest";
import { NAV_ITEMS, isDealerSessionLive, DEAL_ENDED } from "../../src/components/BottomNav.jsx";

/* The nav makes two claims that have to stay true: five real
   destinations, and a live dot that means something. */

describe("nav destinations", () => {
  it("has the five destinations in mockup order", () => {
    expect(NAV_ITEMS.map((i) => i.key)).toEqual(["start", "shop", "garage", "finance", "dealer"]);
  });

  it("labels and icons every destination", () => {
    for (const i of NAV_ITEMS) {
      expect(i.label, `${i.key} needs a label`).toBeTruthy();
      expect(i.icon, `${i.key} needs an icon`).toBeTruthy();
    }
  });

  it("puts the live indicator on Dealer alone", () => {
    expect(NAV_ITEMS.filter((i) => i.live).map((i) => i.key)).toEqual(["dealer"]);
  });

  it("marks Finance as still being built", () => {
    // Reachable and honest about it — not hidden, not a dead tab.
    expect(NAV_ITEMS.filter((i) => i.pending).map((i) => i.key)).toEqual(["finance"]);
  });
});

describe("isDealerSessionLive", () => {
  const deal = { vehicle: "2021 Dodge Challenger GT" };

  it("is off with no deal, whatever the view", () => {
    for (const v of ["capture", "manual", "decoder", "modes", undefined]) {
      expect(isDealerSessionLive(null, v)).toBe(false);
    }
  });

  it("is on while a decoded sheet is open", () => {
    for (const v of ["decoder", "modes", "prep", "table", "paywall"]) {
      expect(isDealerSessionLive(deal, v), `should be live in "${v}"`).toBe(true);
    }
  });

  it("goes out once the session reaches an outcome", () => {
    for (const v of DEAL_ENDED) {
      expect(isDealerSessionLive(deal, v), `should be dark in "${v}"`).toBe(false);
    }
  });

  it("is never always-on", () => {
    // The mockup hard-codes the dot in markup. The whole point of this
    // helper is that ours reflects state.
    expect(isDealerSessionLive(null, "decoder")).toBe(false);
    expect(isDealerSessionLive(deal, "walked")).toBe(false);
  });
});
