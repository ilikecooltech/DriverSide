import { useEffect, useState } from "react";

/* This week's regular gas price near the buyer's ZIP (from /api/gas,
   which reads EIA). Cached per ZIP for 12 hours. Null until known, and
   stays null if the lookup fails: calculators then ask for it. */

const KEY = "driverside.gas";
const TTL = 12 * 60 * 60 * 1000;

function read(zip) {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) || "null");
    return c && c.zip === zip && Date.now() - c.at < TTL ? c.data : null;
  } catch { return null; }
}
function write(zip, data) {
  try { localStorage.setItem(KEY, JSON.stringify({ zip, at: Date.now(), data })); } catch { /* not load-bearing */ }
}

export function useGasPrice(zip) {
  const z = String(zip || "").replace(/\D/g, "").slice(0, 5);
  const [gas, setGas] = useState(() => (z.length === 5 ? read(z) : null));
  useEffect(() => {
    if (z.length !== 5) { setGas(null); return; }
    const cached = read(z);
    if (cached) { setGas(cached); return; }
    let live = true;
    fetch(`/api/gas?zip=${z}`)
      .then((r) => r.json())
      .then((j) => {
        if (!live) return;
        if (j?.source === "eia" && j.price > 0) { const d = { price: j.price, label: j.label, week: j.week }; write(z, d); setGas(d); }
        else setGas(null);
      })
      .catch(() => live && setGas(null));
    return () => { live = false; };
  }, [z]);
  return gas;
}
