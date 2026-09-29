import { useEffect, useState } from "react";

/* This week's regular gas price near the buyer (from /api/gas, which
   reads EIA). Uses GPS when they've allowed it, otherwise their ZIP.
   Cached per area for 12 hours. Null until known, and stays null if the
   lookup fails: calculators then ask for it. */

const KEY = "driverside.gas";
const TTL = 12 * 60 * 60 * 1000;

function read(key) {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) || "null");
    return c && c.key === key && Date.now() - c.at < TTL ? c.data : null;
  } catch { return null; }
}
function write(key, data) {
  try { localStorage.setItem(KEY, JSON.stringify({ key, at: Date.now(), data })); } catch { /* not load-bearing */ }
}

export function gasQuery(zip, coords) {
  if (coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lon))
    return { key: `gps:${coords.lat.toFixed(1)},${coords.lon.toFixed(1)}`, qs: `lat=${coords.lat}&lon=${coords.lon}` };
  const z = String(zip || "").replace(/\D/g, "").slice(0, 5);
  return z.length === 5 ? { key: `zip:${z}`, qs: `zip=${z}` } : null;
}

export function useGasPrice(zip, coords) {
  const q = gasQuery(zip, coords);
  const key = q?.key || "";
  const [gas, setGas] = useState(() => (q ? read(q.key) : null));
  useEffect(() => {
    if (!q) { setGas(null); return; }
    const cached = read(q.key);
    if (cached) { setGas(cached); return; }
    let live = true;
    fetch(`/api/gas?${q.qs}`)
      .then((r) => r.json())
      .then((j) => {
        if (!live) return;
        if (j?.source === "eia" && j.price > 0) {
          const d = { price: j.price, label: j.label, week: j.week, by: j.by || "zip", zip: j.zip || null };
          write(q.key, d); setGas(d);
        }
      })
      .catch(() => {});
    return () => { live = false; };
  }, [key]);
  return gas;
}

export function weekLabel(week) {
  if (!week) return "";
  const d = new Date(`${week}T12:00:00`);
  return Number.isNaN(d.getTime()) ? week : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
