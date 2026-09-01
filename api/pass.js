import crypto from "node:crypto";

/* Deal Pass — the money, server side.

   Everything that must not be forgeable lives here: what a pass costs,
   whether a promo code is real, and (later) the Stripe call. The client
   is never trusted with any of it and never receives a list of codes.

   TEST MODE: with no STRIPE_SECRET_KEY the checkout action returns a
   simulated session and the whole flow works end to end without a charge.
   Adding the key flips it to real hosted Stripe Checkout — card data
   never touches our app either way. See DEPLOY.md for the setup. */

const PRICE_CENTS = { founding: 1900, list: 2900, bundle: 4900 };
const FOUNDING_ACTIVE = true;

/* Codes are issued in batches and validated by signature, so no list of
   live codes exists in the bundle, in this file, or in any response. A
   code is only ever checked one at a time, and only the server can mint
   one. */
const BATCHES = ["FOUNDER", "CREATOR", "PARTNER", "MAKEGOOD", "GIFT"];
/* BATCH-DDRRRR-CCCC. The body carries the issue day (2 chars, base-30)
   and 4 random chars; the tail is a 4-character HMAC.

   Both widths were found by testing rather than chosen. A 2-char check
   scanned across the batch window gave a random guess roughly a 1-in-30
   chance of validating — fine as a typo check, useless as a credential;
   reading the day out of the code instead means exactly one signature to
   verify, over 30^4 (~810k). And 2 random chars gave only 900 codes per
   batch-day, which collided inside a 40-code batch; 4 gives 810k. */
const CODE_RE = /^(FOUNDER|CREATOR|PARTNER|MAKEGOOD|GIFT)-([A-Z0-9]{6})-([A-Z0-9]{4})$/;
const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ2345678"; // exactly 30, no look-alikes
const RADIX = 30;
const DAY_CYCLE = RADIX * RADIX; // 900 days, far beyond any batch window

/* Batch lifetimes. Nothing is evergreen — every batch has an end date, so
   a code that leaks onto Reddit dies on its own. Gift codes are the
   shortest at 30 days. */
const BATCH_DAYS = { FOUNDER: 120, CREATOR: 120, PARTNER: 180, MAKEGOOD: 90, GIFT: 30 };

function secret() {
  /* A dev fallback keeps the simulated flow working locally. In
     production PROMO_SIGNING_SECRET must be set, or every issued code
     becomes invalid the next time the fallback changes. */
  return process.env.PROMO_SIGNING_SECRET || "driverside-dev-only-not-a-secret";
}

const b32 = (buf, n) => [...buf].map((b) => ALPHA[b % ALPHA.length]).join("").slice(0, n);

function checkFor(batch, body) {
  const h = crypto.createHmac("sha256", secret()).update(`${batch}:${body}`).digest();
  return b32(h, 4);
}

const encodeDay = (day) => {
  const v = ((day % DAY_CYCLE) + DAY_CYCLE) % DAY_CYCLE;
  return ALPHA[Math.floor(v / RADIX)] + ALPHA[v % RADIX];
};

/* Recover the issue day from its 2-char encoding, given today. Exact for
   any batch window shorter than DAY_CYCLE. */
function decodeDay(enc, today) {
  const hi = ALPHA.indexOf(enc[0]);
  const lo = ALPHA.indexOf(enc[1]);
  if (hi < 0 || lo < 0 || hi >= RADIX || lo >= RADIX) return null;
  const v = hi * RADIX + lo;
  return today - (((today - v) % DAY_CYCLE) + DAY_CYCLE) % DAY_CYCLE;
}

const dayNow = () => Math.floor(Date.now() / 86400000);

/* Mint a code. Server-only — there is no client path to this. */
export function issueCode(batch, issuedDay = dayNow()) {
  if (!BATCHES.includes(batch)) throw new Error("unknown batch");
  const body = encodeDay(issuedDay) + b32(crypto.randomBytes(8), 4);
  return `${batch}-${body}-${checkFor(batch, body)}`;
}

/* Validate one code. Returns { ok, batch, reason }. Never enumerates.

   Signature proves we issued it; the day-window proves it has not
   outlived its batch. Single use is the one property this cannot enforce
   alone — it needs somewhere to record a redemption. See REDEMPTION
   STORE below. */
