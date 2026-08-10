import React, { useState } from "react";
import { C, mono, heading, fmt, stripes } from "../theme.js";
import { GARAGE } from "../data/decode.js";
import { Kicker, PrimaryBtn } from "./ui.jsx";

/* Garage — the empty state sells the mechanic and shows the goal already
   working; the list sorts by fit and cross-links to the Decoder. */

export function Garage({ archetypeName = "Family Hauler", onOpenDecode }) {
  const [view, setView] = useState("saved");

  if (view === "empty")
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "24px 20px", gap: 14, minHeight: 0, overflowY: "auto" }}>
        <h1 style={{ fontFamily: heading, fontWeight: 600, fontSize: 28, lineHeight: 1.12, margin: "8px 0 0" }}>
          Every site you browse.<br />One garage. One score.
        </h1>
        <div style={{ fontSize: 14, lineHeight: 1.55, color: C.inkSoft }}>
          Save any listing — AutoTrader, CarGurus, a dealer's own site — and we normalize it, score it against your{" "}
          <b style={{ color: C.ink }}>{archetypeName}</b> goal, and watch it for price drops.
        </div>
        <div style={{ border: `1px dashed ${C.dash}`, padding: "18px 16px", background: stripes }}>
          <Kicker style={{ letterSpacing: "0.1em", marginBottom: 10 }}>YOUR FIRST CAR GOES HERE</Kicker>
          {[
            ["1", "Find a car anywhere you already browse"],
            ["2", "Share it to DriverSide — share sheet or browser extension"],
            ["3", "We score it 0–100 for your goal and track the price"],
          ].map(([n, t]) => (
            <div key={n} style={{ display: "flex", gap: 12, fontSize: 13, lineHeight: 1.5, color: C.ink, marginBottom: n === "3" ? 0 : 8 }}>
              <span style={{ fontFamily: mono, fontWeight: 800, color: C.accentText }}>{n}</span>
              <span>{t}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12.5, color: C.inkSoft }}>
          Meanwhile, we're watching for <b style={{ color: C.ink }}>safety-first compact SUVs under $30k</b> near 77471 — your goal, working even while the garage is empty.
        </div>
        <PrimaryBtn onClick={() => setView("saved")} height={52} style={{ fontSize: 18, marginTop: "auto" }}>SAVE YOUR FIRST CAR</PrimaryBtn>
      </div>
    );

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 16, minHeight: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <Kicker style={{ letterSpacing: "0.12em" }}>3 SAVED · SCORED FOR {archetypeName.toUpperCase()} · SORTED BY FIT</Kicker>
        <button onClick={() => setView("empty")} style={{ fontFamily: mono, fontSize: 9, letterSpacing: "0.08em", color: C.accentText, background: "none", border: `1px solid ${C.line}`, padding: "5px 8px", cursor: "pointer" }}>
          VIEW: EMPTY
        </button>
      </div>
      {GARAGE.map((g) => (
        <div key={g.car} style={{ border: `1px solid ${C.line}`, background: C.card, padding: 14, marginBottom: 12, position: "relative" }}>
          {g.best && (
            <div style={{ position: "absolute", top: -1, right: -1, background: C.green, color: "#fff", fontFamily: mono, fontSize: 9, letterSpacing: "0.1em", padding: "4px 8px" }}>BEST FIT</div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <div>
              <div style={{ fontSize: 15.5, fontWeight: 700 }}>{g.car}</div>
              <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 2 }}>
                {g.miles} · <span style={{ fontFamily: mono, fontSize: 10, border: `1px solid ${C.line}`, padding: "1px 5px" }}>{g.src}</span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: mono, fontSize: 16, fontWeight: 800 }}>{fmt(g.price)}</div>
              <div style={{ fontFamily: mono, fontSize: 11, fontWeight: 800, color: g.fit >= 85 ? C.green : C.amber }}>FIT {g.fit}/100</div>
            </div>
          </div>
          <div style={{ height: 4, background: C.line, margin: "10px 0 8px" }}>
            <div style={{ width: `${g.fit}%`, height: 4, background: g.fit >= 85 ? C.green : C.amber }} />
          </div>
          <div style={{ fontSize: 12.5, color: C.inkSoft }}>{g.note}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
            <span style={{ fontFamily: mono, fontSize: 10.5, color: C.inkSoft }}>{g.dol}</span>
            {g.drop && (
              <span style={{ fontFamily: mono, fontSize: 10.5, color: C.green, fontWeight: 700, background: C.greenBg, padding: "2px 6px" }}>{g.drop}</span>
            )}
            {g.decoded && (
              <button onClick={onOpenDecode} style={{ fontFamily: mono, fontSize: 10.5, color: C.accentText, fontWeight: 700, marginLeft: "auto", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                QUOTE DECODED →
              </button>
            )}
          </div>
        </div>
      ))}
      <div style={{ border: `1px dashed ${C.dash}`, minHeight: 48, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: C.accentText, cursor: "pointer" }}>
        + Save another from any site
      </div>
    </div>
  );
}
