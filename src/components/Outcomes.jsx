import React, { useState } from "react";
import { C, mono, heading, fmt } from "../theme.js";
import { Kicker, Corners, PrimaryBtn } from "./ui.jsx";
import { planNumbers } from "./Modes.jsx";

/* 3a walked (Watch Mode), 3b signed (The Receipt), 3c Fresh Start.
   A negotiation ends three ways; the app has a screen for each. */

export function Walked({ deal, median, onGarage }) {
  const [called, setCalled] = useState(false);
  const n = planNumbers(deal, median);
  const counter = n.target + 500;
  const shortName = deal.vehicle.split(" ").slice(0, 4).join(" ");

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ flex: 1, overflowY: "auto", padding: 16, minHeight: 0 }}>
        <h1 style={{ fontFamily: heading, fontWeight: 600, fontSize: 26, lineHeight: 1.15, margin: "4px 0 6px" }}>You walked.<br />That was the strongest move.</h1>
        <div style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.55, marginBottom: 16 }}>
          The car is still listed. Every day it sits, your position improves — and we're watching it so you don't have to.
        </div>
        <div style={{ border: `1px solid ${C.line}`, background: C.card, padding: 14, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{shortName}</div>
              <div style={{ fontSize: 12, color: C.inkSoft }}>{deal.dealer.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())} · still listed</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: mono, fontSize: 16, fontWeight: 800 }}>{fmt(deal.asking)}</div>
              {deal.daysOnLot && <div style={{ fontFamily: mono, fontSize: 10.5, color: C.amber, fontWeight: 700 }}>{deal.daysOnLot + 2} DAYS ON LOT</div>}
            </div>
          </div>
          <div style={{ borderTop: `1px dashed ${C.line}`, marginTop: 10, paddingTop: 8 }}>
            {[
              [`DAY ${(deal.daysOnLot || 45)}`, `You offered ${fmt(n.target)} OTD-clean. They said no.`, C.ink],
              [`DAY ${(deal.daysOnLot || 45) + 1}`, "No price change. Two of the comps sold.", C.ink],
              ["DAY 60", "Most stores re-price around day 60. We'll ping you.", C.inkSoft],
            ].map(([d, t, color]) => (
              <div key={d} style={{ display: "flex", gap: 10, fontSize: 12.5, padding: "3px 0" }}>
                <span style={{ fontFamily: mono, fontSize: 10.5, color: C.inkSoft, width: 56, flexShrink: 0 }}>{d}</span>
                <span style={{ color }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: C.accentTint, padding: "12px 14px", fontSize: 13, lineHeight: 1.5, marginBottom: 14 }}>
          <b>Your number stands.</b> {fmt(n.target)} doesn't expire because you left the building. If they call, it's because the math finally caught up with them.
        </div>
        {!called ? (
          <button onClick={() => setCalled(true)} style={{ width: "100%", minHeight: 50, border: `1px solid ${C.line}`, background: C.card, fontSize: 13.5, fontWeight: 700, color: C.accentText, cursor: "pointer", marginBottom: 14 }}>
            ▷ Simulate: the dealer calls back
          </button>
        ) : (
          <div style={{ position: "relative", border: `1px solid ${C.line}`, padding: 14, marginBottom: 14 }}>
            <Corners />
            <Kicker color={C.amber} style={{ letterSpacing: "0.12em", marginBottom: 6 }}>THEY CALLED · NEW OFFER ON THE TABLE</Kicker>
            {[
              ['"Manager special" price', fmt(counter), C.ink],
              ["Your standing number", fmt(n.target), C.green],
            ].map(([k, v, color]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, padding: "4px 0" }}>
                <span style={{ color: C.inkSoft }}>{k}</span>
                <span style={{ fontFamily: mono, fontWeight: 800, color }}>{v}</span>
              </div>
            ))}
            <div style={{ background: C.amberBg, color: C.amberDark, padding: "10px 12px", fontSize: 12.5, fontWeight: 700, marginTop: 8 }}>
              $500 above your number — and {fmt(deal.asking - counter)} of movement since you walked. Hold. Repeat your number once, then be quiet. They moved first; they'll move again.
            </div>
            <button onClick={() => setCalled(false)} style={{ width: "100%", minHeight: 44, border: "none", background: "none", color: C.accentText, fontSize: 12.5, fontWeight: 700, cursor: "pointer", marginTop: 6 }}>↺ Reset simulation</button>
          </div>
        )}
        <Kicker style={{ marginBottom: 6 }}>WE'LL PING YOU WHEN</Kicker>
        {["The price drops", "Day 60 on the lot", "It sells — with what it sold for"].map((t, i, arr) => (
          <div key={t} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: 44, borderBottom: i < arr.length - 1 ? `1px dashed ${C.line}` : "none", fontSize: 13.5 }}>
            <span>{t}</span>
            <span style={{ fontFamily: mono, fontSize: 10, color: C.green, fontWeight: 700 }}>ON</span>
          </div>
        ))}
      </div>
      <div style={{ borderTop: `1px solid ${C.line}`, background: C.paper, padding: "10px 16px" }}>
        <PrimaryBtn onClick={onGarage} height={50}>MEANWHILE: YOUR 2 OTHER GARAGE CARS →</PrimaryBtn>
      </div>
    </div>
  );
}

