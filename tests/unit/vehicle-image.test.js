import { describe, it, expect } from "vitest";
import { cachedPhoto, cachedPhotoUpstream } from "../../api/shop.js";
import { upstreamFrom } from "../../api/photo.js";
import { toGarageItem } from "../../src/data/shopping.js";

/* Two rules, both learned the hard way in production.

   1. Read `photo_links_cached`, never `photo_links`. The raw array is the
      dealer's CDN and dies with the listing.
   2. MarketCheck embeds our api_key INSIDE the cached URL. Handing that
      to the browser published the secret in the /api/shop JSON and in
      every <img src>. Nothing upstream may reach the client. */

const RAW = "https://dealer-cdn.example.com/raw-and-doomed.jpg";
const SECRET = "mc_live_EXAMPLEKEY123";
const CACHED = `https://mc-api.marketcheck.com/v2/image/cache/car/VIN-abc-def/0123abc?api_key=${SECRET}`;
const CACHED_BARE = "https://mc-api.marketcheck.com/v2/image/cache/car/VIN-abc-def/0123abc";

describe("no secret ever reaches the client", () => {
  it("strips the embedded api_key from the cached URL", () => {
    expect(cachedPhotoUpstream({ media: { photo_links_cached: [CACHED] } })).toBe(CACHED_BARE);
  });

  it("hands the client a same-origin proxy path, not an upstream URL", () => {
    const got = cachedPhoto({ media: { photo_links_cached: [CACHED] } });
    expect(got.startsWith("/api/photo?src=")).toBe(true);
    expect(got).not.toContain("api_key");
    expect(got).not.toContain(SECRET);
  });

  it("leaks nothing even when the key appears in odd places", () => {
    for (const url of [
      CACHED,
      CACHED + "&extra=1",
      `https://mc-api.marketcheck.com/v2/image/cache/car/x/y?api_key=${SECRET}&w=800`,
    ]) {
      const got = cachedPhoto({ photo_links_cached: [url] });
      expect(got, `leaked for ${url}`).not.toContain(SECRET);
      expect(got).not.toContain("api_key");
    }
  });
});

describe("cached, never raw", () => {
  it("NEVER falls back to the raw dealer photos", () => {
    expect(cachedPhoto({ media: { photo_links: [RAW] } })).toBeNull();
    expect(cachedPhoto({ photo_links: [RAW] })).toBeNull();
    expect(cachedPhoto({ media: { photo_links: [RAW], photo_links_cached: [] } })).toBeNull();
  });

  it("prefers cached when both are present", () => {
    const got = cachedPhoto({ media: { photo_links: [RAW], photo_links_cached: [CACHED] } });
    expect(got).toContain("/api/photo?src=");
    expect(got).not.toContain("dealer-cdn");
  });

  it("rejects a cached entry on some other host", () => {
    expect(cachedPhoto({ photo_links_cached: ["https://evil.example.com/v2/image/cache/car/x/y"] })).toBeNull();
  });

  it("skips non-https entries", () => {
    expect(cachedPhoto({ media: { photo_links_cached: ["http://insecure.example/1.jpg"] } })).toBeNull();
  });

  it("returns null rather than throwing on junk", () => {
    for (const junk of [null, undefined, {}, { media: null }, { media: { photo_links_cached: null } },
                        { photo_links_cached: "not-an-array" }, { photo_links_cached: [1, {}, null] },
                        { photo_links_cached: ["not a url"] }]) {
      expect(cachedPhoto(junk)).toBeNull();
    }
  });
});

describe("the proxy is not an open proxy", () => {
  it("accepts only MarketCheck's cached-image path", () => {
    expect(upstreamFrom(CACHED_BARE)?.toString()).toBe(CACHED_BARE);
  });

  it("refuses other hosts, schemes, and paths", () => {
    for (const bad of [
      "https://evil.example.com/v2/image/cache/car/x/y",       // wrong host
      "http://mc-api.marketcheck.com/v2/image/cache/car/x/y",  // wrong scheme
      "https://mc-api.marketcheck.com/v2/search/car/active",   // wrong path — the data API
      "file:///etc/passwd",
      "http://169.254.169.254/latest/meta-data/",              // cloud metadata
      "", null, undefined, "not-a-url",
    ]) {
      expect(upstreamFrom(bad), `should refuse ${bad}`).toBeNull();
    }
  });

  it("discards any query the caller supplies, including a smuggled key", () => {
    const u = upstreamFrom(`https://mc-api.marketcheck.com/v2/image/cache/car/x/y?api_key=${SECRET}&z=1`);
    expect(u.search).toBe("");
    expect(u.toString()).not.toContain(SECRET);
  });
});

describe("the image survives the trip into the garage", () => {
  it("carries the proxy path onto the saved item", () => {
    const img = cachedPhoto({ photo_links_cached: [CACHED] });
    expect(toGarageItem({ year: 2021, make: "Mazda", model: "CX-5", price: 23450, image: img }).image).toBe(img);
  });

  it("normalizes a missing photo to null", () => {
    expect(toGarageItem({ year: 2021, make: "Mazda", model: "CX-5", price: 23450 }).image).toBeNull();
  });
});
