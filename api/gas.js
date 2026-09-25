/* Vercel serverless: /api/gas?zip=77469 — this week's average price for
   regular gas nearest that ZIP (EIA). Same contract as server/index.mjs.
   EIA_API_KEY is optional (free at eia.gov/opendata); without it the
   public demo key is used, which is rate-limited but fine behind the
   six-hour cache here and the CDN cache below. */

import { latestGasRows, pickPrice } from "../server/gas.mjs";

export default async function handler(req, res) {
  const zip = String(req.query?.zip || "").replace(/\D/g, "").slice(0, 5);
  if (zip.length !== 5) return res.status(400).json({ source: "none", note: "Need a 5-digit ZIP" });
  try {
    const hit = pickPrice(await latestGasRows(), zip);
    if (!hit) return res.json({ source: "none", note: "No price for this area this week" });
    res.setHeader("Cache-Control", "public, s-maxage=21600, stale-while-revalidate=86400");
    return res.json({ source: "eia", zip, ...hit });
  } catch (err) {
    console.error("EIA gas request failed:", err.message);
    return res.json({ source: "none", note: "Gas prices are unavailable right now" });
  }
}
