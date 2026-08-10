import React, { useState } from "react";
import { C, mono, heading } from "../theme.js";
import { authConfigured, signInWithProvider, signInWithEmail } from "../lib/supabase.js";
import { Kicker, PrimaryBtn, GhostBtn } from "./ui.jsx";

/* 4b — login with a first-class guest door. Guest states honestly what
   works (everything) and what an account buys (alerts, extension sync).
   Email is magic-link only. Backed by Supabase when configured; the
   prototype simulates sign-in with no keys set. */

export function Login({ onAuth }) {
  const [view, setView] = useState("welcome"); // welcome | email | sent | guest | done
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  /* Real OAuth navigates away and returns via the redirect; the session
     is picked up on load. Without Supabase keys we simulate so the demo
     still walks end to end. */
  const oauth = async (provider) => {
    setError(null);
    setBusy(provider);
    try {
      const r = await signInWithProvider(provider);
      if (r?.simulated) { setView("done"); return; }
      if (r?.error) {
        setError(
          r.error.message?.includes("provider")
            ? `${provider === "apple" ? "Apple" : "Google"} sign-in isn't enabled yet. Use email or continue as guest.`
            : r.error.message || "Sign-in failed. Try email or guest."
        );
      }
    } catch {
      setError("Sign-in failed. Try email or continue as guest.");
    } finally {
      setBusy(null);
    }
  };

  const magicLink = async () => {
    if (!email.includes("@")) { setError("That doesn't look like an email address."); return; }
    setError(null);
    setBusy("email");
    try {
      const r = await signInWithEmail(email);
      if (r?.simulated) { setView("done"); return; }
      if (r?.error) setError(r.error.message || "Couldn't send the link. Try again.");
      else setView("sent");
    } catch {
      setError("Couldn't send the link. Try again.");
    } finally {
      setBusy(null);
    }
  };

  const solidBtn = { minHeight: 50, border: `1.5px solid ${C.ink}`, background: C.ink, color: "#fff", fontSize: 14.5, fontWeight: 700, cursor: "pointer" };
  const lineBtn = { minHeight: 50, border: `1.5px solid ${C.line}`, background: C.card, color: C.ink, fontSize: 14.5, fontWeight: 700, cursor: "pointer" };

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
          <button onClick={() => oauth("apple")} disabled={Boolean(busy)} style={solidBtn}>
            {busy === "apple" ? "Opening Apple…" : " Continue with Apple"}
          </button>
          <button onClick={() => oauth("google")} disabled={Boolean(busy)} style={lineBtn}>
            {busy === "google" ? "Opening Google…" : "Continue with Google"}
          </button>
          <button onClick={() => setView("email")} style={lineBtn}>Continue with email</button>
          <button onClick={() => setView("guest")} style={{ minHeight: 48, border: "none", background: "none", color: C.accentText, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            Just let me in — continue as guest
          </button>
          <div style={{ textAlign: "center", fontSize: 11.5, color: C.inkSoft, lineHeight: 1.5 }}>
            No account needed to decode a quote.<br />We never sell your data — to dealers or anyone.
          </div>
        </div>
      </div>
    );

  if (view === "email")
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "28px 24px", minHeight: 0 }}>
        <button onClick={() => setView("welcome")} style={{ alignSelf: "flex-start", minHeight: 44, background: "none", border: "none", color: C.inkSoft, fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 0 }}>← Back</button>
        <h1 style={{ fontFamily: heading, fontWeight: 600, fontSize: 26, margin: "12px 0 6px" }}>Your email</h1>
        <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 16 }}>We'll send a sign-in link. No password to invent.</div>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && magicLink()}
          placeholder="you@example.com"
          type="email"
          style={{ minHeight: 50, border: `1.5px solid ${C.line}`, background: C.card, padding: "0 14px", fontSize: 15, fontFamily: mono, color: C.ink, width: "100%", boxSizing: "border-box" }}
        />
        {error && (
          <div style={{ background: C.amberBg, color: C.amberDark, padding: "10px 12px", fontSize: 12.5, fontWeight: 600, marginTop: 10 }}>{error}</div>
        )}
        <PrimaryBtn onClick={magicLink} height={50} style={{ marginTop: 10 }}>
          {busy === "email" ? "SENDING…" : "SEND MY LINK"}
        </PrimaryBtn>
        <div style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 12, lineHeight: 1.5 }}>Used for sign-in and the alerts you choose. Nothing else. Ever.</div>
      </div>
    );

  if (view === "sent")
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "28px 24px", minHeight: 0 }}>
        <Kicker color={C.green} style={{ marginTop: 12 }}>LINK SENT</Kicker>
        <h1 style={{ fontFamily: heading, fontWeight: 600, fontSize: 28, lineHeight: 1.12, margin: "8px 0 6px" }}>Check your email.</h1>
        <div style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.55 }}>
          Tap the link on this device and you're in. The link expires in an hour.
        </div>
        <GhostBtn onClick={() => setView("welcome")} style={{ marginTop: "auto" }}>← Different way in</GhostBtn>
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
          Decode quotes, set your goal, save cars — all stored on this device only.
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
          <GhostBtn onClick={() => setView("welcome")}>Create an account instead</GhostBtn>
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
