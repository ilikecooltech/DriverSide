/* Dealer mode: the live session a buyer runs while standing at a dealer.
   Pure functions so the numbers and the words are testable. The session
   itself lives in App state (and on the device) until they end it. */

import { TX_TAX } from "./decode.js";

const TEXAS_ZIP = /^(7[5-9]\d{3}|885\d{2})$/;
const money = (n) => "$" + Math.round(n).toLocaleString("en-US");

export function newSession(car, market = null, now = Date.now()) {
  const fair = market?.source === "live" && market.median > 0 ? market.median : null;
  return {
    car: {
      id: car.id || null, title: car.title || [car.year, car.make, car.model, car.trim].filter(Boolean).join(" "),
      year: car.year, make: car.make, model: car.model, trim: car.trim || "",
      price: Number(car.price) || null, dealer: car.dealer || "", miles: car.miles || null, vin: car.vin || null,
    },
    fair,
    market: fair ? { count: market.count || null, low: market.low || null, comps: (market.comps || []).slice(0, 3) } : null,
    startedAt: now,
    rounds: car.price ? [{ amount: Number(car.price), at: now, label: "Their ask" }] : [],
    checks: {},
    script: "open",
  };
}

export function otdTarget(fair, zip) {
  if (!fair) return null;
  return TEXAS_ZIP.test(String(zip || "")) ? Math.round(fair * (1 + TX_TAX)) : Math.round(fair);
}

export function elapsed(startedAt, now = Date.now()) {
  const s = Math.max(0, Math.floor((now - startedAt) / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
}

/* Every number they've put on the table, with its gap to fair. */
export function tableRows(session) {
  return (session?.rounds || []).map((r, i) => {
    const gap = session.fair ? r.amount - session.fair : null;
    return {
      label: r.label || `Their number ${i + 1}`,
      amount: r.amount,
      gap,
      gapText: gap === null ? "" : gap > 100 ? `${money(gap)} over fair` : gap < -100 ? `${money(-gap)} under fair` : "At fair",
      tone: gap === null ? "none" : gap > 100 ? "over" : "ok",
    };
  });
}

export function yourMove(session, zip) {
  const last = session?.rounds?.length ? session.rounds[session.rounds.length - 1].amount : null;
  const fair = session?.fair;
  const otd = otdTarget(fair, zip);
  if (!fair) return "Ask for the itemized out-the-door price in writing before any credit check. Don't talk monthly payments yet.";
  if (last !== null && last - fair > 100)
    return `Counter at ${money(fair)} before tax and ask for the out-the-door number in writing. Your target is ${money(otd)} out the door.`;
  return `That's a fair number. Ask for the itemized buyer's order and check it against ${money(otd)} out the door before any credit check.`;
}

export const SCRIPT_TABS = [
  { key: "open", label: "Opening" },
  { key: "addons", label: "Add-ons" },
  { key: "finance", label: "Finance office" },
  { key: "walk", label: "Walking away" },
];

export function scripts(session, { zip, apr } = {}) {
  const fair = session?.fair, otd = otdTarget(fair, zip), c = session?.car || {};
  const low = session?.market?.low;
  const what = [c.year, c.model].filter(Boolean).join(" ");
  return {
    open: fair
      ? `I'm ready to buy today.${low && what ? ` Similar ${what}s near here are listed from ${money(low)}.` : ""} I'll do ${money(fair)} before tax, with an itemized out-the-door sheet.`
      : "I'm ready to buy today if the numbers work. Before we talk payments, can I see the itemized out-the-door price?",
    addons: "I didn't ask for any add-ons. Please take them off the buyer's order, or keep the out-the-door price the same.",
    finance: apr
      ? `I already have financing at ${apr}%. I'll use yours if you beat it in writing. No extended warranty or GAP today, thanks.`
      : "I'm bringing my own financing. I'll use yours if you beat my credit union's rate in writing. No extended warranty or GAP today, thanks.",
    walk: `Thanks for your time. My number is ${otd ? `${money(otd)} out the door` : "the out-the-door price we talked about"}. If that works, call me. I have another car to see this afternoon.`,
  };
}

export const CHECKS = [
  "Get the itemized buyer's order before any credit check",
  "Test drive at highway speed with the AC on max",
  "Every add-on is off, or the out-the-door price didn't move",
  "Their loan rate beats yours, in writing",
  "You have copies of everything you signed",
];

/* Slider range for logging their next number: 20% under to 10% over
   the ask, in $50 steps. */
export function offerRange(session) {
  const base = session?.rounds?.[0]?.amount || session?.car?.price || 25000;
  const lo = Math.max(1000, Math.floor((base * 0.8) / 100) * 100);
  const hi = Math.ceil((base * 1.1) / 100) * 100;
  return { min: lo, max: hi, step: 50 };
}
