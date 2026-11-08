import { describe, it, expect } from "vitest";
import { dropDemoImports, isDemoImport } from "../../src/data/connections.js";

describe("dropDemoImports", () => {
  it("removes the sample cars the old Connect buttons added", () => {
    const cars = [
      { id: "2023-Honda-CR-V-31987", src: "AUTOTRADER" },
      { id: "2019-Toyota-Camry-18400", src: "FB MARKETPLACE" },
      { id: "mc-123", src: "SHOPPED" },
    ];
    expect(dropDemoImports(cars)).toEqual([{ id: "mc-123", src: "SHOPPED" }]);
  });

  it("keeps a real car from the same site, and the same car added another way", () => {
    expect(isDemoImport({ id: "vin-1HGCM82633A004352", src: "AUTOTRADER" })).toBe(false);
    expect(isDemoImport({ id: "2023-Honda-CR-V-31987", src: "ADDED BY HAND" })).toBe(false);
  });

  it("handles nothing saved", () => {
    expect(dropDemoImports(undefined)).toEqual([]);
  });
});
