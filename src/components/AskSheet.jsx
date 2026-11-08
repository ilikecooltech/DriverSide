import React, { useEffect, useRef, useState } from "react";
import { C, D, mono, sans } from "../theme.js";
import { ASK_LIMITS, buildAskContext, contextLines, starters, underDailyCap } from "../data/ask.js";
import { track } from "../lib/analytics.js";

/* Ask: a floating button above the tab bar and a bottom sheet with a
   question box that knows where you are in the deal.

   - Shows only when the server says Ask is on (ANTHROPIC_API_KEY set).
   - The buyer sees exactly what Ask will use before sending.
   - The conversation lives in memory only. Closing the sheet keeps it;
     reloading the app clears it. Nothing is saved or sold.
   - Analytics get counts and the screen, never the question. */

const LOG_KEY = "driverside.askLog";
const readLog = () => { try { return JSON.parse(localStorage.getItem(LOG_KEY) || "[]"); } catch { return []; } };
const writeLog = (l) => { try { localStorage.setItem(LOG_KEY, JSON.stringify(l.slice(-ASK_LIMITS.perDay))); } catch { /* private mode */ } };

export function useAskOn() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let live = true;
    fetch("/api/ask").then((r) => r.json()).then((j) => live && setOn(Boolean(j?.on))).catch(() => {});
    return () => { live = false; };
  }, []);
  return on;
}

