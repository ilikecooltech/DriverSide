import { describe, it, expect } from "vitest";
import { JOURNEY_DOORS, resumeSummary, statsFromShop } from "../../src/data/start.js";

/* The Start screen makes two promises the rest of the app has to keep:
   every door goes straight in with no account step, and every number on
   the screen is one we can actually source. Both are pinned here. */

describe("the five doors", () => {
  it("offers exactly the five journeys, dealer first", () => {
    expect(JOURNEY_DOORS).toHaveLength(5);
    expect(JOURNEY_DOORS[0].key).toBe("dealer");
    expect(JOURNEY_DOORS[0].urgent).toBe(true);
  });

  it("marks only the dealer door urgent", () => {
    expect(JOURNEY_DOORS.filter((d) => d.urgent).map((d) => d.key)).toEqual(["dealer"]);
  });

  it("gives every door a real destination", () => {
    for (const d of JOURNEY_DOORS) {
      expect(d.dest?.tab, `"${d.key}" has no destination`).toBeTruthy();
      expect(d.title && d.blurb && d.cta).toBeTruthy();
    }
  });

  it("needs a goal for Shop and nothing else", () => {
    // Shop ranks against an archetype. Every other door must skip
    // onboarding, or the doors become a funnel — the thing this screen
    // exists to remove.
    expect(JOURNEY_DOORS.filter((d) => d.dest.needsGoal).map((d) => d.key)).toEqual(["shop"]);
  });

  it("has unique keys and no duplicate calls to action", () => {
    expect(new Set(JOURNEY_DOORS.map((d) => d.key)).size).toBe(5);
    expect(new Set(JOURNEY_DOORS.map((d) => d.cta)).size).toBe(5);
  });

  it("never re-introduces the duplicate guest CTA", () => {
    // The old landing shipped "SKIP FOR NOW" and "continue as guest" as
    // two buttons for one door. No door copy may say either again.
    const copy = JOURNEY_DOORS.map((d) => `${d.title} ${d.blurb} ${d.cta}`).join(" ").toLowerCase();
    expect(copy).not.toContain("skip for now");
    expect(copy).not.toContain("as guest");
  });
});

describe("resumeSummary", () => {
  const car = { title: "2021 Dodge Challenger GT" };

  it("is null on a first visit, so the card stays hidden", () => {
    expect(resumeSummary({})).toBeNull();
    expect(resumeSummary({ cars: [], archetypeName: null })).toBeNull();
    expect(resumeSummary()).toBeNull();
  });

  it("leads with the saved car and sends them to the Garage", () => {
    const r = resumeSummary({ cars: [car], archetypeName: "Family Hauler" });
    expect(r.title).toBe("2021 Dodge Challenger GT");
    expect(r.line).toContain("Family Hauler");
    expect(r.dest.tab).toBe("garage");
  });

  it("counts the other saved cars, pluralized", () => {
    expect(resumeSummary({ cars: [car, car] }).line).toContain("1 other car saved");
    expect(resumeSummary({ cars: [car, car, car] }).line).toContain("2 other cars saved");
  });

  it("falls back to the goal when nothing is saved yet", () => {
    const r = resumeSummary({ cars: [], archetypeName: "Fresh Start" });
    expect(r.title).toContain("Fresh Start");
    expect(r.dest.tab).toBe("shop");
  });

  it("builds a title from parts when a car has no title", () => {
    const r = resumeSummary({ cars: [{ year: 2020, make: "Ford", model: "F-150" }] });
    expect(r.title).toBe("2020 Ford F-150");
  });

  it("promises nothing it cannot source", () => {
    // The mockup shows "Down $510 since Tuesday". Price-drop history is
    // Phase 5 and does not exist yet, so no dollar figure or date may
    // appear here until it does.
    const r = resumeSummary({ cars: [car], archetypeName: "Family Hauler" });
    const all = `${r.title} ${r.line}`;
    expect(all).not.toMatch(/\$\d/);
    expect(all).not.toMatch(/since|yesterday|tuesday|week/i);
  });
});

describe("statsFromShop", () => {
  const listings = (days) => days.map((d, i) => ({ id: i, days: d }));

  it("reports live inventory and average lot age from real data", () => {
    const t = statsFromShop({ source: "live", count: 1240, listings: listings([10, 20, 30]) });
    expect(t.map((x) => x.key)).toEqual(["cars", "age"]);
    expect(t[0].value).toBe("1,240");
    expect(t[1].value).toBe("20 days");
  });

  it("shows nothing at all when the data is not live", () => {
    // Sample inventory is not a market measurement, so it earns no tiles.
    expect(statsFromShop({ source: "sample", count: 18, listings: listings([10, 20, 30]) })).toEqual([]);
    expect(statsFromShop({ source: "none", listings: [] })).toEqual([]);
  });

  it("drops the age tile rather than average one or two listings", () => {
    const t = statsFromShop({ source: "live", count: 40, listings: listings([12]) });
    expect(t.map((x) => x.key)).toEqual(["cars"]);
  });

  it("never invents a stat it has no source for", () => {
    // The mockup's "$1,410 avg junk found per decoded sheet" is a
    // population claim with no data behind it. It must not appear.
    const all = JSON.stringify(statsFromShop({ source: "live", count: 900, listings: listings([30, 40, 50]) }));
    expect(all).not.toContain("JUNK");
    expect(all).not.toContain("1,410");
  });

  it("survives junk without throwing", () => {
    for (const bad of [null, undefined, {}, { listings: "nope" }, { source: "live", count: NaN, listings: [] }]) {
      expect(Array.isArray(statsFromShop(bad))).toBe(true);
    }
  });
});
