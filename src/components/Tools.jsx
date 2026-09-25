import React, { useMemo, useState } from "react";
import { C, mono, heading, fmt, highlight } from "../theme.js";
import { Kicker } from "./ui.jsx";
import {
  paymentPlan, affordability, rateGap, tradeIn, hybridPayback, outTheDoorCheck, STAGES, ADVICE,
} from "../data/tools.js";

/* Tools — replaces the interim Finance tab.

   Six calculators and advice for each stage of buying. Every calculator
   opens pre-filled with what the buyer already told us (rate, term, trade,
   budget live in `setup`), and anything they type goes back into `setup`,
   so the Garage, the decoder and the next calculator all use the same
   numbers. Signed in, those numbers follow them to other devices; as a
   guest they stay on this phone. Nothing is invented: a blank rate stays
   blank and the screen asks for it. */

export const CALCS = [
  { key: "payment", title: "Payment and total cost", line: "Monthly, interest, total" },
  { key: "afford", title: "What can I afford?", line: "Budget to price" },
  { key: "rates", title: "Their rate vs yours", line: "What a markup costs" },
  { key: "trade", title: "Trade-in", line: "Equity and the tax break" },
  { key: "hybrid", title: "Hybrid or gas?", line: "Fuel payback" },
  { key: "otd", title: "Out-the-door check", line: "Line by line" },
];

const FIELDS = {
  price: { label: "Car price", pre: "$" },
  down: { label: "Down payment", pre: "$" },
  apr: { label: "Your rate (APR)", suf: "%", ph: "from your bank or credit union", decimal: true },
  term: { label: "Loan length", suf: "months" },
  budget: { label: "Most you want to pay a month", pre: "$", suf: "/mo" },
  theirApr: { label: "The dealer's rate (APR)", suf: "%", decimal: true },
  amount: { label: "Amount to finance", pre: "$" },
  trade: { label: "Their offer for your trade-in", pre: "$", ph: "e.g. 9000" },
  payoff: { label: "What you still owe on it", pre: "$", ph: "0 if paid off" },
  priceGap: { label: "How much more the hybrid costs", pre: "$" },
  gasCity: { label: "Gas version: city mpg" },
  gasHwy: { label: "Gas version: highway mpg" },
  hybCity: { label: "Hybrid: city mpg" },
  hybHwy: { label: "Hybrid: highway mpg" },
  miles: { label: "Miles you drive a year", suf: "mi" },
  gasPrice: { label: "Gas price near you", pre: "$", suf: "/gal", decimal: true },
  addons: { label: "Dealer add-ons", pre: "$", ph: "0 is the goal" },
  docFee: { label: "Doc fee", pre: "$", ph: "ask them" },
  titleReg: { label: "Title and registration", pre: "$", ph: "ask them" },
};

/* Which setup key each shared field reads from and writes back to. */
const SETUP_KEYS = { apr: "apr", term: "term", down: "down", budget: "budget", trade: "tradeValue", payoff: "tradePayoff" };

export function seedValues(setup = {}, cars = []) {
  const s = setup || {};
  return {
    price: cars[0]?.price ? String(cars[0].price) : "",
    down: s.down ? String(s.down) : "",
    // The default APR in setup is a placeholder until the buyer sets one.
    apr: s.aprSet && s.apr ? String(s.apr) : "",
    term: String(s.term || 60),
    budget: s.budget ? String(s.budget) : "",
    theirApr: "",
    amount: "",
    trade: s.tradeValue ? String(s.tradeValue) : "",
    payoff: s.tradePayoff ? String(s.tradePayoff) : "",
    priceGap: "", gasCity: "", gasHwy: "", hybCity: "", hybHwy: "", miles: "", gasPrice: "",
    addons: "", docFee: "", titleReg: "",
  };
}

const n = (v) => {
  const x = Number(String(v ?? "").replace(/[^0-9.]/g, ""));
  return v === "" || !Number.isFinite(x) ? null : x;
};

