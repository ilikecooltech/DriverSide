import { describe, it, expect } from "vitest";
import { menuItems, bestModel, fromEpa, fromSafety, powertrainOf, upkeepEstimate, fromVin, vehicleStats } from "../../server/vehicleStats.mjs";

describe("EPA menus and model matching", () => {
  it("handles one item or many", () => {
    expect(menuItems({ menuItem: { text: "Camry", value: "Camry" } })).toEqual([{ text: "Camry", value: "Camry" }]);
    expect(menuItems({ menuItem: [{ text: "A", value: 1 }, { text: "B", value: 2 }] })).toHaveLength(2);
    expect(menuItems(null)).toEqual([]);
  });

  const models = ["Camry", "Camry Hybrid LE", "Camry Hybrid XLE/SE", "RAV4", "RAV4 AWD", "RAV4 Hybrid AWD"].map((t) => ({ text: t, value: t }));
  it("prefers the exact model, and the hybrid when the trim says so", () => {
    expect(bestModel(models, "Camry")).toBe("Camry");
    expect(bestModel(models, "Camry", "Hybrid LE")).toBe("Camry Hybrid LE");
    expect(bestModel(models, "RAV4", "Hybrid XLE")).toBe("RAV4 Hybrid AWD");
    expect(bestModel(models, "Corolla")).toBe(null);
  });
});

describe("normalizing sources", () => {
  const camry = { id: 40609, city08: "29", highway08: "41", comb08: "34", fuelType1: "Regular Gasoline", atvType: "", VClass: "Midsize Cars", drive: "Front-Wheel Drive", trany: "Automatic (S8)", cylinders: "4", displ: "2.5", range: "0", fuelCost08: "1900" };
  it("reads EPA fields", () => {
    expect(fromEpa(camry)).toMatchObject({ epaId: "40609", mpgCity: 29, mpgHwy: 41, mpgComb: 34, powertrain: "Gas", sizeClass: "Midsize Cars", engine: "4 cyl, 2.5 L, Automatic (S8)", evRange: null });
  });
  it("names the powertrain", () => {
    expect(powertrainOf({ atvType: "Hybrid" })).toBe("Hybrid");
    expect(powertrainOf({ atvType: "Plug-in Hybrid" })).toBe("Plug-in hybrid");
    expect(powertrainOf({ atvType: "EV" })).toBe("Electric");
    expect(powertrainOf({ atvType: "Diesel" })).toBe("Diesel");
  });
  it("reads NHTSA ratings and ignores 'Not Rated'", () => {
    expect(fromSafety({ OverallRating: "5", OverallFrontCrashRating: "4", OverallSideCrashRating: "Not Rated", RolloverRating: "4", RecallsCount: 6, ComplaintsCount: 395 }))
      .toMatchObject({ overall: 5, front: 4, side: null, rollover: 4, recalls: 6, complaints: 395 });
  });
  it("reads a VIN decode", () => {
    expect(fromVin({ ModelYear: "2020", Make: "HONDA", Model: "Accord", Trim: "Sport", Seats: "5", ErrorCode: "0" }))
      .toMatchObject({ year: 2020, make: "Honda", model: "Accord", trim: "Sport", seats: 5, error: null });
  });
});

describe("repair estimate", () => {
  it("uses the brand average and scales for age", () => {
    expect(upkeepEstimate("Toyota", 2024, 2026)).toMatchObject({ perYear: 440, known: true });
    expect(upkeepEstimate("Toyota", 2016, 2026).perYear).toBe(Math.round((441 * 1.42) / 10) * 10);
    expect(upkeepEstimate("BMW", 1995, 2026).perYear).toBe(Math.round((968 * 1.6) / 10) * 10);
    expect(upkeepEstimate("Rivian", 2025, 2026)).toMatchObject({ perYear: 650, known: false });
  });
});

describe("vehicleStats", () => {
  const routes = {
    "menu/model": { menuItem: [{ text: "Camry", value: "Camry" }, { text: "Camry Hybrid LE", value: "Camry Hybrid LE" }] },
    "menu/options": { menuItem: [{ text: "Auto (S8), 6 cyl, 3.5 L", value: "40606" }, { text: "Auto (S8), 4 cyl, 2.5 L", value: "40609" }] },
    "vehicle/40606": { id: 40606, city08: 22, highway08: 32, comb08: 26, VClass: "Midsize Cars", drive: "Front-Wheel Drive", atvType: "" },
    "modelyear/2019": { Results: [{ VehicleId: 13200, VehicleDescription: "2019 Toyota Camry 4 DR FWD" }] },
    "VehicleId/13200": { Results: [{ OverallRating: "5", RecallsCount: 6, ComplaintsCount: 395 }] },
  };
  const fetchImpl = async (url) => {
    const key = Object.keys(routes).find((k) => url.includes(k));
    if (!key) return { ok: false, status: 404, json: async () => ({}) };
    return { ok: true, json: async () => routes[key] };
  };

  it("combines EPA, NHTSA and the repair estimate", async () => {
    const s = await vehicleStats({ year: "2019", make: "Toyota", model: "Camry" }, { fetchImpl, marketKey: "", nowYear: 2026 });
    expect(s).toMatchObject({ ok: true, year: 2019, mpgComb: 26, sizeClass: "Midsize Cars", seats: null, epaModel: "Camry" });
    expect(s.safety).toMatchObject({ overall: 5, recalls: 6 });
    expect(s.upkeep.perYear).toBeGreaterThan(441);
    expect(s.epaOptions).toHaveLength(2);
    expect(s.missing).toEqual(["seats"]);
  });

  it("keeps going when a source fails", async () => {
    const s = await vehicleStats({ year: 2019, make: "Toyota", model: "Camry" }, { fetchImpl: async () => { throw new Error("down"); }, marketKey: "", nowYear: 2026 });
    expect(s.ok).toBe(true);
    expect(s.missing).toEqual(["mpg", "safety", "seats"]);
    expect(s.upkeep.perYear).toBeGreaterThan(0);
  });

  it("asks for year, make and model when it has neither those nor a VIN", async () => {
    expect((await vehicleStats({ make: "Toyota" }, { fetchImpl })).ok).toBe(false);
  });
});

describe("NHTSA model names", () => {
  it("tries the EPA name, then shorter", async () => {
    const { modelCandidates } = await import("../../server/vehicleStats.mjs");
    expect(modelCandidates("RAV4 Hybrid AWD")).toEqual(["RAV4 Hybrid AWD", "RAV4 Hybrid", "RAV4"]);
    expect(modelCandidates("Camry")).toEqual(["Camry"]);
  });
});
