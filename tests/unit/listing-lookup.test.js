import { describe, it, expect } from "vitest";
import { lookupListing } from "../../server/lookup.mjs";

const VIN = "1HGCM82633A004352";
const res = (body, ok = true) => ({ ok, json: async () => body });

const mcListing = {
  id: "mc1", vin: VIN, price: 21500, miles: 40100, dom_active: 12,
  build: { year: 2021, make: "Honda", model: "CR-V", trim: "EX", body_type: "SUV" },
  dealer: { name: "Gillman Honda" },
};
const vpic = { Results: [{ ModelYear: "2003", Make: "HONDA", Model: "Accord", Trim: "EX", BodyClass: "Sedan" }] };

describe("lookupListing", () => {
  it("returns the live listing when MarketCheck has the VIN", async () => {
    const out = await lookupListing({ vin: VIN, key: "k", fetchImpl: async () => res({ listings: [mcListing] }) });
    expect(out.source).toBe("live");
    expect(out.listing).toMatchObject({ price: 21500, dealer: "Gillman Honda", vin: VIN });
  });

  it("falls back to a plain decode with no price for cars MarketCheck doesn't carry", async () => {
    const fetchImpl = async (url) => (String(url).includes("marketcheck") ? res({ listings: [] }) : res(vpic));
    const out = await lookupListing({ vin: VIN, key: "k", fetchImpl });
    expect(out.source).toBe("decoded");
    expect(out.car.vin).toBe(VIN);
    expect(out.car.year).toBeGreaterThan(1980);
    expect(out.car).not.toHaveProperty("price");
  });

  it("decodes without a MarketCheck key, and never sends one it doesn't have", async () => {
    const seen = [];
    const out = await lookupListing({ vin: VIN, key: "", fetchImpl: async (url) => { seen.push(String(url)); return res(vpic); } });
    expect(out.source).toBe("decoded");
    expect(seen.some((u) => u.includes("marketcheck"))).toBe(false);
  });

  it("refuses something that isn't a VIN without calling anyone", async () => {
    let called = false;
    const out = await lookupListing({ vin: "NOTAVIN", key: "k", fetchImpl: async () => { called = true; return res({}); } });
    expect(out.ok).toBe(false);
    expect(called).toBe(false);
  });
});
