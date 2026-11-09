import React from "react";
import { C, mono, fmt } from "../theme.js";
import { lotLeverage } from "../data/leverage.js";

/* "Negotiation leverage $1,590 / 62 days on lot · about $26 a day to keep".
   Spans, not divs: it sits inside the card's button. The words carry the
   meaning; color only reinforces it. */
const TONE = { low: C.inkSoft, building: C.accentText, strong: C.green };

export function LeverageLine({ price, days }) {
  const l = lotLeverage({ price, days });
  if (!l) return null;
  return (
    <span style={{ display: "block", borderTop: `1px dashed ${C.line}`, marginTop: 8, paddingTop: 8 }}>
      <span style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>Negotiation leverage</span>
        <span style={{ fontFamily: mono, fontSize: 16, fontWeight: 800, color: TONE[l.tone], fontVariantNumeric: "tabular-nums" }}>{fmt(l.amount)}</span>
      </span>
      <span style={{ display: "block", fontSize: 12, color: C.inkSoft, marginTop: 2 }}>{l.sub}</span>
    </span>
  );
}
