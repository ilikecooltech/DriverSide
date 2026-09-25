import { describe, it, expect } from "vitest";
import { toOwnedItem, statsFor, mpgOf, fuelPerYear, compareChoices, statRows } from "../../src/data/owned.js";
import { applyPick, seedValues } from "../../src/components/Tools.jsx";

const stats = { ok: true, year: 2019, make: "Toyota", model: "Camry", trim: null, epaId: "40609", mpgCity: 29, mpgHwy: 41, mpgComb: 34,
  powertrain: "Gas", sizeClass: "Midsize Cars", drive: "Front-Wheel Drive", seats: 5, safety: { overall: 5, recalls: 6 },
  upkeep: { perYear: 530, known: true, age: 7 }, epaOptions: [{ text: "x", value: "1" }] };

describe("owned cars", () => {
  it("keeps only what we show", () => {
    const o = toOwnedItem(stats, { miles: "68000", milesPerYear: "15000" });
    expect(o).toMatchObject({ owned: true, title: "2019 Toyota Camry", miles: 68000, milesPerYear: 15000 });
    expect(o.id).toBe("own-2019-toyota-camry-40609");
    expect(o.stats.epaOptions).toBeUndefined();
    expect(o.stats.mpgComb).toBe(34);
  });

  it("uses listing mpg and seats until stats are looked up", () => {
    const car = { id: "x", title: "2022 Honda Accord", mpgCity: 30, mpgHwy: 38, seats: 5 };
    expect(statsFor(car)).toMatchObject({ mpgCity: 30, mpgHwy: 38, seats: 5 });
    expect(mpgOf(car)).toBe(33);
  });

  it("works out gas a year, and skips electric cars", () => {
    const o = toOwnedItem(stats);
    expect(fuelPerYear(o, 3.86, 12000)).toBe(Math.round((12000 / 34) * 3.86));
    expect(fuelPerYear({ stats: { mpgComb: 110, powertrain: "Electric" } }, 3.86)).toBe(null);
    expect(fuelPerYear(o, null)).toBe(null);
  });

  it("labels choices as yours or shopping, owned first", () => {
    const list = compareChoices([toOwnedItem(stats)], [{ id: "s1", title: "2024 Toyota Camry Hybrid", price: 31000, mpgCity: 51, mpgHwy: 53 }]);
    expect(list.map((c) => c.kind)).toEqual(["owned", "shopping"]);
    expect(list[0].label).toBe("Yours · 2019 Toyota Camry · 34 mpg");
    expect(list[1].label).toBe("Shopping · 2024 Toyota Camry Hybrid · 52 mpg");
  });

  it("builds the stats rows, leaving out what's missing", () => {
    const rows = statRows(toOwnedItem(stats), { gasPrice: 3.86, gasLabel: "Houston average" });
    const labels = rows.map((r) => r[0]);
    expect(labels).toEqual(["Fuel economy", "Gas a year", "Safety", "Recalls", "Repairs a year", "Seats", "Size", "Drive"]);
    expect(rows[1][2]).toContain("Houston average");
    expect(statRows({ title: "x" })).toEqual([]);
  });
});

describe("hybrid calculator picks", () => {
  it("fills mpg from the picked cars and the price gap between two shopping cars", () => {
    let v = seedValues({}, [], { price: 3.863, label: "Houston average" });
    expect(v.gasPrice).toBe("3.86");
    v = applyPick(v, "A", { id: "a", kind: "shopping", title: "2024 Toyota Camry LE", price: 27000, mpgCity: 28, mpgHwy: 39 });
    v = applyPick(v, "B", { id: "b", kind: "shopping", title: "2024 Toyota Camry Hybrid", price: 30500, mpgCity: 51, mpgHwy: 53 });
    expect(v).toMatchObject({ gasCity: "28", gasHwy: "39", hybCity: "51", hybHwy: "53", priceGap: "3500", nameA: "2024 Toyota Camry LE", nameB: "2024 Toyota Camry Hybrid" });
  });
  it("leaves the price gap for them when car 1 is theirs", () => {
    let v = seedValues({}, []);
    v = applyPick(v, "A", { id: "o", kind: "owned", title: "2019 Toyota Camry", mpgCity: 29, mpgHwy: 41, milesPerYear: 15000 });
    expect(v.miles).toBe("15000");
    v = applyPick(v, "B", { id: "b", kind: "shopping", title: "2024 Toyota Camry Hybrid", price: 30500, mpgCity: 51, mpgHwy: 53 });
    expect(v.priceGap).toBe("");
    expect(v.kindA).toBe("owned");
  });
});
