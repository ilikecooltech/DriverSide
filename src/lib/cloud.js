/* The account's copy of what the app keeps on the phone.

   Guests: nothing here runs; everything stays on the device, as promised.
   Signed in: the same document (src/lib/storage.js) is kept in Supabase
   (table user_state, see supabase/migrations/20261108_accounts.sql) so it
   follows the person to any device. Demo sign-ins never sync.

   The merge is pure and tested, because it decides what a person keeps
   when a guest session meets an account that already has data. The rule:
   nothing is lost. Lists are joined; for single settings the account
   wins, and the phone fills anything the account doesn't have yet. */

import { supabase } from "./supabase.js";

export const SYNC_KEYS = ["archetype", "archetypeKey", "setup", "cars", "owned", "watching", "dealerSession", "pass"];

export function pickSynced(state = {}) {
  const out = {};
  for (const k of SYNC_KEYS) if (state[k] !== undefined) out[k] = state[k];
  return out;
}

const isList = (x) => Array.isArray(x);
const keyOf = (item) => (item && typeof item === "object" ? item.id || item.vin || JSON.stringify(item) : String(item));

/* Account items first (they're the record), then anything new from the phone. */
function joinLists(cloud = [], local = []) {
  const seen = new Set();
  const out = [];
  for (const item of [...(isList(cloud) ? cloud : []), ...(isList(local) ? local : [])]) {
    const k = keyOf(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

const hasKeys = (o) => o && typeof o === "object" && Object.keys(o).length > 0;

/* An active pass beats none; between two, the later one. */
function pickPass(cloud, local) {
  if (!cloud) return local || null;
  if (!local) return cloud;
  if (cloud.active !== local.active) return cloud.active ? cloud : local;
  return (local.at || 0) > (cloud.at || 0) ? local : cloud;
}

/* The live dealer session that started most recently. */
function pickSession(cloud, local) {
  if (!cloud) return local || null;
  if (!local) return cloud;
  return (local.startedAt || 0) > (cloud.startedAt || 0) ? local : cloud;
}

export function mergeStates(local = {}, cloud = {}) {
  const l = pickSynced(local);
  const c = pickSynced(cloud);
  const out = {
    archetype: c.archetype || l.archetype || null,
    archetypeKey: c.archetypeKey || l.archetypeKey || null,
    setup: { ...(l.setup || {}), ...(hasKeys(c.setup) ? c.setup : {}) },
    cars: joinLists(c.cars, l.cars),
    owned: joinLists(c.owned, l.owned),
    watching: joinLists(c.watching, l.watching),
    dealerSession: pickSession(c.dealerSession, l.dealerSession),
    pass: pickPass(c.pass, l.pass),
  };
  return out;
}

/* Is there anything on this phone worth bringing into the account? */
export function hasGuestData(local = {}) {
  const l = pickSynced(local);
  return Boolean(l.archetypeKey || l.cars?.length || l.owned?.length || l.watching?.length || l.dealerSession);
}

/* ── Supabase calls. Each returns { ok, ... } and never throws. ───────── */

export async function loadCloud(userId, client = supabase) {
  if (!client || !userId) return { ok: false, reason: "off" };
  try {
    const { data, error } = await client.from("user_state").select("state, updated_at").eq("user_id", userId).maybeSingle();
    if (error) return { ok: false, reason: error.message };
    return { ok: true, state: data?.state || {}, updatedAt: data?.updated_at || null };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

export async function saveCloud(userId, state, client = supabase) {
  if (!client || !userId) return { ok: false, reason: "off" };
  try {
    const { error } = await client.from("user_state").upsert({ user_id: userId, state: pickSynced(state) }, { onConflict: "user_id" });
    return error ? { ok: false, reason: error.message } : { ok: true, at: Date.now() };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

/* Coalesce rapid edits (a slider drag) into one save. */
export function makeSaver(save, delay = 1200) {
  let timer = null;
  let latest = null;
  const fn = (state) => {
    latest = state;
    clearTimeout(timer);
    return new Promise((resolve) => {
      timer = setTimeout(async () => resolve(await save(latest)), delay);
    });
  };
  fn.cancel = () => clearTimeout(timer);
  return fn;
}

export async function claimPasses(client = supabase) {
  if (!client) return { ok: false };
  try {
    const { data, error } = await client.rpc("claim_my_passes");
    return error ? { ok: false } : { ok: true, claimed: data || 0 };
  } catch {
    return { ok: false };
  }
}

/* Everything the account holds, as one file the person can keep. */
export async function exportMyData({ userId, email }, client = supabase) {
  const out = { exported_at: new Date().toISOString(), account: { email: email || null } };
  if (!client || !userId) return out;
  const [profile, state, passes, cars] = await Promise.all([
    client.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
    client.from("user_state").select("state, updated_at").eq("user_id", userId).maybeSingle(),
    client.from("passes").select("product, cohort, amount_cents, status, created_at, expires_at"),
    client.from("my_cars").select("*"),
  ].map((q) => q.then((r) => r.data ?? null).catch(() => null)));
  return { ...out, profile, saved: state?.state || {}, saved_at: state?.updated_at || null, passes: passes || [], my_cars: cars || [] };
}

export async function deleteMyAccount(client = supabase) {
  if (!client) return { ok: false, reason: "off" };
  try {
    const { error } = await client.rpc("delete_my_account");
    if (error) return { ok: false, reason: error.message };
    await client.auth.signOut().catch(() => {});
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

export async function signOutEverywhere(client = supabase) {
  if (!client) return { ok: false };
  try {
    await client.auth.signOut({ scope: "global" });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
