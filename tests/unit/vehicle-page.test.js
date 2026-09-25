import { describe, it, expect } from "vitest";
import { toListing, cachedPhotos, listingUrl } from "../../server/listing.mjs";
import { toGarageItem } from "../../src/data/shopping.js";
import { leverageFor, outTheDoor, peersFor } from "../../src/components/VehicleDetail.jsx";

const MC = "https://mc-api.marketcheck.com/v2/image/cache/car/ABC";

describe("listing shape for the vehicle page", () => {
  it("returns every cached photo, deduped, with the api_key stripped", () => {
    const photos = cachedPhotos({
      media: { photo_links_cached: [`${MC}/1?api_key=SECRET`, `${MC}/1?api_key=SECRET`, `${MC}/2`, "https://evil.example/x.jpg", "http://mc-api.marketcheck.com/v2/image/cache/car/ABC/3"] },
    });
    expect(photos).toHaveLength(2);
    for (const p of photos) {
      expect(p.startsWith("/api/photo?src=")).toBe(true);
      expect(p).not.toContain("SECRET");
    }
  });

  it("caps the gallery", () => {
    const many = Array.from({ length: 60 }, (_, i) => `${MC}/${i}`);
    expect(cachedPhotos({ media: { photo_links_cached: many } })).toHaveLength(30);
  });

  it("only links out to http(s) listing pages", () => {
    expect(listingUrl("https://www.carmax.com/car/29145941")).toBe("https://www.carmax.com/car/29145941");
    expect(listingUrl("javascript:alert(1)")).toBeNull();
    expect(listingUrl("")).toBeNull();
  });

  it("maps specs and dealer details, and leaves missing ones null", () => {
    const l = toListing({
      id: "x", vin: "5J6RT6H81NL030216", price: 35298, miles: 29480, dom_active: 6, dist: 4.48,
      exterior_color: "White", vdp_url: "https://www.carmax.com/car/29145941",
      build: { year: 2022, make: "Honda", model: "CR-V", trim: "EX-L", body_type: "SUV", engine: "2.0L I4", city_mpg: 40, highway_mpg: 35 },
      dealer: { name: "Carmax Fort Bend", city: "Richmond", state: "TX" },
      media: { photo_links_cached: [`${MC}/1`, `${MC}/2`] },
    });
    expect(l.photos).toHaveLength(2);
    expect(l.image).toBe(l.photos[0]);
    expect(l.mpgCity).toBe(40);
    expect(l.dealerCity).toBe("Richmond");
    expect(l.interior).toBeNull();
    expect(l.seats).toBeNull();
  });

  it("a saved car keeps its detail fields in the Garage", () => {
    const g = toGarageItem({ year: 2022, make: "Honda", model: "CR-V", price: 1, photos: ["/a", "/b"], vin: "V", url: null });
    expect(g.photos).toEqual(["/a", "/b"]);
    expect(g.vin).toBe("V");
    expect("url" in g).toBe(false);
  });
});

describe("vehicle page math", () => {
  const car = { id: "a", year: 2021, make: "Honda", model: "CR-V", trim: "EX", price: 20888, miles: 100994, bodyType: "SUV", days: 15, dealer: "Gillman" };

  it("finds a same-model car with fewer miles for the same money", () => {
    const peers = [{ id: "b", year: 2021, make: "Honda", model: "CR-V", trim: "EX", price: 20900, miles: 57700, dealer: "Az Auto Sale" },
                   { id: "c", year: 2021, make: "Honda", model: "CR-V", trim: "EX", price: 20500, miles: 57700, dealer: "Cheaper Lot" }];
    const lev = leverageFor(car, peers, 21000);
    expect(lev[0]).toContain("Cheaper Lot");
    expect(lev[0]).toContain("$388 less");
  });

  it("counts a same-price car with far fewer miles", () => {
    const lev = leverageFor(car, [{ id: "b", year: 2021, make: "Honda", model: "CR-V", trim: "EX", price: 20900, miles: 57700, dealer: "Az Auto Sale" }], null);
    expect(lev[0]).toContain("Az Auto Sale");
    expect(lev[0]).toContain("43k fewer miles for about the same price");
  });

  it("ignores a car that costs meaningfully more", () => {
    expect(leverageFor(car, [{ id: "b", make: "Honda", model: "CR-V", price: 22000, miles: 30000, dealer: "X" }], null)).toEqual([]);
  });

  it("says nothing it can't back up", () => {
    expect(leverageFor({ ...car, days: 3 }, [], null)).toEqual([]);
  });

  it("flags cars that have sat 45+ days", () => {
    expect(leverageFor({ ...car, days: 60 }, [], null).join(" ")).toContain("60 days");
  });

  it("adds 6.25% tax only for Texas ZIPs", () => {
    expect(outTheDoor(20000, "77469")).toEqual({ tx: true, tax: 1250, floor: 21250 });
    expect(outTheDoor(20000, "10001")).toEqual({ tx: false, tax: null, floor: 20000 });
  });

  it("prices against same-model cars when there are enough of them", () => {
    const same = Array.from({ length: 4 }, (_, i) => ({ id: `s${i}`, make: "Honda", model: "CR-V", bodyType: "SUV", price: 20000 + i }));
    const other = [{ id: "o", make: "Kia", model: "Sorento", bodyType: "SUV", price: 30000 }];
    expect(peersFor(car, [...same, other]).peers).toHaveLength(4);
    expect(peersFor(car, [same[0], ...other]).peers).toHaveLength(2);
  });
});