const RECEIPT_CHK = (target, tax, fees) => [
  `Contract matches: ${fmt(target)} + ${fmt(tax)} tax + ${fmt(fees)} fees — nothing added back`,
  "Decline F&I add-ons one more time — they'll try once more in the chair",
  "Buy GAP from your credit union ($400–600, not their $995)",
  "TX title & plates arrive in 4–6 weeks — we'll track it",
];

export function Receipt({ deal, median, onDone }) {
  const [chk, setChk] = useState({});
  const n = planNumbers(deal, median);
  const priceDelta = Math.max(0, deal.asking - n.target);
  const cleanTax = Math.round(0.0625 * Math.max(0, n.target - deal.trade.offer));
  const taxDelta = Math.max(0, deal.taxCharged - cleanTax);
  const kept = priceDelta + deal.junkTotal + taxDelta;
  const items = RECEIPT_CHK(n.target, cleanTax, deal.cleanFees);
  const done = Object.values(chk).filter(Boolean).length;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ flex: 1, overflowY: "auto", padding: 16, minHeight: 0 }}>
        <div style={{ position: "relative", background: C.ink, color: "#fff", padding: 22, textAlign: "center", marginBottom: 16, border: `1px solid ${C.line}` }}>
          <Corners color="rgba(255,255,255,0.45)" />
          <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.16em", opacity: 0.7 }}>VS THEIR FIRST SHEET, YOU KEPT</div>
          <div style={{ fontFamily: mono, fontSize: 44, fontWeight: 800, margin: "6px 0 2px", color: C.onNavySuccess }}>{fmt(kept)}</div>
          <div style={{ fontSize: 13, opacity: 0.85 }}>{deal.vehicle} · signed at {fmt(n.target)}</div>
        </div>
        <Kicker style={{ marginBottom: 4 }}>HOW — LINE BY LINE, LIKE ALWAYS</Kicker>
        {[
          priceDelta > 0 && [`Price: ${fmt(deal.asking)} → ${fmt(n.target)}`, `−${fmt(priceDelta)}`, C.green],
          deal.junkTotal > 0 && [`Add-on fees: removed, all ${deal.linesFlag.filter((l) => !l.name.startsWith("Sales tax")).length}`, `−${fmt(deal.junkTotal)}`, C.green],
          taxDelta > 0 && ["Tax: re-run on price − trade", `−${fmt(taxDelta)}`, C.green],
        ].filter(Boolean).map(([k, v, color]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, padding: "8px 0", borderBottom: `1px dashed ${C.line}` }}>
            <span>{k}</span>
            <span style={{ fontFamily: mono, fontWeight: 800, color }}>{v}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, padding: "8px 0" }}>
          <span style={{ color: C.inkSoft }}>Financed at your credit union, 7.2%</span>
          <span style={{ fontFamily: mono, fontWeight: 700, color: C.inkSoft }}>{deal.apr ? `not their ${deal.apr}%` : "locked in"}</span>
        </div>
        <Kicker style={{ margin: "16px 0 2px" }}>BEFORE YOU DRIVE OFF — {done}/4</Kicker>
        {items.map((t, i) => (
          <button key={t} onClick={() => setChk({ ...chk, [i]: !chk[i] })} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", minHeight: 52, border: "none", borderBottom: `1px dashed ${C.line}`, background: "none", cursor: "pointer", textAlign: "left", padding: "6px 0" }}>
            <span style={{ width: 22, height: 22, border: `1.5px solid ${chk[i] ? C.green : C.dash}`, background: chk[i] ? C.green : C.card, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>{chk[i] ? "✓" : ""}</span>
            <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: chk[i] ? C.inkSoft : C.ink }}>{t}</span>
          </button>
        ))}
        <div style={{ fontSize: 12, color: C.inkSoft, lineHeight: 1.5, marginTop: 14, textAlign: "center" }}>
          DriverSide takes nothing from this deal.<br />The receipt is the product.
        </div>
      </div>
      <div style={{ borderTop: `1px solid ${C.line}`, background: C.paper, padding: "10px 16px" }}>
        <PrimaryBtn onClick={onDone} height={50}>SET THE REFI WATCH — WE KEEP WORKING</PrimaryBtn>
      </div>
    </div>
  );
}

