import { describe, it, expect } from "vitest";
import { ACCOUNT_REQUIRED, requiresAccount, gateCopy, GATE_COPY } from "../../src/lib/account.js";

/* The guest door is the product's promise: everything works without an
   account. These tests are the guard rail on that promise — a capability
   flipped to `true` by accident is a buyer hitting a wall for no reason. */

describe("what needs an account", () => {
  it("keeps the core shopping loop open to guests", () => {
    // Nothing on-device may be gated. If one of these ever appears in the
    // table as `true`, the guest door is broken.
    for (const cap of ["decoder", "garage", "goal", "scripts", "shop"]) {
      expect(requiresAccount(cap)).toBe(false);
    }
  });

  it("gates only what a phone alone cannot do", () => {
    expect(requiresAccount("alerts")).toBe(true);
    expect(requiresAccount("extensionSync")).toBe(true);
  });

  it("leaves the deal pass ungated while subscriptions are deferred", () => {
    expect(ACCOUNT_REQUIRED.dealPass).toBe(false);
    expect(requiresAccount("dealPass")).toBe(false);
  });

  it("treats an unknown capability as open, not gated", () => {
    expect(requiresAccount("something-new")).toBe(false);
    expect(requiresAccount(undefined)).toBe(false);
  });
});

describe("gate copy", () => {
  it("has buyer-facing copy for every gated capability", () => {
    for (const [cap, gated] of Object.entries(ACCOUNT_REQUIRED)) {
      if (!gated) continue;
      const copy = GATE_COPY[cap];
      expect(copy, `missing gate copy for "${cap}"`).toBeTruthy();
      expect(copy.kicker && copy.headline && copy.line).toBeTruthy();
    }
  });

  it("falls back rather than rendering nothing", () => {
    expect(gateCopy("no-such-capability")).toBe(GATE_COPY.default);
    expect(gateCopy("alerts").headline).toMatch(/text a phone/i);
  });
});