/* The one place that turns inputs into what a calculator screen shows. */
export function runCalc(key, v, cars = []) {
  switch (key) {
    case "payment": {
      const p = paymentPlan({ price: v.price, down: v.down, apr: v.apr, term: v.term });
      if (!p) return { big: "Add a price", sub: "", rows: [], peek: "Add a price" };
      const rows = [["Out the door (price + 6.25% Texas tax)", fmt(p.otd)], ["You finance", fmt(p.financed)]];
      if (p.monthly === null)
        return { big: "Add your rate", sub: "to see the monthly payment and total interest", rows, peek: "Add your rate",
          note: "Get a rate from your bank or credit union first. It's the number the dealer has to beat." };
      rows.push(["Total interest", fmt(p.interest)], ["Total you pay", fmt(p.total), true]);
      return { big: `${fmt(p.monthly)}/mo`, sub: `for ${p.term} months at ${p.apr}%`, rows, peek: `${fmt(p.monthly)}/mo`,
        note: p.stretched ? `Stretching this to 84 months drops the payment to ${fmt(p.stretched.monthly)} but adds ${fmt(p.stretched.extraInterest)} in interest. That's how a "low payment" costs more.` : "Before dealer fees, title and registration." };
    }
    case "afford": {
      const a = affordability({ budget: v.budget, down: v.down, apr: v.apr, term: v.term });
      if (!a) return { big: "Add your rate", sub: "and a monthly budget", rows: [], peek: "Add your rate",
        note: "The dealer can hit any monthly number by stretching the loan. This keeps the price honest." };
      const list = cars.map((c) => ({ id: c.id, title: c.title, price: c.price, over: c.price - a.maxPrice }));
      return { big: `Shop under ${fmt(a.maxPrice)}`, sub: "listed price, before dealer fees", peek: `Under ${fmt(a.maxPrice)}`,
        rows: [["Most you can finance", fmt(a.financed)], ["Plus your down payment", fmt(n(v.down) || 0)], ["Out-the-door ceiling", fmt(a.otdCeiling), true]],
        note: `That's ${fmt(a.budget)} a month for ${a.term} months at ${a.apr}%. Leave room for insurance, which changes a lot by model.`, list };
    }
    case "rates": {
      const amount = v.amount || (paymentPlan({ price: v.price, down: v.down, apr: 0 })?.financed ?? "");
      const g = rateGap({ amount, yourApr: v.apr, theirApr: v.theirApr, term: v.term });
      if (!g) return { big: "Add both rates", sub: "", rows: [], peek: "Compare rates",
        note: "Get your own pre-approval first, then ask the dealer to beat it in writing." };
      const more = g.perMonth > 0;
      return { big: more ? `${fmt(g.overLoan)} more` : g.perMonth < 0 ? `${fmt(-g.overLoan)} less` : "The same",
        sub: more ? `with the dealer's rate, over ${g.term} months` : "with the dealer's rate", peek: more ? `+${fmt(g.overLoan)} at theirs` : "Theirs is lower",
        rows: [[`Your payment at ${v.apr}%`, `${fmt(g.yours)}/mo`], [`Their payment at ${v.theirApr}%`, `${fmt(g.theirs)}/mo`], ["Difference", `${fmt(Math.abs(g.perMonth))}/mo`, true]],
        note: more ? `Ask them to beat ${v.apr}% in writing. If they can't, use your own loan.` : "Their rate is lower. Get it in writing, and check the loan length and price didn't change to pay for it." };
    }
    case "trade": {
      const t = tradeIn({ price: v.price, offer: v.trade, payoff: v.payoff });
      if (!t) return { big: "Add their offer", sub: "for your trade-in", rows: [], peek: "Add a trade",
        note: "Get an offer from CarMax or another buyer first, so you know what yours is worth before the dealer names a number." };
      return { big: t.equity >= 0 ? `${fmt(t.equity)} equity` : `${fmt(-t.equity)} underwater`,
        sub: t.equity >= 0 ? "what your trade puts toward this car" : "owed beyond what the trade is worth", peek: t.equity >= 0 ? `${fmt(t.equity)} equity` : `${fmt(-t.equity)} underwater`,
        rows: [["Their offer", fmt(n(v.trade))], ["Still owed", fmt(n(v.payoff) || 0)], ["Texas tax on this deal", fmt(t.taxWithTrade)], ["Tax the trade saves you", fmt(t.taxSaved), true]],
        note: t.equity < 0 ? "Negative equity gets added to your new loan, so you pay interest on a car you no longer own. Paying it down first, or keeping the car longer, can be cheaper." : `Selling it yourself may bring more money, but you give up the ${fmt(t.taxSaved)} tax savings. Compare the two before you decide.` };
    }
    case "hybrid": {
      const h = hybridPayback(v);
      if (!h) return { big: "Add the numbers", sub: "both cars' EPA mpg, your miles and gas price", rows: [], peek: "Fuel payback",
        note: "EPA city and highway mpg are on the window sticker and on every listing's detail page." };
      return { big: h.years === null ? "It won't" : h.years < 1 ? "Under a year" : `${h.years.toFixed(1)} years`, sub: "for the hybrid to pay back its higher price",
        peek: h.years ? `${h.years.toFixed(1)} yr payback` : "No payback",
        rows: [["Gas version, fuel a year", fmt(h.gasFuel)], ["Hybrid, fuel a year", fmt(h.hybFuel)], ["You save a year", fmt(h.saved), true]],
        note: "Assumes 55% city driving. Mostly town driving makes a hybrid pay back faster." };
    }
    case "otd": {
      const o = outTheDoorCheck({ price: v.price, addons: v.addons, docFee: v.docFee, titleReg: v.titleReg, trade: v.trade, payoff: v.payoff });
      const t = n(v.trade) || 0;
      const rows = [["Price", fmt(n(v.price) || 0)], ["Dealer add-ons", n(v.addons) ? fmt(n(v.addons)) : "$0, keep it that way"],
        ["Doc fee", n(v.docFee) ? fmt(n(v.docFee)) : "Ask"], ["Title and registration", n(v.titleReg) ? fmt(n(v.titleReg)) : "Ask"],
        ["Texas sales tax (6.25%)", fmt(o.tax)]];
      if (t) rows.push(["Trade-in credit", `−${fmt(t)}`]);
      if (o.owe) rows.push(["Payoff on your trade's loan", `+${fmt(o.owe)}`]);
      rows.push(["Out the door", fmt(o.total), true]);
      return { big: fmt(o.total), sub: `out the door${t ? ", after your trade" : ""}`, rows, peek: `${fmt(o.total)} OTD`,
        note: "Ask for this exact breakdown in writing before any credit check. Any line you didn't agree to is a line to question." };
    }
    default:
      return null;
  }
}

