import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import handler from "../../api/market.js";
import { buildDeal, buildScripts, MOCK_DEAL } from "../../src/data/decode.js";
import { fmt, pmt } from "../../src/theme.js";
import { planNumbers } from "../../src/components/Modes.jsx";

/* One test per bug that actually shipped and got fixed. Each names the
   symptom a user would have seen, so a future refactor that reintroduces
   it fails loudly instead of quietly reaching production. */

const call = async (query) => {
  let body = null;
  await handler({ query }, { json: (b) => (body = b) });
  return body;
};

describe("BUG: dealer sheet taxed the full price, app called it correct", () => {
  /* TX taxes price MINUS trade. The original mock marked the tax line
     FAIR, hiding a $382 overcharge — the exact error the product exists
     to catch. */
  it("flags the overcharge with the precise delta", () => {
    expect(MOCK_DEAL.taxError).toBe(382);
    const line = MOCK_DEAL.linesFlag.find((l) => l.name.startsWith("Sales tax"));
    expect(line).toBeTruthy();
    expect(line.why).toContain("$1,424");
  });

  it("still recognizes a correctly computed tax as fair", () => {
    const d = buildDeal({ vehicle: "2022 Toyota RAV4 XLE", asking: 27995, taxCharged: 1750 });
    expect(d.linesFlag.some((l) => l.name.startsWith("Sales tax"))).toBe(false);
  });
});

describe("BUG: MarketCheck trim filter returned zero comps for real cars", () => {
  /* A genuine EX-L is often listed as "EX-L w/Navi", so an exact-trim
     query found nothing and the market section went blank. */
  beforeEach(() => {
    process.env.MARKETCHECK_API_KEY = "test-key-not-real";
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    delete process.env.MARKETCHECK_API_KEY;
    vi.unstubAllGlobals();
  });

  it("retries without the trim and reports that it widened", async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ listings: [] }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ listings: [{ price: 30500, miles: 30000, dom_active: 12, build: {} }], num_found: 9 }),
      });
    const b = await call({ year: "2023", make: "Honda", model: "CR-V", trim: "EX-L" });
    expect(b.source).toBe("live");
    expect(b.trimWidened).toBe(true);
  });
});

describe("BUG: every vehicle fell back to CR-V snapshot comps", () => {
  /* Ask about a RAV4 with no API key and the app answered with Honda
     CR-V listings and a $30,934 median — confident, specific, wrong. */
  beforeEach(() => { delete process.env.MARKETCHECK_API_KEY; });

  it("returns no data rather than another car's comps", async () => {
    const b = await call({ year: "2022", make: "Toyota", model: "RAV4" });
    expect(b.source).toBe("none");
    expect(b.median).toBeUndefined();
  });

  it("still serves the snapshot for the car it belongs to", async () => {
    const b = await call({ year: "2023", make: "Honda", model: "CR-V" });
    expect(b.median).toBe(30934);
  });
});

describe("BUG: free-text vehicle parsing corrupted multi-word models", () => {
  /* "2022 Jeep Grand Cherokee Limited" parsed model as "Grand", so the
     market lookup searched for a car that does not exist. */
  it("uses structured fields from manual entry", () => {
    const d = buildDeal({
      vehicle: "2022 Jeep Grand Cherokee Limited",
      query: { year: "2022", make: "Jeep", model: "Grand Cherokee", trim: "Limited" },
      asking: 38000,
    });
    expect(d.query.model).toBe("Grand Cherokee");
    expect(d.query.trim).toBe("Limited");
  });
});

describe("BUG: scripts quoted hardcoded numbers from the demo car", () => {
  /* The walk-away script said "$1,587 over market" and "$30,400" for
     every vehicle, including cars those figures had nothing to do with. */
  it("derives the gap and anchor from this deal's live market", () => {
    const [, , s3] = buildScripts(MOCK_DEAL, { median: 29000, count: 8, comps: [] }, fmt, pmt);
    expect(s3.body).toContain("$2,987"); // 31,987 - 29,000
    expect(s3.body).toContain("$29,000");
    expect(s3.body).not.toContain("$30,400");
  });

  it("adapts to a completely different vehicle", () => {
    const rav4 = buildDeal({
      vehicle: "2022 Toyota RAV4 XLE", asking: 27995,
      addons: [{ name: "Window etching", amt: 250 }],
    });
    const [s1, , s3] = buildScripts(rav4, { median: 26500, count: 11, comps: [] }, fmt, pmt);
    expect(s1.body).toContain("$250");
    expect(s1.body).not.toContain("$1,792");
    expect(s3.body).toContain("$26,500");
  });
});

describe("BUG: negative equity invented from a payoff with no trade", () => {
  /* Entering a loan payoff while keeping the car produced a phantom
     roll-in and inflated the amount financed. */
  it("reports zero when there is no trade offer", () => {
    const d = buildDeal({ vehicle: "2021 Subaru Outback", asking: 26500, tradeOffer: 0, tradePayoff: 12100 });
    expect(d.negEq).toBe(0);
    expect(d.principal).toBe(d.asking + d.cleanFees + d.expectedTax);
  });
});

describe("BUG: walk-away number sat above the asking price", () => {
  /* With no market data, target defaulted to asking and walk became
     asking + $800 — advice that can never trigger. */
  it("keeps the walk number at or below the sticker", () => {
    const n = planNumbers(MOCK_DEAL, null);
    expect(n.walk).toBeLessThanOrEqual(MOCK_DEAL.asking);
  });
});

describe("BUG: 'remove the junk' script broke on a clean sheet", () => {
  /* With no add-ons and no tax error the sentence rendered as
     "That's ." — the buyer would have read it aloud. */
  it("produces a usable sentence when there is nothing to remove", () => {
    const clean = buildDeal({ vehicle: "2022 Toyota RAV4 XLE", asking: 27995, docFee: 150, taxCharged: 1750 });
    const [s1] = buildScripts(clean, null, fmt, pmt);
    expect(s1.body).not.toMatch(/That's\s*\./);
    expect(s1.body).not.toMatch(/undefined|NaN/);
  });
});

describe("INVARIANT: harm prevention is never paywalled", () => {
  /* docs/monetization.md hard rule. Negative equity and the underwater
     read stay free in every pricing change, forever. */
  it("negative equity is computed on the deal itself, not gated behind a flag", () => {
    const d = buildDeal({ vehicle: "2019 Nissan Altima", asking: 31987, tradeOffer: 9200, tradePayoff: 12100 });
    expect(d.negEq).toBe(2900); // present with no pass, no key, no market
  });
});

describe("INVARIANT: verdicts anchor to the original quote", () => {
  /* CLAUDE.md decision 7: mid-negotiation the anchor must be stable, so
     the calculator compares against the quote, not a moving market. */
  it("baseSpread is fixed at the quoted price minus the quoted trade", () => {
    expect(MOCK_DEAL.baseSpread).toBe(31987 - 9200);
  });
});
