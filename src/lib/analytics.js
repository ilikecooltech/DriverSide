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
  if (ready) return;
  if (!KEY) {
    /* Silent in production (analytics off is a valid setup), loud in
       development so a missing key never goes unnoticed. */
    if (import.meta.env.DEV) console.warn("VITE_POSTHOG_KEY is not set: analytics are off and events are dropped.");
    return;
  }
  try {
    posthog.init(KEY, {
      api_host: import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com",
      person_profiles: "identified_only",
      capture_pageview: false, // single-page shell; we track screens ourselves
      /* Crashes a buyer hits reach us without them filing a report.
         Console errors stay off: too noisy, and some carry user input. */
      capture_exceptions: {
        capture_unhandled_errors: true,
        capture_unhandled_rejections: true,
        capture_console_errors: false,
      },
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
