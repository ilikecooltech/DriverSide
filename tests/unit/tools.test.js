import { describe, it, expect } from "vitest";
import { paymentPlan, affordability, rateGap, tradeIn, hybridPayback, outTheDoorCheck, combinedMpg, ADVICE, STAGES } from "../../src/data/tools.js";

describe("Tools calculators", () => {
  it("prices a payment from the out-the-door, not the sticker", () => {
    const p = paymentPlan({ price: 20888, down: 3000, apr: 6.9, term: 60 });
    expect(p.otd).toBeCloseTo(22193.5, 1);
    expect(p.financed).toBeCloseTo(19193.5, 1);
    expect(p.monthly).toBeCloseTo(379.2, 0);
    expect(p.stretched.monthly).toBeLessThan(p.monthly);
    expect(p.stretched.extraInterest).toBeGreaterThan(1400);
  });

  it("asks for a rate instead of assuming one", () => {
    expect(paymentPlan({ price: 20000 }).monthly).toBeNull();
    expect(affordability({ budget: 450 })).toBeNull();
  });

  it("turns a monthly budget into a price ceiling", () => {
    const a = affordability({ budget: 450, down: 3000, apr: 6.9, term: 60 });
    expect(Math.round(a.financed)).toBe(22780);
    expect(Math.round(a.maxPrice)).toBe(24264);
  });

  it("shows what a rate markup costs over the loan", () => {
    const g = rateGap({ amount: 19300, yourApr: 6.9, theirApr: 9.9, term: 60 });
    expect(Math.round(g.perMonth)).toBe(28);
    expect(Math.round(g.overLoan)).toBe(1672);
  });

  it("credits Texas tax on the trade and nets out the payoff", () => {
    const t = tradeIn({ price: 20888, offer: 9000, payoff: 4500 });
    expect(t.equity).toBe(4500);
    expect(Math.round(t.taxSaved)).toBe(563);
    const o = outTheDoorCheck({ price: 20888, trade: 9000, payoff: 4500 });
    expect(Math.round(o.total)).toBe(17131);
  });

  it("finds hybrid payback from EPA ratings", () => {
    expect(combinedMpg(40, 35)).toBeCloseTo(37.6, 1);
    const h = hybridPayback({ priceGap: 2000, gasCity: 27, gasHwy: 32, hybCity: 40, hybHwy: 35, miles: 15000, gasPrice: 2.8 });
    expect(h.years).toBeCloseTo(6.1, 1);
  });

  it("has advice for every stage", () => {
    for (const s of STAGES) expect(ADVICE[s.key]?.length).toBeGreaterThan(1);
  });
});
