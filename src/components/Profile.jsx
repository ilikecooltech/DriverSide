import React, { useState } from "react";
import { C, mono, heading, fmt } from "../theme.js";
import { Kicker } from "./ui.jsx";

/* 4c — profile organized around the shopping loop: connections that feed
   the Garage, the four numbers the decoder personalizes with, alerts as
   ON/OFF text chips, and the business-model sentence said out loud. */

const APPS = [
  ["AT", "AutoTrader", "12 saved cars found"],
  ["CG", "CarGurus", "Price-history import"],
  ["CC", "Cars.com", "Saved searches import"],
  ["CV", "Carvana", "Watchlist import"],
  ["FB", "FB Marketplace", "Via the share sheet"],
];
const ALERTS = ["Price drops on garage cars", "Day-60 on watched listings", "Rates that beat your 7.2%"];

export function Profile({ name, isGuest, archetypeName, deal, onSignOut, onBack }) {
  const [conn, setConn] = useState({ 0: true });
  const [al, setAl] = useState({ 0: true, 1: true, 2: false });
  const displayName = isGuest ? "Guest" : name || "Driver";
  const initial = displayName[0].toUpperCase();

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 16, minHeight: 0 }}>
      <button onClick={onBack} style={{ minHeight: 40, background: "none", border: "none", color: C.inkSoft, fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 0, marginBottom: 4 }}>← Back</button>
      <div style={{ border: `1px solid ${C.line}`, background: C.card, padding: 14, display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <span style={{ width: 44, height: 44, border: `1.5px solid ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: heading, fontWeight: 600, fontSize: 18, flexShrink: 0 }}>{initial}</span>
        <span style={{ flex: 1 }}>
          <span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>{displayName}</span>
          <span style={{ display: "block", fontSize: 12, color: C.inkSoft }}>
            {archetypeName || "Goal not set"} · Sugar Land, TX 77471{isGuest ? " · on this device only" : ""}
          </span>
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.accentText }}>Edit</span>
      </div>

      <Kicker style={{ marginBottom: 2 }}>WHERE YOU SHOP — CONNECT TO SAVE IN ONE TAP</Kicker>
      {APPS.map(([ab, name2, sub], i) => (
        <div key={ab} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 52, borderBottom: `1px dashed ${C.line}`, padding: "4px 0" }}>
          <span style={{ width: 30, height: 30, border: `1px solid ${C.line}`, background: C.card, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: mono, fontSize: 11, fontWeight: 800, color: C.inkSoft, flexShrink: 0 }}>{ab}</span>
          <span style={{ flex: 1 }}>
            <span style={{ display: "block", fontSize: 14, fontWeight: 700 }}>{name2}</span>
            <span style={{ display: "block", fontSize: 11.5, color: C.inkSoft }}>{sub}</span>
          </span>
          <button onClick={() => setConn({ ...conn, [i]: !conn[i] })} style={{ minHeight: 36, minWidth: 104, fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", border: `1px solid ${conn[i] ? C.green : C.accent}`, background: conn[i] ? C.greenBg : C.card, color: conn[i] ? C.green : C.accentText, cursor: "pointer" }}>
            {conn[i] ? "✓ CONNECTED" : "CONNECT"}
          </button>
        </div>
      ))}
      <div style={{ fontSize: 11.5, color: C.inkSoft, lineHeight: 1.5, margin: "8px 0 16px" }}>
        Connections read your saved cars into the Garage. We never post, message, or share back.
      </div>

      <Kicker style={{ marginBottom: 2 }}>YOUR SHOPPING SETUP</Kicker>
      {[
        ["Buying goal", (archetypeName || "Set it — five taps") + " ›", C.accentText, false],
        ["Search area", "77471 · 100 MI ›", C.ink, true],
        ["Pre-approval on file", "7.2% · 60 MO ›", C.green, true],
        deal?.trade?.payoff > deal?.trade?.offer
          ? ["Trade-in on file", `${deal.trade.car.split(" ").pop().toUpperCase()} · −${fmt(deal.trade.payoff - deal.trade.offer)} ›`, C.ink, true]
          : ["Trade-in on file", "None ›", C.inkSoft, true],
      ].map(([k, v, color, monoV]) => (
        <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: 48, borderBottom: `1px dashed ${C.line}`, fontSize: 13.5 }}>
          <span>{k}</span>
          <span style={{ fontFamily: monoV ? mono : "inherit", fontWeight: 700, color }}>{v}</span>
        </div>
      ))}

      <Kicker style={{ margin: "16px 0 2px" }}>ALERTS{isGuest ? " — NEED AN ACCOUNT" : ""}</Kicker>
      {ALERTS.map((t, i) => (
        <button key={t} onClick={() => !isGuest && setAl({ ...al, [i]: !al[i] })} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", minHeight: 48, border: "none", borderBottom: `1px dashed ${C.line}`, background: "none", cursor: isGuest ? "default" : "pointer", fontSize: 13.5, color: isGuest ? C.inkSoft : C.ink, padding: 0, textAlign: "left" }}>
          <span>{t}</span>
          <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", padding: "6px 10px", border: `1px solid ${!isGuest && al[i] ? C.green : C.dash}`, background: !isGuest && al[i] ? C.greenBg : C.card, color: !isGuest && al[i] ? C.green : C.inkSoft }}>
            {!isGuest && al[i] ? "ON" : "OFF"}
          </span>
        </button>
      ))}

      <div style={{ background: C.accentTint, padding: "12px 14px", fontSize: 12.5, lineHeight: 1.55, marginTop: 16 }}>
        <b>Our only promise that matters:</b> your data is never sold, never shown to a dealer, and deleted the day you ask. We make money when you subscribe — not when you buy a car.
      </div>
      <button onClick={onSignOut} style={{ width: "100%", minHeight: 44, border: "none", background: "none", color: C.red, fontSize: 13, fontWeight: 700, cursor: "pointer", marginTop: 8 }}>
        Sign out
      </button>
    </div>
  );
}
