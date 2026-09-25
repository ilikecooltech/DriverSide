/* Vercel serverless: /api/demo-login — a demo sign-in for the owner.

   Real phone sign-in needs an SMS provider on Supabase, which is not
   switched on yet. This lets one configured number sign in with one
   configured code, without sending a text, so the signed-in experience
   can be shown and tested today.

   Both values live only in server env vars — DEMO_PHONE and DEMO_CODE —
   so neither the number nor the code ever ships in the public bundle.
   With either unset, the endpoint answers "not a demo number" to
   everything and the app falls through to normal sign-in.

   The demo account is tagged `demo: true` so analytics can keep it out
   of real cohorts. It carries no server-side data: like every account
   today, what it sees lives on the device. */

import { createHash, timingSafeEqual } from "node:crypto";

const digits = (s) => String(s || "").replace(/\D/g, "");

/* Compare as E.164-ish digit strings: "9712614600", "+1 (971) 261-4600"
   and "19712614600" are the same number. */
export function samePhone(a, b) {
  const x = digits(a), y = digits(b);
  if (!x || !y) return false;
  const norm = (d) => (d.length === 10 ? `1${d}` : d);
  return norm(x) === norm(y);
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

export function demoConfig(env = process.env) {
  const phone = (env.DEMO_PHONE || "").trim();
  const code = digits(env.DEMO_CODE || "");
  return phone && code.length === 6 ? { phone, code } : null;
}

export function demoUserFor(phone) {
  const d = digits(phone);
  const id = "demo-" + createHash("sha256").update(d).digest("hex").slice(0, 12);
  const name = (process.env.DEMO_NAME || "").trim() || null;
  return { id, phone: `+${d.length === 10 ? "1" + d : d}`, name, demo: true };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  const cfg = demoConfig();
  const q = req.query || {};
  let body = req.body || {};
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const action = q.action || body.action;
  const phone = body.phone || q.phone;

  if (action === "check") return res.json({ demo: Boolean(cfg && samePhone(phone, cfg.phone)) });

  if (action === "verify") {
    if (!cfg || !samePhone(phone, cfg.phone) || !safeEqual(digits(body.code || q.code), cfg.code)) {
      // A small, fixed pause makes guessing six digits slow.
      await new Promise((r) => setTimeout(r, 400));
      return res.status(401).json({ ok: false });
    }
    return res.json({ ok: true, user: demoUserFor(cfg.phone) });
  }

  return res.status(400).json({ ok: false });
}
