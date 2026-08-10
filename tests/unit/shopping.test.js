import { describe, it, expect } from "vitest";
import {
  SHOP_PROFILES, profileFor, matchScore, valueLabel, defaultFilters,
  filterInventory, segmentMedian, toGarageItem, SAMPLE_INVENTORY, BODY_TYPES,
} from "../../src/data/shopping.js";
import { normalizeBody } from "../../api/shop.js";
import { IMPORTS, CONNECTORS, connectorName } from "../../src/data/connections.js";
import { ARCHETYPES } from "../../src/data/archetypes.js";

/* Shop is the first thing a buyer sees, so the recommendation has to be
   defensible: the goal picks the shape of the list, and the score has to
   be explainable in a sentence. */

describe("shop profiles", () => {
  it("covers every archetype the router can produce", () => {
    for (const key of Object.keys(ARCHETYPES)) {
      expect(SHOP_PROFILES[key], key).toBeTruthy();
    }
  });

  it("every profile is complete and internally sane", () => {
    for (const [key, p] of Object.entries(SHOP_PROFILES)) {
      expect(p.bodyTypes.length, key).toBeGreaterThan(0);
      for (const b of p.bodyTypes) expect(BODY_TYPES, key).toContain(b);
      expect(p.maxPrice, key).toBeGreaterThan(5000);
      expect(p.minYear, key).toBeGreaterThan(2010);
      expect(p.why, key).toBeTruthy();
    }
  });

  it("shops trucks for the work truck and vans/SUVs for the hauler", () => {
    expect(profileFor("worktruck").bodyTypes).toContain("Pickup");
    expect(profileFor("hauler").bodyTypes).toEqual(expect.arrayContaining(["SUV", "Minivan"]));
  });

  it("keeps Fresh Start's budget the tightest of all", () => {
    const others = Object.entries(SHOP_PROFILES)
      .filter(([k]) => k !== "freshstart")
      .map(([, p]) => p.maxPrice);
    expect(SHOP_PROFILES.freshstart.maxPrice).toBeLessThan(Math.min(...others));
  });

  it("falls back to a real profile for an unknown goal", () => {
    expect(profileFor(undefined).bodyTypes.length).toBeGreaterThan(0);
    expect(profileFor("nonsense").maxPrice).toBeGreaterThan(0);
  });
});

describe("matchScore", () => {
  const suv = { make: "Toyota", bodyType: "SUV", price: 30000 };
  const truck = { make: "Ford", bodyType: "Pickup", price: 30000 };
  const sedan = { make: "Toyota", bodyType: "Sedan", price: 20000 };

  it("stays within 0-100", () => {
    for (const p of Object.values(SHOP_PROFILES))
      for (const v of [suv, truck, sedan])
        for (const m of [null, 15000, 30000, 60000]) {
          const s = matchScore(v, p, m);
          expect(s).toBeGreaterThanOrEqual(0);
          expect(s).toBeLessThanOrEqual(100);
        }
  });

  it("ranks a family SUV over a pickup for the hauler", () => {
    const p = SHOP_PROFILES.hauler;
    expect(matchScore(suv, p, 30000)).toBeGreaterThan(matchScore(truck, p, 30000));
  });

  it("ranks a pickup over an SUV for the work truck", () => {
    const p = SHOP_PROFILES.worktruck;
    expect(matchScore(truck, p, 30000)).toBeGreaterThan(matchScore(suv, p, 30000));
  });

  it("rewards a car priced under the segment median", () => {
    const p = SHOP_PROFILES.commuter;
    const cheap = { ...sedan, price: 17000 };
    const dear = { ...sedan, price: 24000 };
    expect(matchScore(cheap, p, 20000)).toBeGreaterThan(matchScore(dear, p, 20000));
  });

  it("penalizes going over the goal's budget", () => {
    const p = SHOP_PROFILES.firstride;
    const under = { make: "Honda", bodyType: "Sedan", price: 18000 };
    const over = { make: "Honda", bodyType: "Sedan", price: 40000 };
    expect(matchScore(under, p, 20000)).toBeGreaterThan(matchScore(over, p, 20000));
  });

  it("gives reliable makes a lift, all else equal", () => {
    const p = SHOP_PROFILES.firstride;
    const toyota = { make: "Toyota", bodyType: "Sedan", price: 18000 };
    const other = { make: "Chrysler", bodyType: "Sedan", price: 18000 };
    expect(matchScore(toyota, p, 18000)).toBeGreaterThanOrEqual(matchScore(other, p, 18000));
  });

  it("is a whole number", () => {
    expect(Number.isInteger(matchScore(suv, SHOP_PROFILES.hauler, 29000))).toBe(true);
  });
});

