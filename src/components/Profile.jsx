import React, { useState } from "react";
import { C, mono, heading, fmt } from "../theme.js";
import { CONNECTORS } from "../data/connections.js";
import { Kicker, PrimaryBtn } from "./ui.jsx";

/* Profile — organized around the shopping loop, not account plumbing:
   the marketplaces that feed the Garage, the four numbers every other
   screen personalizes with (all editable), alerts, and the business
   model said out loud. */

const ALERTS = ["Price drops on garage cars", "Day-60 on watched listings", "Rates that beat your pre-approval"];

function EditRow({ label, value, mono: isMono, color, onEdit }) {
  return (
    <button
      onClick={onEdit}
      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", minHeight: 48, border: "none", borderBottom: `1px dashed ${C.line}`, background: "none", cursor: "pointer", fontSize: 13.5, color: C.ink, padding: 0, textAlign: "left" }}
    >
      <span>{label}</span>
      <span style={{ fontFamily: isMono ? mono : "inherit", fontWeight: 700, color: color || C.accentText }}>
        {value} <span style={{ color: C.accentText }}>›</span>
      </span>
    </button>
  );
}

function SetupEditor({ setup, onSave, onCancel }) {
  const [v, setV] = useState(setup);
  const F = [
    { k: "zip", label: "ZIP", ph: "77471", max: 5, mono: true },
    { k: "radius", label: "Search radius (mi)", ph: "100", mono: true },
    { k: "apr", label: "Pre-approval APR %", ph: "7.2", mono: true },
    { k: "term", label: "Pre-approval term (months)", ph: "60", mono: true },
    { k: "tradeCar", label: "Trade-in vehicle", ph: "2019 Nissan Altima SV" },
    { k: "tradeValue", label: "Trade value", ph: "9200", mono: true },
    { k: "tradePayoff", label: "Trade loan payoff", ph: "12100", mono: true },
  ];
  return (
    <div style={{ border: `1px solid ${C.accent}`, background: C.card, padding: 14, marginBottom: 16 }}>
      <Kicker color={C.accentText} style={{ letterSpacing: "0.12em", marginBottom: 10 }}>EDIT YOUR SHOPPING SETUP</Kicker>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        {F.map((f) => (
          <div key={f.k}>
            <label style={{ display: "block", fontFamily: mono, fontSize: 9, letterSpacing: "0.1em", color: C.inkSoft, marginBottom: 4, textTransform: "uppercase" }}>{f.label}</label>
            <input
              value={v[f.k] ?? ""}
              onChange={(e) => setV({ ...v, [f.k]: f.max ? e.target.value.slice(0, f.max) : e.target.value })}
              placeholder={f.ph}
              style={{ width: "100%", boxSizing: "border-box", minHeight: 44, padding: "8px 10px", border: `1px solid ${C.line}`, background: C.paper, fontFamily: f.mono ? mono : "inherit", fontSize: 14, fontWeight: 600, color: C.ink }}
            />
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11.5, color: C.inkSoft, margin: "10px 0", lineHeight: 1.5 }}>
        These drive your Shop results, the financing check, and every trade calculation.
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onCancel} style={{ flex: 1, minHeight: 44, border: `1px solid ${C.line}`, background: C.card, fontSize: 13, fontWeight: 700, color: C.ink, cursor: "pointer" }}>Cancel</button>
        <PrimaryBtn
          onClick={() => onSave({
            ...v,
            radius: Number(v.radius) || 100,
            apr: Number(v.apr) || 7.2,
            term: Number(v.term) || 60,
            tradeValue: Number(v.tradeValue) || 0,
            tradePayoff: Number(v.tradePayoff) || 0,
          })}
          style={{ flex: 2, width: "auto" }}
        >
          SAVE SETUP
        </PrimaryBtn>
      </div>
    </div>
  );
}

