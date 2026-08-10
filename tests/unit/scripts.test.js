import { describe, it, expect } from "vitest";
import { buildDeal, buildScripts, MOCK_DEAL, PRE_APPROVAL } from "../../src/data/decode.js";
import { fmt, pmt } from "../../src/theme.js";

/* Scripts are what the buyer says out loud in the finance office. A wrong
   number here gets said to a dealer's face, so every figure must come
   from the deal or the live market — never a placeholder. */

const market = {
  median: 30400,
  count: 14,
  comps: [
    { name: "2023 CR-V EX-L", price: 30038, source: "hondaoflakejackson.com", miles: 28793, days: 38 },
    { name: "2023 CR-V EX-L", price: 30950, source: "machaikfordpasadena.com", miles: 27165, days: 39 },
  ],
};

const build = (deal, mkt = market) => buildScripts(deal, mkt, fmt, pmt);

describe("script 1 — remove the junk", () => {
  it("names each add-on and the tax error", () => {
    const [s1] = build(MOCK_DEAL);
    expect(s1.body).toContain("dealer prep");
    expect(s1.body).toContain("nitrogen-filled tires");
    expect(s1.body).toContain("$1,792");
    expect(s1.body).toContain("$382");
  });

  it("stays a coherent sentence when there is nothing to remove", () => {
    const clean = buildDeal({
      vehicle: "2022 Toyota RAV4 XLE", asking: 27995,
      docFee: 150, titleReg: 108, taxCharged: 1750, addons: [],
    });
    const [s1] = build(clean);
    expect(clean.junkTotal).toBe(0);
    expect(clean.taxError).toBe(0);
    // no dangling "That's ." from an empty list
    expect(s1.body).not.toMatch(/That's\s*\./);
    expect(s1.body).not.toMatch(/\s,\s/);
    expect(s1.body.length).toBeGreaterThan(40);
  });

  it("handles junk with no tax error", () => {
    const d = buildDeal({
      vehicle: "2022 Toyota RAV4 XLE", asking: 27995, taxCharged: 1750,
      addons: [{ name: "Dealer prep", amt: 395 }],
    });
    const [s1] = build(d);
    expect(s1.body).toContain("$395");
    expect(s1.body).not.toContain("tax error");
  });
});

describe("script 2 — beat my pre-approval", () => {
  it("computes the real interest delta on this deal's principal", () => {
    const [, s2] = build(MOCK_DEAL);
    const dP = pmt(MOCK_DEAL.principal, 9.9, 72);
    const pP = pmt(MOCK_DEAL.principal, PRE_APPROVAL.apr, PRE_APPROVAL.term);
    expect(s2.body).toContain(fmt(dP * 72 - pP * PRE_APPROVAL.term));
    expect(s2.body).toContain("9.9%");
  });

  it("does not quote a fake delta when the dealer rate is unknown", () => {
    const d = buildDeal({ vehicle: "2022 Toyota RAV4 XLE", asking: 27995 });
    const [, s2] = build(d);
    expect(s2.body).toContain("7.2%");
    expect(s2.body).not.toMatch(/costs me about \$0/);
    expect(s2.body).not.toContain("NaN");
  });

  it("does not claim savings when the dealer rate already beats the CU", () => {
    const d = buildDeal({ vehicle: "2022 Toyota RAV4 XLE", asking: 27995, apr: 4.9, term: 60 });
    const [, s2] = build(d);
    expect(s2.body).not.toMatch(/costs me about/);
  });
});

describe("script 3 — walk away", () => {
  it("quotes the live median, the gap, and a named comp", () => {
    const [, , s3] = build(MOCK_DEAL);
    expect(s3.body).toContain("$1,587"); // 31,987 - 30,400
    expect(s3.body).toContain("$30,400");
    expect(s3.body).toContain("hondaoflakejackson.com");
    expect(s3.body).toContain("$30,038");
  });

  it("cites days on lot when known", () => {
    const [, , s3] = build(MOCK_DEAL);
    expect(s3.body).toContain("47 days");
  });

  it("degrades honestly with no market data — no invented numbers", () => {
    const [, , s3] = build(MOCK_DEAL, null);
    expect(s3.body).not.toContain("undefined");
    expect(s3.body).not.toContain("NaN");
    expect(s3.body).not.toContain("$0");
    expect(s3.body).toContain("above the market");
  });

  it("omits comp names when the market returned none", () => {
    const [, , s3] = build(MOCK_DEAL, { median: 30400, count: 14, comps: [] });
    expect(s3.body).toContain("$30,400");
    expect(s3.body).not.toContain("I have the listings");
  });
});

describe("all scripts", () => {
  it("always returns exactly three, in order", () => {
    const s = build(MOCK_DEAL);
    expect(s.map((x) => x.t)).toEqual([
      "Remove the junk", "Beat my pre-approval", "Walk away",
    ]);
  });

  it("never leaks a template artifact", () => {
    for (const mkt of [market, null, { median: 30400, comps: [] }]) {
      for (const s of build(MOCK_DEAL, mkt)) {
        expect(s.body).not.toMatch(/undefined|NaN|\{\{|\$\{/);
      }
    }
  });
});
