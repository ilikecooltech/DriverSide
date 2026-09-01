import { describe, it, expect } from "vitest";
import {
  PRICING, activePriceCents, guaranteeCents, dollars,
  FREE_FOREVER, PASS_GATED, requiresPass, FREE_FOREVER_COPY,
  valueReceipt, totalInterest,
  batchOf, isWellFormedCode, activationTag, isComped, passLabel,
  canGift, canRefund, MAX_GIFT_DEPTH,
} from "../../src/data/pass.js";
import { issueCode, validateCode } from "../../api/pass.js";

/* The paywall's promise is a product claim with a testable shape: the
   truth is free, the words are paid, comps never look or count like
   sales, and codes cannot be guessed or reused. */

describe("pricing", () => {
  it("charges the founding price while it is active, with list struck", () => {
    expect(PRICING.foundingActive).toBe(true);
    expect(activePriceCents()).toBe(PRICING.foundingCents);
    expect(PRICING.foundingCents).toBeLessThan(PRICING.listCents);
  });

  it("promises $290 — pinned to list, so founding buyers over-collect", () => {
    // $290 is 10x the $29 list price. The founding cohort pays $19 and is
    // still owed $290, which is the generous reading and the one the
    // spec asks for.
    expect(dollars(guaranteeCents())).toBe("$290");
    expect(guaranteeCents()).toBe(PRICING.listCents * PRICING.guaranteeMultiple);
    expect(guaranteeCents()).toBeGreaterThan(activePriceCents() * PRICING.guaranteeMultiple);
  });
});

describe("the free/paid boundary", () => {
  it("keeps every truth surface free", () => {
    for (const cap of ["decode", "verdicts", "market", "table", "walkAway", "firstScript", "finance", "shop", "garage"]) {
      expect(requiresPass(cap), `"${cap}" must stay free`).toBe(false);
    }
  });

  it("gates only the words", () => {
    for (const cap of ["scriptLibrary", "liveCounters", "suggestedCounter", "practice", "walkOutKit", "dealFileExport"]) {
      expect(requiresPass(cap), `"${cap}" should be paid`).toBe(true);
    }
  });

  it("never lists the same capability on both sides", () => {
    expect(FREE_FOREVER.filter((c) => PASS_GATED.includes(c))).toEqual([]);
  });

  it("treats anything unlisted as free", () => {
    // "The truth is free" is the default, so a new surface has to opt in
    // to being paid rather than accidentally landing there.
    expect(requiresPass("somethingNew")).toBe(false);
    expect(requiresPass(undefined)).toBe(false);
  });

  it("prints the boundary inside the paywall", () => {
    expect(FREE_FOREVER_COPY).toMatch(/buys words, never the truth/);
  });
});

describe("valueReceipt", () => {
  const deal = {
    junkTotal: 1100, taxError: 74, asking: 31987, principal: 25000,
    apr: 11.4, preApproval: { apr: 7.2, term: 60 },
  };

  it("adds up what was found for free", () => {
    const r = valueReceipt(deal, 30000);
    expect(r.rows.map((x) => x.key)).toEqual(["junk", "market", "rate"]);
    expect(r.rows[0].amount).toBe(1174);      // add-ons + tax error
    expect(r.rows[1].amount).toBe(1987);      // ask over market
    expect(r.total).toBe(r.rows.reduce((s, x) => s + x.amount, 0));
  });

  it("omits a line it cannot substantiate rather than showing zero", () => {
    // Priced at or under market => no "above market" row at all.
    const r = valueReceipt({ ...deal, asking: 29000 }, 30000);
    expect(r.rows.map((x) => x.key)).not.toContain("market");
  });

  it("omits the rate line when their rate is not worse", () => {
    const r = valueReceipt({ ...deal, apr: 6.0 }, 30000);
    expect(r.rows.map((x) => x.key)).not.toContain("rate");
  });

  it("survives a missing deal or median", () => {
    expect(valueReceipt(null, null).total).toBe(0);
    expect(valueReceipt(undefined, 30000).rows).toEqual([]);
    expect(valueReceipt({}, undefined).total).toBe(0);
  });

  it("computes interest the standard way", () => {
    // $25k at 7.2% over 60 months is a shade over $4.8k of interest.
    const i = totalInterest(25000, 7.2, 60);
    expect(i).toBeGreaterThan(4700);
    expect(i).toBeLessThan(5100);
    expect(totalInterest(0, 7.2, 60)).toBe(0);
    expect(totalInterest(25000, 7.2, 0)).toBe(0);
  });
});

