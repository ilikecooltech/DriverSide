/* What actually needs an account — the single source of truth for the
   guest door.

   Guest is the default way in, not a downgrade: the decoder, the goal,
   the garage, the scripts and the whole shopping loop run on-device with
   no sign-in. A capability only earns a `true` here when it genuinely
   cannot work on this phone alone — something has to reach the buyer
   when the app is closed, or find their data from a second device.

   Everything else stays open. When a gated capability is tapped the app
   asks for a code at that moment (SignInPrompt), keeps whatever the
   guest already built, and returns them to what they were doing. */

export const ACCOUNT_REQUIRED = {
  // Price drops and day-60 fire while the app is closed — that needs a
  // server that knows how to reach you.
  alerts: true,
  // The extension saves on a laptop; the garage is on the phone. Only an
  // account can be in both places.
  extensionSync: true,
  /* Deferred with subscriptions and social login (see supabase.js). The
     Deal Pass is a local, unauthenticated purchase in the prototype, so
     gating it today would cost a guest the product's core promise for
     nothing. Flip to true when checkout writes an entitlement row keyed
     to a Supabase user id — the gate below then works with no other
     change. */
  dealPass: false,
};

export function requiresAccount(capability) {
  return Boolean(ACCOUNT_REQUIRED[capability]);
}

/* Why-you're-seeing-this copy, keyed by capability. Written for the
   moment of need: name the thing they just reached for, not "premium". */
export const GATE_COPY = {
  alerts: {
    kicker: "ALERTS NEED AN ACCOUNT",
    headline: "We can't text a phone we don't have.",
    line: "Price drops and the day-60 window happen while the app is closed. Give us a way to reach you and we'll watch for both.",
  },
  extensionSync: {
    kicker: "SYNC NEEDS AN ACCOUNT",
    headline: "Two devices, one garage.",
    line: "The extension saves cars on your laptop. An account is what lets this phone find them.",
  },
  dealPass: {
    kicker: "PASS NEEDS AN ACCOUNT",
    headline: "So your pass follows you.",
    line: "An account keeps the Deal Pass attached to you, not to this browser.",
  },
  default: {
    kicker: "NEEDS AN ACCOUNT",
    headline: "This one needs an account.",
    line: "Everything else keeps working without one.",
  },
};

export const gateCopy = (capability) => GATE_COPY[capability] || GATE_COPY.default;
