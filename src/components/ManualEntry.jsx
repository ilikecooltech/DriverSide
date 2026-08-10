import React, { useState } from "react";
import { C, mono, heading } from "../theme.js";
import { buildDeal } from "../data/decode.js";
import { Kicker, PrimaryBtn, GhostBtn } from "./ui.jsx";

/* Manual entry: the 30-second path to a full decode. The true MVP —
   full value for someone who finds the app the night before signing. */

const F = [
  { k: "vehicle", label: "Vehicle (year make model trim)", ph: "2022 Toyota RAV4 XLE", type: "text", span: 2 },
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

  const ready = v.vehicle && Number(v.asking) > 0;

  const submit = () => {
    if (!ready) return;
    const addons = Number(v.addonsTotal) > 0
      ? [{ name: "Dealer add-ons (as listed on the sheet)", amt: Number(v.addonsTotal), short: "Ask to remove — line by line", why: "Prep, nitrogen, etching, sealant and friends. These are margin, not value. Ask for each one's removal by name; most are waived when challenged." }]
      : [];
    onDecode(
      buildDeal({
        vehicle: v.vehicle, zip: v.zip || "77471",
        asking: v.asking, docFee: v.docFee, titleReg: v.titleReg,
        taxCharged: v.taxCharged, apr: v.apr, term: v.term,
        tradeOffer: v.tradeOffer, tradePayoff: v.tradePayoff,
        addons,
      })
    );
  };

  const input = (f) => (
    <div key={f.k} style={{ gridColumn: f.span === 2 ? "1 / -1" : "auto" }}>
      <label style={{ display: "block", fontFamily: mono, fontSize: 9, letterSpacing: "0.1em", color: C.inkSoft, marginBottom: 4, textTransform: "uppercase" }}>
        {f.label}
      </label>
      <input
        value={v[f.k] || ""}
        onChange={(e) => set(f.k, f.max ? e.target.value.slice(0, f.max) : e.target.value)}
        placeholder={f.ph}
        inputMode={f.type === "tel" ? "decimal" : "text"}
        style={{ width: "100%", boxSizing: "border-box", minHeight: 44, padding: "8px 10px", border: `1px solid ${C.line}`, background: C.card, fontFamily: f.k === "vehicle" ? "inherit" : mono, fontSize: 14, fontWeight: 600, color: C.ink }}
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
        Skip anything you don't have — price and vehicle are enough to start.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {F.map(input)}
      </div>
      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 4 }}>
        <PrimaryBtn onClick={submit} height={52} style={{ fontSize: 18, opacity: ready ? 1 : 0.45 }} >
          DECODE THIS DEAL
        </PrimaryBtn>
        <GhostBtn onClick={onBack}>← Back</GhostBtn>
      </div>
    </div>
  );
}
