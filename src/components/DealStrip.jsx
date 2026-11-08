import React from "react";
import { C, mono, heading, fmt } from "../theme.js";
import { dealStrip } from "../data/dealer.js";

/* "Your deal": a navy strip under the top bar while a dealer session is
   open. It shows the car, their latest number and the gap to fair, and
   the whole strip is one button back to the live session. */
export function DealStrip({ session, onOpen }) {
  const s = dealStrip(session);
  if (!s) return null;
  const chip = s.tone === "over" ? { background: C.red, color: "#FFFFFF" } : s.tone === "ok" ? { background: C.greenFill, color: "#FFFFFF" } : null;
  return (
    <button
      className="ds-onnavy"
      onClick={onOpen}
      aria-label={`Your deal: ${s.title}${s.latest ? `, ${s.latestLabel.toLowerCase()} ${fmt(s.latest)}` : ""}${s.gapText ? `, ${s.gapText}` : ""}. Back to your session`}
      style={{
        display: "flex", alignItems: "center", gap: 10, width: "100%", minHeight: 48, padding: "6px 16px",
        border: "none", background: "#16233B", color: "#FFFFFF", cursor: "pointer", textAlign: "left", fontFamily: "inherit",
      }}
    >
      <span className="ds-pulse" aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: "#F08C7E", flexShrink: 0 }} />
      <span style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
        <span style={{ fontFamily: mono, fontSize: 12, letterSpacing: "0.06em", color: "#A9B4C4" }}>YOUR DEAL</span>
        <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title}</span>
      </span>
      {s.latest ? (
        <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0 }}>
          <span style={{ fontFamily: heading, fontWeight: 700, fontSize: 17, fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>{fmt(s.latest)}</span>
          {chip ? (
            <span style={{ ...chip, fontFamily: mono, fontSize: 12, fontWeight: 700, padding: "1px 5px", marginTop: 2 }}>{s.gapText}</span>
          ) : (
            <span style={{ fontFamily: mono, fontSize: 12, color: "#A9B4C4" }}>{s.latestLabel.toUpperCase()}</span>
          )}
        </span>
      ) : null}
      <span aria-hidden="true" style={{ color: "#8DB4DC", fontSize: 20, lineHeight: 1, flexShrink: 0 }}>›</span>
    </button>
  );
}
