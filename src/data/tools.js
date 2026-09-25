import { pmt } from "../theme.js";
import { TX_TAX } from "./decode.js";

/* Tools: the calculators and the advice behind the Tools tab.

   Pure functions, so every number the tab prints is tested rather than
   trusted. Each takes plain numbers (null for "not entered") and returns
   what the screen needs, or null when there isn't enough to say anything
   honest yet. Nothing here invents a default the buyer didn't give us:
   an empty rate stays empty and the screen asks for it. */

const num = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
};

/* Price -> out the door -> monthly -> total. */
export function paymentPlan({ price, down = 0, apr, term = 60 }) {
  const p = num(price), d = num(down) || 0, r = num(apr), t = num(term) || 60;
  if (!p) return null;
  const otd = p * (1 + TX_TAX);
  const financed = Math.max(0, otd - d);
  if (r === null) return { otd, financed, monthly: null };
  const monthly = pmt(financed, r, t);
  const interest = monthly * t - financed;
  /* What the same loan costs stretched to 84 months: the trick behind a
     "low payment." Only shown when it would actually be longer. */
  const stretched = t < 84 ? { monthly: pmt(financed, r, 84), extraInterest: pmt(financed, r, 84) * 84 - financed - interest } : null;
  return { otd, financed, monthly, interest, total: monthly * t + d, term: t, apr: r, stretched };
}

/* Monthly budget -> the most to pay for a car. */
export function affordability({ budget, down = 0, apr, term = 60 }) {
  const b = num(budget), d = num(down) || 0, r = num(apr), t = num(term) || 60;
  if (!b || r === null) return null;
  const i = r / 1200;
  const financed = i === 0 ? b * t : (b * (1 - Math.pow(1 + i, -t))) / i;
  const otdCeiling = financed + d;
  return { financed, otdCeiling, maxPrice: otdCeiling / (1 + TX_TAX), budget: b, apr: r, term: t };
}

/* The dealer's rate against yours, on the same amount and term. */
export function rateGap({ amount, yourApr, theirApr, term = 60 }) {
  const a = num(amount), y = num(yourApr), th = num(theirApr), t = num(term) || 60;
  if (!a || y === null || th === null) return null;
  const yours = pmt(a, y, t), theirs = pmt(a, th, t);
  return { yours, theirs, perMonth: theirs - yours, overLoan: (theirs - yours) * t, term: t };
}

/* Trade equity, and the Texas tax credit a trade earns: Texas taxes the
   price minus the trade (the same rule the decoder checks). */
export function tradeIn({ price, offer, payoff = 0 }) {
  const p = num(price) || 0, o = num(offer), owe = num(payoff) || 0;
  if (!o) return null;
  return {
    equity: o - owe,
    taxWithTrade: Math.max(0, p - o) * TX_TAX,
    taxSaved: Math.min(o, p) * TX_TAX,
  };
}

/* Hybrid vs gas: years for the fuel savings to cover the price gap.
   Combined mpg is the EPA-style 55% city / 45% highway harmonic mean. */
export const combinedMpg = (city, hwy) => 1 / (0.55 / city + 0.45 / hwy);

export function hybridPayback({ priceGap, gasCity, gasHwy, hybCity, hybHwy, miles, gasPrice }) {
  const gap = num(priceGap), m = num(miles), g = num(gasPrice);
  const gc = num(gasCity), gh = num(gasHwy), hc = num(hybCity), hh = num(hybHwy);
  if (!gap || !m || !g || !gc || !gh || !hc || !hh) return null;
  const gasFuel = (m / combinedMpg(gc, gh)) * g;
  const hybFuel = (m / combinedMpg(hc, hh)) * g;
  const saved = gasFuel - hybFuel;
  return { gasFuel, hybFuel, saved, years: saved > 0 ? gap / saved : null };
}

/* The dealer's sheet, line by line. Tax on price + add-ons − trade; the
   trade's loan payoff is added back, because the dealer pays it off. */
export function outTheDoorCheck({ price, addons = 0, docFee = 0, titleReg = 0, trade = 0, payoff = 0 }) {
  const p = num(price) || 0, a = num(addons) || 0, doc = num(docFee) || 0, tr = num(titleReg) || 0;
  const t = num(trade) || 0, owe = t ? num(payoff) || 0 : 0;
  const tax = Math.max(0, p + a - t) * TX_TAX;
  return { tax, total: p + a + doc + tr + tax - t + owe, owe };
}

/* Advice by stage. Plain, general, and nothing we can't stand behind. */
export const STAGES = [
  { key: "before", label: "Before you shop" },
  { key: "shopping", label: "Shopping" },
  { key: "dealer", label: "At the dealer" },
  { key: "finance", label: "Finance office" },
  { key: "after", label: "After you buy" },
];

export const ADVICE = {
  before: [
    { t: "Get pre-approved first", b: "A rate from your bank or credit union gives the dealer a real number to beat. It also caps what you can be talked into.", calc: "rates" },
    { t: "Budget the out-the-door price, not the payment", b: "Any payment can be hit by stretching the loan. Decide the most you'll pay in total, then shop under it.", calc: "afford" },
    { t: "Price the insurance before you pick the car", b: "Quotes can swing a lot between models. Get two or three quotes on your top choices." },
  ],
  shopping: [
    { t: "Check open recalls by VIN", b: "It's free at nhtsa.gov/recalls. An open recall is a fix the dealer should do before you sign." },
    { t: "Get an inspection on any used car", b: "An independent mechanic will spot what photos miss. A seller who won't allow one is telling you something." },
    { t: "Get the out-the-door price in writing first", b: "Ask for an itemized buyer's order by text or email before you drive over.", calc: "otd" },
  ],
  dealer: [
    { t: "One number at a time", b: "Agree on the out-the-door price first. Then the trade-in. Then financing. Mixing them hides where the money goes." },
    { t: "No credit check until the price is agreed", b: "You don't need to hand over your Social Security number to negotiate a price." },
    { t: "Add-ons are optional, even pre-printed ones", b: "Nitrogen, etching, protection packages. Ask for them off, or for the total to stay the same." },
  ],
  finance: [
    { t: "Extended warranties and GAP are optional", b: "Both are usually cheaper through your credit union or insurer. You can say no and decide later." },
    { t: "Read the rate and length before you sign", b: "Make sure they match what you agreed to and beat your pre-approval.", calc: "rates" },
  ],
  after: [
    { t: "You can usually cancel add-ons later", b: "Most service contracts and GAP can be cancelled for a prorated refund. The refund usually goes to your loan balance." },
    { t: "Refinance if rates drop", b: "If your credit improves or rates fall, a new loan can lower your payment. Check again after 6 to 12 months of on-time payments." },
    { t: "Keep every page you signed", b: "You'll need them to cancel add-ons, fix a title problem or refinance." },
  ],
};
