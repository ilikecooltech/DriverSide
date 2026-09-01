import React, { useState } from "react";
import { C, mono, heading, fmt } from "../theme.js";
import { Kicker } from "./ui.jsx";
import { PRICING, dollars, activePriceCents, guaranteeCents, valueReceipt, FREE_FOREVER_COPY } from "../data/pass.js";

/* The Deal Pass paywall.

   It sells against the buyer's own numbers, computed from this session —
   never a feature list. The receipt above the price is everything we
   already found for free, so the ask is framed against thousands already
   on the table rather than against nothing.

   The free/paid boundary is printed inside the paywall itself. That is
   the point of the whole product: a skeptic reading "the pass buys words,
   never the truth" while looking at a free decode is the only argument
   that answers "is this just another meter?".

   Placement is the scripts step, after the first script has been given in
   full and copyable. Nobody is asked to pay before they have used the
   thing they would be paying for. */

export function Paywall({ deal, median, context, onBuy, onRedeem, onClose, testMode = true, busy = null, error = null }) {
  const [code, setCode] = useState("");
  const receipt = valueReceipt(deal, median);
  const price = activePriceCents();

  const row = { display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 12.5, padding: "5px 0", color: C.inkSoft };
  const amt = { fontFamily: mono, color: C.ink };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 16, minHeight: 0 }}>
      <div style={{ border: `1px solid ${C.line}`, background: C.card }}>
        {/* ── head: what it is, what it costs ── */}
        <div style={{ padding: "13px 14px", borderBottom: `1px solid ${C.line}`, display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <b style={{ fontFamily: heading, fontWeight: 700, fontSize: 16 }}>Deal Pass — this deal, everything</b>
          <span style={{ fontFamily: heading, fontWeight: 700, fontSize: 20, color: C.amber, display: "flex", alignItems: "baseline", gap: 5 }}>
            {PRICING.foundingActive && (
              <s style={{ color: C.inkSoft, fontWeight: 400, fontSize: 14 }}>{dollars(PRICING.listCents)}</s>
            )}
            {dollars(price)}
            <small style={{ fontSize: 11, fontWeight: 400, color: C.inkSoft }}>one time</small>
            {PRICING.foundingActive && (
              <span style={{ fontFamily: mono, fontSize: 8.5, letterSpacing: "0.06em", color: "#fff", background: C.amber, padding: "3px 6px" }}>
                FOUNDING PRICE
              </span>
            )}
          </span>
        </div>

        {/* ── the receipt: their own money, found free ── */}
        {receipt.rows.length > 0 && (
          <div style={{ padding: "10px 14px 4px" }}>
            <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: "0.07em", color: C.accentText, marginBottom: 5 }}>
              WHAT THIS SHEET IS HIDING — FOUND SO FAR, FREE
            </div>
            {receipt.rows.map((r) => (
              <div key={r.key} style={row}>
                <span>{r.label}</span>
                <b style={amt}>{fmt(r.amount)}</b>
              </div>
            ))}
            <div style={{ ...row, borderTop: `1px solid ${C.line}`, marginTop: 4, paddingTop: 8, color: C.ink, fontWeight: 600 }}>
              <span>On the table right now</span>
              <b style={{ ...amt, color: C.green, fontSize: 14, fontWeight: 800 }}>{fmt(receipt.total)}</b>
            </div>
          </div>
        )}

        <div style={{ padding: "8px 14px 0", fontSize: 11.5, color: C.inkSoft, lineHeight: 1.55 }}>
          The pass unlocks the rest of the arsenal for this negotiation: every script with your live numbers, an F&amp;I
          rebuttal for each add-on, email &amp; text templates if you&apos;d rather not say it out loud, counters that
          rewrite as the rounds move, and a practice run before it counts.
        </div>

        <button
          onClick={onBuy}
          disabled={Boolean(busy)}
          style={{
            width: "calc(100% - 28px)", margin: "12px 14px 0", minHeight: 52, border: "none",
            background: C.ink, color: "#fff", fontFamily: heading, fontWeight: 600, fontSize: 17,
            letterSpacing: "0.02em", cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1,
          }}
        >
          {busy === "buy" ? "OPENING CHECKOUT…" : `UNLOCK THIS DEAL — ${dollars(price)}`}
        </button>

        {/* Held for now — see PRICING.guaranteeActive. */}
        {PRICING.guaranteeActive && (
          <div style={{ margin: "10px 14px 0", background: C.greenBg, padding: "9px 11px", fontSize: 11.5, color: C.green, lineHeight: 1.5 }}>
            <b style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: "0.05em" }}>THE {dollars(guaranteeCents())} PROMISE</b> — if this
            pass doesn&apos;t show you at least {dollars(guaranteeCents())} in this deal, it&apos;s free. Automatic. No forms.
          </div>
        )}

        {/* ── promo ── */}
        <form
          onSubmit={(e) => { e.preventDefault(); onRedeem(code); }}
          style={{ display: "flex", gap: 8, margin: "10px 14px 0" }}
        >
          <label htmlFor="ds-promo" style={{ position: "absolute", left: -9999 }}>Promo code</label>
          <input
            id="ds-promo"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="HAVE A CODE?"
            autoComplete="off"
            style={{ flex: 1, minHeight: 44, border: `1px solid ${C.line}`, background: C.paper, padding: "0 11px", fontFamily: mono, fontSize: 12, letterSpacing: "0.04em", color: C.ink, boxSizing: "border-box" }}
          />
          <button
            type="submit"
            disabled={Boolean(busy)}
            style={{ minHeight: 44, padding: "0 14px", border: `1px solid ${C.ink}`, background: C.card, color: C.ink, fontFamily: mono, fontSize: 10.5, letterSpacing: "0.06em", fontWeight: 700, cursor: busy ? "default" : "pointer" }}
          >
            {busy === "redeem" ? "…" : "APPLY"}
          </button>
        </form>
        {error && (
          <div role="alert" style={{ margin: "6px 14px 0", fontFamily: mono, fontSize: 10.5, letterSpacing: "0.03em", color: C.red }}>
            {error}
          </div>
        )}

        <div style={{ textAlign: "center", fontSize: 11.5, color: C.inkSoft, padding: "10px 14px 8px" }}>
          Shopping more than one car?{" "}
          <span style={{ textDecoration: "underline" }}>
            Every deal for {PRICING.bundleDays} days — {dollars(PRICING.bundleCents)}
          </span>
        </div>

        {/* ── the boundary, printed where it is being tested ── */}
        <div style={{ background: C.greenBg, borderTop: `1px solid ${C.line}`, padding: "10px 14px", fontSize: 11.5, color: C.inkSoft, lineHeight: 1.55 }}>
          <b style={{ fontFamily: mono, fontSize: 9, letterSpacing: "0.05em", color: C.green }}>FREE FOREVER</b>
          {FREE_FOREVER_COPY.replace(/^FREE FOREVER/, "")}
        </div>
      </div>

      <button
        onClick={onClose}
        style={{ width: "100%", minHeight: 44, marginTop: 10, background: "none", border: "none", color: C.inkSoft, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
      >
        Not now
      </button>

      {testMode && (
        <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: "0.1em", color: C.dash, textAlign: "center", paddingBottom: 8 }}>
          TEST MODE · NO PAYMENT PROVIDER CONFIGURED · NO CHARGE
        </div>
      )}
    </div>
  );
}

