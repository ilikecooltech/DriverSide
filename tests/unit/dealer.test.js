import { describe, it, expect } from "vitest";
import { newSession, otdTarget, elapsed, tableRows, yourMove, scripts, offerRange, CHECKS } from "../../src/data/dealer.js";

const car = { id: "c1", title: "2021 Honda CR-V EX", year: 2021, make: "Honda", model: "CR-V", trim: "EX", price: 20888, dealer: "Gillman Honda" };
const market = { source: "live", median: 20645, low: 18900, count: 160, comps: [{ name: "a" }, { name: "b" }, { name: "c" }, { name: "d" }] };

describe("dealer session", () => {
  it("starts with their ask on the table and the market's middle as fair", () => {
    const s = newSession(car, market, 1000);
    expect(s).toMatchObject({ fair: 20645, startedAt: 1000, script: "open", checks: {} });
    expect(s.rounds).toEqual([{ amount: 20888, at: 1000, label: "Their ask" }]);
    expect(s.market.comps).toHaveLength(3);
  });

  it("has no fair price without live market data", () => {
    expect(newSession(car, { source: "none" }).fair).toBe(null);
    expect(newSession(car, null).market).toBe(null);
  });

  it("adds Texas tax for the out-the-door target", () => {
    expect(otdTarget(20645, "77469")).toBe(Math.round(20645 * 1.0625));
    expect(otdTarget(20645, "10001")).toBe(20645);
    expect(otdTarget(null, "77469")).toBe(null);
  });

  it("shows the clock", () => {
    expect(elapsed(0, 75_000)).toBe("1:15");
    expect(elapsed(0, 3_723_000)).toBe("1:02:03");
  });

  it("marks each number against fair", () => {
    const s = newSession(car, market, 0);
    s.rounds.push({ amount: 20600, at: 1 });
    const rows = tableRows(s);
    expect(rows[0]).toMatchObject({ gapText: "$243 over fair", tone: "over" });
    expect(rows[1]).toMatchObject({ label: "Their number 2", gapText: "At fair", tone: "ok" });
  });

  it("tells them their move", () => {
    const s = newSession(car, market, 0);
    expect(yourMove(s, "77469")).toMatch(/^Counter at \$20,645 before tax/);
    s.rounds.push({ amount: 20650 });
    expect(yourMove(s, "77469")).toMatch(/^That's a fair number/);
    expect(yourMove(newSession(car, null), "77469")).toMatch(/itemized out-the-door price/);
  });

  it("writes the scripts from their own numbers", () => {
    const s = newSession(car, market, 0);
    const say = scripts(s, { zip: "77469", apr: 5.9 });
    expect(say.open).toContain("Similar 2021 CR-Vs near here are listed from $18,900");
    expect(say.open).toContain("I'll do $20,645 before tax");
    expect(say.finance).toContain("5.9%");
    expect(say.walk).toContain(`$${Math.round(20645 * 1.0625).toLocaleString("en-US")} out the door`);
    expect(scripts(newSession(car, null), {}).finance).toMatch(/credit union/);
  });

  it("sizes the offer slider around the ask", () => {
    expect(offerRange(newSession(car, market))).toEqual({ min: 16700, max: 23000, step: 50 });
    expect(CHECKS).toHaveLength(5);
  });
});
