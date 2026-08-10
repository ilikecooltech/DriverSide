import posthog from "posthog-js";

const KEY = import.meta.env.VITE_POSTHOG_KEY;
const HOST = import.meta.env.VITE_POSTHOG_HOST;
let ready = false;

function reportMissingConfig(variable) {
  if (import.meta.env.DEV) {
    console.error(`${variable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${variable} is configured`);
  }
}

export function initAnalytics() {
  if (ready) return;
  if (!KEY) {
    reportMissingConfig("VITE_POSTHOG_KEY");
    return;
  }
  if (!HOST) {
    reportMissingConfig("VITE_POSTHOG_HOST");
    return;
  }

  posthog.init(KEY, {
    api_host: HOST,
    defaults: "2026-05-30",
    capture_exceptions: {
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      capture_console_errors: false,
    },
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
