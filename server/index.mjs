/* DriverSide API server.
   - GET /api/market → live MarketCheck listings when MARKETCHECK_API_KEY
     is set; otherwise a real Aug 8, 2026 snapshot so the demo always works.
   - In production (after `npm run build`) it also serves the built app,
     so `npm start` runs everything on one port. */

import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { SNAPSHOT } from "./snapshot.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 8787;
const KEY = process.env.MARKETCHECK_API_KEY;

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

app.get("/api/market", async (req, res) => {
  const {
    zip = "77471",
    radius = "100",
    year = "2023",
    make = "Honda",
    model = "CR-V",
    trim = "EX-L",
  } = req.query;

  if (!KEY) {
    // No key configured. Serve the real snapshot pull, but only for the
    // vehicle it was pulled for; other vehicles honestly report no data.
    const isSnapshotVehicle =
      String(make).toLowerCase() === "honda" && String(model).toLowerCase() === "cr-v";
    if (!isSnapshotVehicle) return res.json({ source: "none", note: "No cached data for this vehicle. Set MARKETCHECK_API_KEY for live comps." });
    return res.json({ ...SNAPSHOT, note: "Set MARKETCHECK_API_KEY for live data" });
  }

  try {
    const params = new URLSearchParams({
      api_key: KEY,
      car_type: "used",
      year: String(year),
      make: String(make),
      model: String(model),
      trim: String(trim),
      zip: String(zip),
      radius: String(radius),
      rows: "24",
      sort_by: "price",
      sort_order: "asc",
    });
    const url = `https://mc-api.marketcheck.com/v2/search/car/active?${params}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`MarketCheck ${r.status}: ${await r.text()}`);
    const data = await r.json();
    const listings = (data.listings || []).filter((l) => l.price > 0);
    if (!listings.length) {
      return res.json({ ...SNAPSHOT, note: "No live listings matched — showing snapshot" });
    }
    const prices = listings.map((l) => l.price);
    res.json({
      source: "live",
      zip,
      radius: Number(radius),
      count: data.num_found ?? listings.length,
      median: median(prices),
      low: Math.min(...prices),
      high: Math.max(...prices),
      comps: listings.slice(0, 6).map((l) => ({
        name: `${l.build?.year ?? year} ${l.build?.model ?? model} ${l.build?.trim ?? trim}${l.is_certified ? " (CPO)" : ""}`,
        price: l.price,
        miles: l.miles ?? 0,
        days: l.dom_active ?? l.dom ?? 0,
        source: l.source ?? l.dealer?.website ?? "dealer",
      })),
    });
  } catch (err) {
    console.error("MarketCheck request failed:", err.message);
    res.json({ ...SNAPSHOT, note: "Live request failed — showing snapshot" });
  }
});

// Serve the built app if it exists (production mode).
const dist = path.join(__dirname, "..", "dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

app.listen(PORT, () => {
  console.log(`DriverSide API on http://localhost:${PORT}${KEY ? " (live MarketCheck)" : " (snapshot mode — no API key)"}`);
});
