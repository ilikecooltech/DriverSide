/* PostHog wrapper. No key -> every call is a silent no-op, so the
   prototype never breaks and no data leaves the device unconfigured.
   Key: VITE_POSTHOG_KEY (optional VITE_POSTHOG_HOST, defaults to US cloud).

   Event taxonomy maps to the wedge success metrics in CLAUDE.md:
   - quotes analyzed per week        -> quote_decoded
   - % returning with second quote   -> quote_redecoded (same vehicle)
   - self-reported savings           -> outcome_signed { kept }
   - share rate on the decoded card  -> decode_shared (when share ships)
   Plus the monetization funnel: gate_hit -> paywall_viewed -> deal_pass_purchased. */

import posthog from "posthog-js";

const KEY = import.meta.env.VITE_POSTHOG_KEY;
let ready = false;

/* Analytics is never load-bearing. A bad key, a blocked domain, or an ad
   blocker must not take the product down with it. */
export function initAnalytics() {
  if (!KEY || ready) return;
  try {
    posthog.init(KEY, {
      api_host: import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com",
      person_profiles: "identified_only",
      capture_pageview: false, // single-page shell; we track screens ourselves
    });
    ready = true;
  } catch (err) {
    console.error("PostHog init failed — analytics off:", err?.message || err);
  }
}

export function track(event, props = {}) {
  if (!ready) return;
  try { posthog.capture(event, props); } catch { /* never load-bearing */ }
}

export function identify(id, props = {}) {
  if (!ready) return;
  try { posthog.identify(id, props); } catch { /* never load-bearing */ }
}

export function resetIdentity() {
  if (!ready) return;
  try { posthog.reset(); } catch { /* never load-bearing */ }
}
