import React, { useState } from "react";
import { C, mono } from "../theme.js";
import { statRows, pickStats } from "../data/owned.js";

/* The stats card for any car: owned or shopping. A shopping car shows
   whatever its listing already knew and offers to look up the rest
   (safety, repairs, size) once; the answer is saved with the car. */

export async function lookupStats(car) {
  const q = new URLSearchParams({ year: String(car.year || ""), make: car.make || "", model: car.model || "", trim: car.trim || "" });
  if (car.vin) q.set("vin", car.vin);
  const r = await fetch(`/api/vehicle-stats?${q}`);
  const j = await r.json();
  if (!j?.ok) throw new Error(j?.note || "lookup failed");
  return { ...pickStats(j), at: Date.now() };
}

export function CarStats({ car, gas, onStats, compact = false }) {
  const [state, setState] = useState("idle");
  const rows = statRows(car, { gasPrice: gas?.price, gasLabel: gas?.label, miles: car.milesPerYear });
  const looked = Boolean(car.stats?.at || car.owned);
  const shown = compact ? rows.slice(0, 4) : rows;

  const load = async () => {
    setState("loading");
    try { onStats?.(car.id, await lookupStats(car)); setState("idle"); }
    catch { setState("error"); }
  };

  return (
    <div style={{ marginTop: 10 }}>
      {shown.length > 0 && (
        <dl style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px", margin: 0 }}>
          {shown.map(([k, v, note]) => (
            <div key={k} style={{ minWidth: 0 }}>
              <dt style={{ fontFamily: mono, fontSize: 9, letterSpacing: "0.1em", color: C.inkSoft, textTransform: "uppercase" }}>{k}</dt>
              <dd style={{ margin: "1px 0 0", fontSize: 14, fontWeight: 700, lineHeight: 1.25 }}>{v}</dd>
              {note && <dd style={{ margin: "1px 0 0", fontSize: 11, color: C.inkSoft, lineHeight: 1.35 }}>{note}</dd>}
            </div>
          ))}
        </dl>
      )}
      {!looked && onStats && (
        <button
          onClick={load}
          disabled={state === "loading"}
          style={{ marginTop: shown.length ? 10 : 0, minHeight: 36, padding: "0 10px", border: `1px solid ${C.accent}`, background: "none", color: C.accentText, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
        >
          {state === "loading" ? "Looking it up…" : state === "error" ? "Couldn't find it. Try again" : "See safety, repairs and size"}
        </button>
      )}
    </div>
  );
}
