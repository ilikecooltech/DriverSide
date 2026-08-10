import React from "react";
import { C, mono, heading, fmt } from "../theme.js";
import { Kicker, Corners, PrimaryBtn, GhostBtn } from "./ui.jsx";

/* The Deal Pass paywall. Always sells with the user's own leverage
   number, never a generic feature list. Harm-prevention stays free.
   Gate contexts: second-decode, scripts, practice, comps. */

const CONTEXT_LINES = {
  "second-decode": "Your second decode is where the negotiation actually starts.",
  scripts: "Three scripts, personalized with this morning's market numbers.",
  practice: "Rehearse the F&I chair before you sit in it.",
  comps: "The receipts: named cars, dealers, miles, days on lot.",
};

export function Paywall({ leverage, context, onBuy, onClose }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 20, minHeight: 0, overflowY: "auto" }}>
      <div style={{ position: "relative", background: C.ink, color: "#fff", padding: "24px 22px", border: `1px solid ${C.line}` }}>
        <Corners color="rgba(255,255,255,0.45)" />
        <Kicker style={{ color: "rgba(255,255,255,0.7)", letterSpacing: "0.16em", marginBottom: 12 }}>DEAL PASS · ONE VEHICLE · 90 DAYS</Kicker>
        <div style={{ fontFamily: heading, fontWeight: 600, fontSize: 34, lineHeight: 1.05 }}>
          Unlock the plan to capture{leverage ? " your" : ""}
        </div>
        <div style={{ fontFamily: mono, fontSize: 40, fontWeight: 800, color: C.onNavySuccess, margin: "6px 0 2px" }}>
          {leverage ? fmt(leverage) : "your leverage"}
        </div>
        <div style={{ fontSize: 13, opacity: 0.85, marginTop: 8 }}>{CONTEXT_LINES[context] || CONTEXT_LINES.scripts}</div>
      </div>

      <div style={{ marginTop: 16 }}>
        {[
          "Unlimited decodes and re-analysis on this vehicle",
          "Live comps by ZIP — named cars, dealers, days on lot",
          "Three negotiation scripts with live market numbers",
          "Practice mode: role-play the F&I manager",
          "Financing deep check on your actual deal",
          "Deal review before signing — catches fees that reappear",
        ].map((t) => (
          <div key={t} style={{ display: "flex", gap: 10, alignItems: "baseline", padding: "8px 0", borderBottom: `1px dashed ${C.line}`, fontSize: 13.5 }}>
            <span style={{ color: C.green, fontWeight: 800 }}>✓</span>
            <span>{t}</span>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 12.5, color: C.inkSoft, margin: "12px 0", lineHeight: 1.5 }}>
        Removes one junk fee and it's paid for itself 10x. Negative-equity warnings and "don't buy yet" guidance are always free — that's the deal we make with you.
      </div>

      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
        <PrimaryBtn onClick={onBuy} height={52} style={{ fontSize: 18 }}>GET THE DEAL PASS · $49</PrimaryBtn>
        <GhostBtn onClick={onClose}>Not now</GhostBtn>
        <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: "0.1em", color: C.dash, textAlign: "center" }}>PROTOTYPE · NO REAL PURCHASE</div>
      </div>
    </div>
  );
}
