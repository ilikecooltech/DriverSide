import React, { useState, useRef, useEffect } from "react";
import { C, mono } from "../theme.js";
import { sendOtp, verifyOtp } from "../lib/supabase.js";
import { PrimaryBtn, GhostBtn } from "./ui.jsx";

/* The account door, in one reusable piece: a field that takes a phone
   number or an email, then a 6-digit code. Shared by the login screen
   and by the at-point-of-need sign-in prompt a guest hits, so there is
   exactly one implementation of "prove it's you" in the app.

   onDone() fires on a verified session (or on a simulated one when no
   Supabase keys are set, so the prototype still walks end to end). */

/* Pretty-prints the destination we sent the code to. */
export function prettyDest(kind, value) {
  if (kind !== "phone") return value;
  const d = String(value).replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  return value;
}

/* Supabase's own text here is developer-facing; translate the ones a
   buyer can actually hit into something honest and actionable. */
function sendMessage(r) {
  const m = r.error?.message || "";
  if (r.kind === "phone" && /provider|sms|not enabled|unsupported/i.test(m))
    return "Text-message sign-in isn't switched on yet. Use your email instead.";
  if (/rate|too many/i.test(m)) return "Too many tries. Wait a minute and try again.";
  return m || "Couldn't send the code. Try again.";
}

export function OtpForm({ onDone, sendLabel = "SEND MY CODE", autoFocus = false }) {
  const [step, setStep] = useState("identifier"); // identifier | code
  const [identifier, setIdentifier] = useState("");
  const [dest, setDest] = useState(null); // { kind, value } — what we sent to
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);
  const codeRef = useRef(null);

  useEffect(() => {
    if (step === "code") codeRef.current?.focus();
  }, [step]);

  /* Step 1 — send. One field takes either channel; the parse lives in
     lib/supabase.js so the phone/email rules stay testable. */
  const send = async (resend = false) => {
    setError(null);
    setNote(null);
    setBusy(resend ? "resend" : "send");
    try {
      const r = await sendOtp(identifier);
      if (r.kind === "invalid") { setError(r.reason); return; }
      setDest({ kind: r.kind, value: r.value });
      if (r.simulated) { onDone(); return; }
      if (r.error) { setError(sendMessage(r)); return; }
      setCode("");
      setStep("code");
      if (resend) setNote("New code sent.");
    } catch {
      setError("Couldn't send the code. Try again.");
    } finally {
      setBusy(null);
    }
  };

  /* Step 2 — verify. A correct code returns a session; App also listens
     on onAuthStateChange, so this is belt-and-braces, not the only path. */
  const verify = async () => {
    setError(null);
    setNote(null);
    setBusy("verify");
    try {
      const r = await verifyOtp({ ...dest, token: code });
      if (r?.simulated) { onDone(); return; }
      if (r?.error) {
        setError(
          /expired|invalid/i.test(r.error.message || "")
            ? "That code didn't work. Check it, or send a new one."
            : r.error.message || "Couldn't verify that code."
        );
        return;
      }
      onDone(r.session || null);
    } catch {
      setError("Couldn't verify that code. Try again.");
    } finally {
      setBusy(null);
    }
  };

  const field = { minHeight: 50, border: `1.5px solid ${C.line}`, background: C.card, padding: "0 14px", fontSize: 15, fontFamily: mono, color: C.ink, width: "100%", boxSizing: "border-box" };
  const errorBox = error && (
    <div style={{ background: C.amberBg, color: C.amberDark, padding: "10px 12px", fontSize: 12.5, fontWeight: 600, lineHeight: 1.45, marginTop: 8 }}>{error}</div>
  );

  if (step === "identifier")
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {errorBox}
        <label htmlFor="ds-identifier" style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.1em", color: C.inkSoft }}>
          PHONE OR EMAIL
        </label>
        <input
          id="ds-identifier"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !busy && send()}
          placeholder="(555) 123-4567 or you@example.com"
          type="text"
          inputMode="email"
          autoComplete="username"
          autoFocus={autoFocus}
          style={field}
        />
        <PrimaryBtn onClick={() => send()} height={50}>
          {busy === "send" ? "SENDING…" : sendLabel}
        </PrimaryBtn>
      </div>
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.5 }}>
        We sent a 6-digit code to{" "}
        <span style={{ fontFamily: mono, color: C.ink }}>{dest ? prettyDest(dest.kind, dest.value) : ""}</span>.
        {dest?.kind === "email" ? " It expires in an hour." : " It expires in a few minutes."}
      </div>
      <input
        ref={codeRef}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        onKeyDown={(e) => e.key === "Enter" && !busy && verify()}
        placeholder="123456"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        style={{ ...field, fontSize: 22, letterSpacing: "0.35em", textAlign: "center" }}
      />
      {errorBox}
      {note && (
        <div style={{ background: C.greenBg, color: C.green, padding: "10px 12px", fontSize: 12.5, fontWeight: 600 }}>{note}</div>
      )}
      <PrimaryBtn onClick={verify} height={50}>
        {busy === "verify" ? "CHECKING…" : "VERIFY & SIGN IN"}
      </PrimaryBtn>
      <GhostBtn onClick={() => send(true)}>{busy === "resend" ? "Sending…" : "Send a new code"}</GhostBtn>
      <button
        onClick={() => { setStep("identifier"); setError(null); setNote(null); }}
        style={{ minHeight: 44, border: "none", background: "none", color: C.inkSoft, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
      >
        ← Use a different phone or email
      </button>
    </div>
  );
}
