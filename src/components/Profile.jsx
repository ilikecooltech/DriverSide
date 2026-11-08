import React, { useState } from "react";
import { C, mono, heading, fmt } from "../theme.js";
import { Kicker, PrimaryBtn, Slider } from "./ui.jsx";

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
  const T = [
    { k: "zip", label: "ZIP", ph: "77471", max: 5, mono: true, numeric: true },
    { k: "tradeCar", label: "Trade-in vehicle", ph: "2019 Nissan Altima SV" },
  ];
  /* Numbers are sliders with the exact figure beside them. */
  const S = [
    { k: "radius", label: "Search radius", suf: "mi", min: 25, max: 250, step: 25 },
    { k: "apr", label: "Pre-approval rate", suf: "%", min: 0, max: 25, step: 0.1, decimal: true },
    { k: "term", label: "Pre-approval term", suf: "mo", min: 24, max: 84, step: 12 },
    { k: "tradeValue", label: "Trade value", pre: "$", min: 0, max: 60000, step: 250 },
    { k: "tradePayoff", label: "Trade loan payoff", pre: "$", min: 0, max: 60000, step: 250 },
  ];
  return (
    <div style={{ border: `1px solid ${C.accent}`, background: C.card, padding: 14, marginBottom: 16 }}>
      <Kicker color={C.accentText} style={{ letterSpacing: "0.08em", marginBottom: 10 }}>EDIT YOUR SHOPPING SETUP</Kicker>
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
        {T.map((f) => (
          <div key={f.k}>
            <label htmlFor={`setup-${f.k}`} style={{ display: "block", fontFamily: mono, fontSize: 12, letterSpacing: "0.1em", color: C.inkSoft, marginBottom: 4, textTransform: "uppercase" }}>{f.label}</label>
            <input
              id={`setup-${f.k}`}
              value={v[f.k] ?? ""}
              onChange={(e) => setV({ ...v, [f.k]: f.max ? e.target.value.slice(0, f.max) : e.target.value })}
              placeholder={f.ph}
              inputMode={f.numeric ? "numeric" : undefined}
              style={{ width: "100%", boxSizing: "border-box", minHeight: 44, padding: "8px 10px", border: `1px solid ${C.line}`, background: C.paper, fontFamily: f.mono ? mono : "inherit", fontSize: 14, fontWeight: 600, color: C.ink }}
            />
          </div>
        ))}
        {S.map((f) => (
          <Slider key={f.k} id={`setup-${f.k}`} label={f.label} value={v[f.k] ?? ""} onChange={(x) => setV({ ...v, [f.k]: x })}
            min={f.min} max={f.max} step={f.step} pre={f.pre} suf={f.suf} decimal={f.decimal} />
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
  name, isGuest, archetypeName, setup, onPasteLink,
  onSaveSetup, onEditGoal, onSignOut, onBack, hideBack = false, onRequireAccount,
}) {
  const [editing, setEditing] = useState(false);
  const [al, setAl] = useState({ 0: true, 1: true, 2: false });
  const displayName = isGuest ? "Guest" : name || "Driver";
  const initial = displayName[0].toUpperCase();
  const negEq = Math.max(0, (setup.tradePayoff || 0) - (setup.tradeValue || 0));

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 16, minHeight: 0 }}>
      <h1 className="ds-sr">Profile</h1>
      {/* The app bar already shows a named Back when there is somewhere to go back to. */}
      {!hideBack && <button onClick={onBack} style={{ minHeight: 44, background: "none", border: "none", color: C.inkSoft, fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 0, marginBottom: 4 }}>← Back</button>}

      {isGuest && (
        <div style={{ border: `1px solid ${C.amber}`, background: C.amberBg, padding: "12px 14px", marginBottom: 16 }}>
          <Kicker color={C.amberDark} style={{ marginBottom: 6 }}>BROWSING AS A GUEST</Kicker>
          <div style={{ fontSize: 12.5, color: C.amberDark, lineHeight: 1.55, marginBottom: 10 }}>
            Everything here works and stays on this device. An account only adds what a phone can't do on its own —
            alerts that reach you with the app closed, and the browser extension syncing to this garage.
          </div>
          <button
            onClick={() => onRequireAccount?.("alerts")}
            style={{ minHeight: 44, width: "100%", border: `1.5px solid ${C.amberDark}`, background: C.card, color: C.amberDark, fontFamily: mono, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", cursor: "pointer" }}
          >
            CREATE AN ACCOUNT — KEEPS EVERYTHING YOU'VE BUILT
          </button>
        </div>
      )}

      <div style={{ border: `1px solid ${C.line}`, background: C.card, padding: 14, display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <span style={{ width: 44, height: 44, border: `1.5px solid ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: heading, fontWeight: 600, fontSize: 18, flexShrink: 0 }}>{initial}</span>
        <span style={{ flex: 1 }}>
          <span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>{displayName}</span>
          <span style={{ display: "block", fontSize: 12, color: C.inkSoft }}>
            {archetypeName || "Goal not set"} · {setup.zip || "77471"}{isGuest ? " · on this device only" : ""}
          </span>
        </span>
      </div>

      <Kicker style={{ marginBottom: 6 }}>WHERE YOU SHOP</Kicker>
      <div style={{ border: `1px solid ${C.line}`, background: C.card, padding: 14, marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>Bring cars in from any site</div>
        <div style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.5 }}>
          AutoTrader, CarGurus, Cars.com, Carvana, Facebook and dealer sites don't let apps read your saved cars, and we won't
          log in as you. Paste a listing's link or VIN instead and we'll look it up and add it to your Garage. On Android, use
          Share and pick DriverSide.
        </div>
        {onPasteLink && <PrimaryBtn onClick={onPasteLink} height={46}>PASTE A LINK</PrimaryBtn>}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 }}>
        <Kicker>YOUR SHOPPING SETUP</Kicker>
        {!editing && (
          <button onClick={() => setEditing(true)} style={{ minHeight: 44, minWidth: 44, fontSize: 12, fontWeight: 700, color: C.accentText, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
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

      <Kicker style={{ margin: "16px 0 2px" }}>ALERTS{isGuest ? " — TAP TO TURN ON" : ""}</Kicker>
      {ALERTS.map((t, i) => (
        <button
          key={t}
          /* A guest gets the account ask here, at the moment they reach
             for it, and lands back on this screen with the switches live.
             (The prompt takes the whole screen, so this component
             remounts — no pending-toggle to hand back.) */
          onClick={() => (isGuest ? onRequireAccount?.("alerts") : setAl({ ...al, [i]: !al[i] }))}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", minHeight: 48, border: "none", borderBottom: `1px dashed ${C.line}`, background: "none", cursor: "pointer", fontSize: 13.5, color: isGuest ? C.inkSoft : C.ink, padding: 0, textAlign: "left" }}
        >
          <span>{t}</span>
          <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", padding: "6px 10px", border: `1px solid ${!isGuest && al[i] ? C.green : C.dash}`, background: !isGuest && al[i] ? C.greenBg : C.card, color: !isGuest && al[i] ? C.green : C.inkSoft }}>
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
