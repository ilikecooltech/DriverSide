import { describe, it, expect } from "vitest";
import { buildDeal, parseVehicle, MOCK_DEAL, TX_TAX } from "../../src/data/decode.js";

/* The deal engine is the product. Every verdict a buyer acts on comes
   from buildDeal(), so its math is tested harder than anything else. */

const base = {
  vehicle: "2022 Toyota RAV4 XLE",
  asking: 28000,
  docFee: 200,
  titleReg: 108,
  taxCharged: 1750,
  tradeOffer: 0,
  tradePayoff: 0,
  addons: [],
};

const flagNames = (d) => d.linesFlag.map((l) => l.name);
const checkNames = (d) => d.linesCheck.map((l) => l.name);
const fairNames = (d) => d.fairRows.map((r) => r.name);

describe("TX sales tax", () => {
  it("taxes price minus trade, not full price", () => {
    const d = buildDeal({ ...base, asking: 31987, tradeOffer: 9200, taxCharged: 1424 });
    expect(d.expectedTax).toBe(1424); // 6.25% of 22,787
    expect(d.taxError).toBe(0);
  });

  it("flags an overcharge with the exact delta", () => {
    const d = buildDeal({ ...base, asking: 31987, tradeOffer: 9200, taxCharged: 1806 });
    expect(d.taxError).toBe(382);
    expect(flagNames(d)).toContain("Sales tax (6.25% TX)");
    const line = d.linesFlag.find((l) => l.name.startsWith("Sales tax"));
    expect(line.short).toContain("$382");
    expect(line.why).toContain("$1,424");
  });

  it("treats correct tax as FAIR, never FLAG", () => {
    const d = buildDeal({ ...base, asking: 27995, taxCharged: 1750 });
    expect(d.taxError).toBe(0);
    expect(flagNames(d).some((n) => n.startsWith("Sales tax"))).toBe(false);
    expect(fairNames(d).some((n) => n.startsWith("Sales tax"))).toBe(true);
  });

  it("tolerates rounding under $25 rather than crying wolf", () => {
    const d = buildDeal({ ...base, asking: 27995, taxCharged: 1770 }); // $20 over
    expect(flagNames(d).some((n) => n.startsWith("Sales tax"))).toBe(false);
  });

  it("never reports a negative tax error when the dealer undercharges", () => {
    const d = buildDeal({ ...base, asking: 27995, taxCharged: 900 });
    expect(d.taxError).toBe(0);
  });

  it("omits the tax row entirely when the buyer skipped the field", () => {
    const d = buildDeal({ ...base, taxCharged: 0 });
    expect(d.taxError).toBe(0);
    expect(fairNames(d).some((n) => n.startsWith("Sales tax"))).toBe(false);
    expect(flagNames(d).some((n) => n.startsWith("Sales tax"))).toBe(false);
  });

  it("uses the documented TX rate", () => {
    expect(TX_TAX).toBe(0.0625);
  });
});

describe("add-ons", () => {
  it("sums junk into the leverage number and flags each line", () => {
    const d = buildDeal({
      ...base,
      addons: [
        { name: "Dealer prep", amt: 395 },
        { name: "Nitrogen tires", amt: 299 },
      ],
    });
    expect(d.junkTotal).toBe(694);
    expect(flagNames(d)).toEqual(expect.arrayContaining(["Dealer prep", "Nitrogen tires"]));
  });

  it("drops zero and blank add-ons instead of listing $0 lines", () => {
    const d = buildDeal({ ...base, addons: [{ name: "Prep", amt: 0 }, { name: "Etch", amt: "" }] });
    expect(d.junkTotal).toBe(0);
    expect(d.linesFlag).toHaveLength(0);
  });
});

describe("doc fee", () => {
  it("pushes on a doc fee above the TX typical range", () => {
    const d = buildDeal({ ...base, docFee: 499 });
    expect(checkNames(d)).toContain("Doc fee");
  });

  it("leaves a reasonable doc fee alone", () => {
    const d = buildDeal({ ...base, docFee: 150 });
    expect(checkNames(d)).not.toContain("Doc fee");
  });
});

