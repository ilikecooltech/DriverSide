import React from "react";
import { C, mono, heading } from "../theme.js";
import { Kicker, PrimaryBtn } from "./ui.jsx";

/* Finance — interim.

   The bottom nav ships a Finance destination now; the surface behind it
   is Phase 2 (direct vs indirect flow diagrams, the loan-cost calculator
   with the term table, TCO with the stacked cost bar, the five tips).

   A tab that opens nothing is worse than no tab, so this is not a
   placeholder: it shows the loan terms the app already holds and uses —
   the pre-approval APR and term that price every payment on Shop and in
   the decoder — and lets you change them. It says plainly what is still
   coming rather than implying the tab is finished. */

export function Finance({ setup, onEditTerms }) {
  const apr = Number(setup?.apr);
  const term = Number(setup?.term);
  const hasTerms = Number.isFinite(apr) && apr > 0 && Number.isFinite(term) && term > 0;

  const row = { display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "11px 0", borderBottom: `1px dashed ${C.line}` };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 16, minHeight: 0 }}>
      <Kicker color={C.accentText} style={{ letterSpacing: "0.12em" }}>YOUR MONEY</Kicker>
      <h1 style={{ fontFamily: heading, fontWeight: 600, fontSize: 26, lineHeight: 1.12, margin: "6px 0 6px" }}>
        Money first. Car second.
      </h1>
      <p style={{ fontSize: 13.5, color: C.inkSoft, lineHeight: 1.55, marginTop: 0 }}>
        The terms you walk in with are the strongest number you own. These are the ones we price everything against
        today — on every Shop card and in every decoded sheet.
      </p>

      <div style={{ border: `1px solid ${C.line}`, background: C.card, padding: 14, marginTop: 16 }}>
        <Kicker style={{ marginBottom: 2 }}>YOUR PRE-APPROVAL</Kicker>
        {hasTerms ? (
          <>
            <div style={row}>
              <span style={{ fontSize: 13.5 }}>Rate</span>
              <span style={{ fontFamily: mono, fontSize: 15, fontWeight: 800 }}>{apr}% APR</span>
            </div>
            <div style={{ ...row, borderBottom: "none" }}>
              <span style={{ fontSize: 13.5 }}>Term</span>
              <span style={{ fontFamily: mono, fontSize: 15, fontWeight: 800 }}>{term} months</span>
            </div>
          </>
        ) : (
          <p style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.5, margin: "6px 0 0" }}>
            No terms set yet. Add the rate and term you have been approved for and every payment in the app starts
            using them.
          </p>
        )}
        <PrimaryBtn onClick={onEditTerms} height={44} style={{ marginTop: 12 }}>
          {hasTerms ? "CHANGE MY TERMS" : "ADD MY TERMS"}
        </PrimaryBtn>
      </div>

      {/* What this tab becomes — said out loud, not implied. */}
      <div style={{ border: `1px dashed ${C.dash}`, background: C.neutralTint, padding: "13px 14px", marginTop: 14 }}>
        <Kicker color={C.amberDark} style={{ marginBottom: 6 }}>STILL BEING BUILT</Kicker>
        <div style={{ fontSize: 13, color: C.ink, lineHeight: 1.55 }}>
          The full Finance tab lands in the next update:
        </div>
        <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 12.5, color: C.inkSoft, lineHeight: 1.7 }}>
          <li>Direct vs. dealer financing — and where the markup hides</li>
          <li>What the loan really costs, across 36 / 48 / 60 / 72 / 84 months</li>
          <li>True cost of ownership, with resale netted out</li>
        </ul>
      </div>
    </div>
  );
}
