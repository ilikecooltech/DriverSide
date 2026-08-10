import React, { useState } from "react";
import { C, mono, heading, fmt } from "../theme.js";
import { Kicker, PrimaryBtn, StepperRow } from "./ui.jsx";

/* 4a mode switch, 2a Prep Mode, 2b Table Mode. Table Mode is a
   projection of the decode, not a new feature: every number derives
   from the deal object. */

const HOME_CHK = [
  "Get a credit-union pre-approval — target 7.2% or better",
  "Screenshot the 3 comps under your target",
  "Set your walk number — and tell someone you trust",
  "Read the three scripts out loud, once",
];

const WLINES = [
  "“Take the add-ons off and re-run the tax on price minus my trade — then we talk price.”",
  "“Beat my 7.2% pre-approval, or I finance with my credit union.”",
  (target) => `“${fmt(target)} plus tax, title and a fair doc fee — out the door — or I'm walking.”`,
];

/* numbers shared by prep + table, derived from the deal + market */
export function planNumbers(deal, median) {
  const target = median || deal.asking;
  return {
    open: Math.round((target - 600) / 100) * 100,
    target,
    walk: target + 800,
    leverage: deal.junkTotal + deal.taxError,
  };
}

export function ModeSwitch({ mode, setMode, onOpen, onOutcome }) {
  const [auto, setAuto] = useState(true);
  const prep = mode === "prep";

  const card = (key, title, desc) => {
    const active = mode === key;
    return (
      <button onClick={() => setMode(key)} style={{ display: "block", width: "100%", textAlign: "left", border: `1.5px solid ${active ? C.accent : C.line}`, background: active ? C.accentTint : C.card, padding: 16, cursor: "pointer", marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontFamily: heading, fontWeight: 600, fontSize: 22, color: C.ink }}>{title}</span>
          <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: "0.1em", color: active ? C.green : C.dash, fontWeight: 700 }}>{active ? "● ACTIVE" : "OFF"}</span>
        </div>
        <div style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.5, marginTop: 4 }}>{desc}</div>
      </button>
    );
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ flex: 1, overflowY: "auto", padding: 16, minHeight: 0 }}>
        <h1 style={{ fontFamily: heading, fontWeight: 600, fontSize: 26, lineHeight: 1.15, margin: "4px 0 6px" }}>Where are you<br />right now?</h1>
        <div style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.55, marginBottom: 16 }}>The app changes shape for the room you're in.</div>
        {card("prep", "Prep Mode", "At home, before. Full decode, homework checklist, your numbers on paper, practice. Reads like a document.")}
        {card("table", "Table Mode", "In the dealership. Three numbers, the concession tally, spread check, one script line. Reads like an instrument.")}
        <div style={{ border: `1px solid ${C.line}`, background: C.card, padding: 14, marginBottom: 16 }}>
          <button onClick={() => setAuto(!auto)} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", minHeight: 44, border: "none", background: "none", cursor: "pointer", textAlign: "left", padding: 0 }}>
            <span style={{ flex: 1 }}>
              <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: C.ink }}>Switch automatically</span>
              <span style={{ display: "block", fontSize: 12, color: C.inkSoft, marginTop: 2 }}>Table Mode turns on when you arrive at a saved dealer's address — and off when you leave.</span>
            </span>
            <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", padding: "6px 10px", border: `1px solid ${auto ? C.green : C.dash}`, background: auto ? C.greenBg : C.card, color: auto ? C.green : C.inkSoft }}>{auto ? "ON" : "OFF"}</span>
          </button>
          <div style={{ fontSize: 11.5, color: C.inkSoft, borderTop: `1px dashed ${C.line}`, marginTop: 10, paddingTop: 8 }}>
            Location is used on-device, only for this switch. Never shared, never stored.
          </div>
        </div>
        <div style={{ background: C.accentTint, padding: "12px 14px", fontSize: 12.5, lineHeight: 1.5 }}>
          <b>Now showing:</b> {prep ? "the full decode, checklist and scripts — the document." : "target / walk / won, the tally and spread check — the instrument."}
        </div>
        <Kicker style={{ margin: "18px 0 4px" }}>AFTER THE TABLE — HOW DID IT END?</Kicker>
        {[
          ["walked", "I walked — watch the listing for me →"],
          ["receipt", "I signed — show me the receipt →"],
        ].map(([k, t]) => (
          <button key={k} onClick={() => onOutcome(k)} style={{ display: "flex", width: "100%", minHeight: 48, alignItems: "center", border: "none", borderBottom: `1px dashed ${C.line}`, background: "none", cursor: "pointer", fontSize: 13.5, fontWeight: 700, color: C.accentText, padding: "0 0", textAlign: "left" }}>
            {t}
          </button>
        ))}
      </div>
      <div style={{ borderTop: `1px solid ${C.line}`, background: C.paper, padding: "10px 16px" }}>
        <PrimaryBtn onClick={() => onOpen(mode)} height={50}>{prep ? "OPEN PREP MODE →" : "OPEN TABLE MODE →"}</PrimaryBtn>
      </div>
    </div>
  );
}