/* ── The front anchor ───────────────────────────────────────────────────
   The pass is introduced at the front of the experience so nobody meets
   it for the first time at the moment of being asked for money. It is an
   anchor, not a wall: it explains what the pass is and deep-links to the
   same paywall, and every truth surface behind it stays open with no pass
   and no account.

   Two placements, one component. `variant="start"` sits on the Start
   screen as its own presence; `variant="dealer"` rides above the dealer
   flow as a persistent teaser once a guest is actually working a sheet,
   where the offer is concrete rather than abstract. */
export function PassAnchor({ variant = "start", onOpen, receiptTotal = 0 }) {
  const dealer = variant === "dealer";

  if (dealer)
    return (
      <button
        onClick={onOpen}
        style={{
          display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
          background: C.neutralTint, border: "none", borderBottom: `1px solid ${C.line}`,
          padding: "9px 16px", cursor: "pointer", fontFamily: "inherit", color: C.ink,
        }}
      >
        <span aria-hidden="true" style={{ fontSize: 13 }}>🔒</span>
        <span style={{ flex: 1, minWidth: 0, fontSize: 12, lineHeight: 1.4 }}>
          {receiptTotal > 0 ? (
            <>
              <b style={{ fontWeight: 700 }}>{fmt(receiptTotal)} found so far — free.</b>{" "}
              The words to go get it are the Deal Pass.
            </>
          ) : (
            <>
              <b style={{ fontWeight: 700 }}>The decode is free.</b> The words to go get it are the Deal Pass.
            </>
          )}
        </span>
        <span style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: "0.05em", color: C.accentText, whiteSpace: "nowrap" }}>
          {dollars(activePriceCents())} →
        </span>
      </button>
    );

  return (
    <div style={{ margin: "14px 16px 0", border: `1px solid ${C.line}`, background: C.card, padding: "13px 14px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <Kicker color={C.accentText} style={{ letterSpacing: "0.08em" }}>THE DEAL PASS</Kicker>
        <span style={{ marginLeft: "auto", fontFamily: heading, fontWeight: 700, fontSize: 15, color: C.amber, display: "flex", alignItems: "baseline", gap: 4 }}>
          {PRICING.foundingActive && <s style={{ color: C.inkSoft, fontWeight: 400, fontSize: 11.5 }}>{dollars(PRICING.listCents)}</s>}
          {dollars(activePriceCents())}
        </span>
      </div>
      <div style={{ fontFamily: heading, fontWeight: 600, fontSize: 17, marginTop: 4, lineHeight: 1.2 }}>
        Unlock the words for this deal.
      </div>
      <p style={{ fontSize: 12.5, color: C.inkSoft, lineHeight: 1.5, margin: "4px 0 0" }}>
        Decoding, the live market check, The Table and your first script are free, forever, with no account. The pass
        buys what to <i>say</i> — every script, an F&amp;I rebuttal per add-on, and counters that rewrite as the rounds
        move.
      </p>
      <button
        onClick={onOpen}
        style={{ marginTop: 10, minHeight: 44, padding: "0 14px", border: `1px solid ${C.ink}`, background: C.card, color: C.ink, fontFamily: mono, fontSize: 10.5, letterSpacing: "0.06em", fontWeight: 700, cursor: "pointer" }}
      >
        WHAT THE PASS UNLOCKS →
      </button>
    </div>
  );
}

/* The unlocked state. A comped pass gets the same capability and a
   different badge — never the paid UI, because the analytics rule that
   comps must not pollute conversion data is worth nothing if the product
   itself blurs them. */
export function PassActive({ pass, giftCode, onGift, onRefund, busy, label, canGift, canRefund }) {
  return (
    <div style={{ border: `1px solid ${C.green}`, background: C.greenBg, padding: "12px 13px", marginBottom: 12 }}>
      <Kicker color={C.green} style={{ letterSpacing: "0.06em" }}>{label}</Kicker>
      <div style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.5, marginTop: 4 }}>
        Every script, live counters, and practice mode are unlocked. Go get it.
      </div>

      {/* Shown while they can still gift AND after they have, because the
          code itself lives here — hiding the block on success would hide
          the thing they just minted. */}
      {(canGift || giftCode) && (
        <div style={{ borderTop: `1px dashed ${C.green}`, marginTop: 10, paddingTop: 10 }}>
          <div style={{ fontSize: 12, color: C.ink, lineHeight: 1.5 }}>
            <b style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: "0.05em" }}>YOU HAVE 1 PASS TO GIVE</b> — every pass
            comes with one for a friend who&apos;s also in the fight.
          </div>
          <button
            onClick={onGift}
            disabled={Boolean(busy) || Boolean(giftCode)}
            style={{ marginTop: 8, minHeight: 44, padding: "0 14px", border: "none", background: C.green, color: "#fff", fontFamily: mono, fontSize: 10.5, letterSpacing: "0.06em", fontWeight: 700, cursor: "pointer" }}
          >
            {giftCode ? `${giftCode} · 1 USE, 30 DAYS` : busy === "gift" ? "MINTING…" : "SHARE A PASS →"}
          </button>
        </div>
      )}

      {canRefund && (
        <div style={{ borderTop: `1px dashed ${C.green}`, marginTop: 10, paddingTop: 10 }}>
          <div style={{ fontSize: 11.5, color: C.inkSoft, lineHeight: 1.5 }}>
            Didn&apos;t find you ten times what it cost? Take it back — one tap, no forms, no questions.
          </div>
          <button
            onClick={onRefund}
            disabled={Boolean(busy)}
            style={{ marginTop: 8, minHeight: 44, padding: "0 14px", border: `1px solid ${C.inkSoft}`, background: "none", color: C.inkSoft, fontFamily: mono, fontSize: 10.5, letterSpacing: "0.06em", fontWeight: 700, cursor: "pointer" }}
          >
            {busy === "refund" ? "REFUNDING…" : "CLAIM THE PROMISE — REFUND ME"}
          </button>
        </div>
      )}

      {pass?.refundedAt && (
        <div style={{ marginTop: 10, fontFamily: mono, fontSize: 10, letterSpacing: "0.04em", color: C.inkSoft }}>
          REFUNDED — THE PASS STAYS UNLOCKED FOR THIS DEAL.
        </div>
      )}
    </div>
  );
}
