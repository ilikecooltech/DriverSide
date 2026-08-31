import React from "react";
import { C, mono, heading } from "../theme.js";
import { gateCopy } from "../lib/account.js";
import { Kicker, GhostBtn } from "./ui.jsx";
import { OtpForm } from "./OtpForm.jsx";

/* The account ask, at the moment of need — never before it.

   A guest reaches for something a phone alone can't do (alerts, sync).
   Instead of a dead switch or a wall at the front door, we say what we
   need and why, take a code, and hand them straight back to what they
   were doing. Nothing they've built is lost: the upgrade keeps the local
   garage, goal and setup exactly as they are.

   Same OtpForm as the login screen — one implementation of the account
   door, so the deferred social buttons and the subscription upsell land
   in one place when they're switched on. */

export function SignInPrompt({ capability, onSignedIn, onClose }) {
  const copy = gateCopy(capability);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "24px 22px", minHeight: 0, overflowY: "auto" }}>
      <button
        onClick={onClose}
        style={{ alignSelf: "flex-start", minHeight: 44, background: "none", border: "none", color: C.inkSoft, fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 0 }}
      >
        ← Back
      </button>

      <Kicker color={C.amber} style={{ marginTop: 8 }}>{copy.kicker}</Kicker>
      <h1 style={{ fontFamily: heading, fontWeight: 600, fontSize: 28, lineHeight: 1.12, margin: "8px 0 6px" }}>
        {copy.headline}
      </h1>
      <div style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.55, marginBottom: 18 }}>{copy.line}</div>

      <div style={{ background: C.greenBg, color: C.green, padding: "10px 12px", fontSize: 12.5, fontWeight: 600, lineHeight: 1.5, marginBottom: 16 }}>
        Your garage, goal and decoded quotes stay exactly as they are. Signing in adds to them — it never starts you over.
      </div>

      <OtpForm onDone={() => onSignedIn()} sendLabel="SEND MY CODE" autoFocus />

      <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.06em", color: C.inkSoft, marginTop: 14, lineHeight: 1.6 }}>
        USED FOR SIGN-IN AND THE ALERTS YOU CHOOSE. NOTHING ELSE.
      </div>

      <GhostBtn onClick={onClose} style={{ marginTop: "auto" }}>
        Not now — keep going as a guest
      </GhostBtn>
    </div>
  );
}
