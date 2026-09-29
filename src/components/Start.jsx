import React, { useEffect, useState } from "react";
import { C, mono, heading, highlight } from "../theme.js";
import { JOURNEY_DOORS, resumeSummary, statsFromShop, planSteps } from "../data/start.js";
import { affordability } from "../data/tools.js";
import { OtpForm } from "./OtpForm.jsx";
import { PassAnchor } from "./Paywall.jsx";
import { GhostBtn } from "./ui.jsx";

/* Phase 1 — Start.

   Replaces the old welcome screen and the guest interstitial behind it.
   That flow asked the same question twice — "SKIP FOR NOW" and "continue
   as guest" were one door wearing two coats — and made everyone settle an
   account decision before seeing anything. This one opens with the work
   instead: five doors, one per place a buyer can actually be standing.

   Guest-first is structural here rather than a button. There is no gate
   to clear; every door goes straight in. The account is one quiet line at
   the bottom, which is the whole of its presence on this screen. */

const TRUST = ["NO ACCOUNT NEEDED", "STAYS ON THIS PHONE", "NEVER SOLD TO DEALERS"];

/* The strip wants live inventory numbers, but a MarketCheck call on every
   landing view would spend the rate limit on decoration. One call, then
   six hours off the device's own copy. */
const STATS_CACHE = "ds_start_stats";
const STATS_TTL = 6 * 60 * 60 * 1000;

function readCachedStats(zip) {
  try {
    const raw = JSON.parse(localStorage.getItem(STATS_CACHE) || "null");
    if (raw && raw.zip === zip && Date.now() - raw.at < STATS_TTL) return raw.tiles;
  } catch {
    /* private mode, or someone cleared it — just refetch */
  }
  return null;
}

function writeCachedStats(zip, tiles) {
  try {
    localStorage.setItem(STATS_CACHE, JSON.stringify({ at: Date.now(), zip, tiles }));
  } catch {
    /* nothing to do; the strip refetches next time */
  }
}

/* Line icons for the doors. No emoji: they render differently on every
   phone and read as decoration. */
const DOOR_ICONS = {
  shop: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4",
  garage: "M3 21V9l9-5 9 5v12M7 21v-7h10v7M7 17h10",
  finance: "M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8 7h8M8 11h2M12 11h2M8 15h2M12 15h2",
  quote: "M6 3h9l4 4v14H6zM15 3v4h4M9 12h7M9 16h7",
  bought: "M20 6L9 17l-5-5",
};

function DoorIcon({ k }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={DOOR_ICONS[k] || DOOR_ICONS.shop} />
    </svg>
  );
}

