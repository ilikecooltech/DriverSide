import React, { useState } from "react";
import { C, mono } from "../theme.js";
import { Kicker } from "./ui.jsx";

/* Known problems for a year, make and model: where owner complaints to
   NHTSA cluster, and every recall with its fix. Loaded on tap (it's a
   bigger lookup) and saved with the car when `onStats` is given. */

export async function lookupProblems(car) {
  const q = new URLSearchParams({ problems: "1", year: String(car.year || ""), make: car.make || "", model: car.model || "" });
  const j = await fetch(`/api/vehicle-stats?${q}`).then((r) => r.json());
  if (!j?.ok) throw new Error(j?.note || "lookup failed");
  return j;
}

const chip = (text, tone) => (
  <span key={text} style={{ fontFamily: mono, fontSize: 10.5, fontWeight: 700, padding: "3px 7px", background: tone === "red" ? C.redBg : tone === "amber" ? C.amberBg : C.neutralTint, color: tone === "red" ? C.red : tone === "amber" ? C.amberDark : C.ink }}>{text}</span>
);

export function ProblemsPanel({ car, onStats }) {
  const saved = car?.stats?.problems || null;
  const [data, setData] = useState(saved);
  const [state, setState] = useState("idle");
  const [openPart, setOpenPart] = useState(null);
  const [showAllRecalls, setShowAllRecalls] = useState(false);
  if (!car?.year || !car?.make || !car?.model) return null;

  const load = async () => {
    setState("loading");
    try {
      const j = await lookupProblems(car);
      setData(j); setState("idle");
      onStats?.(car.id, { problems: j });
    } catch { setState("error"); }
  };

  if (!data)
    return (
      <button onClick={load} disabled={state === "loading"}
        style={{ marginTop: 10, width: "100%", minHeight: 44, padding: "0 12px", border: `1px solid ${C.line}`, background: C.paper, color: C.ink, fontSize: 13, fontWeight: 700, cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>{state === "loading" ? "Checking NHTSA…" : state === "error" ? "Couldn't reach NHTSA. Try again" : "Known problems and recalls"}</span>
        <span aria-hidden="true" style={{ color: C.accentText }}>›</span>
      </button>
    );

  const c = data.complaints || { total: 0, top: [] };
  const recalls = data.recalls || [];
  const max = Math.max(1, ...c.top.map((t) => t.count));
  const vinLink = car.vin ? `https://www.nhtsa.gov/recalls?vin=${encodeURIComponent(car.vin)}` : null;
  const shownRecalls = showAllRecalls ? recalls : recalls.slice(0, 3);

  return (
    <section aria-label="Known problems" style={{ marginTop: 12, borderTop: `1px dashed ${C.line}`, paddingTop: 10 }}>
      <Kicker style={{ marginBottom: 6 }}>KNOWN PROBLEMS · {data.year} {String(data.make).toUpperCase()} {String(data.model).toUpperCase()}</Kicker>
      <div style={{ fontSize: 14, fontWeight: 700 }}>
        {c.total ? `${c.total.toLocaleString()} owner complaint${c.total === 1 ? "" : "s"} to NHTSA` : "No owner complaints on file"}
      </div>
      {(c.crashes || c.fires || c.injuries || c.deaths) ? (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
          {c.crashes ? chip(`${c.crashes} crash${c.crashes === 1 ? "" : "es"}`, "amber") : null}
          {c.fires ? chip(`${c.fires} fire${c.fires === 1 ? "" : "s"}`, "red") : null}
          {c.injuries ? chip(`${c.injuries} injur${c.injuries === 1 ? "y" : "ies"}`, "amber") : null}
          {c.deaths ? chip(`${c.deaths} death${c.deaths === 1 ? "" : "s"}`, "red") : null}
        </div>
      ) : null}

      {c.top.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 4 }}>Where they cluster. Tap one to read the latest.</div>
          {c.top.map((t) => (
            <div key={t.part}>
              <button onClick={() => setOpenPart(openPart === t.part ? null : t.part)} aria-expanded={openPart === t.part}
                style={{ width: "100%", minHeight: 44, display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 4, padding: "4px 0", border: "none", background: "none", cursor: "pointer", textAlign: "left", color: C.ink, fontFamily: "inherit" }}>
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>{t.part}</span>
                <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 700 }}>{t.count}</span>
                <span aria-hidden="true" style={{ gridColumn: "1 / -1", height: 5, background: C.line }}>
                  <span style={{ display: "block", height: 5, width: `${(t.count / max) * 100}%`, background: C.amber }} />
                </span>
              </button>
              {openPart === t.part && t.example && (
                <p style={{ margin: "2px 0 8px", fontSize: 12.5, lineHeight: 1.5, color: C.inkSoft, borderLeft: `3px solid ${C.line}`, paddingLeft: 8 }}>&ldquo;{t.example}&rdquo;</p>
              )}
            </div>
          ))}
          <div style={{ fontSize: 11, color: C.inkSoft, marginTop: 4 }}>Owner reports. NHTSA hasn't verified each one.</div>
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{recalls.length ? `${recalls.length} recall${recalls.length === 1 ? "" : "s"}` : "No recalls"}</div>
        {shownRecalls.map((r) => (
          <div key={r.id} style={{ borderTop: `1px solid ${C.line}`, padding: "8px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
              <span style={{ fontSize: 13.5, fontWeight: 700 }}>{r.part}</span>
              <span style={{ fontFamily: mono, fontSize: 10.5, color: C.inkSoft, whiteSpace: "nowrap" }}>{r.date}</span>
            </div>
            {(r.parkIt || r.parkOutside) && <div style={{ marginTop: 4 }}>{chip(r.parkIt ? "DON'T DRIVE UNTIL FIXED" : "PARK OUTSIDE UNTIL FIXED", "red")}</div>}
            {r.what && <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 3 }}>{r.what}</div>}
            {r.fix && <div style={{ fontSize: 12, lineHeight: 1.5, marginTop: 2, color: C.inkSoft }}><b style={{ color: C.green }}>Fix:</b> {r.fix}</div>}
          </div>
        ))}
        {recalls.length > 3 && (
          <button onClick={() => setShowAllRecalls(!showAllRecalls)} style={{ minHeight: 44, border: "none", background: "none", color: C.accentText, fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 0 }}>
            {showAllRecalls ? "Show fewer" : `Show all ${recalls.length} recalls`}
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 4 }}>
        {vinLink && <a href={vinLink} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", minHeight: 44, fontSize: 13, fontWeight: 700, color: C.accentText }}>Check your VIN for open recalls ↗</a>}
        {!vinLink && recalls.length > 0 && <span style={{ display: "inline-flex", alignItems: "center", minHeight: 44, fontSize: 12.5, color: C.inkSoft }}>Ask the seller for the VIN and check it at nhtsa.gov/recalls.</span>}
        {data.link && <a href={data.link} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", minHeight: 44, fontSize: 13, fontWeight: 700, color: C.accentText }}>Full NHTSA record ↗</a>}
      </div>
    </section>
  );
}
