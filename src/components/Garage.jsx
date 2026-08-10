import React, { useMemo, useState } from "react";
import { C, mono, heading, fmt, stripes } from "../theme.js";
import { matchScore, profileFor, segmentMedian, valueLabel, toGarageItem } from "../data/shopping.js";
import { Kicker, PrimaryBtn, GhostBtn, useDesktop } from "./ui.jsx";

/* Garage — everything the buyer is considering, from any source, in one
   ranked list. Rank is the buyer's own call (dropdown); match is ours.
   Cars arrive from Shop, from a connected marketplace, or by hand. */

export function marketFit(price, median) {
  if (!median) return 70;
  const pct = ((median - price) / median) * 100;
  const fit = pct >= 0 ? 85 + pct * 1.3 : 85 + pct * 2.2;
  return Math.max(40, Math.min(98, Math.round(fit)));
}

const ADD_FIELDS = [
  { k: "year", label: "Year", ph: "2021", max: 4 },
  { k: "make", label: "Make", ph: "Subaru" },
  { k: "model", label: "Model", ph: "Outback" },
  { k: "trim", label: "Trim (optional)", ph: "Premium" },
  { k: "price", label: "Listed price", ph: "26500", mono: true },
  { k: "miles", label: "Miles (optional)", ph: "34000", mono: true },
  { k: "dealer", label: "Dealer or seller (optional)", ph: "Katy Subaru" },
];

function AddVehicle({ onAdd, onCancel }) {
  const [v, setV] = useState({});
  const ready = /^(19|20)\d{2}$/.test(v.year || "") && v.make && v.model && Number(v.price) > 0;

  return (
    <div style={{ border: `1px solid ${C.accent}`, background: C.card, padding: 14, marginBottom: 12 }}>
      <Kicker color={C.accentText} style={{ letterSpacing: "0.12em", marginBottom: 10 }}>ADD A CAR BY HAND</Kicker>
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
        <PrimaryBtn
          onClick={() => ready && onAdd(toGarageItem({
            year: Number(v.year), make: v.make, model: v.model, trim: v.trim,
            price: Number(v.price), miles: Number(v.miles) || 0, dealer: v.dealer,
          }, "ADDED BY HAND"))}
          style={{ flex: 2, width: "auto", opacity: ready ? 1 : 0.45 }}
        >
          SAVE TO GARAGE
        </PrimaryBtn>
      </div>
    </div>
  );
}

