/* Vercel serverless: /api/shop — inventory search by criteria (body type,
   price, miles, year, radius) rather than one specific vehicle. Powers the
   Shop tab. Keep in parity with the /shop route in server/index.mjs.

   With no MARKETCHECK_API_KEY the client falls back to sample inventory
   and labels it as sample; this endpoint never fabricates listings. */

export default async function handler(req, res) {
  const {
    zip = "77471", radius = "100",
    bodyType = "", maxPrice = "", maxMiles = "", minYear = "",
  } = req.query;
  const KEY = process.env.MARKETCHECK_API_KEY;

  if (!KEY) return res.json({ source: "none", listings: [], note: "Set MARKETCHECK_API_KEY for live inventory" });

  try {
    const p = new URLSearchParams({
      api_key: KEY, car_type: "used",
      zip: String(zip), radius: String(radius),
      rows: "30", sort_by: "price", sort_order: "asc",
    });
    if (bodyType) p.set("body_type", String(bodyType));
    if (maxPrice) p.set("price_range", `0-${Number(maxPrice)}`);
    if (maxMiles) p.set("miles_range", `0-${Number(maxMiles)}`);
    if (minYear) p.set("year_range", `${Number(minYear)}-2026`);

    const r = await fetch(`https://mc-api.marketcheck.com/v2/search/car/active?${p}`);
    if (!r.ok) throw new Error(`MarketCheck ${r.status}`);
    const data = await r.json();

    const listings = (data.listings || [])
      .filter((l) => l.price > 0 && l.build?.make && l.build?.model)
      .slice(0, 24)
      .map((l) => ({
        id: l.id || `${l.vin || l.build.make + l.build.model}-${l.price}`,
        year: l.build.year, make: l.build.make, model: l.build.model,
        trim: l.build.trim || "",
        price: l.price, miles: l.miles ?? 0,
        bodyType: normalizeBody(l.build.body_type),
        dealer: l.dealer?.name || l.source || "Dealer",
        days: l.dom_active ?? l.dom ?? 0,
        certified: Boolean(l.is_certified),
        image: cachedPhoto(l),
      }));

    res.json({ source: "live", count: data.num_found ?? listings.length, listings });
  } catch (err) {
    console.error("MarketCheck shop request failed:", err.message);
    res.json({ source: "none", listings: [], note: "Live request failed" });
  }
}

/* MarketCheck returns two photo arrays and only one of them is safe.

   `photo_links` points at the dealer's own CDN and 404s once the listing
   comes down; `photo_links_cached` is MarketCheck's copy and keeps
   resolving. So we read the cached array only, never the raw one.

   The catch: MarketCheck embeds our api_key *inside* the cached URL.
   Returning it as-is would publish the secret in this endpoint's JSON and
   in every <img src> on the results page. So the key (and any other
   query) is stripped here, and the client is handed a same-origin
   /api/photo path that re-attaches it server-side. No upstream URL — and
   therefore no secret — ever reaches the browser.

   https-only, because a mixed-content image would be blocked anyway. */

const PHOTO_HOST = "mc-api.marketcheck.com";

/* The bare upstream URL, key stripped. Exported for tests. */
export function cachedPhotoUpstream(listing) {
  const cached =
    listing?.media?.photo_links_cached ||
    listing?.photo_links_cached ||
    null;
  if (!Array.isArray(cached)) return null;
  const first = cached.find((u) => typeof u === "string" && u.trim().startsWith("https://"));
  if (!first) return null;
  try {
    const u = new URL(first.trim());
    if (u.hostname !== PHOTO_HOST) return null;
    u.search = "";
    return u.toString();
  } catch {
    return null;
  }
}

/* What the client actually gets: a same-origin path, never a secret. */
export function cachedPhoto(listing) {
  const upstream = cachedPhotoUpstream(listing);
  return upstream ? `/api/photo?src=${encodeURIComponent(upstream)}` : null;
}

/* MarketCheck body types are messier than our six buckets. */
export function normalizeBody(raw) {
  const s = String(raw || "").toLowerCase();
  if (s.includes("pickup") || s.includes("truck")) return "Pickup";
  if (s.includes("van")) return "Minivan";
  if (s.includes("hatch")) return "Hatchback";
  if (s.includes("coupe") || s.includes("convertible")) return "Coupe";
  if (s.includes("suv") || s.includes("crossover") || s.includes("sport utility")) return "SUV";
  if (s.includes("sedan")) return "Sedan";
  return "Sedan";
}
