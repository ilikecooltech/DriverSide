/* Vercel serverless: /api/vehicle-stats — same contract as server/index.mjs.

   ?menu=makes&year=2019               → [{ text, value }]
   ?menu=models&year=2019&make=Toyota
   ?menu=options&year=2019&make=Toyota&model=Camry   (engines/transmissions)
   ?year=2019&make=Toyota&model=Camry[&trim=LE][&epaId=40609]
   ?vin=4T1B11HK5KU000000

   All sources are public and free; MarketCheck (if its key is set) only
   fills in seating. Answers are the same for everyone, so the CDN keeps
   them for a day. */

import { menu, vehicleStats } from "../server/vehicleStats.mjs";

export default async function handler(req, res) {
  const q = req.query || {};
  try {
    if (q.menu) {
      const items = await menu(String(q.menu), { year: q.year, make: q.make, model: q.model });
      res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
      return res.json({ ok: true, items });
    }
    const stats = await vehicleStats({
      year: q.year, make: q.make, model: q.model, trim: q.trim || "",
      vin: String(q.vin || "").trim().toUpperCase(), epaId: q.epaId || "",
    });
    if (stats.ok) res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
    return res.json(stats);
  } catch (err) {
    console.error("vehicle-stats failed:", err.message);
    return res.json({ ok: false, note: "Vehicle stats are unavailable right now" });
  }
}
