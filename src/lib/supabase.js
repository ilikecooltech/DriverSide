/* Supabase auth client. Configured entirely by env; with no keys the app
   runs in prototype mode (simulated sign-in) so the demo always works.
   Keys: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (anon key is public by
   design; row-level security is the real boundary). */

import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && anon ? createClient(url, anon) : null;
export const authConfigured = Boolean(supabase);

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