export function PrepMode({ deal, median, onTable }) {
  const [chk, setChk] = useState({});
  const n = planNumbers(deal, median);
  const done = Object.values(chk).filter(Boolean).length;
  const over = median ? Math.max(0, deal.asking - median) : 0;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ flex: 1, overflowY: "auto", padding: 16, minHeight: 0 }}>
        <h1 style={{ fontFamily: heading, fontWeight: 600, fontSize: 26, lineHeight: 1.15, margin: "4px 0 6px" }}>The deal is won<br />at this table, not theirs.</h1>
        <div style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.55, marginBottom: 16 }}>
          You're seeing the {deal.vehicle.split(" ").slice(1, 3).join(" ")} soon. Everything below takes about 20 minutes.
        </div>
        <div style={{ background: C.greenBg, padding: "12px 14px", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.12em", color: C.green, fontWeight: 700 }}>YOUR LEVERAGE, DECODED</span>
            <span style={{ fontFamily: mono, fontSize: 15, fontWeight: 800, color: C.green }}>
              {over > 0 ? `${fmt(n.leverage)}–${fmt(n.leverage + over)}` : fmt(n.leverage)}
            </span>
          </div>
          <div style={{ fontSize: 12, color: C.ink, marginTop: 4 }}>
            {deal.junkTotal > 0 ? `${fmt(deal.junkTotal)} junk fees` : ""}{deal.taxError > 25 ? ` · ${fmt(deal.taxError)} tax error` : ""}{over > 0 ? ` · ${fmt(over)} over market` : ""}{deal.daysOnLot ? ` · ${deal.daysOnLot} days on lot` : ""}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
          <Kicker>BEFORE YOU GO</Kicker>
          <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 800, color: C.accentText }}>{done}/4 DONE</span>
        </div>
        {HOME_CHK.map((t, i) => (
          <button key={t} onClick={() => setChk({ ...chk, [i]: !chk[i] })} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", minHeight: 52, border: "none", borderBottom: `1px dashed ${C.line}`, background: "none", cursor: "pointer", textAlign: "left", padding: "6px 0" }}>
            <span style={{ width: 22, height: 22, border: `1.5px solid ${chk[i] ? C.green : C.dash}`, background: chk[i] ? C.green : C.card, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>{chk[i] ? "✓" : ""}</span>
            <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: chk[i] ? C.inkSoft : C.ink }}>{t}</span>
          </button>
        ))}
        <div style={{ border: `1px solid ${C.line}`, background: C.card, padding: 14, marginTop: 16 }}>
          <Kicker style={{ letterSpacing: "0.12em", marginBottom: 8 }}>YOUR NUMBERS — PUT THEM ON PAPER</Kicker>
          {[
            ["Opening counter", fmt(n.open), C.ink],
            ["Target price", fmt(n.target), C.ink],
            ["Walk if price stays above", fmt(n.walk), C.red],
          ].map(([k, v, color], i, arr) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, padding: "5px 0", borderBottom: i < arr.length - 1 ? `1px dashed ${C.line}` : "none" }}>
              <span style={{ color: C.inkSoft }}>{k}</span>
              <span style={{ fontFamily: mono, fontWeight: 800, color }}>{v}</span>
            </div>
          ))}
          <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 8, lineHeight: 1.5 }}>
            Write these on real paper and bring it. Phones get glanced at; paper gets respected.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, border: `1px dashed ${C.dash}`, padding: 12, color: C.inkSoft }}>
          <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700 }}>Practice tonight — role-play the finance manager</span>
          <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: "0.1em", background: "#EDEAE0", padding: "3px 7px" }}>COMING SOON</span>
        </div>
      </div>
      <div style={{ borderTop: `1px solid ${C.line}`, background: C.paper, padding: "10px 16px" }}>
        <PrimaryBtn onClick={onTable} height={50}>TOMORROW: SWITCH TO TABLE MODE →</PrimaryBtn>
        <div style={{ textAlign: "center", fontSize: 11, color: C.inkSoft, marginTop: 6 }}>Switches automatically when you're at the dealership address</div>
      </div>
    </div>
  );
}