describe("valueLabel", () => {
  it("calls out under-market with the dollar amount", () => {
    const v = valueLabel(28000, 30000);
    expect(v.tone).toBe("good");
    expect(v.text).toContain("$2,000");
  });

  it("warns on over-market", () => {
    expect(valueLabel(32000, 30000).tone).toBe("warn");
  });

  it("treats near-median as at market", () => {
    expect(valueLabel(30100, 30000).text).toBe("At market");
  });

  it("says so honestly when there is no median", () => {
    expect(valueLabel(30000, null).tone).toBe("neutral");
    expect(valueLabel(30000, null).text).not.toContain("$");
  });
});

describe("filters", () => {
  it("seeds from the goal and the buyer's setup", () => {
    const f = defaultFilters(SHOP_PROFILES.hauler, { zip: "78701", radius: 50 });
    expect(f.bodyType).toBe("SUV");
    expect(f.maxPrice).toBe(SHOP_PROFILES.hauler.maxPrice);
    expect(f.zip).toBe("78701");
    expect(f.radius).toBe(50);
  });

  it("falls back to a default ZIP when setup is empty", () => {
    expect(defaultFilters(SHOP_PROFILES.commuter, null).zip).toBe("77471");
  });

  it("filters inventory on every criterion", () => {
    const f = { bodyType: "Sedan", maxPrice: 20000, maxMiles: 70000, minYear: 2019 };
    const out = filterInventory(SAMPLE_INVENTORY, f);
    expect(out.length).toBeGreaterThan(0);
    for (const v of out) {
      expect(v.bodyType).toBe("Sedan");
      expect(v.price).toBeLessThanOrEqual(20000);
      expect(v.miles).toBeLessThanOrEqual(70000);
      expect(v.year).toBeGreaterThanOrEqual(2019);
    }
  });

  it("returns nothing rather than something wrong when filters are impossible", () => {
    expect(filterInventory(SAMPLE_INVENTORY, { bodyType: "Pickup", maxPrice: 5000, maxMiles: 10000, minYear: 2025 })).toHaveLength(0);
  });

  it("every sample vehicle uses a known body type", () => {
    for (const v of SAMPLE_INVENTORY) expect(BODY_TYPES).toContain(v.bodyType);
  });
});

describe("segmentMedian", () => {
  it("handles odd and even counts", () => {
    expect(segmentMedian([{ price: 1 }, { price: 3 }, { price: 5 }])).toBe(3);
    expect(segmentMedian([{ price: 10 }, { price: 20 }])).toBe(15);
  });

  it("returns null on an empty set instead of NaN", () => {
    expect(segmentMedian([])).toBeNull();
  });
});

describe("toGarageItem", () => {
  it("normalizes a shop result into the garage shape", () => {
    const g = toGarageItem({ year: 2021, make: "Mazda", model: "CX-5", trim: "Touring", price: 23450, miles: 31000, bodyType: "SUV" }, "SHOPPED");
    expect(g.title).toBe("2021 Mazda CX-5 Touring");
    expect(g.src).toBe("SHOPPED");
    expect(g.id).toBeTruthy();
  });

  it("builds a stable id so the same car can't be saved twice", () => {
    const v = { year: 2021, make: "Mazda", model: "CX-5", price: 23450 };
    expect(toGarageItem(v).id).toBe(toGarageItem(v).id);
  });

  it("survives a missing trim without a trailing space", () => {
    expect(toGarageItem({ year: 2021, make: "Subaru", model: "Outback", price: 26500 }).title).toBe("2021 Subaru Outback");
  });
});

describe("marketplace connections", () => {
  it("every connector has an import set", () => {
    for (const c of CONNECTORS) expect(IMPORTS[c.id], c.id).toBeTruthy();
  });

  it("imports normalize into valid garage items", () => {
    for (const [id, list] of Object.entries(IMPORTS))
      for (const v of list) {
        const g = toGarageItem(v, connectorName(id).toUpperCase());
        expect(g.title, id).toMatch(/^\d{4} /);
        expect(g.price, id).toBeGreaterThan(0);
      }
  });

  it("names a connector for its badge", () => {
    expect(connectorName("cargurus")).toBe("CarGurus");
  });
});

describe("body type normalization", () => {
  it("maps MarketCheck strings into our six buckets", () => {
    expect(normalizeBody("Crew Cab Pickup")).toBe("Pickup");
    expect(normalizeBody("Sport Utility Vehicle")).toBe("SUV");
    expect(normalizeBody("Passenger Van")).toBe("Minivan");
    expect(normalizeBody("4dr Hatchback")).toBe("Hatchback");
    expect(normalizeBody("Convertible")).toBe("Coupe");
    expect(normalizeBody("Sedan")).toBe("Sedan");
  });

  it("never returns undefined for junk input", () => {
    for (const junk of ["", null, undefined, "???"]) {
      expect(BODY_TYPES).toContain(normalizeBody(junk));
    }
  });
});