describe("trade and negative equity", () => {
  it("computes the gap rolled into the new loan", () => {
    const d = buildDeal({ ...base, tradeOffer: 9200, tradePayoff: 12100 });
    expect(d.negEq).toBe(2900);
  });

  it("reports no negative equity when there is equity", () => {
    const d = buildDeal({ ...base, tradeOffer: 12000, tradePayoff: 9000 });
    expect(d.negEq).toBe(0);
  });

  it("reports no negative equity when there is no trade at all", () => {
    const d = buildDeal({ ...base, tradeOffer: 0, tradePayoff: 0 });
    expect(d.negEq).toBe(0);
  });

  it("does not invent negative equity from a payoff with no trade offer", () => {
    // Buyer still owes on a car they are NOT trading in. Nothing gets
    // rolled into this loan, so the decode must not claim it does.
    const d = buildDeal({ ...base, tradeOffer: 0, tradePayoff: 12100 });
    expect(d.negEq).toBe(0);
  });
});

describe("amount financed", () => {
  it("uses corrected tax, not the dealer's wrong number", () => {
    const d = buildDeal({
      ...base, asking: 31987, docFee: 499, titleReg: 108,
      taxCharged: 1806, tradeOffer: 9200, tradePayoff: 12100,
    });
    // 31,987 + 499 + 108 + 1,424 (corrected) + 2,900 (neg equity)
    expect(d.principal).toBe(36918);
  });
});

describe("spread and clean fees", () => {
  it("clean fees exclude junk", () => {
    const d = buildDeal({ ...base, docFee: 499, titleReg: 108, addons: [{ name: "Prep", amt: 395 }] });
    expect(d.cleanFees).toBe(607);
  });

  it("baseSpread anchors to the original quote", () => {
    const d = buildDeal({ ...base, asking: 31987, tradeOffer: 9200 });
    expect(d.baseSpread).toBe(22787);
  });
});

describe("parseVehicle", () => {
  it("parses a simple vehicle", () => {
    expect(parseVehicle("2022 Toyota RAV4 XLE")).toEqual({
      year: "2022", make: "Toyota", model: "RAV4", trim: "XLE",
    });
  });

  it("handles a missing trim", () => {
    expect(parseVehicle("2021 Subaru Outback")).toEqual({
      year: "2021", make: "Subaru", model: "Outback", trim: "",
    });
  });

  it("returns null on junk rather than guessing", () => {
    expect(parseVehicle("my car")).toBeNull();
    expect(parseVehicle("")).toBeNull();
  });

  it("keeps multi-word models together in the trim overflow", () => {
    // "Jeep Grand Cherokee Limited" — free text can't know Grand Cherokee
    // is the model. This is exactly why manual entry uses structured
    // fields; the parser must at least not corrupt make.
    const p = parseVehicle("2022 Jeep Grand Cherokee Limited");
    expect(p.make).toBe("Jeep");
    expect(p.year).toBe("2022");
  });
});

describe("structured query wins over free text", () => {
  it("uses the explicit query when provided", () => {
    const d = buildDeal({
      ...base,
      vehicle: "2022 Jeep Grand Cherokee Limited",
      query: { year: "2022", make: "Jeep", model: "Grand Cherokee", trim: "Limited" },
    });
    expect(d.query.model).toBe("Grand Cherokee");
  });

  it("falls back to parsing when no query is given", () => {
    const d = buildDeal({ ...base, vehicle: "2021 Subaru Outback" });
    expect(d.query.make).toBe("Subaru");
  });
});

describe("MOCK_DEAL demo fixture", () => {
  it("carries the deliberate $382 tax error that demos the product", () => {
    expect(MOCK_DEAL.taxError).toBe(382);
    expect(MOCK_DEAL.expectedTax).toBe(1424);
  });

  it("totals $1,792 of removable add-ons", () => {
    expect(MOCK_DEAL.junkTotal).toBe(1792);
  });

  it("rolls $2,900 of negative equity", () => {
    expect(MOCK_DEAL.negEq).toBe(2900);
  });

  it("finances $36,918", () => {
    expect(MOCK_DEAL.principal).toBe(36918);
  });
});
