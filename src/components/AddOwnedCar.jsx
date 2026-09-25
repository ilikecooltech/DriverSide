import React, { useEffect, useState } from "react";
import { C, mono } from "../theme.js";
import { Kicker, PrimaryBtn, GhostBtn } from "./ui.jsx";
import { toOwnedItem } from "../data/owned.js";
import { CarStats } from "./CarStats.jsx";

/* "I already own a car." Year → make → model → engine come from the
   EPA's own menus, so what they pick always has mpg on file. Or a VIN,
   which fills all of it in. We show the stats before saving so they can
   see it's the right car. */

const thisYear = new Date().getFullYear();
const YEARS = Array.from({ length: thisYear + 1 - 1990 + 1 }, (_, i) => String(thisYear + 1 - i));

async function items(q) {
  const r = await fetch(`/api/vehicle-stats?${new URLSearchParams(q)}`);
  const j = await r.json();
  return j?.ok ? j.items : [];
}

const field = { width: "100%", boxSizing: "border-box", minHeight: 44, padding: "8px 10px", border: `1px solid ${C.line}`, background: C.paper, fontSize: 14, fontWeight: 600, color: C.ink };
const lab = { display: "block", fontFamily: mono, fontSize: 9, letterSpacing: "0.1em", color: C.inkSoft, marginBottom: 4, textTransform: "uppercase" };

function Select({ id, label, value, onChange, options, disabled, placeholder }) {
  return (
    <div>
      <label htmlFor={id} style={lab}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} style={{ ...field, opacity: disabled ? 0.5 : 1 }}>
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.text}</option>)}
      </select>
    </div>
  );
}

export function AddOwnedCar({ gas, onAdd, onCancel }) {
  const [mode, setMode] = useState("pick");
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [epaId, setEpaId] = useState("");
  const [vin, setVin] = useState("");
  const [miles, setMiles] = useState("");
  const [perYear, setPerYear] = useState("");
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [options, setOptions] = useState([]);
  const [found, setFound] = useState(null);
  const [status, setStatus] = useState("");

  useEffect(() => { setMake(""); setMakes([]); if (year) items({ menu: "makes", year }).then(setMakes); }, [year]);
  useEffect(() => { setModel(""); setModels([]); if (year && make) items({ menu: "models", year, make }).then(setModels); }, [year, make]);
  useEffect(() => {
    setEpaId(""); setOptions([]);
    if (year && make && model) items({ menu: "options", year, make, model }).then((o) => { setOptions(o); if (o.length === 1) setEpaId(o[0].value); });
  }, [year, make, model]);
  useEffect(() => { setFound(null); setStatus(""); }, [mode, year, make, model, epaId, vin]);

  const vinOk = /^[A-HJ-NPR-Z0-9]{17}$/i.test(vin.trim());
  const ready = mode === "vin" ? vinOk : Boolean(year && make && model);

  const look = async () => {
    setStatus("loading");
    const q = mode === "vin" ? { vin: vin.trim().toUpperCase() } : { year, make, model, ...(epaId ? { epaId } : {}) };
    try {
      const r = await fetch(`/api/vehicle-stats?${new URLSearchParams(q)}`);
      const j = await r.json();
      if (!j?.ok) { setStatus(j?.note || "We couldn't find that car."); return; }
      setFound({ ...j, at: Date.now() });
      setStatus("");
    } catch { setStatus("Lookup failed. Check your connection and try again."); }
  };

  const preview = found ? toOwnedItem(found, { miles, milesPerYear: perYear }) : null;

  return (
    <div style={{ border: `1px solid ${C.accent}`, background: C.card, padding: 14, marginBottom: 12 }}>
      <Kicker color={C.accentText} style={{ letterSpacing: "0.12em", marginBottom: 10 }}>ADD A CAR YOU OWN</Kicker>
      <div role="tablist" style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {[["pick", "Year, make, model"], ["vin", "VIN"]].map(([k, t]) => (
          <button key={k} role="tab" aria-selected={mode === k} onClick={() => setMode(k)}
            style={{ flex: 1, minHeight: 38, border: `1px solid ${mode === k ? C.ink : C.line}`, background: mode === k ? C.ink : C.card, color: mode === k ? "#fff" : C.ink, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
            {t}
          </button>
        ))}
      </div>

      {mode === "pick" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
          <Select id="own-year" label="Year" value={year} onChange={setYear} options={YEARS.map((y) => ({ text: y, value: y }))} placeholder="Year" />
          <Select id="own-make" label="Make" value={make} onChange={setMake} options={makes} disabled={!year} placeholder={year && !makes.length ? "Loading…" : "Make"} />
          <Select id="own-model" label="Model" value={model} onChange={setModel} options={models} disabled={!make} placeholder={make && !models.length ? "Loading…" : "Model"} />
          {options.length > 1 && (
            <Select id="own-engine" label="Engine" value={epaId} onChange={setEpaId} options={options} placeholder="Not sure" />
          )}
        </div>
      ) : (
        <div>
          <label htmlFor="own-vin" style={lab}>VIN (17 characters, on your insurance card or the driver's door)</label>
          <input id="own-vin" value={vin} onChange={(e) => setVin(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 17))} placeholder="1HGCV1F30LA000000" style={{ ...field, fontFamily: mono, letterSpacing: "0.04em" }} />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
        <div>
          <label htmlFor="own-miles" style={lab}>Miles on it (optional)</label>
          <input id="own-miles" inputMode="numeric" value={miles} onChange={(e) => setMiles(e.target.value.replace(/\D/g, ""))} placeholder="68000" style={{ ...field, fontFamily: mono }} />
        </div>
        <div>
          <label htmlFor="own-peryear" style={lab}>Miles you drive a year</label>
          <input id="own-peryear" inputMode="numeric" value={perYear} onChange={(e) => setPerYear(e.target.value.replace(/\D/g, ""))} placeholder="12000" style={{ ...field, fontFamily: mono }} />
        </div>
      </div>

      {preview && (
        <div style={{ marginTop: 12, borderTop: `1px dashed ${C.line}`, paddingTop: 10 }}>
          <div style={{ fontSize: 15.5, fontWeight: 700 }}>{preview.title}</div>
          <CarStats car={preview} gas={gas} />
          {found.missing?.length > 0 && (
            <p style={{ margin: "8px 0 0", fontSize: 12, color: C.inkSoft }}>No {found.missing.join(" or ")} on file for this one.</p>
          )}
        </div>
      )}
      {status && status !== "loading" && <p role="alert" style={{ margin: "10px 0 0", fontSize: 13, color: C.red }}>{status}</p>}

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <GhostBtn onClick={onCancel} style={{ width: "auto", flex: 1 }}>Cancel</GhostBtn>
        {preview ? (
          <PrimaryBtn onClick={() => onAdd(preview)} style={{ flex: 2, width: "auto" }}>ADD TO MY GARAGE</PrimaryBtn>
        ) : (
          <PrimaryBtn onClick={() => ready && status !== "loading" && look()} style={{ flex: 2, width: "auto", opacity: ready ? 1 : 0.45 }}>
            {status === "loading" ? "LOOKING IT UP…" : "LOOK IT UP"}
          </PrimaryBtn>
        )}
      </div>
    </div>
  );
}