export function Garage({ cars, archetypeKey, archetypeName, onAdd, onRemove, onRank, onOpenDecode, onShop }) {
  const [adding, setAdding] = useState(false);
  const desktop = useDesktop();
  const profile = useMemo(() => profileFor(archetypeKey), [archetypeKey]);
  const median = useMemo(() => segmentMedian(cars), [cars]);

  const scored = useMemo(
    () => cars.map((c) => ({ ...c, match: matchScore(c, profile, median) })),
    [cars, profile, median]
  );

  if (cars.length === 0 && !adding)
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "24px 20px", gap: 14, minHeight: 0, overflowY: "auto" }}>
        <h1 style={{ fontFamily: heading, fontWeight: 600, fontSize: 28, lineHeight: 1.12, margin: "8px 0 0" }}>
          Every site you browse.<br />One garage. One score.
        </h1>
        <div style={{ fontSize: 14, lineHeight: 1.55, color: C.inkSoft }}>
          Save from Shop, connect the marketplaces you already use, or add a car by hand. We normalize all of it, score it
          against your <b style={{ color: C.ink }}>{archetypeName || "goal"}</b>, and watch for price drops.
        </div>
        <div style={{ border: `1px dashed ${C.dash}`, padding: "18px 16px", background: stripes }}>
          <Kicker style={{ letterSpacing: "0.1em", marginBottom: 10 }}>YOUR FIRST CAR GOES HERE</Kicker>
          {[
            ["1", "Shop by your goal — save anything that fits"],
            ["2", "Or connect AutoTrader, CarGurus, Carvana in Profile"],
            ["3", "Rank them yourself; we price and watch them all"],
          ].map(([n, t]) => (
            <div key={n} style={{ display: "flex", gap: 12, fontSize: 13, lineHeight: 1.5, color: C.ink, marginBottom: n === "3" ? 0 : 8 }}>
              <span style={{ fontFamily: mono, fontWeight: 800, color: C.accentText }}>{n}</span>
              <span>{t}</span>
            </div>
          ))}
        </div>
        <PrimaryBtn onClick={onShop} height={52} style={{ fontSize: 18, marginTop: "auto" }}>SHOP FOR MY GOAL →</PrimaryBtn>
        <GhostBtn onClick={() => setAdding(true)}>Add a car by hand instead</GhostBtn>
      </div>
    );

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 16, minHeight: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10, gap: 8 }}>
        <Kicker style={{ letterSpacing: "0.12em" }}>
          {cars.length} SAVED · SCORED FOR {(archetypeName || "YOUR GOAL").toUpperCase()}
        </Kicker>
        <span style={{ fontFamily: mono, fontSize: 9, color: C.inkSoft }}>YOUR ORDER</span>
      </div>

      {adding && <AddVehicle onAdd={(c) => { onAdd(c); setAdding(false); }} onCancel={() => setAdding(false)} />}

      <div style={{ display: "grid", gridTemplateColumns: desktop ? "1fr 1fr" : "1fr", gap: 12 }}>
        {scored.map((g, ix) => {
          const val = valueLabel(g.price, median);
          const tone = val.tone === "good" ? C.green : val.tone === "warn" ? C.amber : C.inkSoft;
          return (
            <div key={g.id} style={{ border: `1px solid ${C.line}`, background: C.card, padding: 14, position: "relative" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15.5, fontWeight: 700 }}>{g.title}</div>
                  <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 2 }}>
                    {g.miles ? `${Math.round(g.miles / 1000)}k mi · ` : ""}
                    <span style={{ fontFamily: mono, fontSize: 10, border: `1px solid ${C.line}`, padding: "1px 5px" }}>{g.src}</span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: mono, fontSize: 16, fontWeight: 800 }}>{fmt(g.price)}</div>
                  <div style={{ fontFamily: mono, fontSize: 11, fontWeight: 800, color: g.match >= 80 ? C.green : C.amber }}>
                    MATCH {g.match}/100
                  </div>
                </div>
              </div>
              <div style={{ height: 4, background: C.line, margin: "10px 0 8px" }}>
                <div style={{ width: `${g.match}%`, height: 4, background: g.match >= 80 ? C.green : C.amber }} />
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5 }}>
                <span style={{ color: tone, fontWeight: 700 }}>{val.text}</span>
                {g.drop && (
                  <span style={{ fontFamily: mono, fontSize: 10.5, color: C.green, fontWeight: 700, background: C.greenBg, padding: "2px 6px" }}>{g.drop}</span>
                )}
                <span style={{ fontFamily: mono, fontSize: 10.5, color: C.inkSoft, marginLeft: "auto" }}>
                  {g.days ? `${g.days} days on lot` : ""}
                </span>
              </div>
              {g.dealer && <div style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 6 }}>{g.dealer}</div>}

              {/* buyer's own ranking + remove */}
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10, borderTop: `1px dashed ${C.line}`, paddingTop: 10 }}>
                <label style={{ fontFamily: mono, fontSize: 9, letterSpacing: "0.1em", color: C.inkSoft }} htmlFor={`rank-${g.id}`}>
                  MY RANK
                </label>
                <select
                  id={`rank-${g.id}`}
                  value={ix + 1}
                  onChange={(e) => onRank(ix, Number(e.target.value) - 1)}
                  style={{ minHeight: 36, border: `1px solid ${C.line}`, background: C.paper, fontFamily: mono, fontSize: 13, fontWeight: 700, color: C.ink, padding: "0 6px" }}
                >
                  {cars.map((_, i) => (
                    <option key={i} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
                {g.decoded && (
                  <button onClick={onOpenDecode} style={{ fontFamily: mono, fontSize: 10.5, color: C.accentText, fontWeight: 700, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                    QUOTE DECODED →
                  </button>
                )}
                <button
                  onClick={() => onRemove(g.id)}
                  style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: C.red, background: "none", border: "none", cursor: "pointer", padding: "6px 2px" }}
                >
                  Remove
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {!adding && (
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button onClick={onShop} style={{ flex: 1, border: `1px dashed ${C.dash}`, background: "none", minHeight: 48, fontSize: 13, fontWeight: 700, color: C.accentText, cursor: "pointer" }}>
            + Shop for more
          </button>
          <button onClick={() => setAdding(true)} style={{ flex: 1, border: `1px dashed ${C.dash}`, background: "none", minHeight: 48, fontSize: 13, fontWeight: 700, color: C.accentText, cursor: "pointer" }}>
            + Add by hand
          </button>
        </div>
      )}
    </div>
  );
}
