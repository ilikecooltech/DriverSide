/* One MarketCheck listing -> the shape the app uses. Shared by the Vercel
   function (api/shop.js) and the local Express server (server/index.mjs)
   so the two can't drift. Everything the vehicle page shows comes from
   here: every cached photo, specs, the dealer, and the link out.

   Photos follow the same rule as before: only `photo_links_cached`, the
   api_key stripped, and the client handed same-origin /api/photo paths.
   No upstream URL, and so no secret, ever reaches the browser. */

const PHOTO_HOST = "mc-api.marketcheck.com";
export const MAX_PHOTOS = 30;

function cachedList(listing) {
  const cached = listing?.media?.photo_links_cached || listing?.photo_links_cached || null;
  return Array.isArray(cached) ? cached : [];
}

function stripToUpstream(raw) {
  if (typeof raw !== "string" || !raw.trim().startsWith("https://")) return null;
  try {
    const u = new URL(raw.trim());
    if (u.hostname !== PHOTO_HOST) return null;
    u.search = "";
    return u.toString();
  } catch {
    return null;
  }
}

const toProxy = (upstream) => `/api/photo?src=${encodeURIComponent(upstream)}`;

/* The bare upstream URL of the first usable photo, key stripped. */
export function cachedPhotoUpstream(listing) {
  for (const raw of cachedList(listing)) {
    const u = stripToUpstream(raw);
    if (u) return u;
  }
  return null;
}

/* What the client gets for the card: a same-origin path, never a secret. */
export function cachedPhoto(listing) {
  const upstream = cachedPhotoUpstream(listing);
  return upstream ? toProxy(upstream) : null;
}

/* Every usable photo, deduped, capped, as same-origin paths. */
export function cachedPhotos(listing, max = MAX_PHOTOS) {
  const seen = new Set();
  const out = [];
  for (const raw of cachedList(listing)) {
    const u = stripToUpstream(raw);
    if (!u || seen.has(u)) continue;
    seen.add(u);
    out.push(toProxy(u));
    if (out.length >= max) break;
  }
  return out;
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

/* The dealer's own page for this car. https only, and only a plain URL:
   it becomes an <a href>, so nothing like javascript: gets through. */
export function listingUrl(raw) {
  try {
    const u = new URL(String(raw || ""));
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

const num = (v) => (Number.isFinite(Number(v)) && v !== null && v !== "" ? Number(v) : null);

export function toListing(l) {
  const b = l.build || {};
  const d = l.dealer || {};
  const photos = cachedPhotos(l);
  return {
    id: l.id || `${l.vin || b.make + b.model}-${l.price}`,
    year: b.year, make: b.make, model: b.model, trim: b.trim || "",
    price: l.price, miles: l.miles ?? 0,
    bodyType: normalizeBody(b.body_type),
    dealer: d.name || l.source || "Dealer",
    days: l.dom_active ?? l.dom ?? 0,
    certified: Boolean(l.is_certified),
    image: photos[0] || null,
    photos,
    /* Detail-page fields. All optional: sample inventory has none of
       them and the page shows only what exists. */
    vin: l.vin || null,
    stockNo: l.stock_no || null,
    exterior: l.exterior_color || null,
    interior: l.interior_color || null,
    engine: b.engine || null,
    drivetrain: b.drivetrain || null,
    transmission: b.transmission || null,
    powertrain: b.powertrain_type || null,
    mpgCity: num(b.city_mpg),
    mpgHwy: num(b.highway_mpg),
    seats: num(b.std_seating),
    dealerCity: d.city || null,
    dealerState: d.state || null,
    dealerType: d.dealer_type || null,
    dist: num(l.dist),
    url: listingUrl(l.vdp_url),
    source: l.source || null,
  };
}
