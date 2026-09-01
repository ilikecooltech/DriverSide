/* The Deal Pass: what it costs, what it unlocks, what it is worth, and how
   a code turns into one.

   The gating rule, from the split doc, decides anything not listed here:
   THE TRUTH IS FREE, THE WORDS ARE PAID. Market data, flags, arithmetic
   and verdicts stay free forever because trust is the whole brand. What
   the pass buys is coaching through the confrontation — scripts, live
   counters, suggested counters, practice, the walk-out kit, the export.

   Everything in this file is pure so the gate and the money are testable
   without a browser or a payment provider. */

export const PRICING = {
  listCents: 2900,
  foundingCents: 1900,
  bundleCents: 4900,
  bundleDays: 90,
  currency: "usd",
  /* The founding price is pre-announced rather than discovered, so the
     later rise to $29 is a kept promise instead of a rug-pull. */
  foundingActive: true,
  guaranteeMultiple: 10,
};

export const dollars = (cents) => `$${Math.round(cents / 100).toLocaleString()}`;

/* The $290 promise. Pinned to the LIST price, not the founding price, so
   the number stays $290 while the founding cohort pays $19 — the promise
   over-delivers rather than shrinking for early buyers.

   Worth knowing: the mockup's copy says both "$290" and "ten times its
   price", which cannot both be true at $19. We state the dollar figure
   and drop the multiple, so the sentence is checkable. Flagged for
   Darrell as a copy call. */
export function guaranteeCents(priceCents = PRICING.listCents) {
  return priceCents * PRICING.guaranteeMultiple;
}

export function activePriceCents() {
  return PRICING.foundingActive ? PRICING.foundingCents : PRICING.listCents;
}

/* ── What the pass gates ────────────────────────────────────────────────
   Listed explicitly so the boundary is reviewable in one place, and so a
   new surface has to make a deliberate choice rather than inherit one. */
export const FREE_FOREVER = [
  "decode",           // every sheet, unlimited
  "verdicts",         // FLAG / CHECK / FAIR
  "market",           // live comps and the market check
  "addonFlags",       // what the add-ons really cost
  "table",            // The Table: arithmetic + spread verdicts
  "payment",          // the payment calculator and its levers
  "walkAway",         // when to leave — the most on-brand sentence we own
  "firstScript",      // the anchor script, full and copyable
  "finance",          // the entire Finance tab
  "shop",
  "garage",
];

export const PASS_GATED = [
  "scriptLibrary",    // every script beyond the anchor
  "liveCounters",     // scripts that rewrite after each logged round
  "suggestedCounter", // advice, not arithmetic
  "practice",
  "walkOutKit",
  "dealFileExport",
];

export function requiresPass(capability) {
  return PASS_GATED.includes(capability);
}

/* The boundary, printed verbatim inside the paywall. Kept here so the
   promise and the code that enforces it live together. */
export const FREE_FOREVER_COPY =
  "FREE FOREVER — decoding any sheet, the live market check, add-on flags, The Table, " +
  "the payment calculator, and your first script. The pass buys words, never the truth.";

/* ── The value receipt ──────────────────────────────────────────────────
   Computed from the session, never invented: what this sheet is hiding,
   found for free, before we ask for anything. Each line is omitted when
   we cannot substantiate it rather than shown as a zero. */

const monthly = (principal, aprPct, months) => {
  const r = Number(aprPct) / 12 / 100;
  if (!(principal > 0) || !(months > 0)) return 0;
  if (!(r > 0)) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
};

export function totalInterest(principal, aprPct, months) {
  if (!(principal > 0) || !(months > 0)) return 0;
  return Math.max(0, monthly(principal, aprPct, months) * months - principal);
}