export function Start({ cars, archetypeName, setup, onEnter, onSignedIn, hasPass = false, onOpenPass, signedIn = false, userName = null, watchingCount = 0, hasDeal = false, dealerSession = null }) {
  const zip = setup?.zip || "77471";
  const [tiles, setTiles] = useState(() => readCachedStats(zip) || []);
  const [signIn, setSignIn] = useState(false);
  const resume = resumeSummary({ cars, archetypeName });
  const afford = affordability({ budget: setup?.budget, down: setup?.down, apr: setup?.aprSet ? setup?.apr : null, term: setup?.term });
  const plan = planSteps({ setup, cars, watchingCount, hasDeal, affordMax: afford?.maxPrice || null });
  const doneCount = plan.filter((s) => s.done).length;
  /* The checklist leads the page for everyone: it is the whole purchase
     on one card, and each step opens the screen that finishes it. */
  const showPlan = plan.length > 0;

  useEffect(() => {
    if (tiles.length) return;
    let dead = false;
    const q = new URLSearchParams({ zip: String(zip), radius: String(setup?.radius || 100) });
    fetch("/api/shop?" + q)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (dead || !d) return;
        const next = statsFromShop(d);
        if (next.length) {
          setTiles(next);
          writeCachedStats(zip, next);
        }
      })
      .catch(() => {
        /* no strip is fine — it is not load-bearing */
      });
    return () => {
      dead = true;
    };
  }, []);

  // Signed in while the form was open (or it was opened by mistake): go home.
  useEffect(() => { if (signedIn && signIn) setSignIn(false); }, [signedIn, signIn]);

  if (signIn && !signedIn)
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "24px 20px", minHeight: 0, overflowY: "auto" }}>
        <button
          onClick={() => setSignIn(false)}
          style={{ alignSelf: "flex-start", minHeight: 44, background: "none", border: "none", color: C.inkSoft, fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 0 }}
        >
          ← Back
        </button>
        <h1 style={{ fontFamily: heading, fontWeight: 600, fontSize: 26, margin: "12px 0 6px" }}>Phone or email</h1>
        <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 16, lineHeight: 1.5 }}>
          We&apos;ll send a one-time code. No password to invent.
        </div>
        <OtpForm onDone={(session) => onSignedIn(session)} autoFocus />
        <GhostBtn onClick={() => setSignIn(false)} style={{ marginTop: "auto" }}>
          Not now — just let me in
        </GhostBtn>
      </div>
    );


  return (
    <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
      {/* ── hero ── */}
      <div style={{ padding: "22px 16px 16px", borderBottom: `1px solid ${C.line}` }}>
        <h1 style={{ fontFamily: heading, fontWeight: 700, fontSize: 34, lineHeight: 1.05, margin: 0, maxWidth: "16ch" }}>
          Where are you <span style={highlight(0.36)}>in the process?</span>
        </h1>
        <p style={{ color: C.inkSoft, fontSize: 14, marginTop: 8, marginBottom: 0, lineHeight: 1.5, maxWidth: "46ch" }}>
          Pick where you are. You can jump anywhere later.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
          {TRUST.map((t) => (
            <span
              key={t}
              style={{ fontFamily: mono, fontSize: 9, letterSpacing: "0.05em", color: C.green, background: C.greenBg, padding: "3px 8px" }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* ── signed in: a greeting, and the plan built from what's on the device ── */}
      {signedIn && (
        <div style={{ margin: "14px 16px 0", background: C.greenBg, padding: "12px 13px" }}>
          <div style={{ fontFamily: heading, fontWeight: 700, fontSize: 20 }}>Welcome back{userName ? `, ${userName}` : ""}.</div>
          <div style={{ fontSize: 12.5, color: C.ink, marginTop: 2, lineHeight: 1.5 }}>
            {watchingCount ? `Watching ${watchingCount} price${watchingCount === 1 ? "" : "s"} for drops and the 60-day mark.` : "Watch a price from any car's page and we'll keep an eye on it."}
          </div>
        </div>
      )}
      {showPlan && (
        <div style={{ margin: "14px 16px 0", border: `1px solid ${C.line}`, background: C.card, padding: "12px 13px 4px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <h2 style={{ fontFamily: heading, fontWeight: 700, fontSize: 20, margin: 0 }}>Your plan</h2>
            <span style={{ fontFamily: mono, fontSize: 10, color: C.green }}>{doneCount} OF {plan.length} DONE</span>
          </div>
          <div aria-hidden="true" style={{ height: 5, background: C.line, margin: "8px 0 4px" }}>
            <div style={{ height: 5, width: `${(doneCount / plan.length) * 100}%`, background: C.greenFill }} />
          </div>
          {plan.map((s) => (
            <button
              key={s.key}
              onClick={() => onEnter(s.dest)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, minHeight: 50, padding: "6px 0", border: "none", borderTop: `1px solid ${C.line}`, background: "none", cursor: "pointer", textAlign: "left", color: C.ink, fontFamily: "inherit" }}
            >
              <span aria-hidden="true" style={{ width: 22, height: 22, flexShrink: 0, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, background: s.done ? C.greenFill : "transparent", color: "#fff", border: `2px solid ${s.done ? C.greenFill : C.dash}`, boxSizing: "border-box" }}>{s.done ? "✓" : ""}</span>
              <span style={{ flex: 1 }}>
                <b style={{ display: "block", fontSize: 14 }}>{s.title}<span style={{ position: "absolute", left: -9999 }}>{s.done ? ", done" : ", to do"}</span></b>
                <span style={{ display: "block", fontSize: 12, color: C.inkSoft }}>{s.line}</span>
              </span>
              <span aria-hidden="true" style={{ color: C.accentText, fontWeight: 700 }}>›</span>
            </button>
          ))}
        </div>
      )}

      {/* ── returning buyer: only what's actually on the device ── */}
      {resume && (
        <div style={{ margin: "14px 16px 0", border: `1px solid ${C.green}`, background: C.greenBg, padding: "12px 13px" }}>
          <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: "0.07em", color: C.green }}>
            WELCOME BACK — PICK UP WHERE YOU LEFT OFF
          </div>
          <div style={{ fontFamily: heading, fontWeight: 600, fontSize: 17, marginTop: 3 }}>{resume.title}</div>
          <p style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 3, marginBottom: 0, lineHeight: 1.5 }}>{resume.line}</p>
          <button
            onClick={() => onEnter(resume.dest)}
            style={{ marginTop: 9, background: C.green, color: "#fff", border: "none", fontFamily: heading, fontWeight: 600, fontSize: 13.5, padding: "9px 14px", minHeight: 44, cursor: "pointer" }}
          >
            {resume.cta}
          </button>
        </div>
      )}

      {/* ── the doors, as tiles: two across on a phone, three on a wide
          screen. The dealer tile is dark and first: someone at a desk
          right now has the least time and the most to lose. ── */}
      <div style={{ padding: "16px 16px 8px" }}>
        <h2 style={{ fontFamily: heading, fontWeight: 700, fontSize: 21, margin: "0 0 10px" }}>{showPlan ? "Jump to" : "Start wherever you are"}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
          {JOURNEY_DOORS.map((door) => {
            /* A live dealer session turns the dealer tile into the way back to it. */
            const d = door.key === "dealer" && dealerSession
              ? { ...door, title: "Back to your session", blurb: dealerSession.car?.title || "Your dealer session is live.", cta: "RESUME →", dest: { tab: "dealer", dealView: "live" } }
              : door;
            return (
            <button
              key={d.key}
              onClick={() => onEnter(d.dest)}
              style={{
                minHeight: 132, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 8,
                padding: 14, textAlign: "left", cursor: "pointer", fontFamily: "inherit",
                background: d.urgent ? C.ink : C.card, color: d.urgent ? "#F3F6F9" : C.ink,
                border: `1px solid ${d.urgent ? C.ink : C.line}`,
              }}
            >
              <span style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span aria-hidden="true" style={{ height: 22, display: "flex", alignItems: "center", color: C.accent }}>
                  {d.urgent
                    ? <span className="ds-pulse" style={{ width: 10, height: 10, borderRadius: "50%", background: C.onNavySuccess, display: "block" }} />
                    : <DoorIcon k={d.key} />}
                </span>
                <b style={{ fontFamily: heading, fontWeight: 600, fontSize: 19, lineHeight: 1.12 }}>{d.title}</b>
                <span style={{ fontSize: 13, lineHeight: 1.4, color: d.urgent ? "#B9C6D6" : C.inkSoft }}>{d.blurb}</span>
              </span>
              <span style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: "0.06em", fontWeight: 700, color: d.urgent ? C.onNavySuccess : C.accentText }}>{d.cta}</span>
            </button>
            );
          })}
        </div>
      </div>

      {/* ── the pass, anchored at the front ──
          Below the doors on purpose: the doors are the guest-first
          promise and nothing may displace them. But it sits above the
          fold-end so the pass is introduced here rather than sprung at
          the moment of asking for money. */}
      {!hasPass && onOpenPass && <PassAnchor variant="start" onOpen={onOpenPass} />}

      {/* ── stats: only the ones we can source ── */}
      {tiles.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${tiles.length}, 1fr)`, gap: 8, padding: "8px 16px 16px" }}>
          {tiles.map((s) => (
            <div key={s.key} style={{ border: `1px solid ${C.line}`, background: C.card, padding: "10px 11px" }}>
              <div style={{ fontFamily: heading, fontWeight: 700, fontSize: 18 }}>{s.value}</div>
              <div style={{ fontFamily: mono, fontSize: 8.5, letterSpacing: "0.04em", color: C.inkSoft, marginTop: 2, lineHeight: 1.4 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── the account, in one quiet line ── */}
      {signedIn ? (
        <div style={{ padding: "0 16px 22px", fontSize: 12, color: C.inkSoft, textAlign: "center", lineHeight: 1.6 }}>
          Signed in{userName ? ` as ${userName}` : ""}. Your garage and numbers follow you.{" "}
          <button
            onClick={() => onEnter({ tab: "profile" })}
            style={{ background: "none", border: "none", font: "inherit", color: C.accentText, fontWeight: 700, cursor: "pointer", textDecoration: "underline", display: "inline-block", padding: "13px 6px", margin: "-13px -2px" }}
          >
            Profile
          </button>
        </div>
      ) : (
      <div style={{ padding: "0 16px 22px", fontSize: 12, color: C.inkSoft, textAlign: "center", lineHeight: 1.6 }}>
        Works without an account. Add one later and everything you&apos;ve built comes with you.{" "}
        <button
          onClick={() => setSignIn(true)}
          /* Inline in the sentence, but still a real tap target: the
             padding buys the 44px hit area and the negative margin gives
             the line its spacing back. */
          style={{ background: "none", border: "none", font: "inherit", color: C.accentText, fontWeight: 700, cursor: "pointer", textDecoration: "underline", display: "inline-block", padding: "13px 6px", margin: "-13px -2px" }}
        >
          Sign in
        </button>
      </div>
      )}
    </div>
  );
}
