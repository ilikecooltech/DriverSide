import { describe, it, expect, beforeEach } from "vitest";
import { stateForZip, areasForZip, pickPrice, latestGasRows, _resetGasCache } from "../../server/gas.mjs";
import handler from "../../api/gas.js";

const WEEK = "2026-09-21";
const rows = [
  { period: WEEK, duoarea: "NUS", "area-name": "U.S.", value: "4.478" },
  { period: WEEK, duoarea: "Y44HO", "area-name": "HOUSTON", value: "3.863" },
  { period: WEEK, duoarea: "STX", "area-name": "TEXAS", value: "3.929" },
  { period: WEEK, duoarea: "R30", "area-name": "PADD 3", value: "3.972" },
  { period: WEEK, duoarea: "R20", "area-name": "PADD 2", value: "4.386" },
  { period: WEEK, duoarea: "SCA", "area-name": "CALIFORNIA", value: "6.003" },
  { period: WEEK, duoarea: "R1X", "area-name": "PADD 1A", value: "4.382" },
  { period: "2026-09-14", duoarea: "Y44HO", "area-name": "HOUSTON", value: "3.70" },
];

describe("ZIP to state", () => {
  it("maps ZIP prefixes to states, including the odd ones", () => {
    expect(stateForZip("77469")).toBe("TX");
    expect(stateForZip("88510")).toBe("TX");
    expect(stateForZip("73301")).toBe("TX");
    expect(stateForZip("73101")).toBe("OK");
    expect(stateForZip("02108")).toBe("MA");
    expect(stateForZip("90210")).toBe("CA");
    expect(stateForZip("60614")).toBe("IL");
    expect(stateForZip("12")).toBe(null);
  });

  it("orders areas closest first", () => {
    expect(areasForZip("77469")).toEqual(["Y44HO", "STX", "R30", "NUS"]);
    expect(areasForZip("75201")).toEqual(["STX", "R30", "NUS"]);
    expect(areasForZip("46201")).toEqual(["R20", "NUS"]);
  });
});

describe("picking this week's price", () => {
  it("uses the metro when the ZIP is in one, from the newest week", () => {
    expect(pickPrice(rows, "77469")).toEqual({ price: 3.86, area: "Y44HO", label: "Houston average", week: WEEK });
  });
  it("falls back to the state, then the region, then the U.S.", () => {
    expect(pickPrice(rows, "75201").label).toBe("Texas average");
    expect(pickPrice(rows, "46201").label).toBe("Midwest average");
    expect(pickPrice(rows, "04101").label).toBe("New England average");
    expect(pickPrice(rows, "99501").label).toBe("U.S. average");
  });
  it("returns null with no data", () => {
    expect(pickPrice([], "77469")).toBe(null);
  });
});

describe("/api/gas", () => {
  beforeEach(() => _resetGasCache());

  const res = () => {
    const r = { headers: {}, code: 200, body: null };
    r.status = (c) => { r.code = c; return r; };
    r.json = (b) => { r.body = b; return r; };
    r.setHeader = (k, v) => { r.headers[k] = v; };
    return r;
  };

  it("caches the EIA answer for six hours", async () => {
    let calls = 0;
    const fetchImpl = async () => { calls++; return { ok: true, json: async () => ({ response: { data: rows } }) }; };
    await latestGasRows({ fetchImpl, now: 1000 });
    await latestGasRows({ fetchImpl, now: 1000 + 60 * 60 * 1000 });
    expect(calls).toBe(1);
    await latestGasRows({ fetchImpl, now: 1000 + 7 * 60 * 60 * 1000 });
    expect(calls).toBe(2);
  });

  it("rejects a bad ZIP without calling EIA", async () => {
    const r = res();
    await handler({ query: { zip: "77" } }, r);
    expect(r.code).toBe(400);
  });
});
