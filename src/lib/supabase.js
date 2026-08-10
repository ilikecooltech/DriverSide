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

export async function signInWithProvider(provider) {
  if (!supabase) return { simulated: true };
  return supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin },
  });
}

/* Fires on the OAuth/magic-link return trip so the app can pick up the
   session without a manual refresh. */
export function onAuthChange(cb) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_e, session) => cb(session));
  return () => data?.subscription?.unsubscribe();
}

export async function signInWithEmail(email) {
  if (!supabase) return { simulated: true };
  return supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
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
