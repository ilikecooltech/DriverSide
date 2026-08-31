import React, { useState } from "react";
import { C, mono, heading } from "../theme.js";
import { authConfigured, socialLoginEnabled, signInWithProvider } from "../lib/supabase.js";
import { Kicker, PrimaryBtn, GhostBtn } from "./ui.jsx";
import { OtpForm } from "./OtpForm.jsx";

/* 4b — login with a first-class guest door.

   Guest is the default path in and the biggest button on the screen: no
   sign-in, no code, nothing to invent — the decoder, the goal and the
   garage all work on this device. An account is the second door, offered
   for what a device can't do (alerts, sync across devices) and taken by
   a one-time code to a phone number or an email. A guest who later wants
   one is asked at the point of need, not here — see SignInPrompt.

   Social sign-in (Google/Apple) is deferred until certification and is
   hidden behind VITE_ENABLE_SOCIAL_LOGIN — see lib/supabase.js. */

export function Login({ onAuth }) {
  const [view, setView] = useState("welcome"); // welcome | account | guest | done
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  const solidBtn = { minHeight: 50, border: `1.5px solid ${C.ink}`, background: C.ink, color: "#fff", fontSize: 14.5, fontWeight: 700, cursor: "pointer" };
  const lineBtn = { minHeight: 50, border: `1.5px solid ${C.line}`, background: C.card, color: C.ink, fontSize: 14.5, fontWeight: 700, cursor: "pointer" };

  /* ── Deferred: social sign-in. Off until certification (Apple Developer
     account + Google Cloud OAuth client) and paid subscriptions land.
     Flip VITE_ENABLE_SOCIAL_LOGIN=true to restore — no code change. ── */
  const oauth = async (provider) => {
    setError(null);
    setBusy(provider);
    try {
      const r = await signInWithProvider(provider);
      if (r?.simulated) { setView("done"); return; }
      if (r?.error) {
        setError(
          r.error.message?.includes("provider")
            ? `${provider === "apple" ? "Apple" : "Google"} sign-in isn't enabled yet. Use a code or continue as guest.`
            : r.error.message || "Sign-in failed. Try a code or guest."
        );
      }
    } catch {
      setError("Sign-in failed. Try a code or continue as guest.");
    } finally {
      setBusy(null);
    }
  };

  const socialButtons = !socialLoginEnabled ? null : (
    <>
      <button onClick={() => oauth("apple")} disabled={Boolean(busy)} style={solidBtn}>
        {busy === "apple" ? "Opening Apple…" : " Continue with Apple"}
      </button>
      <button onClick={() => oauth("google")} disabled={Boolean(busy)} style={lineBtn}>
        {busy === "google" ? "Opening Google…" : "Continue with Google"}
      </button>
    </>
  );
  /* ─────────────────────────────────────────────────────────────────── */

  if (view === "welcome")
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "28px 24px", minHeight: 0 }}>
        <div style={{ marginTop: 36 }}>
          <div style={{ fontFamily: heading, fontWeight: 600, fontSize: 38, lineHeight: 1.05 }}>DriverSide</div>
          <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.1em", color: C.inkSoft, marginTop: 8 }}>
            THE ONLY ONE AT THE TABLE ON YOUR SIDE
          </div>
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.6, color: C.ink, marginTop: 28 }}>
          Dealers have software, training, and the home field.<br />Now you have something too.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: "auto" }}>
          {error && (
            <div style={{ background: C.amberBg, color: C.amberDark, padding: "10px 12px", fontSize: 12.5, fontWeight: 600, lineHeight: 1.45 }}>{error}</div>
          )}
          <PrimaryBtn onClick={() => setView("guest")} height={52}>
            SKIP FOR NOW — NO ACCOUNT →
          </PrimaryBtn>
          <div style={{ textAlign: "center", fontSize: 11.5, color: C.inkSoft, lineHeight: 1.5 }}>
            No account. No code. Everything works.
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "6px 0 2px" }}>
            <div style={{ flex: 1, borderTop: `1px dashed ${C.line}` }} />
            <span style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: "0.1em", color: C.inkSoft }}>OR</span>
            <div style={{ flex: 1, borderTop: `1px dashed ${C.line}` }} />
          </div>
          <button onClick={() => setView("account")} style={lineBtn}>
            Sign in with a code
          </button>
          {socialButtons}
          <button
            onClick={() => setView("guest")}
            style={{ minHeight: 44, border: "none", background: "none", color: C.accentText, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}
          >
            Just let me in — continue as guest
          </button>
          <div style={{ textAlign: "center", fontSize: 11.5, color: C.inkSoft, lineHeight: 1.5 }}>
            We never sell your data — to dealers or anyone.
          </div>
        </div>
      </div>
    );

  if (view === "account")
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "28px 24px", minHeight: 0 }}>
        <button onClick={() => setView("welcome")} style={{ alignSelf: "flex-start", minHeight: 44, background: "none", border: "none", color: C.inkSoft, fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 0 }}>← Back</button>
        <h1 style={{ fontFamily: heading, fontWeight: 600, fontSize: 26, margin: "12px 0 6px" }}>Phone or email</h1>
        <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 16, lineHeight: 1.5 }}>
          We'll send a one-time code. No password to invent.
        </div>
        <OtpForm onDone={() => setView("done")} autoFocus />
        <div style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 12, lineHeight: 1.5 }}>
          Used for sign-in and the alerts you choose. Nothing else. Ever.
        </div>
        <GhostBtn onClick={() => setView("guest")} style={{ marginTop: "auto" }}>
          Skip for now — continue as guest
        </GhostBtn>
      </div>
    );

  if (view === "guest")
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "28px 24px", minHeight: 0 }}>
        <Kicker color={C.green} style={{ marginTop: 12 }}>YOU'RE IN · GUEST</Kicker>
        <h1 style={{ fontFamily: heading, fontWeight: 600, fontSize: 28, lineHeight: 1.12, margin: "8px 0 6px" }}>
          Everything works.<br />Nothing leaves this phone.
        </h1>
        <div style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.55, marginBottom: 18 }}>
          Decode quotes, set your goal, save cars — all stored on this device only. Add an account later and everything
          you've built comes with you.
        </div>
        {[
          ["✓", C.green, "Deal Decoder — full, unlimited", C.ink],
          ["✓", C.green, "Your Goal and the Garage, on this phone", C.ink],
          ["–", C.amber, "Price-drop & day-60 alerts need an account — they reach you when the app is closed", C.inkSoft],
          ["–", C.amber, "Browser-extension saves need an account to sync here", C.inkSoft],
        ].map(([mk, mkc, t, tc], i, arr) => (
          <div key={t} style={{ display: "flex", gap: 12, fontSize: 13.5, padding: "9px 0", borderBottom: i < arr.length - 1 ? `1px dashed ${C.line}` : "none" }}>
            <span style={{ color: mkc, fontWeight: 800 }}>{mk}</span>
            <span style={{ color: tc }}>{t}</span>
          </div>
        ))}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: "auto" }}>
          <PrimaryBtn onClick={() => onAuth("guest")} height={50}>START DECODING →</PrimaryBtn>
          <GhostBtn onClick={() => setView("account")}>Sign in with a code instead</GhostBtn>
        </div>
      </div>
    );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "28px 24px", minHeight: 0 }}>
      <Kicker color={C.green} style={{ marginTop: 12 }}>SIGNED IN{authConfigured ? "" : " · SIMULATED"}</Kicker>
      <h1 style={{ fontFamily: heading, fontWeight: 600, fontSize: 28, lineHeight: 1.12, margin: "8px 0 6px" }}>You're in.</h1>
      <div style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.55 }}>
        Garage synced, alerts armed, extension connected. Next stop: your goal — five taps.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: "auto" }}>
        <PrimaryBtn onClick={() => onAuth("account")} height={50}>SET MY GOAL →</PrimaryBtn>
      </div>
    </div>
  );
}
