import React, { useEffect, useState } from "react";
import { C, mono, heading } from "../theme.js";
import { JOURNEY_DOORS, resumeSummary, statsFromShop } from "../data/start.js";
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

export function Start({ cars, archetypeName, setup, onEnter, onSignedIn, hasPass = false, onOpenPass }) {
  const zip = setup?.zip || "77471";
  const [tiles, setTiles] = useState(() => readCachedStats(zip) || []);
  const [signIn, setSignIn] = useState(false);
  const resume = resumeSummary({ cars, archetypeName });

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

  if (signIn)
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

  const card = {
    border: `1px solid ${C.line}`,
    background: C.card,
    padding: 13,
    width: "100%",
    textAlign: "left",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 9,
    fontFamily: "inherit",
    color: C.ink,
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
      {/* ── hero ── */}
      <div style={{ padding: "22px 16px 16px", borderBottom: `1px solid ${C.line}` }}>
        <h1 style={{ fontFamily: heading, fontWeight: 600, fontSize: 30, lineHeight: 1.1, margin: 0, maxWidth: "18ch" }}>
          Buying a car? Good. You brought backup.
        </h1>
        <p style={{ color: C.inkSoft, fontSize: 13.5, marginTop: 8, lineHeight: 1.55, maxWidth: "46ch" }}>
          The dealer has software, training, and the home field. DriverSide reads the live market, decodes their
          paperwork, and hands you the words — at every step from &quot;just looking&quot; to signing day.
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
            style={{ marginTop: 9, background: C.green, color: "#fff", border: "none", fontFamily: heading, fontWeight: 600, fontSize: 13.5, padding: "9px 14px", minHeight: 40, cursor: "pointer" }}
          >
            {resume.cta}
          </button>
        </div>
      )}

      {/* ── the five doors ── */}
      <div style={{ padding: "16px 16px 8px" }}>
        <h2 style={{ fontFamily: heading, fontWeight: 600, fontSize: 19, margin: 0 }}>Start wherever you are.</h2>
        <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 2, marginBottom: 12 }}>
          Every door leads to the same toolbox — nothing here is a funnel.
        </div>

        {JOURNEY_DOORS.map((d) => (
          <button
            key={d.key}
            onClick={() => onEnter(d.dest)}
            style={d.urgent ? { ...card, background: C.ink, border: `1px solid ${C.ink}`, color: "#F3F6F9" } : card}
          >
            <span
              aria-hidden="true"
              style={{ fontSize: 20, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", width: 22 }}
            >
              {d.urgent ? (
                <span className="ds-pulse" style={{ width: 9, height: 9, borderRadius: "50%", background: C.onNavySuccess, display: "block" }} />
              ) : (
                d.icon
              )}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <b style={{ fontFamily: heading, fontWeight: 600, fontSize: 16, display: "block" }}>{d.title}</b>
              <span style={{ fontSize: 12.5, color: d.urgent ? "#B9C6D6" : C.inkSoft, display: "block", marginTop: 1, lineHeight: 1.45 }}>
                {d.blurb}
              </span>
            </span>
            <span
              style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: "0.05em", color: d.urgent ? C.onNavySuccess : C.accentText, whiteSpace: "nowrap", flexShrink: 0 }}
            >
              {d.cta}
            </span>
          </button>
        ))}
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
    </div>
  );
}
