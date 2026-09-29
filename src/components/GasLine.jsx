import React from "react";
import { C, mono } from "../theme.js";
import { weekLabel } from "../lib/gas.js";

/* One line that says what gas costs where you are, where the number came
   from, and offers GPS if they haven't turned it on. */
export function GasLine({ gas, loc, zip, style }) {
  const on = loc?.status === "on";
  const canAsk = loc && !on && loc.status !== "unsupported" && loc.status !== "denied";
  const where = gas ? (gas.by === "gps" ? "near you" : `for ZIP ${gas.zip || zip}`) : "";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", border: `1px solid ${C.line}`, background: C.card, padding: "8px 12px", ...style }}>
      <div style={{ flex: "1 1 180px", minWidth: 0 }}>
        <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: "0.1em", color: C.inkSoft }}>GAS {where.toUpperCase()}</div>
        <div style={{ fontSize: 14, fontWeight: 700 }}>
          {gas ? `$${gas.price.toFixed(2)}/gal regular` : loc?.status === "asking" ? "Finding your area…" : "Not available right now"}
        </div>
        {gas && <div style={{ fontSize: 11.5, color: C.inkSoft }}>{gas.label}, week of {weekLabel(gas.week)} (EIA)</div>}
        {loc?.status === "denied" && <div style={{ fontSize: 11.5, color: C.inkSoft }}>Location is off for this site, so we use your ZIP.</div>}
      </div>
      {canAsk && (
        <button onClick={loc.locate} disabled={loc.status === "asking"}
          style={{ minHeight: 44, padding: "0 12px", border: `1px solid ${C.accent}`, background: "none", color: C.accentText, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          {loc.status === "asking" ? "Locating…" : "Use my location"}
        </button>
      )}
    </div>
  );
}
