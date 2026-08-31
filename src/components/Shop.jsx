import React, { useEffect, useMemo, useState } from "react";
import { C, mono, heading, fmt } from "../theme.js";
import {
  BODY_TYPES, FILTER_META, profileFor, defaultFilters, matchScore,
  valueLabel, SAMPLE_INVENTORY, filterInventory, segmentMedian, formatFilterValue,
} from "../data/shopping.js";
import { Kicker, PrimaryBtn, useDesktop, VehicleImage } from "./ui.jsx";

/* Shop — where the journey starts. The goal picks what you see; the
   filters are the six that change the answer, not forty that don't.
   Every card leads with match (does this serve YOUR need) and value
   (is it fairly priced), because that's the order the buyer thinks in. */

export function Shop({ archetypeKey, archetypeName, setup, savedIds, onSave, onOpenGoal }) {
  const profile = useMemo(() => profileFor(archetypeKey), [archetypeKey]);
  const [filters, setFilters] = useState(() => defaultFilters(profile, setup));
  const [listings, setListings] = useState(null);
  const [source, setSource] = useState("loading");
  const [showFilters, setShowFilters] = useState(false);
  const desktop = useDesktop();

  // Re-seed filters when the buyer's goal changes.
  useEffect(() => { setFilters(defaultFilters(profile, setup)); }, [archetypeKey]);

  useEffect(() => {
    let dead = false;
    setSource("loading");
    const q = new URLSearchParams({
      zip: filters.zip, radius: String(filters.radius),
      bodyType: filters.bodyType, maxPrice: String(filters.maxPrice),
      maxMiles: String(filters.maxMiles), minYear: String(filters.minYear),
    });
    fetch(`/api/shop?${q}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (dead) return;
        if (d?.source === "live" && d.listings?.length) {
          setListings(d.listings); setSource("live");
        } else {
          setListings(filterInventory(SAMPLE_INVENTORY, filters)); setSource("sample");
        }
      })
      .catch(() => {
        if (dead) return;
        setListings(filterInventory(SAMPLE_INVENTORY, filters)); setSource("sample");
      });
    return () => { dead = true; };
  }, [filters]);

  const median = useMemo(() => segmentMedian(listings || []), [listings]);
  const ranked = useMemo(() => {
    if (!listings) return [];
    return listings
      .map((l) => ({ ...l, match: matchScore(l, profile, median) }))
      .sort((a, b) => b.match - a.match);
  }, [listings, profile, median]);

  const set = (k, v) => setFilters({ ...filters, [k]: v });

  const stepper = (k) => {
    const m = FILTER_META[k];
    const val = filters[k];
    const btn = { width: 40, height: 40, border: `1px solid ${C.line}`, background: C.paper, fontSize: 17, fontWeight: 700, cursor: "pointer", color: C.ink };
    return (
      <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 700 }}>{m.label}</span>
        <button onClick={() => set(k, Math.max(m.min, val - m.step))} aria-label={`Lower ${m.label}`} style={btn}>−</button>
        <span style={{ fontFamily: mono, fontSize: 14, fontWeight: 800, width: 82, textAlign: "center" }}>
          {formatFilterValue(m, val)}
        </span>
        <button onClick={() => set(k, Math.min(m.max, val + m.step))} aria-label={`Raise ${m.label}`} style={btn}>+</button>
      </div>
    );
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 16, minHeight: 0 }}>
      {/* goal banner — the recommendation's reason, always visible */}
      <div style={{ background: C.accentTint, padding: "12px 14px", marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
          <Kicker color={C.accentText} style={{ letterSpacing: "0.12em" }}>SHOPPING FOR YOUR GOAL</Kicker>
          <button onClick={onOpenGoal} style={{ fontSize: 11.5, fontWeight: 700, color: C.accentText, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            Change goal
          </button>
        </div>
        <div style={{ fontFamily: heading, fontWeight: 600, fontSize: 20, marginTop: 2 }}>{archetypeName || "Commuter Math"}</div>
        <div style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.5, marginTop: 2 }}>{profile.why}</div>
      </div>

      {/* filter bar */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        {BODY_TYPES.map((b) => (
          <button
            key={b}
            onClick={() => set("bodyType", filters.bodyType === b ? "" : b)}
            style={{
              minHeight: 36, padding: "0 12px", cursor: "pointer", fontSize: 12, fontWeight: 700,
              border: `1px solid ${filters.bodyType === b ? C.accent : C.line}`,
              background: filters.bodyType === b ? C.accentTint : C.card,
              color: filters.bodyType === b ? C.accentText : C.ink,
            }}
          >
            {b}
          </button>
        ))}
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={{ minHeight: 36, padding: "0 12px", cursor: "pointer", fontSize: 12, fontWeight: 700, border: `1px solid ${C.line}`, background: C.card, color: C.accentText, marginLeft: "auto" }}
        >
          {showFilters ? "Hide filters −" : "More filters +"}
        </button>
      </div>

      {showFilters && (
        <div style={{ border: `1px solid ${C.line}`, background: C.card, padding: 14, marginBottom: 12 }}>
          {["maxPrice", "maxMiles", "minYear", "radius"].map(stepper)}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 700 }}>ZIP</span>
            <input
              value={filters.zip}
              onChange={(e) => set("zip", e.target.value.replace(/\D/g, "").slice(0, 5))}
              style={{ width: 90, minHeight: 40, padding: "0 10px", border: `1px solid ${C.line}`, background: C.paper, fontFamily: mono, fontSize: 14, fontWeight: 700, color: C.ink }}
            />
          </div>
          <button
            onClick={() => setFilters(defaultFilters(profile, setup))}
            style={{ marginTop: 10, background: "none", border: "none", color: C.accentText, fontSize: 12.5, fontWeight: 700, cursor: "pointer", padding: 0 }}
          >
            ↺ Reset to what fits my goal
          </button>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <Kicker>
          {source === "loading" ? "SEARCHING…" : `${ranked.length} MATCHES · SORTED BY FIT`}
        </Kicker>
        {source === "sample" && (
          <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: "0.08em", color: C.amber, background: C.amberBg, padding: "3px 7px" }}>SAMPLE INVENTORY</span>
        )}
        {source === "live" && (
          <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: "0.08em", color: C.green }}>LIVE · {filters.zip}</span>
        )}
      </div>

      {source === "loading" && (
        <div style={{ fontSize: 13, color: C.inkSoft, padding: "20px 0" }}>Pricing local inventory against your goal…</div>
      )}

      {source !== "loading" && ranked.length === 0 && (
        <div style={{ border: `1px dashed ${C.dash}`, padding: "18px 16px", fontSize: 13, color: C.inkSoft, lineHeight: 1.5 }}>
          Nothing matches those filters within {filters.radius} miles. Widen the radius or raise the price ceiling — or tap
          "Reset to what fits my goal."
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: desktop ? "1fr 1fr" : "1fr", gap: 12 }}>
        {ranked.map((v, i) => {
          const id = v.id || `${v.year}-${v.make}-${v.model}-${v.price}`;
          const saved = savedIds.includes(id);
          const val = valueLabel(v.price, median);
          const tone = val.tone === "good" ? C.green : val.tone === "warn" ? C.amber : C.inkSoft;
          return (
            <div key={id} style={{ border: `1px solid ${C.line}`, background: C.card, position: "relative" }}>
              {/* Full-bleed above the content — the photo is the first
                  thing a shopper reads, and the badge rides over it. */}
              <VehicleImage src={v.image} alt={[v.year, v.make, v.model, v.trim].filter(Boolean).join(" ")} />
              {i === 0 && (
                <div style={{ position: "absolute", top: -1, right: -1, background: C.green, color: "#fff", fontFamily: mono, fontSize: 9, letterSpacing: "0.1em", padding: "4px 8px" }}>BEST MATCH</div>
              )}
              <div style={{ padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15.5, fontWeight: 700 }}>
                      {v.year} {v.make} {v.model} {v.trim}
                    </div>
                    <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 2 }}>
                      {Math.round(v.miles / 1000)}k mi · {v.bodyType}
                      {v.certified ? " · CPO" : ""}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: mono, fontSize: 16, fontWeight: 800 }}>{fmt(v.price)}</div>
                    <div style={{ fontFamily: mono, fontSize: 11, fontWeight: 800, color: v.match >= 80 ? C.green : C.amber }}>
                      MATCH {v.match}/100
                    </div>
                  </div>
                </div>
                <div style={{ height: 4, background: C.line, margin: "10px 0 8px" }}>
                  <div style={{ width: `${v.match}%`, height: 4, background: v.match >= 80 ? C.green : C.amber }} />
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5 }}>
                  <span style={{ color: tone, fontWeight: 700 }}>{val.text}</span>
                  <span style={{ fontFamily: mono, fontSize: 10.5, color: C.inkSoft, marginLeft: "auto" }}>
                    {v.days ? `${v.days} days on lot` : ""}
                  </span>
                </div>
                <div style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 6 }}>{v.dealer}</div>
                <button
                  onClick={() => !saved && onSave({ ...v, id })}
                  disabled={saved}
                  style={{
                    width: "100%", minHeight: 40, marginTop: 10, cursor: saved ? "default" : "pointer",
                    border: `1px solid ${saved ? C.green : C.accent}`,
                    background: saved ? C.greenBg : C.card,
                    color: saved ? C.green : C.accentText,
                    fontSize: 12.5, fontWeight: 700,
                  }}
                >
                  {saved ? "✓ IN YOUR GARAGE" : "SAVE TO GARAGE"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {source === "sample" && ranked.length > 0 && (
        <div style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 12, lineHeight: 1.5 }}>
          Sample inventory — set a MarketCheck key to search real listings near {filters.zip}. Match scores use segment
          estimates until safety and reliability data is wired in.
        </div>
      )}
    </div>
  );
}
