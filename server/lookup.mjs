/* One car by VIN, for "Add a car from any site". Shared by api/listing.js
   and server/index.mjs so the two can't drift.

   Order: the live listing on MarketCheck (price, miles, dealer, photos),
   then a plain NHTSA decode (year, make, model) for cars MarketCheck
   doesn't carry, like private sellers. Never invents a price. */

import { toListing, normalizeBody } from "./listing.mjs";
import { decodeVin } from "./vehicleStats.mjs";
import { isValidVin } from "../src/data/vin.js";

export async function lookupListing({ vin, key, fetchImpl = fetch }) {
  const v = String(vin || "").toUpperCase();
  if (!isValidVin(v)) return { ok: false, source: "none", note: "That doesn't look like a VIN." };

  if (key) {
    try {
      const p = new URLSearchParams({ api_key: key, vin: v, rows: "1", include_dealer_object: "true", include_build_object: "true" });
      const r = await fetchImpl(`https://mc-api.marketcheck.com/v2/search/car/active?${p}`);
      if (r.ok) {
        const data = await r.json();
        const l = (data.listings || []).find((x) => x.price > 0 && x.build?.make);
        if (l) return { ok: true, source: "live", listing: { ...toListing(l), vin: v } };
      }
    } catch (err) {
      console.error("MarketCheck VIN lookup failed:", err.message);
    }
  }

  try {
    const d = await decodeVin(v, fetchImpl);
    if (d && !d.error && d.year && d.make && d.model)
      return { ok: true, source: "decoded", car: { vin: v, year: Number(d.year), make: d.make, model: d.model, trim: d.trim || "", bodyType: d.body ? normalizeBody(d.body) : null } };
  } catch { /* fall through */ }

  return { ok: false, source: "none", note: "We couldn't find that VIN. Check it against the listing." };
}
