/* Negotiation leverage from days on lot.

   Every day a car sits, it costs the dealer money: interest on the loan
   that paid for it (floorplan), the value it loses, and the cost of the
   lot itself. The longer it sits, the more they've sunk into it and the
   more they want it gone. That total, in dollars, is the buyer's
   leverage: a number to point at, not a promised discount.

   Inputs, from dealer-side industry sources (Nov 2026):
   - Floorplan interest about 7.5% a year on the car's value
     (Kinetic Advantage, "The True Cost of Aged Inventory").
   - Depreciation 0.5 to 1% a month in a normal market; we use 0.75%
     (same source).
   - Lot costs about $15 a day: insurance, space, detailing, overhead
     (same source; most independents land at $12 to $20).
   Dealers start treating a car as aged around 30 to 60 days and many cut
   price or wholesale by 60 to 90 (Autotrader; Auto Remarketing). */

export const HOLDING = {
  floorplanApr: 0.075,
  depreciationPerMonth: 0.0075,
  lotPerDay: 15,
};

/* What one more day on the lot costs the dealer, for a car at this price. */
export function holdingPerDay(price, h = HOLDING) {
  const p = Number(price) || 0;
  if (p <= 0) return 0;
  return p * h.floorplanApr / 365 + p * h.depreciationPerMonth / 30 + h.lotPerDay;
}

/* The card line. Null when there's nothing honest to say. */
export function lotLeverage({ price, days } = {}, h = HOLDING) {
  const d = Math.floor(Number(days) || 0);
  const perDay = holdingPerDay(price, h);
  if (d <= 0 || perDay <= 0) return null;
  const amount = Math.round((perDay * d) / 10) * 10;
  /* Under 30 days a dealer feels little pressure; 30 to 59 it's aging;
     60 and up most dealers want it gone. */
  const tone = d >= 60 ? "strong" : d >= 30 ? "building" : "low";
  return {
    amount,
    perDay: Math.round(perDay),
    days: d,
    tone,
    sub: `${d} ${d === 1 ? "day" : "days"} on lot · about $${Math.round(perDay)} a day to keep`,
  };
}
