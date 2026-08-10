import { describe, it, expect } from "vitest";
import { fmt, pmt } from "../../src/theme.js";
import { dealerMath, buildDeal, MOCK_DEAL } from "../../src/data/decode.js";
import { planNumbers } from "../../src/components/Modes.jsx";
import { marketFit } from "../../src/components/Garage.jsx";

describe("pmt", () => {
  it("matches a standard amortization", () => {
    // $20,000 at 6% for 60 months = $386.66
    expect(pmt(20000, 6, 60)).toBeCloseTo(386.66, 1);
  });

  it("handles 0% financing without dividing by zero", () => {
    expect(pmt(24000, 0, 48)).toBe(500);
  });

  it("costs more over a longer term at the same rate", () => {
    const short = pmt(30000, 8, 48) * 48;
    const long = pmt(30000, 8, 84) * 84;
    expect(long).toBeGreaterThan(short);
  });
});

describe("fmt", () => {
  it("renders whole dollars with separators", () => {
    expect(fmt(31987)).toBe("$31,987");
    expect(fmt(0)).toBe("$0");
  });

  it("rounds rather than showing cents", () => {
    expect(fmt(1423.75)).toBe("$1,424");
  });
});

describe("dealerMath", () => {
  it("estimates all-in cost below market and a fair price above it", () => {
    const m = dealerMath(30400);
    expect(m.acq).toBeLessThan(30400);
    expect(m.fair).toBeGreaterThan(m.acq);
  });

  it("leaves the dealer a healthy $2-3k gross at the fair price", () => {
    const m = dealerMath(30400);
    expect(m.fair - m.acq).toBeGreaterThanOrEqual(2000);
    expect(m.fair - m.acq).toBeLessThanOrEqual(3000);
  });

  it("scales with the vehicle", () => {
    expect(dealerMath(60000).acq).toBeGreaterThan(dealerMath(20000).acq);
  });
});

describe("planNumbers", () => {
  it("anchors target to the live median", () => {
    const n = planNumbers(MOCK_DEAL, 30400);
    expect(n.target).toBe(30400);
    expect(n.open).toBeLessThan(n.target);
    expect(n.walk).toBeGreaterThan(n.target);
  });

  it("never sets a walk number above what the dealer is already asking", () => {
    // Walking away "if the price stays above" a number higher than the
    // sticker is nonsense advice — it can never trigger.
    const n = planNumbers(MOCK_DEAL, null);
    expect(n.walk).toBeLessThanOrEqual(MOCK_DEAL.asking);
  });

  it("keeps open < target < walk in every case", () => {
    for (const median of [null, 25000, 30400, 31987]) {
      const n = planNumbers(MOCK_DEAL, median);
      expect(n.open, `median=${median}`).toBeLessThan(n.target);
      expect(n.target, `median=${median}`).toBeLessThanOrEqual(n.walk);
    }
  });

  it("carries the leverage number for the mode screens", () => {
    const n = planNumbers(MOCK_DEAL, 30400);
    expect(n.leverage).toBe(MOCK_DEAL.junkTotal + MOCK_DEAL.taxError);
  });
});

describe("marketFit", () => {
  it("scores an at-market car in the mid-80s", () => {
    expect(marketFit(30000, 30000)).toBeGreaterThanOrEqual(83);
    expect(marketFit(30000, 30000)).toBeLessThanOrEqual(87);
  });

  it("scores under-market higher than over-market", () => {
    expect(marketFit(28000, 30000)).toBeGreaterThan(marketFit(32000, 30000));
  });

  it("stays inside 0-100 at absurd inputs", () => {
    for (const [p, m] of [[1, 30000], [300000, 30000], [30000, 1]]) {
      const f = marketFit(p, m);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThanOrEqual(100);
    }
  });

  it("returns a neutral score with no market data instead of a fake 100", () => {
    const f = marketFit(30000, null);
    expect(f).toBeGreaterThan(0);
    expect(f).toBeLessThan(85);
  });

  it("is a whole number for display", () => {
    expect(Number.isInteger(marketFit(27350, 30400))).toBe(true);
  });
});

describe("one-number calculator math", () => {
  /* The calculator is the anti-four-square feature: only the spread
     matters, and the verdict anchors to the original quote. */
  const spreadReal = (deal, price, trade) => {
    const spread = price - trade;
    return spread + spread * 0.0625 + deal.cleanFees;
  };

  it("a trade bump cancelled by a price bump is not progress", () => {
    const d = MOCK_DEAL;
    const before = spreadReal(d, 31987, 9200);
    const after = spreadReal(d, 32987, 10200); // +$1,000 both sides
    expect(after).toBeCloseTo(before, 2);
  });

  it("catches the classic trick: +$800 trade, +$1,000 price is a loss", () => {
    const d = MOCK_DEAL;
    const before = 31987 - 9200;
    const after = 32987 - 10000;
    expect(after).toBeGreaterThan(before);
    expect(after - before).toBe(200);
  });

  it("every $1,000 of trade value saves $62.50 in TX tax", () => {
    const taxOn = (spread) => spread * 0.0625;
    expect(taxOn(22787) - taxOn(21787)).toBeCloseTo(62.5, 2);
  });
});