export function TableMode({ deal, median, onFullDecode }) {
  const n = planNumbers(deal, median);
  const conc = [
    ...deal.linesFlag.filter((l) => !l.name.startsWith("Sales tax")).map((l) => [l.name, l.amt]),
    ...(deal.taxError > 25 ? [[`Tax re-run — their ${fmt(deal.taxError)} error`, deal.taxError]] : []),
  ];
  const [won, setWon] = useState({});
  const [price, setPrice] = useState(deal.asking);
  const [trade, setTrade] = useState(deal.trade.offer);
  const [scriptIx, setScriptIx] = useState(0);

  const wonTot = conc.reduce((t, [, a], i) => t + (won[i] ? a : 0), 0);
  const total = n.leverage || 1;
  const allWon = wonTot >= total;
  const spread = price - trade;
  const real = spread + spread * 0.0625 + deal.cleanFees;
  const delta = spread - deal.baseSpread;
  const better = delta < 0;

  const stat = (label, value, color) => (
    <div style={{ flex: 1, padding: "10px 6px", textAlign: "center" }}>
      <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: "0.1em", color: color || C.inkSoft }}>{label}</div>
      <div style={{ fontFamily: mono, fontSize: 17, fontWeight: 800, color: color || C.ink }}>{value}</div>
    </div>
  );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ display: "flex", borderBottom: `1px solid ${C.line}` }}>
        {stat("TARGET", fmt(n.target))}
        <div style={{ borderLeft: `1px dashed ${C.line}`, display: "flex", flex: 1 }}>{stat("WALK ABOVE", fmt(n.walk), C.red)}</div>
        <div style={{ borderLeft: `1px dashed ${C.line}`, display: "flex", flex: 1 }}>{stat("WON SO FAR", fmt(wonTot), C.green)}</div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", minHeight: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
          <Kicker>TAP EACH ONE THEY CONCEDE</Kicker>
          <span style={{ fontFamily: mono, fontSize: 10, color: C.inkSoft }}>{fmt(Math.max(0, total - wonTot))} LEFT</span>
        </div>
        <div style={{ height: 4, background: C.line, marginBottom: 6 }}>
          <div style={{ width: `${Math.min(100, Math.round((wonTot / total) * 100))}%`, height: 4, background: C.green }} />
        </div>
        {conc.map(([t, a], i) => (
          <button key={t} onClick={() => setWon({ ...won, [i]: !won[i] })} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", minHeight: 54, border: "none", borderBottom: `1px dashed ${C.line}`, background: won[i] ? C.greenBg : "transparent", cursor: "pointer", textAlign: "left", padding: "6px 4px" }}>
            <span style={{ width: 24, height: 24, border: `1.5px solid ${won[i] ? C.green : C.dash}`, background: won[i] ? C.green : C.card, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, flexShrink: 0 }}>{won[i] ? "✓" : ""}</span>
            <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: won[i] ? C.inkSoft : C.ink }}>{t}</span>
            <span style={{ fontFamily: mono, fontSize: 15, fontWeight: 800, color: won[i] ? C.green : C.ink }}>+{fmt(a)}</span>
          </button>
        ))}
        {allWon && (
          <div style={{ background: C.greenBg, color: C.green, padding: "11px 14px", fontSize: 13.5, fontWeight: 700, marginTop: 8 }}>
            Sheet is clean. Now the price: anchor at {fmt(n.target)} and stop talking.
          </div>
        )}
        <Kicker style={{ margin: "18px 0 8px" }}>THEIR LATEST OFFER — CHECK THE SPREAD</Kicker>
        <StepperRow label="Price" value={price} fmt={fmt} stepLabel="$250"
          onDown={() => setPrice(price - 250)} onUp={() => setPrice(price + 250)} />
        <StepperRow label="Trade" value={trade} fmt={fmt} stepLabel="$100"
          onDown={() => setTrade(Math.max(0, trade - 100))} onUp={() => setTrade(trade + 100)} />
        <div style={{ background: delta === 0 ? C.neutralTint : better ? C.greenBg : C.redBg, color: delta === 0 ? C.inkSoft : better ? C.green : C.red, padding: "12px 14px", fontSize: 14, fontWeight: 800, marginBottom: 16 }}>
          {delta === 0
            ? "Matches the original quote — no real movement yet."
            : better
            ? `${fmt(Math.abs(delta))} BETTER than the quote. Real number: ${fmt(real)}`
            : `${fmt(delta)} WORSE than the quote — whatever they called it.`}
        </div>
        <Kicker style={{ marginBottom: 8 }}>IF YOU FREEZE, READ THIS</Kicker>
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          {["Clean the sheet", "Beat my rate", "Walk"].map((t, i) => (
            <button key={t} onClick={() => setScriptIx(i)} style={{ flex: 1, minHeight: 40, cursor: "pointer", fontSize: 11, fontWeight: 700, border: `1px solid ${scriptIx === i ? C.ink : C.line}`, background: scriptIx === i ? C.ink : C.card, color: scriptIx === i ? "#fff" : C.ink, padding: 4 }}>{t}</button>
          ))}
        </div>
        <div style={{ background: C.ink, color: "#fff", padding: 16, fontSize: 17, lineHeight: 1.5, fontStyle: "italic", minHeight: 84 }}>
          {typeof WLINES[scriptIx] === "function" ? WLINES[scriptIx](n.target) : WLINES[scriptIx]}
        </div>
      </div>
      <div style={{ borderTop: `1px solid ${C.line}`, background: C.paper, padding: "10px 16px", display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: "0.1em", color: C.inkSoft }}>REMEMBER</div>
          <div style={{ fontSize: 12.5, fontWeight: 700 }}>You can leave. They can't.</div>
        </div>
        <button onClick={onFullDecode} style={{ minHeight: 48, padding: "0 18px", border: `1px solid ${C.line}`, background: C.card, fontSize: 13, fontWeight: 700, color: C.ink, cursor: "pointer" }}>Full decode</button>
      </div>
    </div>
  );
}