const CALC_FIELDS = {
  payment: ["price", "down", "apr", "term"],
  afford: ["budget", "down", "apr", "term"],
  rates: ["amount", "apr", "theirApr", "term"],
  trade: ["price", "trade", "payoff"],
  hybrid: ["priceGap", "gasCity", "gasHwy", "hybCity", "hybHwy", "miles", "gasPrice"],
  otd: ["price", "addons", "docFee", "titleReg", "trade", "payoff"],
};
const INTRO = {
  payment: "What a car really costs once tax and interest are in. Start from the out-the-door price, never the monthly.",
  afford: "Turns a monthly budget into the most you should pay for a car. Shop by this number, not by the payment.",
  rates: "The finance office often marks up the rate. See what a point or two costs you.",
  trade: "Texas taxes the price minus your trade, so a trade-in is worth more than its offer.",
  hybrid: "Does the hybrid earn back its higher price in fuel?",
  otd: "Type in the dealer's sheet line by line. This is the one number to negotiate.",
};

export function Tools({ setup, cars = [], signedIn, view, onView, onSaveSetup, onOpenCar }) {
  const [vals, setVals] = useState(() => seedValues(setup, cars));
  const calcKey = view?.calc || null;
  const stage = view?.stage || "before";

  const set = (k) => (e) => {
    const value = e.target.value;
    setVals((prev) => ({ ...prev, [k]: value }));
    const sk = SETUP_KEYS[k];
    if (sk) {
      const numVal = n(value);
      onSaveSetup?.({ [sk]: numVal ?? (sk === "term" ? 60 : 0), ...(k === "apr" ? { aprSet: numVal !== null } : {}) });
    }
  };

  const peeks = useMemo(() => Object.fromEntries(CALCS.map((c) => [c.key, runCalc(c.key, vals, cars)?.peek])), [vals, cars]);

  const saveLine = signedIn ? "SAVED TO YOUR ACCOUNT" : "STAYS ON THIS PHONE";
  const wrap = { flex: 1, overflowY: "auto", padding: 16, minHeight: 0, display: "flex", flexDirection: "column", gap: 18 };

  if (calcKey) {
    const r = runCalc(calcKey, vals, cars);
    const def = CALCS.find((c) => c.key === calcKey);
    return (
      <div style={wrap}>
        <div>
          <h1 style={{ fontFamily: heading, fontWeight: 700, fontSize: 28, lineHeight: 1.1, margin: "0 0 6px" }}>{def.title}</h1>
          <p style={{ margin: 0, fontSize: 13.5, color: C.inkSoft, lineHeight: 1.55 }}>{INTRO[calcKey]}</p>
        </div>
        <div role="status" style={{ background: C.ink, color: "#fff", padding: "16px 16px 14px" }}>
          <div style={{ fontFamily: heading, fontWeight: 700, fontSize: 32, lineHeight: 1.05 }}>{r.big}</div>
          {r.sub && <div style={{ fontSize: 13, color: "#C9D3E0", marginTop: 4 }}>{r.sub}</div>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {CALC_FIELDS[calcKey].map((k) => {
            const f = FIELDS[k];
            return (
              <div key={k} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <label htmlFor={`calc-${k}`} style={{ fontSize: 13, fontWeight: 700 }}>{f.label}</label>
                <div style={{ display: "flex", alignItems: "center", gap: 6, minHeight: 48, padding: "0 12px", border: `1.5px solid ${C.line}`, background: C.card }}>
                  {f.pre && <span style={{ color: C.inkSoft }}>{f.pre}</span>}
                  <input
                    id={`calc-${k}`}
                    value={vals[k]}
                    onChange={set(k)}
                    inputMode={f.decimal ? "decimal" : "numeric"}
                    placeholder={f.ph || ""}
                    style={{ flex: 1, minWidth: 0, minHeight: 44, border: "none", background: "transparent", fontFamily: mono, fontSize: 16, color: C.ink }}
                  />
                  {f.suf && <span style={{ color: C.inkSoft, fontSize: 13 }}>{f.suf}</span>}
                </div>
              </div>
            );
          })}
        </div>
        {r.rows.length > 0 && (
          <div style={{ border: `1px solid ${C.line}`, background: C.card, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 7, fontSize: 13.5 }}>
            {r.rows.map(([k, v, strong]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontWeight: strong ? 800 : 400, borderTop: strong ? `1px solid ${C.line}` : "none", paddingTop: strong ? 7 : 0 }}>
                <span>{k}</span>
                <span style={{ fontFamily: mono, textAlign: "right", whiteSpace: "nowrap", ...(strong ? highlight(0.45) : {}) }}>{v}</span>
              </div>
            ))}
          </div>
        )}
        {r.note && <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55 }}>{r.note}</p>}
        {r.list?.length > 0 && (
          <div>
            <Kicker style={{ marginBottom: 8 }}>HOW YOUR SAVED CARS FIT</Kicker>
            {r.list.map((c) => (
              <button key={c.id} onClick={() => onOpenCar?.(c.id)} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "11px 12px", marginBottom: 8, border: `1px solid ${C.line}`, background: C.card, cursor: "pointer", textAlign: "left", color: C.ink, fontFamily: "inherit" }}>
                <span style={{ fontSize: 13.5, fontWeight: 700 }}>{c.title}<span style={{ display: "block", fontWeight: 400, fontSize: 12, color: C.inkSoft }}>{fmt(c.price)}</span></span>
                <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, padding: "4px 8px", whiteSpace: "nowrap", background: c.over <= 0 ? C.greenBg : C.redBg, color: c.over <= 0 ? C.green : C.red }}>
                  {c.over <= 0 ? "FITS" : `${fmt(c.over)} OVER`}
                </span>
              </button>
            ))}
          </div>
        )}
        <div style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: "0.1em", color: signedIn ? C.green : C.inkSoft }}>{saveLine}</div>
      </div>
    );
  }

  return (
    <div style={wrap}>
      <div>
        <Kicker color={C.accentText}>TOOLS</Kicker>
        <h1 style={{ fontFamily: heading, fontWeight: 700, fontSize: 28, lineHeight: 1.1, margin: "4px 0 6px" }}>Money first. Car second.</h1>
        <p style={{ margin: 0, fontSize: 13.5, color: C.inkSoft, lineHeight: 1.55 }}>
          {signedIn
            ? "Using the numbers saved to your account. Change one here and it changes everywhere, on every device."
            : "Everything here works without an account. Your numbers stay on this phone."}
        </p>
      </div>

      <section aria-label="Calculators">
        <Kicker style={{ marginBottom: 8 }}>CALCULATORS</Kicker>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {CALCS.map((c) => (
            <button
              key={c.key}
              onClick={() => onView({ calc: c.key, stage })}
              style={{ minHeight: 112, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 8, padding: 12, border: `1px solid ${C.line}`, background: C.card, cursor: "pointer", textAlign: "left", color: C.ink, fontFamily: "inherit" }}
            >
              <span>
                <span style={{ display: "block", fontFamily: heading, fontWeight: 700, fontSize: 17, lineHeight: 1.15 }}>{c.title}</span>
                <span style={{ display: "block", fontSize: 12, color: C.inkSoft, marginTop: 3 }}>{c.line}</span>
              </span>
              <span style={{ fontFamily: mono, fontSize: 11.5, color: C.accentText, fontWeight: 700 }}>{peeks[c.key]}</span>
            </button>
          ))}
        </div>
      </section>

      <section aria-label="Advice for where you are">
        <Kicker style={{ marginBottom: 8 }}>ADVICE FOR WHERE YOU ARE</Kicker>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, marginBottom: 8 }}>
          {STAGES.map((s) => {
            const on = s.key === stage;
            return (
              <button key={s.key} onClick={() => onView({ calc: null, stage: s.key })} aria-pressed={on}
                style={{ flexShrink: 0, minHeight: 38, padding: "0 12px", border: `1px solid ${on ? C.ink : C.line}`, background: on ? C.ink : C.card, color: on ? "#fff" : C.ink, fontSize: 12.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                {s.label}
              </button>
            );
          })}
        </div>
        {(ADVICE[stage] || []).map((a) => (
          <div key={a.t} style={{ border: `1px solid ${C.line}`, background: C.card, padding: "13px 14px", marginBottom: 8 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.35 }}>{a.t}</div>
            <div style={{ fontSize: 13.5, color: C.inkSoft, lineHeight: 1.55, marginTop: 4 }}>{a.b}</div>
            {a.calc && (
              <button onClick={() => onView({ calc: a.calc, stage })} style={{ marginTop: 8, minHeight: 38, padding: "0 12px", border: `1px solid ${C.accent}`, background: "none", color: C.accentText, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                Open the {CALCS.find((c) => c.key === a.calc).title.toLowerCase()} calculator
              </button>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
