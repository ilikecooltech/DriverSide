import { describe, it, expect } from "vitest";
import { isValidVin, extractVin, guessTitle, sourceFromLink, readPaste } from "../../src/data/vin.js";

/* Adding a car from any site starts with finding the VIN. A false
   positive (a random listing ID read as a VIN) would look up the wrong
   car, so the check digit is the guard. */

const HONDA = "1HGCM82633A004352"; // textbook valid VIN
const WITH_X = "1M8GDM9AXKP042788"; // check digit X

describe("isValidVin", () => {
  it("accepts real VINs, including an X check digit", () => {
    expect(isValidVin(HONDA)).toBe(true);
    expect(isValidVin(WITH_X)).toBe(true);
    expect(isValidVin(HONDA.toLowerCase())).toBe(true);
  });

  it("rejects a wrong check digit, banned letters and wrong lengths", () => {
    expect(isValidVin("1HGCM82643A004352")).toBe(false);
    expect(isValidVin("1HGCM8263OA004352")).toBe(false); // O is never in a VIN
    expect(isValidVin("1HGCM82633A00435")).toBe(false);
    expect(isValidVin("")).toBe(false);
  });
});

describe("extractVin", () => {
  it("finds the VIN inside a dealer listing link", () => {
    expect(extractVin(`https://www.gillmanhonda.com/used/Honda/2021-Honda-CR-V-${HONDA}.htm`)).toBe(HONDA);
    expect(extractVin(`https://dealer.example/vdp?vin=${HONDA.toLowerCase()}&x=1`)).toBe(HONDA);
  });

  it("does not mistake a 17-character listing ID for a VIN", () => {
    expect(extractVin("https://www.cars.com/vehicledetail/ABCDEFGH123456789/")).toBeNull();
  });

  it("returns null when there's nothing to find", () => {
    expect(extractVin("Check out this car")).toBeNull();
    expect(extractVin(null)).toBeNull();
  });
});

describe("guessTitle", () => {
  it("reads year, make and model from shared text", () => {
    expect(guessTitle("Check out this 2021 Honda CR-V EX on Autotrader https://x")).toEqual({ year: 2021, make: "Honda", model: "CR-V EX" });
  });
  it("stays quiet when there's no year", () => {
    expect(guessTitle("Honda CR-V")).toBeNull();
  });
});

describe("sourceFromLink", () => {
  it("names the marketplace", () => {
    expect(sourceFromLink("https://www.autotrader.com/cars-for-sale/vehicle/123")).toBe("AUTOTRADER");
    expect(sourceFromLink("look https://www.facebook.com/marketplace/item/9")).toBe("FB MARKETPLACE");
  });
  it("falls back to the host for a dealer site, and null for no link", () => {
    expect(sourceFromLink("https://www.gillmanhonda.com/used/x")).toBe("GILLMANHONDA.COM");
    expect(sourceFromLink("no link here")).toBeNull();
  });
});

describe("readPaste", () => {
  it("routes a VIN or a link with one to lookup", () => {
    expect(readPaste(HONDA)).toMatchObject({ kind: "vin", vin: HONDA, source: "VIN" });
    expect(readPaste(`https://www.carvana.com/vehicle/1?vin=${HONDA}`)).toMatchObject({ kind: "vin", source: "CARVANA" });
  });
  it("asks for the VIN when a link has none, keeping what it could read", () => {
    const r = readPaste("2022 Toyota RAV4 XLE https://www.autotrader.com/cars-for-sale/vehicle/7");
    expect(r.kind).toBe("no-vin");
    expect(r.source).toBe("AUTOTRADER");
    expect(r.guess).toMatchObject({ year: 2022, make: "Toyota" });
  });
  it("explains a VIN that's too short", () => {
    expect(readPaste("1HGCM82633A").kind).toBe("bad-vin");
  });
  it("does nothing on an empty paste", () => {
    expect(readPaste("  ").kind).toBe("empty");
  });
});
