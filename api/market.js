/* Vercel serverless function: /api/market. Same contract as the local
   Express server (server/index.mjs) — keep the two in parity. The
   MarketCheck key stays server-side per CLAUDE.md; the client never
   sees it. Trim over-narrows on MarketCheck (a real "EX-L" may list as
   "EX-L w/Navi"), so a zero-result exact-trim query widens to all trims. */

import { SNAPSHOT } from "../server/snapshot.mjs";

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

export default async function handler(req, res) {
  const {
    zip = "77471", radius = "100", year = "2023",
    make = "Honda", model = "CR-V", trim = "",
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
    const query = (withTrim) => {
      const p = new URLSearchParams({
        api_key: KEY, car_type: "used",
        year: String(year), make: String(make), model: String(model),
        zip: String(zip), radius: String(radius),
        rows: "24", sort_by: "price", sort_order: "asc",
      });
      if (withTrim && trim) p.set("trim", String(trim));
      return fetch(`https://mc-api.marketcheck.com/v2/search/car/active?${p}`);
    };

    let trimWidened = false;
    let r = await query(true);
    if (!r.ok) throw new Error(`MarketCheck ${r.status}`);
    let data = await r.json();
    let listings = (data.listings || []).filter((l) => l.price > 0);
    if (!listings.length && trim) {
      r = await query(false);
      if (!r.ok) throw new Error(`MarketCheck ${r.status}`);
      data = await r.json();
      listings = (data.listings || []).filter((l) => l.price > 0);
      trimWidened = true;
    }
    if (!listings.length)
      return res.json({ source: "none", note: "No live listings matched this vehicle" });

    const prices = listings.map((l) => l.price);
    res.json({
      source: "live", trimWidened, zip, radius: Number(radius),
      count: data.num_found ?? listings.length,
      median: median(prices),
      low: Math.min(...prices), high: Math.max(...prices),
      comps: listings.slice(0, 6).map((l) => ({
        name: `${l.build?.year ?? year} ${l.build?.model ?? model} ${l.build?.trim ?? trim}${l.is_certified ? " (CPO)" : ""}`.trim(),
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
