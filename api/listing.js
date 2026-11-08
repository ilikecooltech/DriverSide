/* Vercel serverless: /api/listing?vin=... — one car by VIN, for adding a
   car from any site. Logic lives in server/lookup.mjs (parity with
   server/index.mjs). The MarketCheck key stays server-side. */

import { lookupListing } from "../server/lookup.mjs";

export default async function handler(req, res) {
  const out = await lookupListing({ vin: req.query?.vin, key: process.env.MARKETCHECK_API_KEY });
  /* A listing's price moves, so only a short cache. */
  if (out.ok) res.setHeader("Cache-Control", "public, s-maxage=900, stale-while-revalidate=3600");
  res.json(out);
}
