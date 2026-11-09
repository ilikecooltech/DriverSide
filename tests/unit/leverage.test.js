import { describe, it, expect } from "vitest";
import { holdingPerDay, lotLeverage, HOLDING } from "../../src/data/leverage.js";

describe("holdingPerDay", () => {
  it("adds floorplan interest, depreciation and lot cost", () => {
    // $23,450: interest $4.82 + depreciation $5.86 + lot $15 = $25.68
    expect(holdingPerDay(23450)).toBeCloseTo(25.68, 1);
  });
  it("is zero with no price", () => {
    expect(holdingPerDay(0)).toBe(0);
    expect(holdingPerDay(undefined)).toBe(0);
  });
  it("grows with the price of the car", () => {
    expect(holdingPerDay(40000)).toBeGreaterThan(holdingPerDay(20000));
  });
});

describe("lotLeverage", () => {
  it("prices 62 days on a $23,450 car at about $1,590", () => {
    expect(lotLeverage({ price: 23450, days: 62 })).toEqual({
      amount: 1590, perDay: 26, days: 62, tone: "strong",
      sub: "62 days on lot · about $26 a day to keep",
    });
  });
  it("calls 18 days low and 47 days building", () => {
    expect(lotLeverage({ price: 27995, days: 18 })).toMatchObject({ amount: 500, tone: "low" });
    expect(lotLeverage({ price: 31987, days: 47 }).tone).toBe("building");
  });
  it("says nothing without days or a price", () => {
    expect(lotLeverage({ price: 23450 })).toBeNull();
    expect(lotLeverage({ price: 23450, days: 0 })).toBeNull();
    expect(lotLeverage({ days: 40 })).toBeNull();
  });
  it("uses the singular for one day", () => {
    expect(lotLeverage({ price: 20000, days: 1 }).sub).toMatch(/^1 day on lot/);
  });
  it("follows the inputs if they change", () => {
    const cheaper = { ...HOLDING, floorplanApr: 0.05 };
    expect(lotLeverage({ price: 23450, days: 62 }, cheaper).amount).toBeLessThan(1590);
  });
});

import { toListing } from "../../server/listing.mjs";

describe("days on lot from live listings", () => {
  const base = { id: "a", price: 25000, miles: 30000, build: { year: 2021, make: "Honda", model: "CR-V" } };
  it("counts days at this dealer, not across every dealer", () => {
    expect(toListing({ ...base, dos_active: 9, dom_active: 64 }).days).toBe(9);
  });
  it("falls back to market-wide days when that's all there is", () => {
    expect(toListing({ ...base, dom_active: 64 }).days).toBe(64);
  });
});
