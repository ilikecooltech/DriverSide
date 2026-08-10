/* Vercel serverless function: /api/market. Same contract as the local
   Express server (server/index.mjs). MarketCheck key stays server-side,
   per the security rule in CLAUDE.md — the client never sees it. */

import { SNAPSHOT } from "../server/snapshot.mjs";

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

export default async function handler(req, res) {
  const {
    zip = "77471", radius = "100", year = "2023",
    make = "Honda", model = "CR-V", trim = "EX-L",
  } = req.query;
  const KEY = process.env.MARKETCHECK_API_KEY;

  if (!KEY) {
    const isSnapshotVehicle =
      String(make).toLowerCase() === "honda" && String(model).toLowerCase() === "cr-v";
    if (!isSnapshotVehicle)
      return res.json({ source: "none", note: "No cached data for this vehicle. Set MARKETCHECK_API_KEY for live comps." });
    return res.json({ ...SNAPSHOT, note: "Set MARKETCHECK_API_KEY for live data" });
  }

  try {
    const params = new URLSearchParams({
      api_key: KEY, car_type: "used",
      year: String(year), make: String(make), model: String(model), trim: String(trim),
      zip: String(zip), radius: String(radius),
      rows: "24", sort_by: "price", sort_order: "asc",
    });
    const r = await fetch(`https://mc-api.marketcheck.com/v2/search/car/active?${params}`);
    if (!r.ok) throw new Error(`MarketCheck ${r.status}`);
    const data = await r.json();
    const listings = (data.listings || []).filter((l) => l.price > 0);
    if (!listings.length)
      return res.json({ source: "none", note: "No live listings matched" });
    const prices = listings.map((l) => l.price);
    res.json({
      source: "live", zip, radius: Number(radius),
      count: data.num_found ?? listings.length,
      median: median(prices),
      low: Math.min(...prices), high: Math.max(...prices),
      comps: listings.slice(0, 6).map((l) => ({
        name: `${l.build?.year ?? year} ${l.build?.model ?? model} ${l.build?.trim ?? trim}${l.is_certified ? " (CPO)" : ""}`,
        price: l.price, miles: l.miles ?? 0,
        days: l.dom_active ?? l.dom ?? 0,
        source: l.source ?? l.dealer?.website ?? "dealer",
      })),
    });
  } catch (err) {
    console.error("MarketCheck request failed:", err.message);
    res.json({ source: "none", note: "Live request failed" });
  }
}
