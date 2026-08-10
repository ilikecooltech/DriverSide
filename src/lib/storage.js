/* Local persistence. Guests keep everything on-device, which is the
   promise the login screen makes; signed-in users get the same behavior
   until Supabase tables land. Every read is defensive — a corrupt or
   half-written value must never white-screen the app. */

const KEY = "driverside.v1";

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveState(patch) {
  try {
    const next = { ...loadState(), ...patch };
    localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  } catch {
    return null; // private mode, quota, etc. Never load-bearing.
  }
}

export function clearState() {
  try {
    localStorage.removeItem(KEY);
  } catch { /* ignore */ }
}
