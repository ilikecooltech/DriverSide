import React, { useState } from "react";
import { C, mono, heading } from "../theme.js";
import { buildDeal } from "../data/decode.js";
import { Kicker, PrimaryBtn, GhostBtn, Slider } from "./ui.jsx";

/* Manual entry: the 30-second path to a full decode. Vehicle is captured
   as structured fields (year/make/model/trim) so the market lookup is
   exact — free-text parsing broke on "Jeep Grand Cherokee". */

const thisYear = new Date().getFullYear();
const YEARS = Array.from({ length: thisYear + 2 - 2005 }, (_, i) => String(thisYear + 1 - i));

/* The car: short text and a year picker. */
const F = [
  { k: "make", label: "Make", ph: "Toyota" },
  { k: "model", label: "Model", ph: "RAV4" },
  { k: "trim", label: "Trim (optional)", ph: "XLE" },
  { k: "zip", label: "ZIP", ph: "77471", max: 5, numeric: true },
];

/* The sheet: every number is a slider with the exact figure beside it.
   Read the line, type it or drag to it. Blank means "not on the sheet". */
const S = [
  { k: "asking", label: "Vehicle price", pre: "$", min: 5000, max: 100000, step: 250, rest: 28000 },
  { k: "docFee", label: "Doc fee", pre: "$", min: 0, max: 1500, step: 10, rest: 150 },
  { k: "titleReg", label: "Title and registration", pre: "$", min: 0, max: 1500, step: 10, rest: 300 },
  { k: "addonsTotal", label: "Dealer add-ons total", pre: "$", min: 0, max: 6000, step: 50, rest: 0, hint: "Prep, nitrogen, etching, protection packages." },
  { k: "taxCharged", label: "Sales tax on the sheet", pre: "$", min: 0, max: 8000, step: 25, rest: 1750 },
  { k: "apr", label: "Their rate (APR)", suf: "%", min: 0, max: 25, step: 0.1, decimal: true, rest: 9 },
  { k: "term", label: "Loan length", suf: "mo", min: 24, max: 84, step: 12, rest: 72 },
  { k: "tradeOffer", label: "Their trade offer", pre: "$", min: 0, max: 60000, step: 250, rest: 0, hint: "Leave at 0 if you have no trade." },
  { k: "tradePayoff", label: "Your loan payoff", pre: "$", min: 0, max: 60000, step: 250, rest: 0 },
];

/* `initial` pre-fills the car when the buyer came from a vehicle page
   ("I'm at this dealer"), so they only type what's on the sheet. */
export function ManualEntry({ onDecode, onBack, initial }) {
  const [v, setV] = useState(() => ({ ...(initial || {}) }));
  const set = (k, val) => setV((prev) => ({ ...prev, [k]: val }));

  const ready = /^(19|20)\d{2}$/.test(v.year || "") && v.make && v.model && Number(v.asking) > 0;

  const submit = () => {
    if (!ready) return;
    const addons = Number(v.addonsTotal) > 0
      ? [{ name: "Dealer add-ons (as listed on the sheet)", amt: Number(v.addonsTotal), short: "Ask to remove — line by line", why: "Prep, nitrogen, etching, sealant and friends. These are margin, not value. Ask for each one's removal by name; most are waived when challenged." }]
      : [];
    const vehicle = [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ");
    onDecode(
      buildDeal({
        vehicle,
        query: { year: v.year.trim(), make: v.make.trim(), model: v.model.trim(), trim: (v.trim || "").trim() },
        zip: v.zip || "77471",
        asking: v.asking, docFee: v.docFee, titleReg: v.titleReg,
        taxCharged: v.taxCharged, apr: v.apr, term: v.term,
        tradeOffer: v.tradeOffer, tradePayoff: v.tradePayoff,
        addons,
      })
    );
  };

  const lab = { display: "block", fontFamily: mono, fontSize: 9, letterSpacing: "0.1em", color: C.inkSoft, marginBottom: 4, textTransform: "uppercase" };
  const box = { width: "100%", boxSizing: "border-box", minHeight: 44, padding: "8px 10px", border: `1px solid ${C.line}`, background: C.card, fontSize: 14, fontWeight: 600, color: C.ink };
  const input = (f) => (
    <div key={f.k}>
      <label htmlFor={`me-${f.k}`} style={lab}>{f.label}</label>
      <input
        id={`me-${f.k}`}
        value={v[f.k] || ""}
        onChange={(e) => set(f.k, f.max ? e.target.value.replace(/\D/g, "").slice(0, f.max) : e.target.value)}
        placeholder={f.ph}
        inputMode={f.numeric ? "numeric" : "text"}
        style={{ ...box, fontFamily: f.numeric ? mono : "inherit" }}
      />
    </div>
  );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 20, minHeight: 0, overflowY: "auto" }}>
      <Kicker color={C.accentText} style={{ letterSpacing: "0.12em" }}>MANUAL ENTRY · 30 SECONDS</Kicker>
      <h1 style={{ fontFamily: heading, fontWeight: 600, fontSize: 24, lineHeight: 1.15, margin: "6px 0 4px" }}>
        Type what's on their sheet.
      </h1>
      <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 16 }}>
        Skip anything you don't have — year, make, model, and price are enough to start.
      </div>
      <Kicker style={{ marginBottom: 8 }}>THE CAR</Kicker>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label htmlFor="me-year" style={lab}>Year</label>
          <select id="me-year" value={v.year || ""} onChange={(e) => set("year", e.target.value)} style={{ ...box, fontFamily: mono }}>
            <option value="">Year</option>
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        {F.map(input)}
      </div>
      <Kicker style={{ margin: "18px 0 8px" }}>THEIR SHEET</Kicker>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {S.map((f) => (
          <Slider key={f.k} id={`me-${f.k}`} label={f.label} value={v[f.k] ?? ""} onChange={(x) => set(f.k, x)}
            min={f.min} max={f.max} step={f.step} rest={f.rest} pre={f.pre} suf={f.suf} decimal={f.decimal} hint={f.hint} />
        ))}
      </div>
      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 4 }}>
        <PrimaryBtn onClick={submit} height={52} style={{ fontSize: 18, opacity: ready ? 1 : 0.45 }}>
          DECODE THIS DEAL
        </PrimaryBtn>
        <GhostBtn onClick={onBack}>← Back</GhostBtn>
      </div>
    </div>
  );
}