export function valueReceipt(deal, median) {
  const rows = [];
  if (!deal) return { rows, totalCents: 0, total: 0 };

  const junk = Math.round(Number(deal.junkTotal) || 0) + Math.round(Number(deal.taxError) || 0);
  if (junk > 0) rows.push({ key: "junk", label: "Removable add-ons flagged", amount: junk });

  const asking = Number(deal.asking);
  const mid = Number(median);
  if (Number.isFinite(asking) && Number.isFinite(mid) && mid > 0 && asking > mid) {
    rows.push({ key: "market", label: "Ask above live market", amount: Math.round(asking - mid) });
  }

  const pre = deal.preApproval || {};
  const principal = Number(deal.principal);
  const theirApr = Number(deal.apr);
  const yourApr = Number(pre.apr);
  const term = Number(pre.term) || Number(deal.term);
  if (
    Number.isFinite(principal) && principal > 0 &&
    Number.isFinite(theirApr) && Number.isFinite(yourApr) &&
    Number.isFinite(term) && term > 0 && theirApr > yourApr
  ) {
    const delta = Math.round(totalInterest(principal, theirApr, term) - totalInterest(principal, yourApr, term));
    if (delta > 0) rows.push({ key: "rate", label: "Interest: their loan vs yours", amount: delta });
  }

  const total = rows.reduce((s, r) => s + r.amount, 0);
  return { rows, total, totalCents: total * 100 };
}

/* ── Promo codes ────────────────────────────────────────────────────────
   Single-use, batch-issued, expiring, never publicly listable, and never
   evergreen. The client only ever learns whether ONE code it was given is
   good — it cannot enumerate a batch, and no list of live codes ships in
   the bundle. Validation belongs to the server (api/pass.js); this half
   is only the shape and the batch rules.

   Format: BATCH-XXXX-XX (batch, random, check). GIFT codes carry the
   chain depth so a gifted pass cannot mint an unlimited tree. */

export const PROMO_BATCHES = ["FOUNDER", "CREATOR", "PARTNER", "MAKEGOOD", "GIFT"];

/* Depth 0 = paid or first-party comp. A pass minted from a GIFT code is
   depth 1 and may still gift once. Depth 2 is the end of the chain. */
export const MAX_GIFT_DEPTH = 2;

export function batchOf(code) {
  const s = String(code || "").trim().toUpperCase();
  if (!s) return null;
  const head = s.split("-")[0];
  return PROMO_BATCHES.includes(head) ? head : null;
}

export function isWellFormedCode(code) {
  return /^(FOUNDER|CREATOR|PARTNER|MAKEGOOD|GIFT)-[A-Z0-9]{4}-[A-Z0-9]{2}$/.test(
    String(code || "").trim().toUpperCase()
  );
}

/* The activation tag. This is the whole analytics contract: paid and
   comped activations must never be summed together, or the
   willingness-to-pay experiment measures nothing. */
export function activationTag({ kind, batch }) {
  if (kind === "comped") return `comped_${String(batch || "unknown").toLowerCase()}`;
  return PRICING.foundingActive ? "paid_founding" : "paid_full";
}

export function isComped(tag) {
  return String(tag || "").startsWith("comped_");
}

/* Human label for the pass state. A comped pass is never dressed as a
   paid one — same capability, different badge. */
export function passLabel(pass) {
  if (!pass?.active) return null;
  if (isComped(pass.tag)) {
    const batch = String(pass.tag).replace(/^comped_/, "").toUpperCase();
    return `DEAL PASS ACTIVE — COMPED · ${batch} BATCH`;
  }
  return "DEAL PASS ACTIVE — THIS DEAL";
}

export function canGift(pass) {
  return Boolean(pass?.active) && !pass.giftedAt && (pass.depth ?? 0) < MAX_GIFT_DEPTH;
}

/* Refunds are a button, not a form — the guarantee is worthless if
   claiming it is work. Only a paid pass can be refunded; a comped one has
   nothing to return. */
export function canRefund(pass) {
  return Boolean(pass?.active) && !isComped(pass.tag) && !pass.refundedAt;
}
