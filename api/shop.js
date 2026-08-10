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
      }));

    res.json({ source: "live", count: data.num_found ?? listings.length, listings });
  } catch (err) {
    console.error("MarketCheck shop request failed:", err.message);
    res.json({ source: "none", listings: [], note: "Live request failed" });
  }
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