export function FreshStart({ deal, onStart }) {
  const [extra, setExtra] = useState(0);
  const gap = deal.negEq || 2900;
  const monthly = 190;
  const months = Math.max(1, Math.ceil(gap / (monthly + extra)));
  const date = new Date(Date.now() + months * 30.4 * 864e5).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const rollCost = Math.round(gap * 0.33); // added interest rolling at ~10%/72mo

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ flex: 1, overflowY: "auto", padding: 16, minHeight: 0 }}>
        <h1 style={{ fontFamily: heading, fontWeight: 600, fontSize: 26, lineHeight: 1.15, margin: "4px 0 6px" }}>Our honest read:<br />don't buy yet.</h1>
        <div style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.55, marginBottom: 16 }}>
          You'd carry {fmt(gap)} of the {deal.trade.car.split(" ").pop()} into any new loan. No one selling cars will tell you that. We will — with the way out.
        </div>
        <div style={{ border: `1px solid ${C.line}`, background: C.card, padding: 14, marginBottom: 14 }}>
          <Kicker style={{ letterSpacing: "0.12em", marginBottom: 6 }}>{deal.trade.car.toUpperCase()} · UNDERWATER</Kicker>
          {[
            ["Loan payoff", fmt(deal.trade.payoff)],
            ["Market value", fmt(deal.trade.offer)],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, padding: "4px 0" }}>
              <span style={{ color: C.inkSoft }}>{k}</span>
              <span style={{ fontFamily: mono, fontWeight: 700 }}>{v}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "7px 0 0", fontWeight: 800, color: C.red, borderTop: `1px dashed ${C.line}`, marginTop: 4 }}>
            <span>The gap</span>
            <span style={{ fontFamily: mono }}>−{fmt(gap)}</span>
          </div>
          <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 6 }}>
            Closing at about ${monthly}/mo on its own — your payments outrun the depreciation.
          </div>
        </div>
        <div style={{ border: `1px solid ${C.line}`, background: C.card, padding: 14, marginBottom: 14 }}>
          <Kicker color={C.accentText} style={{ letterSpacing: "0.12em", marginBottom: 8 }}>SPEED IT UP — EXTRA TOWARD PAYOFF</Kicker>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700 }}>Extra per month</span>
            <button onClick={() => setExtra(Math.max(0, extra - 25))} aria-label="Less extra payment" style={{ width: 44, height: 44, border: `1px solid ${C.line}`, background: C.paper, fontSize: 18, fontWeight: 700, cursor: "pointer", color: C.ink }}>−</button>
            <span style={{ fontFamily: mono, fontSize: 15, fontWeight: 800, width: 60, textAlign: "center" }}>${extra}</span>
            <button onClick={() => setExtra(Math.min(300, extra + 25))} aria-label="More extra payment" style={{ width: 44, height: 44, border: `1px solid ${C.line}`, background: C.paper, fontSize: 18, fontWeight: 700, cursor: "pointer", color: C.ink }}>+</button>
          </div>
          <div style={{ background: C.greenBg, padding: "12px 14px", textAlign: "center" }}>
            <div style={{ fontFamily: mono, fontSize: 26, fontWeight: 800, color: C.green }}>{months} months</div>
            <div style={{ fontSize: 12, color: C.ink }}>until you're above water — around <b>{date}</b>. We'll re-check the market for you then.</div>
          </div>
        </div>
        <Kicker style={{ marginBottom: 4 }}>EVERY EXIT, PRICED HONESTLY</Kicker>
        {[
          ["BEST", C.greenBg, C.green, "Wait it out, keep paying", "costs $0 extra", C.ink],
          ["CHECK", C.amberBg, C.amber, "Refinance the " + deal.trade.car.split(" ").pop(), "if rate < yours", C.ink],
          ["FLAG", C.redBg, C.red, `Roll the ${fmt(gap)} into a new loan`, `+${fmt(rollCost)} interest`, C.red],
        ].map(([chip, bg, fg, t, v, vc], i, arr) => (
          <div key={t} style={{ display: "flex", gap: 10, alignItems: "baseline", padding: "9px 0", borderBottom: i < arr.length - 1 ? `1px dashed ${C.line}` : "none" }}>
            <span style={{ background: bg, color: fg, fontFamily: mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", padding: "3px 6px" }}>{chip}</span>
            <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{t}</span>
            <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: vc }}>{v}</span>
          </div>
        ))}
      </div>
      <div style={{ borderTop: `1px solid ${C.line}`, background: C.paper, padding: "10px 16px" }}>
        <PrimaryBtn onClick={onStart} height={50}>START THE PLAN — TRACK MY PAYOFF</PrimaryBtn>
      </div>
    </div>
  );
}