export function AskButton({ onOpen, dark = false, desktop = false }) {
  return (
    <button
      id="ds-ask-btn"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-label="Ask a question about your deal"
      style={{
        position: "fixed", zIndex: 21,
        bottom: "calc(72px + env(safe-area-inset-bottom))",
        right: `max(16px, calc(50% - ${desktop ? 380 : 260}px + 16px))`,
        display: "inline-flex", alignItems: "center", gap: 6, height: 48, padding: "0 18px 0 14px",
        border: dark ? `1px solid ${D.rule}` : "none", borderRadius: 24, cursor: "pointer",
        background: dark ? D.link : "#16233B", color: dark ? "#0F1826" : "#FFFFFF",
        boxShadow: "0 4px 14px rgba(22,35,59,0.28)", fontFamily: sans, fontSize: 15, fontWeight: 700,
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z" />
      </svg>
      Ask
    </button>
  );
}

export function AskSheet({ open, onClose, screen, setup, session, deal, car, garageCount, hasPass, onSeePass, desktop = false }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const dlgRef = useRef(null);

  const ctx = buildAskContext({ screen, setup, session, deal, car, garageCount, hasPass });
  const shared = contextLines(ctx);
  const ideas = starters(ctx);

  /* The browser's own modal dialog: the page behind becomes unreachable to
     keyboards and screen readers, Escape closes it, and on close focus goes
     back to the Ask button (WCAG 2.4.3). */
  useEffect(() => {
    const d = dlgRef.current;
    if (!d) return;
    if (open && !d.open) {
      try { d.showModal(); } catch { d.setAttribute("open", ""); }
      setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 30);
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);
  const onDialogClose = () => {
    if (open) onClose();
    document.getElementById("ds-ask-btn")?.focus();
  };
  /* Keep Tab cycling inside, so it never steps out to the browser's toolbar. */
  const wrapTab = (e) => {
    if (e.key !== "Tab") return;
    const f = [...dlgRef.current.querySelectorAll("button:not([disabled]), textarea, [href]")];
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }); }, [messages, busy]);

  const send = async (text) => {
    const q = String(text ?? draft).trim();
    if (!q || busy) return;
    if (!underDailyCap(readLog())) { setError("That's today's limit for Ask on this phone. It resets in 24 hours."); return; }
    setError(""); setDraft(""); setBusy(true);
    const history = messages;
    setMessages([...history, { role: "user", content: q }]);
    writeLog([...readLog(), Date.now()]);
    track("ask_sent", { screen: ctx.screen, starter: ideas.includes(q), turn: history.length / 2 + 1 });
    try {
      const r = await fetch("/api/ask", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q, messages: history, context: ctx }),
      });
      const j = await r.json().catch(() => ({}));
      if (j?.ok) { setMessages((m) => [...m, { role: "assistant", content: j.answer }]); track("ask_answered", { tier: j.tier }); }
      else { setError(j?.message || "Ask couldn't answer that just now. Try again."); setMessages(history); setDraft(q); }
    } catch {
      setError("Couldn't reach Ask. Check your connection and try again."); setMessages(history); setDraft(q);
    } finally {
      setBusy(false);
    }
  };

  const showsPassLine = (t) => !hasPass && /Deal Pass has the exact words/.test(t);

  return (
    <dialog
      ref={dlgRef}
      className={`ds-ask${desktop ? " ds-wide" : ""}`}
      aria-labelledby="ask-title"
      onClose={onDialogClose}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === dlgRef.current) onClose(); }}
      onKeyDown={wrapTab}
      style={{
        background: C.paper, color: C.ink, fontFamily: sans,
        borderTop: `3px solid #16233B`, boxShadow: "0 -8px 30px rgba(15,24,38,0.25)", paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 8px 10px 16px", borderBottom: `1px solid ${C.line}`, background: C.card }}>
          <div>
            <div style={{ fontFamily: mono, fontSize: 12, letterSpacing: "0.08em", color: C.inkSoft }}>ASK DRIVERSIDE</div>
            <h2 id="ask-title" style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>On your side, on your numbers</h2>
          </div>
          <button onClick={onClose} aria-label="Close Ask" style={{ width: 44, height: 44, border: "none", background: "none", fontSize: 26, lineHeight: 1, color: C.inkSoft, cursor: "pointer" }}>×</button>
        </div>

        <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          {shared.length > 0 && (
            <div style={{ background: C.neutralTint, padding: "10px 12px", fontSize: 12.5, lineHeight: 1.5 }}>
              <div style={{ fontFamily: mono, fontSize: 12, letterSpacing: "0.06em", color: C.inkSoft, marginBottom: 4 }}>ASK USES</div>
              {shared.map((l) => <div key={l}>{l}</div>)}
              <div style={{ color: C.inkSoft, marginTop: 4 }}>Never your name, contact info, the dealer's name or the VIN.</div>
            </div>
          )}

          {messages.length === 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 13, color: C.inkSoft }}>Try one of these, or ask your own.</div>
              {ideas.map((q) => (
                <button key={q} onClick={() => send(q)} disabled={busy} style={{ textAlign: "left", minHeight: 44, padding: "10px 12px", border: `1px solid ${C.line}`, background: C.card, color: C.accentText, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: sans }}>
                  {q}
                </button>
              ))}
            </div>
          )}

          {messages.map((m, i) => (
            m.role === "user" ? (
              <div key={i} style={{ alignSelf: "flex-end", maxWidth: "85%", background: "#16233B", color: "#FFFFFF", padding: "9px 12px", fontSize: 14.5, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>{m.content}</div>
            ) : (
              <div key={i} style={{ alignSelf: "flex-start", maxWidth: "92%", background: C.card, border: `1px solid ${C.line}`, padding: "10px 12px", fontSize: 14.5, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
                {m.content}
                {showsPassLine(m.content) && onSeePass && (
                  <button onClick={() => { onSeePass(); track("ask_pass_tapped", {}); }} style={{ display: "block", marginTop: 8, padding: 0, border: "none", background: "none", color: C.accentText, fontWeight: 700, fontSize: 13.5, cursor: "pointer", fontFamily: sans }}>
                    See what the Deal Pass includes ›
                  </button>
                )}
              </div>
            )
          ))}
          {busy && <div aria-live="polite" style={{ alignSelf: "flex-start", fontFamily: mono, fontSize: 11, color: C.inkSoft, letterSpacing: "0.08em" }}>THINKING…</div>}
          {error && <div role="alert" style={{ background: C.amberBg, color: C.amberDark, padding: "10px 12px", fontSize: 13, fontWeight: 600 }}>{error}</div>}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); send(); }} style={{ borderTop: `1px solid ${C.line}`, background: C.card, padding: "10px 12px 8px" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <label htmlFor="ask-input" style={{ position: "absolute", left: -9999 }}>Your question</label>
            <textarea
              id="ask-input" ref={inputRef} value={draft} rows={1}
              onChange={(e) => setDraft(e.target.value.slice(0, ASK_LIMITS.question))}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={messages.length ? "Ask a follow-up" : "Ask about your deal"}
              style={{ flex: 1, minHeight: 48, maxHeight: 120, resize: "none", padding: "12px", border: `1.5px solid ${C.line}`, background: C.paper, color: C.ink, fontSize: 15, fontFamily: sans, boxSizing: "border-box" }}
            />
            <button type="submit" disabled={busy || !draft.trim()} aria-label="Send" style={{ width: 52, minHeight: 48, border: "none", background: busy || !draft.trim() ? C.line : C.accent, color: "#FFFFFF", fontSize: 20, cursor: busy || !draft.trim() ? "default" : "pointer" }}>↑</button>
          </div>
          <div style={{ fontSize: 11, color: C.inkSoft, marginTop: 6, lineHeight: 1.4 }}>
            Ask can be wrong. Check the numbers before you sign. Your questions aren't saved or sold.
          </div>
        </form>
    </dialog>
  );
}
