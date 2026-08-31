import { describe, it, expect } from "vitest";
import { cachedPhoto } from "../../api/shop.js";
import { toGarageItem } from "../../src/data/shopping.js";

/* The whole point of this field is WHICH array it reads. `photo_links`
   is the dealer's CDN and 404s once the listing comes down;
   `photo_links_cached` is MarketCheck's copy and keeps resolving. A
   regression here looks fine in dev and rots in production, so the
   never-read-the-raw-array rule is pinned hard below. */

const RAW = "https://dealer-cdn.example.com/raw-and-doomed.jpg";
const CACHED = "https://cdn.marketcheck.com/cached-1.jpg";

describe("cachedPhoto", () => {
  it("takes the first cached photo under media", () => {
    expect(cachedPhoto({ media: { photo_links_cached: [CACHED, "https://cdn.marketcheck.com/2.jpg"] } })).toBe(CACHED);
  });

  it("also accepts the field at the top level", () => {
    expect(cachedPhoto({ photo_links_cached: [CACHED] })).toBe(CACHED);
  });

  it("NEVER falls back to the raw dealer photos", () => {
    // The listing has photos — just not cached ones. Placeholder is correct.
    expect(cachedPhoto({ media: { photo_links: [RAW] } })).toBeNull();
    expect(cachedPhoto({ photo_links: [RAW] })).toBeNull();
    expect(cachedPhoto({ media: { photo_links: [RAW], photo_links_cached: [] } })).toBeNull();
  });

  it("prefers the cached array when both are present", () => {
    const got = cachedPhoto({ media: { photo_links: [RAW], photo_links_cached: [CACHED] } });
    expect(got).toBe(CACHED);
    expect(got).not.toBe(RAW);
  });

  it("skips non-https entries, which a browser would block anyway", () => {
    expect(cachedPhoto({ media: { photo_links_cached: ["http://insecure.example/1.jpg"] } })).toBeNull();
    expect(cachedPhoto({ media: { photo_links_cached: ["http://insecure.example/1.jpg", CACHED] } })).toBe(CACHED);
  });

  it("returns null rather than throwing on junk", () => {
    for (const junk of [null, undefined, {}, { media: null }, { media: { photo_links_cached: null } },
                        { photo_links_cached: "not-an-array" }, { photo_links_cached: [1, {}, null] }]) {
      expect(cachedPhoto(junk)).toBeNull();
    }
  });

  it("trims incidental whitespace", () => {
    expect(cachedPhoto({ photo_links_cached: ["  " + CACHED + "  "] })).toBe(CACHED);
  });
});

describe("the image survives the trip into the garage", () => {
  it("carries a cached photo onto the saved item", () => {
    expect(toGarageItem({ year: 2021, make: "Mazda", model: "CX-5", price: 23450, image: CACHED }).image).toBe(CACHED);
  });

  it("normalizes a missing photo to null, so the card shows a placeholder", () => {
    expect(toGarageItem({ year: 2021, make: "Mazda", model: "CX-5", price: 23450 }).image).toBeNull();
  });
});
