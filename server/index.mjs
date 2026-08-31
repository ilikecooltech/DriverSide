/* DriverSide API server.
   - GET /api/market → live MarketCheck listings when MARKETCHECK_API_KEY
     is set; otherwise a real Aug 8, 2026 snapshot so the demo always works.
   - In production (after `npm run build`) it also serves the built app,
     so `npm start` runs everything on one port. */

import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { SNAPSHOT } from "./snapshot.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 8787;
const KEY = process.env.MARKETCHECK_API_KEY;

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

app.get("/api/market", async (req, res) => {
  const {
    zip = "77471",
    radius = "100",
    year = "2023",
    make = "Honda",
    model = "CR-V",
    trim = "EX-L",
  } = req.query;

  if (!KEY) {
    // No key configured. Serve the real snapshot pull, but only for the
    // vehicle it was pulled for; other vehicles honestly report no data.
    const isSnapshotVehicle =
      String(make).toLowerCase() === "honda" && String(model).toLowerCase() === "cr-v";
    if (!isSnapshotVehicle) return res.json({ source: "none", note: "No cached data for this vehicle. Set MARKETCHECK_API_KEY for live comps." });
    return res.json({ ...SNAPSHOT, note: "Set MARKETCHECK_API_KEY for live data" });
  }

  try {
    const query = (withTrim) => {
      const p = new URLSearchParams({
        api_key: KEY,
        car_type: "used",
        year: String(year),
        make: String(make),
        model: String(model),
        zip: String(zip),
        radius: String(radius),
        rows: "24",
        sort_by: "price",
        sort_order: "asc",
      });
      if (withTrim && trim) p.set("trim", String(trim));
      return fetch(`https://mc-api.marketcheck.com/v2/search/car/active?${p}`);
    };
    // Exact trim first; MarketCheck trim strings over-narrow (a real "EX-L"
    // may be listed as "EX-L w/Navi"), so zero results widens to all trims.
    let trimWidened = false;
    let r = await query(true);
    if (!r.ok) throw new Error(`MarketCheck ${r.status}: ${await r.text()}`);
    let data = await r.json();
    let listings = (data.listings || []).filter((l) => l.price > 0);
    if (!listings.length && trim) {
      r = await query(false);
      if (!r.ok) throw new Error(`MarketCheck ${r.status}: ${await r.text()}`);
      data = await r.json();
      listings = (data.listings || []).filter((l) => l.price > 0);
      trimWidened = true;
    }
    if (!listings.length) {
      return res.json({ source: "none", note: "No live listings matched this vehicle" });
    }
    const prices = listings.map((l) => l.price);
    res.json({
      source: "live",
      trimWidened,
      zip,
      radius: Number(radius),
      count: data.num_found ?? listings.length,
      median: median(prices),
      low: Math.min(...prices),
      high: Math.max(...prices),
      comps: listings.slice(0, 6).map((l) => ({
        name: `${l.build?.year ?? year} ${l.build?.model ?? model} ${l.build?.trim ?? trim}${l.is_certified ? " (CPO)" : ""}`,
        price: l.price,
        miles: l.miles ?? 0,
        days: l.dom_active ?? l.dom ?? 0,
        source: l.source ?? l.dealer?.website ?? "dealer",
      })),
    });
  } catch (err) {
    console.error("MarketCheck request failed:", err.message);
    res.json({ ...SNAPSHOT, note: "Live request failed — showing snapshot" });
  }
});

/* Inventory search for the Shop tab — parity with api/shop.js. */
app.get("/api/shop", async (req, res) => {
  const { zip = "77471", radius = "100", bodyType = "", maxPrice = "", maxMiles = "", minYear = "" } = req.query;
  if (!KEY) return res.json({ source: "none", listings: [], note: "Set MARKETCHECK_API_KEY for live inventory" });
  try {
    const p = new URLSearchParams({
      api_key: KEY, car_type: "used", zip: String(zip), radius: String(radius),
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
        year: l.build.year, make: l.build.make, model: l.build.model, trim: l.build.trim || "",
        price: l.price, miles: l.miles ?? 0, bodyType: normalizeBody(l.build.body_type),
        dealer: l.dealer?.name || l.source || "Dealer",
        days: l.dom_active ?? l.dom ?? 0, certified: Boolean(l.is_certified),
        image: cachedPhoto(l),
      }));
    res.json({ source: "live", count: data.num_found ?? listings.length, listings });
  } catch (err) {
    console.error("MarketCheck shop request failed:", err.message);
    res.json({ source: "none", listings: [], note: "Live request failed" });
  }
});

/* Image proxy — parity with api/photo.js. The api_key never leaves this
   process; the client only ever sees /api/photo?src=... */
app.get("/api/photo", async (req, res) => {
  const PHOTO_PREFIX = "/v2/image/cache/";
  let u = null;
  try {
    u = new URL(String(req.query.src || ""));
    if (u.protocol !== "https:" || u.hostname !== "mc-api.marketcheck.com" || !u.pathname.startsWith(PHOTO_PREFIX)) u = null;
    else u.search = "";
  } catch { u = null; }
  if (!u) return res.status(400).json({ error: "Unsupported image source" });
  if (!KEY) return res.status(404).end();
  u.searchParams.set("api_key", KEY);
  try {
    const r = await fetch(u.toString());
    if (!r.ok) return res.status(r.status === 429 ? 429 : 404).end();
    const type = r.headers.get("content-type") || "";
    if (!type.startsWith("image/")) return res.status(415).end();
    res.setHeader("Content-Type", type);
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=604800, immutable");
    return res.status(200).send(Buffer.from(await r.arrayBuffer()));
  } catch {
    return res.status(502).end();
  }
});


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
function cachedPhotoUpstream(listing) {
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
function cachedPhoto(listing) {
  const upstream = cachedPhotoUpstream(listing);
  return upstream ? `/api/photo?src=${encodeURIComponent(upstream)}` : null;
}

function normalizeBody(raw) {
  const s = String(raw || "").toLowerCase();
  if (s.includes("pickup") || s.includes("truck")) return "Pickup";
  if (s.includes("van")) return "Minivan";
  if (s.includes("hatch")) return "Hatchback";
  if (s.includes("coupe") || s.includes("convertible")) return "Coupe";
  if (s.includes("suv") || s.includes("crossover") || s.includes("sport utility")) return "SUV";
  if (s.includes("sedan")) return "Sedan";
  return "Sedan";
}

// Serve the built app if it exists (production mode).
const dist = path.join(__dirname, "..", "dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

app.listen(PORT, () => {
  console.log(`DriverSide API on http://localhost:${PORT}${KEY ? " (live MarketCheck)" : " (snapshot mode — no API key)"}`);
});
