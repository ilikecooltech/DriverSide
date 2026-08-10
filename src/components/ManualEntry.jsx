import React, { useState } from "react";
import { C, mono, heading } from "../theme.js";
import { buildDeal } from "../data/decode.js";
import { Kicker, PrimaryBtn, GhostBtn } from "./ui.jsx";

/* Manual entry: the 30-second path to a full decode. Vehicle is captured
   as structured fields (year/make/model/trim) so the market lookup is
   exact — free-text parsing broke on "Jeep Grand Cherokee". */

const F = [
  { k: "year", label: "Year", ph: "2022", type: "tel", max: 4 },
  { k: "make", label: "Make", ph: "Toyota", type: "text" },
  { k: "model", label: "Model", ph: "RAV4", type: "text" },
  { k: "trim", label: "Trim (optional)", ph: "XLE", type: "text" },
  { k: "zip", label: "ZIP", ph: "77471", type: "tel", max: 5 },
  { k: "asking", label: "Vehicle price", ph: "27995", type: "tel" },
  { k: "docFee", label: "Doc fee", ph: "499", type: "tel" },
  { k: "titleReg", label: "Title & registration", ph: "108", type: "tel" },
  { k: "addonsTotal", label: "Dealer add-ons total", ph: "prep, nitrogen, etching…", type: "tel" },
  { k: "taxCharged", label: "Sales tax on the sheet", ph: "1750", type: "tel" },
  { k: "apr", label: "Their APR %", ph: "9.9", type: "text" },
  { k: "term", label: "Term (months)", ph: "72", type: "tel" },
  { k: "tradeOffer", label: "Their trade offer ($0 if none)", ph: "9200", type: "tel" },
  { k: "tradePayoff", label: "Your loan payoff ($0 if none)", ph: "12100", type: "tel" },
];

export function ManualEntry({ onDecode, onBack }) {
  const [v, setV] = useState({});
  const set = (k, val) => setV({ ...v, [k]: val });

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

  const input = (f) => (
    <div key={f.k}>
      <label style={{ display: "block", fontFamily: mono, fontSize: 9, letterSpacing: "0.1em", color: C.inkSoft, marginBottom: 4, textTransform: "uppercase" }}>
        {f.label}
      </label>
      <input
        value={v[f.k] || ""}
        onChange={(e) => set(f.k, f.max ? e.target.value.slice(0, f.max) : e.target.value)}
        placeholder={f.ph}
        inputMode={f.type === "tel" ? "decimal" : "text"}
        style={{ width: "100%", boxSizing: "border-box", minHeight: 44, padding: "8px 10px", border: `1px solid ${C.line}`, background: C.card, fontFamily: ["make", "model", "trim"].includes(f.k) ? "inherit" : mono, fontSize: 14, fontWeight: 600, color: C.ink }}
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        {F.map(input)}
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