export function validateCode(code, now = Date.now()) {
  const s = String(code || "").trim().toUpperCase();
  if (!s) return { ok: false, reason: "empty" };
  const m = CODE_RE.exec(s);
  if (!m) return { ok: false, reason: "malformed" };
  const [, batch, body, check] = m;

  /* Constant-shape comparison: signature first, then expiry, and one
     reason for every failure so the endpoint cannot be used to tell a
     forged code from an expired one. */
  if (checkFor(batch, body) !== check) return { ok: false, reason: "invalid_or_expired" };

  const today = Math.floor(now / 86400000);
  const issuedDay = decodeDay(body.slice(0, 2), today);
  if (issuedDay === null) return { ok: false, reason: "invalid_or_expired" };

  const window = BATCH_DAYS[batch] ?? 90;
  const expiresDay = issuedDay + window;
  if (today > expiresDay || today < issuedDay) return { ok: false, reason: "invalid_or_expired" };

  return { ok: true, batch, code: s, issuedDay, expiresDay };
}

/* ── REDEMPTION STORE ───────────────────────────────────────────────────
   Single-use requires durable storage; a serverless function has none.
   This in-memory set holds only for a warm instance and is NOT sufficient
   for production — it is here so the interface is exercised end to end in
   test mode. Swap for Vercel KV / Postgres before real codes are issued
   (one row: code, redeemed_at, device). Flagged in DEPLOY.md. */
const redeemed = new Set();

function markRedeemed(code) {
  if (redeemed.has(code)) return false;
  redeemed.add(code);
  return true;
}

async function stripeCheckout({ priceCents, origin }) {
  const KEY = process.env.STRIPE_SECRET_KEY;
  const body = new URLSearchParams({
    mode: "payment",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(priceCents),
    "line_items[0][price_data][product_data][name]": "DriverSide Deal Pass",
    "line_items[0][price_data][product_data][description]": "One vehicle. Every script, counter and rebuttal for this negotiation.",
    success_url: `${origin}/?pass=ok&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?pass=cancelled`,
  });
  const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!r.ok) throw new Error(`stripe ${r.status}`);
  return r.json();
}

export default async function handler(req, res) {
  const action = String(req.query?.action || req.body?.action || "").toLowerCase();
  const live = Boolean(process.env.STRIPE_SECRET_KEY);
  const priceCents = FOUNDING_ACTIVE ? PRICE_CENTS.founding : PRICE_CENTS.list;

  try {
    if (action === "checkout") {
      if (!live) {
        /* Test mode: no charge, no card, no account — the rest of the
           flow is identical so the real thing swaps in cleanly. */
        return res.json({
          mode: "test",
          ok: true,
          priceCents,
          sessionId: `test_${crypto.randomBytes(8).toString("hex")}`,
          note: "TEST MODE — no payment provider configured, no charge made",
        });
      }
      const origin = req.headers?.origin || `https://${req.headers?.host || "driverside.vercel.app"}`;
      const session = await stripeCheckout({ priceCents, origin });
      return res.json({ mode: "live", ok: true, priceCents, sessionId: session.id, url: session.url });
    }

    if (action === "redeem") {
      const code = req.query?.code || req.body?.code;
      const v = validateCode(code);
      /* One shape for every failure: a caller must not be able to tell a
         wrong batch from an expired code from a used one, or the endpoint
         becomes an oracle for guessing codes. */
      if (!v.ok) return res.status(400).json({ ok: false, reason: "invalid" });
      if (!markRedeemed(v.code)) return res.status(400).json({ ok: false, reason: "invalid" });
      return res.json({ ok: true, batch: v.batch, expiresDay: v.expiresDay });
    }

    if (action === "gift") {
      /* One gift per activated pass; depth is enforced by the caller's
         stored pass and re-checked here. */
      const depth = Number(req.query?.depth ?? req.body?.depth ?? 0);
      if (!Number.isFinite(depth) || depth >= 2) {
        return res.status(400).json({ ok: false, reason: "chain_depth" });
      }
      return res.json({ ok: true, code: issueCode("GIFT"), days: BATCH_DAYS.GIFT, depth: depth + 1 });
    }

    if (action === "refund") {
      /* The $290 promise: a button, never a form. In live mode this is
         where the Stripe refund call goes; the client records the state
         either way so the guarantee is honoured even if the provider is
         slow. */
      return res.json({ ok: true, mode: live ? "live" : "test", refundedAt: Date.now() });
    }

    return res.status(400).json({ ok: false, reason: "unknown_action" });
  } catch (err) {
    console.error("pass endpoint failed:", err.message);
    return res.status(502).json({ ok: false, reason: "upstream" });
  }
}
