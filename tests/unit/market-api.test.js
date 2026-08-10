import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import handler from "../../api/market.js";

/* The market endpoint is the one place a wrong answer is invisible to the
   buyer — they just see a number and believe it. These tests pin the
   behavior that keeps it honest: real comps or an explicit "no data",
   never a plausible-looking substitute. */

const call = async (query) => {
  let body = null;
  const res = { json: (b) => { body = b; return b; } };
  await handler({ query }, res);
  return body;
};

const listing = (price, extra = {}) => ({
  price, miles: 30000, dom_active: 20, source: "dealer.com",
  build: { year: 2023, model: "CR-V", trim: "EX-L" }, ...extra,
});

const ok = (listings, num_found = listings.length) => ({
  ok: true, json: async () => ({ listings, num_found }),
});

const CRV = { year: "2023", make: "Honda", model: "CR-V", trim: "EX-L", zip: "77471" };
const RAV4 = { year: "2022", make: "Toyota", model: "RAV4", trim: "XLE", zip: "77471" };

let originalKey;
beforeEach(() => {
  originalKey = process.env.MARKETCHECK_API_KEY;
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => {
  if (originalKey === undefined) delete process.env.MARKETCHECK_API_KEY;
  else process.env.MARKETCHECK_API_KEY = originalKey;
  vi.unstubAllGlobals();
});

describe("without an API key (snapshot mode)", () => {
  beforeEach(() => { delete process.env.MARKETCHECK_API_KEY; });

  it("serves the real snapshot for the vehicle it was pulled for", async () => {
    const b = await call(CRV);
    expect(b.source).toBe("snapshot");
    expect(b.median).toBe(30934);
    expect(b.comps.length).toBeGreaterThan(0);
  });

  it("does NOT serve CR-V comps for a different vehicle", async () => {
    const b = await call(RAV4);
    expect(b.source).toBe("none");
    expect(b.median).toBeUndefined();
    expect(b.comps).toBeUndefined();
  });

  it("never calls MarketCheck without a key", async () => {
    await call(CRV);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("with an API key (live mode)", () => {
  beforeEach(() => { process.env.MARKETCHECK_API_KEY = "test-key-not-real"; });

  it("returns live comps, median, and range", async () => {
    fetch.mockResolvedValueOnce(ok([listing(29000), listing(30000), listing(31000)], 14));
    const b = await call(CRV);
    expect(b.source).toBe("live");
    expect(b.median).toBe(30000);
    expect(b.low).toBe(29000);
    expect(b.high).toBe(31000);
    expect(b.count).toBe(14);
  });

  it("averages the middle two on an even sample", async () => {
    fetch.mockResolvedValueOnce(ok([listing(29000), listing(30000), listing(31000), listing(32000)]));
    const b = await call(CRV);
    expect(b.median).toBe(30500);
  });

  it("widens to all trims when the exact trim returns nothing", async () => {
    fetch
      .mockResolvedValueOnce(ok([]))                       // trim=EX-L: zero
      .mockResolvedValueOnce(ok([listing(30500)], 9));     // no trim: hits
    const b = await call(CRV);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(b.source).toBe("live");
    expect(b.trimWidened).toBe(true);
    expect(b.median).toBe(30500);
  });

  it("sends trim on the first attempt and drops it on the second", async () => {
    fetch.mockResolvedValueOnce(ok([])).mockResolvedValueOnce(ok([listing(30500)]));
    await call(CRV);
    expect(fetch.mock.calls[0][0]).toContain("trim=EX-L");
    expect(fetch.mock.calls[1][0]).not.toContain("trim=");
  });

  it("does not widen when the first attempt already found cars", async () => {
    fetch.mockResolvedValueOnce(ok([listing(30000)]));
    const b = await call(CRV);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(b.trimWidened).toBe(false);
  });

  it("does not retry when no trim was requested", async () => {
    fetch.mockResolvedValueOnce(ok([]));
    const b = await call({ ...CRV, trim: "" });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(b.source).toBe("none");
  });

  it("says 'none' rather than falling back to snapshot comps", async () => {
    fetch.mockResolvedValueOnce(ok([])).mockResolvedValueOnce(ok([]));
    const b = await call(CRV);
    expect(b.source).toBe("none");
    expect(b.median).toBeUndefined();
  });

  it("ignores listings with no price", async () => {
    fetch.mockResolvedValueOnce(ok([listing(0), listing(30000), { ...listing(30000), price: null }]));
    const b = await call(CRV);
    expect(b.median).toBe(30000);
    expect(b.comps).toHaveLength(1);
  });

  it("degrades to 'none' on an API error instead of throwing", async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 429, text: async () => "rate limited" });
    const b = await call(CRV);
    expect(b.source).toBe("none");
  });

  it("degrades to 'none' when the network fails", async () => {
    fetch.mockRejectedValueOnce(new Error("ECONNRESET"));
    const b = await call(CRV);
    expect(b.source).toBe("none");
  });

  it("caps comps so the payload stays small", async () => {
    fetch.mockResolvedValueOnce(ok(Array.from({ length: 24 }, (_, i) => listing(29000 + i * 100))));
    const b = await call(CRV);
    expect(b.comps.length).toBeLessThanOrEqual(6);
  });

  it("never leaks the API key into the response", async () => {
    fetch.mockResolvedValueOnce(ok([listing(30000)]));
    const b = await call(CRV);
    expect(JSON.stringify(b)).not.toContain("test-key-not-real");
  });

  it("passes the buyer's ZIP and radius through", async () => {
    fetch.mockResolvedValueOnce(ok([listing(30000)]));
    await call({ ...CRV, zip: "78701", radius: "50" });
    expect(fetch.mock.calls[0][0]).toContain("zip=78701");
    expect(fetch.mock.calls[0][0]).toContain("radius=50");
  });

  it("marks certified listings in the comp name", async () => {
    fetch.mockResolvedValueOnce(ok([listing(30000, { is_certified: true })]));
    const b = await call(CRV);
    expect(b.comps[0].name).toContain("(CPO)");
  });
});
