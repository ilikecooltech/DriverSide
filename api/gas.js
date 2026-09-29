/* Vercel serverless: /api/gas?zip=77469 — this week's average price for
   regular gas nearest that ZIP (EIA). Same contract as server/index.mjs.
   EIA_API_KEY is optional (free at eia.gov/opendata); without it the
   public demo key is used, which is rate-limited but fine behind the
   six-hour cache here and the CDN cache below. */

import { latestGasRows, pickPrice, areasForPoint, stateForPoint } from "../server/gas.mjs";

/* ?lat=29.58&lon=-95.76 (from the phone's GPS, rounded to about 1 km)
   or ?zip=77469. Coordinates are used for this one lookup and not kept. */
export default async function handler(req, res) {
  const q = req.query || {};
  const lat = Math.round(Number(q.lat) * 100) / 100, lon = Math.round(Number(q.lon) * 100) / 100;
  const hasPoint = Number.isFinite(lat) && Number.isFinite(lon) && q.lat != null && q.lat !== "" && q.lon != null && q.lon !== "" && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
  const zip = String(q.zip || "").replace(/\D/g, "").slice(0, 5);
  if (!hasPoint && zip.length !== 5) return res.status(400).json({ source: "none", note: "Need a location or a 5-digit ZIP" });
  try {
    let where = zip, by = "zip";
    if (hasPoint) {
      const state = await stateForPoint(lat, lon).catch(() => null);
      where = areasForPoint(lat, lon, state); by = "gps";
    }
    const hit = pickPrice(await latestGasRows(), where);
    if (!hit) return res.json({ source: "none", note: "No price for this area this week" });
    res.setHeader("Cache-Control", hasPoint ? "private, max-age=21600" : "public, s-maxage=21600, stale-while-revalidate=86400");
    return res.json({ source: "eia", by, ...(by === "zip" ? { zip } : {}), ...hit });
  } catch (err) {
    console.error("EIA gas request failed:", err.message);
    return res.json({ source: "none", note: "Gas prices are unavailable right now" });
  }
}