describe("activation tags", () => {
  it("separates paid from comped", () => {
    expect(activationTag({ kind: "paid" })).toBe("paid_founding");
    expect(activationTag({ kind: "comped", batch: "FOUNDER" })).toBe("comped_founder");
    expect(isComped("comped_founder")).toBe(true);
    expect(isComped("paid_founding")).toBe(false);
  });

  it("never lets a comped pass wear the paid label", () => {
    const paid = { active: true, tag: "paid_founding" };
    const comped = { active: true, tag: "comped_founder" };
    expect(passLabel(paid)).toBe("DEAL PASS ACTIVE — THIS DEAL");
    expect(passLabel(comped)).toBe("DEAL PASS ACTIVE — COMPED · FOUNDER BATCH");
    expect(passLabel(comped)).not.toBe(passLabel(paid));
  });
});

describe("gifting and refunds", () => {
  const paid = { active: true, tag: "paid_founding", depth: 0 };

  it("gives every activated pass exactly one to give", () => {
    expect(canGift(paid)).toBe(true);
    expect(canGift({ ...paid, giftedAt: Date.now() })).toBe(false);
  });

  it("caps the chain so comps cannot tree out forever", () => {
    expect(canGift({ ...paid, depth: MAX_GIFT_DEPTH - 1 })).toBe(true);
    expect(canGift({ ...paid, depth: MAX_GIFT_DEPTH })).toBe(false);
  });

  it("lets a comped pass gift too — the loop is the point", () => {
    expect(canGift({ active: true, tag: "comped_founder", depth: 1 })).toBe(true);
  });

  it("offers no refund while the guarantee is held", () => {
    // The $290 promise is built but deliberately unsurfaced. Offering the
    // refund without stating the guarantee would advertise a promise we
    // chose not to make.
    expect(PRICING.guaranteeActive).toBe(false);
    expect(canRefund(paid)).toBe(false);
  });

  it("refunds only what was actually paid for, once the promise is live", () => {
    PRICING.guaranteeActive = true;
    try {
      expect(canRefund(paid)).toBe(true);
      expect(canRefund({ active: true, tag: "comped_founder" })).toBe(false);
      expect(canRefund({ ...paid, refundedAt: Date.now() })).toBe(false);
      expect(canRefund(null)).toBe(false);
    } finally {
      PRICING.guaranteeActive = false;
    }
  });
});

describe("promo codes", () => {
  it("recognises only the issued batches", () => {
    expect(batchOf("FOUNDER-AB12CD-XYZW")).toBe("FOUNDER");
    expect(batchOf("GIFT-AB12CD-XYZW")).toBe("GIFT");
    expect(batchOf("HACKER-AB12CD-XYZW")).toBeNull();
    expect(batchOf("")).toBeNull();
  });

  it("validates a code the server actually issued", () => {
    for (const batch of ["FOUNDER", "CREATOR", "PARTNER", "MAKEGOOD", "GIFT"]) {
      const code = issueCode(batch);
      expect(isWellFormedCode(code), `${code} malformed`).toBe(true);
      const v = validateCode(code);
      expect(v.ok, `${code} should validate`).toBe(true);
      expect(v.batch).toBe(batch);
    }
  });

  it("rejects codes nobody issued, however well-formed", () => {
    // This is the whole security property: shape is not enough.
    expect(validateCode("FOUNDER-AAAAAA-AAAA").ok).toBe(false);
    expect(validateCode("FOUNDER-ZZZZZZ-ZZZZ").ok).toBe(false);
    expect(validateCode("").ok).toBe(false);
    expect(validateCode("nonsense").ok).toBe(false);
  });

  it("has no evergreen codes — every batch expires", () => {
    const code = issueCode("GIFT");
    expect(validateCode(code).ok).toBe(true);
    // 31 days later a 30-day gift code is dead.
    expect(validateCode(code, Date.now() + 31 * 86400000).ok).toBe(false);
  });

  it("gives one indistinguishable failure, so it cannot be used as an oracle", () => {
    const reasons = new Set([
      validateCode("FOUNDER-AAAAAA-AAAA").reason,
      validateCode(issueCode("GIFT"), Date.now() + 40 * 86400000).reason,
    ]);
    expect(reasons).toEqual(new Set(["invalid_or_expired"]));
  });

  it("mints a whole batch without collisions", () => {
    // 2 random chars gave 900 per batch-day and collided inside 40 codes.
    // A batch has to be issuable in bulk without handing two people the
    // same code.
    const codes = new Set(Array.from({ length: 500 }, () => issueCode("FOUNDER")));
    expect(codes.size).toBe(500);
  });

  it("does not validate forged codes at any meaningful rate", () => {
    // The real security property. An earlier cut scanned a day-window
    // against a 2-char check, which accepted roughly 1 random guess in
    // 30 — enough to brute-force a free pass in seconds.
    const A = "ABCDEFGHJKMNPQRSTUVWXYZ2345678";
    const pick = (n) => Array.from({ length: n }, () => A[Math.floor(Math.random() * A.length)]).join("");
    let accepted = 0;
    for (let i = 0; i < 3000; i++) {
      if (validateCode(`FOUNDER-${pick(6)}-${pick(4)}`).ok) accepted++;
    }
    expect(accepted).toBe(0);
  });
});
