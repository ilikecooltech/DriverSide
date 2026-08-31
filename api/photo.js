/* Same-origin image proxy for MarketCheck cached photos.

   MarketCheck embeds the account's api_key directly inside the cached
   photo URL it hands back. Passing that URL to the browser publishes the
   secret in every <img src> and in the /api/shop JSON — so the client is
   never given an upstream URL at all. It gets /api/photo?src=<url>, and
   the key is attached here, server-side, where it already lives.

   Strictly allowlisted to MarketCheck's cached-image path. This endpoint
   must never become an open proxy that fetches arbitrary URLs on behalf
   of anyone who calls it. */

const HOST = "mc-api.marketcheck.com";
const PREFIX = "/v2/image/cache/";

/* Returns a safe upstream URL object, or null. Any query string the
   caller supplied is discarded — including an api_key they tried to
   smuggle in, and including the one MarketCheck put there itself. */
export function upstreamFrom(src) {
  let u;
  try {
    u = new URL(String(src || ""));
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  if (u.hostname !== HOST) return null;
  if (!u.pathname.startsWith(PREFIX)) return null;
  u.search = "";
  return u;
}

export default async function handler(req, res) {
  const KEY = process.env.MARKETCHECK_API_KEY;
  const upstream = upstreamFrom(req.query?.src);
  if (!upstream) return res.status(400).json({ error: "Unsupported image source" });
  if (!KEY) return res.status(404).end();

  upstream.searchParams.set("api_key", KEY);

  try {
    const r = await fetch(upstream.toString());
    if (!r.ok) return res.status(r.status === 429 ? 429 : 404).end();
    const type = r.headers.get("content-type") || "";
    if (!type.startsWith("image/")) return res.status(415).end();

    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader("Content-Type", type);
    /* A listing photo doesn't change, so cache it hard at the edge. That
       also stops us spending the rate limit twice on the same picture —
       which is what put us into 429s in the first place. */
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=604800, immutable");
    return res.status(200).send(buf);
  } catch {
    return res.status(502).end();
  }
}
