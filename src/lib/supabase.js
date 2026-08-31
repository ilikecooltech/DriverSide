/* Supabase auth client. Configured entirely by env; with no keys the app
   runs in prototype mode (simulated sign-in) so the demo always works.
   Keys: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (anon key is public by
   design; row-level security is the real boundary). */

import { createClient } from "@supabase/supabase-js";

const url = (import.meta.env.VITE_SUPABASE_URL || "").trim();
const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

/* createClient throws synchronously on a malformed URL, and at module
   scope that blanks the entire app. A misconfigured key must degrade to
   guest-only auth, never to a white screen. */
let client = null;
if (url && anon) {
  try {
    client = createClient(url, anon);
  } catch (err) {
    console.error("Supabase init failed — continuing with guest-only auth:", err?.message || err);
  }
}

export const supabase = client;
export const authConfigured = Boolean(client);

/* ── Social login: deferred, not deleted ──────────────────────────────
   Google/Apple OAuth is off until the Apple Developer / Google Cloud
   certification is done and paid subscriptions land. The capability below
   is intact and tested-by-inspection; flip VITE_ENABLE_SOCIAL_LOGIN=true
   (Vercel env or .env.local) to bring the buttons back with no code
   change. Keep this flag and `signInWithProvider` together.

   The button markup itself came out with the Phase 1 Start screen (the
   old Login screen is gone; see git history at commit a6f4b50 for the
   last version of it). The capability below is untouched — re-enabling
   means adding buttons to Start.jsx that call `signInWithProvider`, and
   flipping the flag. */
export const socialLoginEnabled =
  String(import.meta.env.VITE_ENABLE_SOCIAL_LOGIN || "").trim().toLowerCase() === "true";

export async function signInWithProvider(provider) {
  if (!supabase) return { simulated: true };
  return supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin },
  });
}
/* ─────────────────────────────────────────────────────────────────── */

/* Fires on the OAuth/magic-link/OTP return trip so the app can pick up
   the session without a manual refresh. */
export function onAuthChange(cb) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_e, session) => cb(session));
  return () => data?.subscription?.unsubscribe();
}

/* ── Identifier parsing ───────────────────────────────────────────────
   One field takes either a phone or an email, because asking a buyer to
   pick a channel before they've typed anything is a tax. Digits-first =>
   phone; anything with an @ => email. E.164 is what Supabase requires,
   and a bare 10-digit US number is what people actually type. */

const DIGITS = /\d/g;

export function normalizePhone(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  const plus = s.startsWith("+");
  const digits = (s.match(DIGITS) || []).join("");
  if (!digits) return null;
  // Explicit country code — trust it, only sanity-check the length.
  if (plus) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  // Bare US 10-digit, or 11-digit starting with the US country code.
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

export function isEmail(raw) {
  const s = String(raw || "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
}

/* Returns { kind: "email"|"phone", value } or { kind: "invalid", reason }.
   `reason` is written for the buyer, not the console. */
export function classifyIdentifier(raw) {
  const s = String(raw || "").trim();
  if (!s) return { kind: "invalid", reason: "Enter your phone number or email." };
  if (s.includes("@")) {
    return isEmail(s)
      ? { kind: "email", value: s.toLowerCase() }
      : { kind: "invalid", reason: "That doesn't look like an email address." };
  }
  const phone = normalizePhone(s);
  if (phone) return { kind: "phone", value: phone };
  return {
    kind: "invalid",
    reason: /\d/.test(s)
      ? "That doesn't look like a phone number. Try 10 digits, or +country code."
      : "Enter your phone number or email.",
  };
}

/* ── OTP: send then verify ────────────────────────────────────────────
   Both channels are the same two-step shape: send a 6-digit code, verify
   it, get a session. Email additionally still honors the magic link if
   the template keeps one — either way in works. */

/* Sends the code. `identifier` is a raw string from the input; returns
   { kind, value, simulated?, error? } so the caller knows which channel
   it landed on without re-parsing. */
export async function sendOtp(identifier) {
  const parsed = classifyIdentifier(identifier);
  if (parsed.kind === "invalid") return { ...parsed, error: { message: parsed.reason } };
  if (!supabase) return { ...parsed, simulated: true };

  const payload =
    parsed.kind === "email"
      ? { email: parsed.value, options: { emailRedirectTo: window.location.origin, shouldCreateUser: true } }
      : { phone: parsed.value, options: { shouldCreateUser: true } };

  const { data, error } = await supabase.auth.signInWithOtp(payload);
  return { ...parsed, data, error };
}

/* Verifies the code. `kind` and `value` come straight back from sendOtp.
   Supabase types: "email" for email OTP, "sms" for phone OTP. */
export async function verifyOtp({ kind, value, token }) {
  const code = String(token || "").replace(/\D/g, "");
  if (code.length < 6) return { error: { message: "Enter the 6-digit code." } };
  if (!supabase) return { simulated: true };

  const payload =
    kind === "email"
      ? { email: value, token: code, type: "email" }
      : { phone: value, token: code, type: "sms" };

  const { data, error } = await supabase.auth.verifyOtp(payload);
  return { data, error, session: data?.session || null };
}

/* Kept for callers that only ever want the email channel. */
export async function signInWithEmail(email) {
  return sendOtp(email);
}

export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session || null;
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}
