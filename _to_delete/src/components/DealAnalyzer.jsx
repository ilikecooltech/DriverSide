import React, { useState } from "react";
import { C, mono, fmt, pmt } from "../theme.js";
import { DEAL, DEALER_MATH, SEGMENT_ROOM, TAX_EXPECTED } from "../data/mock.js";
import { Chip, SectionLabel } from "./ui.jsx";
import { MarketCheckPanel } from "./MarketCheckPanel.jsx";

export function DealAnalyzer() {
  const [openLine, setOpenLine] = useState(null);
  const [script, setScript] = useState(0);
  const [calcPrice, setCalcPrice] = useState(31987);
  const [calcTrade, setCalcTrade] = useState(9200);

  const junkTotal = DEAL.lines.filter((l) => l.verdict === "red" && l.name !== "Sales tax (6.25% TX)").reduce((s, l) => s + l.amt, 0);
  const taxError = 1806 - TAX_EXPECTED;
  const overMarket = 31987 - DEALER_MATH.marketEst;
  const negEq = DEAL.trade.payoff - DEAL.trade.offer;
  /* amount financed: price + clean fees + correct tax − trade equity
     (equity is negative here: −(9,200 − 12,100) adds the rolled payoff) */
  const principal = 31987 + 499 + 108 + TAX_EXPECTED - (DEAL.trade.offer - DEAL.trade.payoff);
  const dP = pmt(principal, DEAL.financing.dealer.apr, DEAL.financing.dealer.term);
  const pP = pmt(principal, DEAL.financing.preapproval.apr, DEAL.financing.preapproval.term);
  const dInt = dP * DEAL.financing.dealer.term - principal;
  const pInt = pP * DEAL.financing.preapproval.term - principal;

  const scripts = [
    {
      t: "Remove the junk",
      body: `"Before we go further — I need the prep fee, nitrogen, VIN etching, and paint protection off this sheet, and the tax line re-run on price minus my trade. That's ${fmt(junkTotal)} in add-ons I didn't ask for plus a ${fmt(taxError)} tax error. I'm ready to move today on a clean out-the-door number."`,
    },
    {
      t: "Beat my pre-approval",
      body: `"I'm pre-approved at 7.2% for 60 months. Your 9.9% for 72 costs me about ${fmt(dInt - pInt)} more in interest. If your finance team can beat 7.2%, I'll finance with you. Otherwise I'm using my credit union."`,
    },
    {
      t: "Walk away",
      body: `"This car has been on your lot 47 days and it's listed about ${fmt(overMarket)} over market. My number is ${fmt(DEALER_MATH.marketEst)} plus tax, title, and a reasonable doc fee — out the door. If you can get there, call me. I'm looking at two others this week."`,
    },
  ];

  const acq = Math.round(DEALER_MATH.marketEst * DEALER_MATH.acquisitionPct + DEALER_MATH.recon);
  const askingGross = 31987 - acq;

  return (
    <div>
      {/* summary verdict */}
      <div style={{ background: C.card, border: `2px solid ${C.ink}`, borderRadius: 10, padding: 20, marginBottom: 14 }}>
        <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.14em", color: C.inkSoft, marginBottom: 6 }}>
          QUOTE DECODED · {DEAL.dealer.toUpperCase()}
        </div>
        <div style={{ fontSize: 17, fontWeight: 800 }}>{DEAL.vehicle}</div>
        <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 14 }}>{DEAL.miles} · photographed quote · analyzed in 42 sec</div>
        <div style={{ background: C.greenBg, borderRadius: 8, padding: "14px 16px" }}>
          <div style={{ fontFamily: mono, fontSize: 11, color: C.green, fontWeight: 700, letterSpacing: "0.08em" }}>YOUR LEVERAGE</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.green, margin: "2px 0" }}>
            {fmt(junkTotal + taxError)}–{fmt(junkTotal + taxError + overMarket)}
          </div>
          <div style={{ fontSize: 13, color: C.ink }}>
            in removable fees, a tax error in their favor, and above-market pricing. This car has sat 47 days — you have room.
          </div>
        </div>
      </div>

      <MarketCheckPanel askingPrice={31987} vehicle={DEAL.vehicle} />

      {/* dealer's side of the math */}
      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, padding: 18, marginBottom: 14 }}>
        <SectionLabel>The dealer's side of the math</SectionLabel>
        <div style={{ fontSize: 13.5, lineHeight: 1.55, color: C.ink, marginBottom: 12 }}>
          Dealers typically acquire used inventory at <b>85–90% of retail market value</b>, then aim for
          <b> $2,000–$3,000 front-end profit</b> per car. Knowing their floor tells you how far to push.
        </div>
        <div style={{ background: C.paper, borderRadius: 8, padding: "12px 14px", marginBottom: 12 }}>
          {[
            ["Est. dealer all-in cost (acquisition + recon)", fmt(acq)],
            ["Asking price", fmt(31987)],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
              <span style={{ color: C.inkSoft }}>{k}</span>
              <span style={{ fontFamily: mono, fontWeight: 700 }}>{v}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0 0", fontWeight: 800 }}>
            <span>Profit built into the ask</span>
            <span style={{ fontFamily: mono, color: C.amber }}>≈{fmt(askingGross)}</span>
          </div>
          <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 6 }}>
            That's ~{fmt(askingGross - DEALER_MATH.targetGross[1])}–{fmt(askingGross - DEALER_MATH.targetGross[0])} above a
            normal profit target. A fair deal still leaves them $2–3k. You're not taking food off anyone's table at {fmt(29800)}.
          </div>
        </div>
        <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.1em", color: C.inkSoft, fontWeight: 700, marginBottom: 6 }}>
          TYPICAL NEGOTIATING ROOM BY SEGMENT
        </div>
        {SEGMENT_ROOM.map((s) => (
          <div key={s.seg} style={{ display: "flex", gap: 8, alignItems: "baseline", padding: "6px 0", borderBottom: `1px dashed ${C.line}`, background: s.hot ? C.blueBg : "transparent", borderRadius: s.hot ? 6 : 0, paddingLeft: s.hot ? 8 : 0, paddingRight: s.hot ? 8 : 0 }}>
            <span style={{ fontSize: 13, fontWeight: s.hot ? 800 : 700, flex: "0 0 44%" }}>{s.seg}</span>
            <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, flex: "0 0 24%" }}>{s.room}</span>
            <span style={{ fontSize: 11, color: C.inkSoft, flex: 1 }}>{s.note}</span>
          </div>
        ))}
      </div>

      {/* the sticker */}
      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, padding: "18px 18px 8px", marginBottom: 14 }}>
        <SectionLabel>Line by line — tap any line</SectionLabel>
        {DEAL.lines.map((l, i) => (
          <div key={l.name} style={{ borderBottom: `1px dashed ${C.line}` }}>
            <button onClick={() => setOpenLine(openLine === i ? null : i)} style={{ width: "100%", background: "none", border: "none", padding: "11px 0", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", color: C.ink }}>
              <Chip verdict={l.verdict} />
              <span style={{ flex: 1, textAlign: "left", fontSize: 14, fontWeight: 700 }}>{l.name}</span>
              <span style={{ fontFamily: mono, fontSize: 14, fontWeight: 700 }}>{fmt(l.amt)}</span>
            </button>
            {openLine === i && (
              <div style={{ padding: "0 0 12px 0", fontSize: 13.5, lineHeight: 1.5, color: C.inkSoft }}>
                <span style={{ fontWeight: 700, color: l.verdict === "red" ? C.red : l.verdict === "amber" ? C.amber : C.green }}>{l.short}. </span>
                {l.why}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* financing check */}
      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, padding: 18, marginBottom: 14 }}>
        <SectionLabel>Financing check</SectionLabel>
        <div style={{ display: "flex", gap: 10 }}>
          {[
            { f: DEAL.financing.dealer, p: dP, int: dInt, bad: true },
            { f: DEAL.financing.preapproval, p: pP, int: pInt, bad: false },
          ].map(({ f, p, int, bad }) => (
            <div key={f.label} style={{ flex: 1, borderRadius: 8, padding: 12, background: bad ? C.redBg : C.greenBg }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: bad ? C.red : C.green }}>{f.label}</div>
              <div style={{ fontFamily: mono, fontSize: 18, fontWeight: 800, margin: "4px 0" }}>{fmt(p)}/mo</div>
              <div style={{ fontSize: 11.5, color: C.inkSoft }}>{f.apr}% · {f.term} mo</div>
              <div style={{ fontSize: 11.5, color: C.inkSoft }}>Total interest: <b>{fmt(int)}</b></div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 13, marginTop: 10, color: C.ink }}>
          The dealer's rate costs <b>{fmt(dInt - pInt)} more in interest</b> for a lower-looking payment. Bring the pre-approval and make them beat it.
        </div>
      </div>

      {/* negative equity */}
      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, padding: 18, marginBottom: 14 }}>
        <SectionLabel>Your trade — the part they won't explain</SectionLabel>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{DEAL.trade.car}</div>
        {[
          ["Trade offer", fmt(DEAL.trade.offer)],
          ["Loan payoff", fmt(DEAL.trade.payoff)],
        ].map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, padding: "5px 0", borderBottom: `1px dashed ${C.line}` }}>
            <span style={{ color: C.inkSoft }}>{k}</span>
            <span style={{ fontFamily: mono, fontWeight: 700 }}>{v}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, padding: "8px 0", fontWeight: 800, color: C.red }}>
          <span>Negative equity rolled into new loan</span>
          <span style={{ fontFamily: mono }}>+{fmt(negEq)}</span>
        </div>
        <div style={{ background: C.amberBg, borderRadius: 8, padding: "12px 14px", fontSize: 13, lineHeight: 1.5 }}>
          That {fmt(negEq)} becomes part of your new loan and costs roughly{" "}
          <b>{fmt(pmt(negEq, DEAL.financing.dealer.apr, DEAL.financing.dealer.term) * DEAL.financing.dealer.term - negEq)} in added interest</b>{" "}
          at the dealer's rate. Worth knowing: you could also keep the Altima 12–18 months and let the payoff catch up. We'll show you that math too.
        </div>
      </div>

      {/* one-number calculator */}
      <div style={{ background: C.card, border: `2px solid ${C.blue}`, borderRadius: 10, padding: 18, marginBottom: 14 }}>
        <SectionLabel>The one number — don't let them split it</SectionLabel>
        <div style={{ fontSize: 13.5, lineHeight: 1.55, marginBottom: 14 }}>
          Dealers negotiate the price and your trade as <b>two separate conversations</b> so a win on one hides a loss on
          the other. Only the spread matters. Move the sliders to any offer they make and watch the real number.
        </div>
        {[
          { label: "Vehicle price", val: calcPrice, set: setCalcPrice, min: 29000, max: 32500 },
          { label: "Their trade offer", val: calcTrade, set: setCalcTrade, min: 8000, max: 11000 },
        ].map((s) => (
          <div key={s.label} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
              <span>{s.label}</span>
              <span style={{ fontFamily: mono }}>{fmt(s.val)}</span>
            </div>
            <input
              type="range" min={s.min} max={s.max} step={100} value={s.val}
              onChange={(e) => s.set(Number(e.target.value))}
              style={{ width: "100%", accentColor: C.blue }}
            />
          </div>
        ))}
        {(() => {
          const spread = calcPrice - calcTrade;
          const baseSpread = 31987 - 9200;
          const delta = spread - baseSpread;
          const tax = spread * 0.0625;
          const cleanFees = 499 + 108;
          const real = spread + tax + cleanFees;
          const better = delta < 0;
          return (
            <div>
              <div style={{ background: C.paper, borderRadius: 8, padding: "12px 14px", marginBottom: 10 }}>
                {[
                  ["Price minus trade (the spread)", fmt(spread)],
                  ["TX tax — 6.25% of the spread", fmt(tax)],
                  ["Doc + title/reg (junk fees removed)", fmt(cleanFees)],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
                    <span style={{ color: C.inkSoft }}>{k}</span>
                    <span style={{ fontFamily: mono, fontWeight: 700 }}>{v}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, padding: "8px 0 0", fontWeight: 800, borderTop: `1px solid ${C.line}`, marginTop: 6 }}>
                  <span>Your real number</span>
                  <span style={{ fontFamily: mono }}>{fmt(real)}</span>
                </div>
              </div>
              <div style={{ background: delta === 0 ? C.paper : better ? C.greenBg : C.redBg, borderRadius: 8, padding: "11px 14px", fontSize: 13, fontWeight: 700, color: delta === 0 ? C.inkSoft : better ? C.green : C.red }}>
                {delta === 0
                  ? "This matches the original quote. Any new offer goes here — bumped trade, dropped price, whatever they say."
                  : better
                  ? `This offer is ${fmt(Math.abs(delta))} better than the original quote. Real progress.`
                  : `Careful — whatever they framed as a win, this is ${fmt(delta)} WORSE than the original quote.`}
              </div>
              <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 8, lineHeight: 1.5 }}>
                Example of the trick: "+$800 on your trade" while the price quietly goes up $1,000 = you lost $200.
                Bonus TX math: every $1,000 of trade value also saves you $62.50 in tax — already counted above.
              </div>
            </div>
          );
        })()}
      </div>

      {/* scripts */}
      <div style={{ background: C.ink, borderRadius: 10, padding: 18, color: "#fff" }}>
        <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.14em", opacity: 0.7, marginBottom: 10 }}>YOUR SCRIPTS — SAY IT LIKE THIS</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {scripts.map((s, i) => (
            <button key={s.t} onClick={() => setScript(i)} style={{ flex: 1, padding: "8px 4px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11.5, fontWeight: 700, background: script === i ? "#fff" : "rgba(255,255,255,0.12)", color: script === i ? C.ink : "#fff" }}>
              {s.t}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 14.5, lineHeight: 1.6, fontStyle: "italic", minHeight: 96 }}>{scripts[script].body}</div>
        <button style={{ width: "100%", marginTop: 14, padding: "12px 0", borderRadius: 7, border: "none", background: C.blue, color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
          🎙 Practice this conversation
        </button>
        <div style={{ fontSize: 11, opacity: 0.6, marginTop: 8, textAlign: "center" }}>Role-play the finance manager before you walk in</div>
      </div>
    </div>
  );
}
