import React, { useState } from "react";
import { C, mono, heading, fmt, stripes } from "../theme.js";
import { Kicker, PrimaryBtn, GhostBtn, useDesktop } from "./ui.jsx";

/* Garage — real add-vehicle flow. Saving a car runs a live market check
   and grades the price against the median; the fit score is a simple
   market-value heuristic until goal-based scoring ships. */

const ADD_FIELDS = [
  { k: "year", label: "Year", ph: "2021", max: 4 },
  { k: "make", label: "Make", ph: "Subaru" },
  { k: "model", label: "Model", ph: "Outback" },
  { k: "trim", label: "Trim (optional)", ph: "Premium" },
  { k: "price", label: "Listed price", ph: "26500", mono: true },
  { k: "miles", label: "Miles (optional)", ph: "34000", mono: true },
  { k: "zip", label: "ZIP", ph: "77471", max: 5, mono: true },
  { k: "src", label: "Where you found it (optional)", ph: "CarGurus" },
];

/* fit heuristic calibrated to the demo cars: at-market ≈ 85, each %
   over market costs ~2.2 pts, each % under adds ~1.3 */
export function marketFit(price, median) {
  if (!median) return 70;
  const pct = ((median - price) / median) * 100;
  const fit = pct >= 0 ? 85 + pct * 1.3 : 85 + pct * 2.2;
  return Math.max(40, Math.min(98, Math.round(fit)));
}

function AddVehicle({ onAdd, onCancel }) {
  const [v, setV] = useState({});
  const [busy, setBusy] = useState(false);
  const ready = /^(19|20)\d{2}$/.test(v.year || "") && v.make && v.model && Number(v.price) > 0;

  const save = async () => {
    if (!ready || busy) return;
    setBusy(true);
    let market = null;
    try {
      const q = new URLSearchParams({ zip: v.zip || "77471", radius: "100", year: v.year, make: v.make, model: v.model, trim: v.trim || "" });
      const r = await fetch(`/api/market?${q}`);
      const d = r.ok ? await r.json() : null;
      if (d && typeof d.median === "number") market = d;
    } catch { /* offline is fine */ }

    const price = Number(v.price);
    const delta = market ? price - market.median : null;
    const note = market
      ? delta > 0
        ? `≈${fmt(delta)} over market · median ${fmt(market.median)} (${market.count} comps)`
        : `${fmt(Math.abs(delta))} under market · median ${fmt(market.median)} (${market.count} comps)`
      : "No live market data yet — we'll keep checking";

    onAdd({
      car: [v.year, v.make, v.model, v.trim].filter(Boolean).join(" "),
      price,
      src: (v.src || "SAVED LINK").toUpperCase(),
      fit: marketFit(price, market?.median),
      miles: v.miles ? `${Math.round(Number(v.miles) / 1000)}k mi` : "",
      note,
      drop: null,
      dol: "just saved",
      underMarket: delta !== null && delta < 0,
    });
  };

  return (
    <div style={{ border: `1px solid ${C.accent}`, background: C.card, padding: 14, marginBottom: 12 }}>
      <Kicker color={C.accentText} style={{ letterSpacing: "0.12em", marginBottom: 10 }}>SAVE A CAR — WE'LL PRICE IT AGAINST THE MARKET</Kicker>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
        {ADD_FIELDS.map((f) => (
          <div key={f.k}>
            <label style={{ display: "block", fontFamily: mono, fontSize: 9, letterSpacing: "0.1em", color: C.inkSoft, marginBottom: 4, textTransform: "uppercase" }}>{f.label}</label>
            <input
              value={v[f.k] || ""}
              onChange={(e) => setV({ ...v, [f.k]: f.max ? e.target.value.slice(0, f.max) : e.target.value })}
              placeholder={f.ph}
              style={{ width: "100%", boxSizing: "border-box", minHeight: 44, padding: "8px 10px", border: `1px solid ${C.line}`, background: C.paper, fontFamily: f.mono ? mono : "inherit", fontSize: 14, fontWeight: 600, color: C.ink }}
            />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <GhostBtn onClick={onCancel} style={{ width: "auto", flex: 1 }}>Cancel</GhostBtn>
        <PrimaryBtn onClick={save} style={{ flex: 2, width: "auto", opacity: ready && !busy ? 1 : 0.45 }}>
          {busy ? "CHECKING THE MARKET…" : "SAVE TO GARAGE"}
        </PrimaryBtn>
      </div>
    </div>
  );
}

export function Garage({ cars, onAdd, archetypeName = "Family Hauler", onOpenDecode }) {
  const [adding, setAdding] = useState(false);
  const desktop = useDesktop();

  const handleAdd = (car) => {
    onAdd(car);
    setAdding(false);
  };

  if (cars.length === 0 && !adding)
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
        <PrimaryBtn onClick={() => setAdding(true)} height={52} style={{ fontSize: 18, marginTop: "auto" }}>SAVE YOUR FIRST CAR</PrimaryBtn>
      </div>
    );

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 16, minHeight: 0 }}>
      <Kicker style={{ letterSpacing: "0.12em", marginBottom: 10 }}>
        {cars.length} SAVED · SCORED FOR {archetypeName.toUpperCase()} · SORTED BY FIT
      </Kicker>
      {adding && <AddVehicle onAdd={handleAdd} onCancel={() => setAdding(false)} />}
      <div style={{ display: "grid", gridTemplateColumns: desktop ? "1fr 1fr" : "1fr", gap: 12 }}>
        {cars.map((g, ix) => (
          <div key={g.car + ix} style={{ border: `1px solid ${C.line}`, background: C.card, padding: 14, position: "relative" }}>
            {ix === 0 && cars.length > 1 && (
              <div style={{ position: "absolute", top: -1, right: -1, background: C.green, color: "#fff", fontFamily: mono, fontSize: 9, letterSpacing: "0.1em", padding: "4px 8px" }}>BEST FIT</div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div>
                <div style={{ fontSize: 15.5, fontWeight: 700 }}>{g.car}</div>
                <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 2 }}>
                  {g.miles ? `${g.miles} · ` : ""}<span style={{ fontFamily: mono, fontSize: 10, border: `1px solid ${C.line}`, padding: "1px 5px" }}>{g.src}</span>
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
      </div>
      {!adding && (
        <button onClick={() => setAdding(true)} style={{ width: "100%", border: `1px dashed ${C.dash}`, background: "none", minHeight: 48, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: C.accentText, cursor: "pointer", marginTop: 12 }}>
          + Save another from any site
        </button>
      )}
    </div>
  );
}