export function Profile({
  name, isGuest, archetypeName, setup, connections, onConnect, onDisconnect,
  onSaveSetup, onEditGoal, onSignOut, onBack,
}) {
  const [editing, setEditing] = useState(false);
  const [al, setAl] = useState({ 0: true, 1: true, 2: false });
  const displayName = isGuest ? "Guest" : name || "Driver";
  const initial = displayName[0].toUpperCase();
  const negEq = Math.max(0, (setup.tradePayoff || 0) - (setup.tradeValue || 0));

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 16, minHeight: 0 }}>
      <button onClick={onBack} style={{ minHeight: 40, background: "none", border: "none", color: C.inkSoft, fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 0, marginBottom: 4 }}>← Back</button>

      <div style={{ border: `1px solid ${C.line}`, background: C.card, padding: 14, display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <span style={{ width: 44, height: 44, border: `1.5px solid ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: heading, fontWeight: 600, fontSize: 18, flexShrink: 0 }}>{initial}</span>
        <span style={{ flex: 1 }}>
          <span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>{displayName}</span>
          <span style={{ display: "block", fontSize: 12, color: C.inkSoft }}>
            {archetypeName || "Goal not set"} · {setup.zip || "77471"}{isGuest ? " · on this device only" : ""}
          </span>
        </span>
      </div>

      <Kicker style={{ marginBottom: 2 }}>WHERE YOU SHOP — CONNECT TO PULL IN YOUR SAVED CARS</Kicker>
      {CONNECTORS.map((c) => {
        const on = Boolean(connections[c.id]);
        return (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 52, borderBottom: `1px dashed ${C.line}`, padding: "4px 0" }}>
            <span style={{ width: 30, height: 30, border: `1px solid ${C.line}`, background: C.card, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: mono, fontSize: 11, fontWeight: 800, color: C.inkSoft, flexShrink: 0 }}>{c.ab}</span>
            <span style={{ flex: 1 }}>
              <span style={{ display: "block", fontSize: 14, fontWeight: 700 }}>{c.name}</span>
              <span style={{ display: "block", fontSize: 11.5, color: C.inkSoft }}>{c.sub}</span>
            </span>
            <button
              onClick={() => (on ? onDisconnect(c.id) : onConnect(c.id))}
              style={{ minHeight: 36, minWidth: 108, fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", border: `1px solid ${on ? C.green : C.accent}`, background: on ? C.greenBg : C.card, color: on ? C.green : C.accentText, cursor: "pointer" }}
            >
              {on ? "✓ CONNECTED" : "CONNECT"}
            </button>
          </div>
        );
      })}
      <div style={{ fontSize: 11.5, color: C.inkSoft, lineHeight: 1.5, margin: "8px 0 4px" }}>
        Connections read your saved cars into the Garage. We never post, message, or share back.
      </div>
      <div style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: "0.06em", color: C.amber, background: C.amberBg, padding: "6px 8px", marginBottom: 16, lineHeight: 1.5 }}>
        DEMO IMPORT — these marketplaces have no public saved-cars API. Connecting shows the mechanic with sample
        favorites; the real path is the browser extension and share sheet.
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 }}>
        <Kicker>YOUR SHOPPING SETUP</Kicker>
        {!editing && (
          <button onClick={() => setEditing(true)} style={{ fontSize: 12, fontWeight: 700, color: C.accentText, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            Edit all
          </button>
        )}
      </div>
      {editing ? (
        <SetupEditor
          setup={setup}
          onCancel={() => setEditing(false)}
          onSave={(s) => { onSaveSetup(s); setEditing(false); }}
        />
      ) : (
        <>
          <EditRow label="Buying goal" value={archetypeName || "Set it — five taps"} onEdit={onEditGoal} />
          <EditRow label="Search area" value={`${setup.zip || "77471"} · ${setup.radius || 100} MI`} mono onEdit={() => setEditing(true)} />
          <EditRow label="Pre-approval on file" value={`${setup.apr || 7.2}% · ${setup.term || 60} MO`} mono color={C.green} onEdit={() => setEditing(true)} />
          <EditRow
            label="Trade-in on file"
            value={setup.tradeCar ? `${setup.tradeCar.split(" ").slice(-1)[0].toUpperCase()} · ${negEq > 0 ? `−${fmt(negEq)}` : fmt(setup.tradeValue || 0)}` : "None"}
            mono
            color={negEq > 0 ? C.red : C.ink}
            onEdit={() => setEditing(true)}
          />
        </>
      )}

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
        <b>Our only promise that matters:</b> your data is never sold, never shown to a dealer, and deleted the day you
        ask. We make money when you subscribe — not when you buy a car.
      </div>
      <button onClick={onSignOut} style={{ width: "100%", minHeight: 44, border: "none", background: "none", color: C.red, fontSize: 13, fontWeight: 700, cursor: "pointer", marginTop: 8 }}>
        Sign out
      </button>
    </div>
  );
}
