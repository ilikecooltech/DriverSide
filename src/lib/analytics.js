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

export function initAnalytics() {
  if (!KEY || ready) return;
  posthog.init(KEY, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: false, // single-page shell; we track screens ourselves
  });
  ready = true;
}

export function track(event, props = {}) {
  if (!ready) return;
  posthog.capture(event, props);
}

export function identify(id, props = {}) {
  if (!ready) return;
  posthog.identify(id, props);
}

export function resetIdentity() {
  if (!ready) return;
  posthog.reset();
}
