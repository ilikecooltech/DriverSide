import React, { useState } from "react";
import { C, mono, fmt } from "../theme.js";
import { SectionLabel } from "./ui.jsx";

/* Live market check — calls our backend proxy (/api/market), which hits
   MarketCheck's REST API server-side when MARKETCHECK_API_KEY is set and
   falls back to a real snapshot (pulled Aug 8, 2026) otherwise. */

export function MarketCheckPanel({ askingPrice, vehicle }) {
  const [zipInput, setZipInput] = useState("77471");
  const [live, setLive] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function fetchLiveMarket() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        zip: zipInput,
        radius: "100",
        year: "2023",
        make: "Honda",
        model: "CR-V",
        trim: "EX-L",
      });
      const res = await fetch(`/api/market?${params}`);
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      if (!data || typeof data.median !== "number") throw new Error("Unexpected response shape");
      setLive(data);
    } catch (err) {
      console.error("Live market check failed:", err);
      setError("Couldn't reach market data. Is the API server running? (npm run server)");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, padding: 18, marginBottom: 14 }}>
      <SectionLabel>Live market check · MarketCheck data</SectionLabel>
      {!live && (
        <div>
          <div style={{ fontSize: 13.5, lineHeight: 1.5, marginBottom: 12 }}>
            Pull real active listings for this exact year/model/trim near you and price this quote against the live
            market, not a stale book value.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={zipInput}
              onChange={(e) => setZipInput(e.target.value.replace(/\D/g, "").slice(0, 5))}
              placeholder="ZIP"
              style={{ width: 90, padding: "10px 12px", borderRadius: 7, border: `1.5px solid ${C.line}`, fontFamily: mono, fontSize: 14, fontWeight: 700, color: C.ink, background: C.paper }}
            />
            <button
              onClick={fetchLiveMarket}
              disabled={loading || zipInput.length !== 5}
              style={{ flex: 1, padding: "10px 0", borderRadius: 7, border: "none", background: loading ? C.inkSoft : C.green, color: "#fff", fontWeight: 800, fontSize: 13.5, cursor: loading ? "wait" : "pointer" }}
            >
              {loading ? "Checking live listings…" : "Run live market check"}
            </button>
          </div>
          {error && <div style={{ marginTop: 10, fontSize: 12.5, color: C.red, fontWeight: 600 }}>{error}</div>}
        </div>
      )}
      {live && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {[
              ["Active comps", live.count],
              ["Median", fmt(live.median)],
              ["Range", `${fmt(live.low)}–${fmt(live.high)}`],
            ].map(([k, v]) => (
              <div key={k} style={{ flex: 1, background: C.paper, borderRadius: 8, padding: "10px 8px", textAlign: "center" }}>
                <div style={{ fontFamily: mono, fontSize: 13, fontWeight: 800 }}>{v}</div>
                <div style={{ fontSize: 10.5, color: C.inkSoft, fontWeight: 700 }}>{k}</div>
              </div>
            ))}
          </div>
          <div
            style={{
              background: askingPrice > live.median ? C.amberBg : C.greenBg,
              borderRadius: 8,
              padding: "11px 14px",
              fontSize: 13.5,
              fontWeight: 700,
              marginBottom: 12,
              color: askingPrice > live.median ? C.amber : C.green,
            }}
          >
            {askingPrice > live.median
              ? `This quote is ${fmt(askingPrice - live.median)} above the live median. Anchor your counter at or below ${fmt(live.median)}.`
              : `This quote is at or below the live median. The price itself is fair — focus on fees and financing.`}
          </div>
          {(live.comps || []).map((c, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "baseline", padding: "7px 0", borderBottom: `1px dashed ${C.line}`, fontSize: 12.5 }}>
              <span style={{ fontWeight: 700, flex: 1 }}>{c.name}</span>
              <span style={{ fontFamily: mono, fontWeight: 800 }}>{fmt(c.price)}</span>
              <span style={{ color: C.inkSoft, fontFamily: mono, fontSize: 11 }}>{Math.round(c.miles / 1000)}k mi · {c.days}d</span>
            </div>
          ))}
          <div style={{ fontSize: 11, color: C.inkSoft, marginTop: 8 }}>
            {live.source === "live"
              ? "Live listings via MarketCheck · take these comps with you to the dealership"
              : `Snapshot data (${live.pulled || "MarketCheck pull"}) — set MARKETCHECK_API_KEY on the server for live listings`}
          </div>
        </div>
      )}
    </div>
  );
}
