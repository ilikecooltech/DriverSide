import React, { useEffect, useRef, useState } from "react";
import { C, mono, heading, fmt, pmt, reducedMotion } from "../theme.js";
import { STEP_BOUNDS, dealerMath, buildScripts } from "../data/decode.js";
import { Kicker, DecodeLine, StepperRow, PrimaryBtn, useDesktop } from "./ui.jsx";

/* Deal Decoder, Direction A: sticky verdict strip + anchor nav.
   Renders ANY normalized deal (mock demo or manual entry). Market stats
   auto-fetch by the deal's parsed vehicle + ZIP; scripts are built from
   the live median and named comps. Deal Pass gates: scripts, named
   comps, practice. Harm prevention (negative equity) is never gated. */

const STRIP_OFFSET = 92;

export function Decoder({ deal, hasPass, onGate, onMedian, onFreshStart }) {
  const [openLine, setOpenLine] = useState(null);
  const [script, setScript] = useState(0);
  const [copied, setCopied] = useState(null);

  /* The free script has to be genuinely usable, which means copyable —
     a script you cannot paste into a text message is a screenshot. */
  const copyScript = (i, body) => {
    /* Async rejection, so .catch — a denied clipboard should not throw
       into the page. The script stays selectable regardless. */
    navigator.clipboard?.writeText(body)?.catch(() => {});
    setCopied(i);
    setTimeout(() => setCopied((c) => (c === i ? null : c)), 1600);
  };
  const [price, setPrice] = useState(deal.asking);
  const [trade, setTrade] = useState(deal.trade.offer);
  /* Start with no market read rather than a placeholder median. The
     leverage number is the emotional payload of this screen; showing one
     figure and silently correcting it a beat later is exactly the kind of
     confident-but-wrong behavior this product exists to call out. */
  const [market, setMarket] = useState(null);
  const [marketState, setMarketState] = useState("loading");

  const boxRef = useRef(null);
  const refs = { ver: useRef(null), prob: useRef(null), mkt: useRef(null), trd: useRef(null), say: useRef(null) };

  useEffect(() => {
    setPrice(deal.asking);
    setTrade(deal.trade.offer);
    setOpenLine(null);
    setMarket(null);
    if (!deal.query) { setMarketState("none"); return; }
    setMarketState("loading");
    let dead = false;
    const q = new URLSearchParams({ zip: deal.zip, radius: "100", year: deal.query.year, make: deal.query.make, model: deal.query.model, trim: deal.query.trim || "" });
    fetch(`/api/market?${q}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (dead) return;
        if (d && typeof d.median === "number") {
          setMarket({ count: d.count, median: d.median, low: d.low, high: d.high, comps: d.comps || [], source: d.source });
          setMarketState("ok");
          onMedian?.(d.median);
        } else {
          setMarketState("none");
        }
      })
      .catch(() => { if (!dead) setMarketState("none"); });
    return () => { dead = true; };
  }, [deal]);

  const go = (k) => {
    const c = boxRef.current, el = refs[k].current;
    if (c && el) c.scrollTo({ top: el.offsetTop - STRIP_OFFSET, behavior: reducedMotion() ? "auto" : "smooth" });
  };

  /* market context: live median > user estimate > none */
  const median = market?.median || deal.marketEst || null;
  const overMarket = median ? Math.max(0, deal.asking - median) : 0;
  const levLo = deal.junkTotal + deal.taxError;
  const levHi = levLo + overMarket;
  const dm = median ? dealerMath(median) : null;

  const spread = price - trade;
  const tax = spread * 0.0625;
  const real = spread + tax + deal.cleanFees;
  const delta = spread - deal.baseSpread;
  const better = delta < 0;
  const deltaBg = delta === 0 ? C.neutralTint : better ? C.greenBg : C.redBg;
  const deltaFg = delta === 0 ? C.inkSoft : better ? C.green : C.red;
  const deltaMsg =
    delta === 0
      ? "Matches the original quote. Enter any new offer — bumped trade, dropped price, whatever they say."
      : better
      ? `This offer is ${fmt(Math.abs(delta))} better than the original quote. Real progress.`
      : `Careful — whatever they framed as a win, this is ${fmt(delta)} WORSE than the original.`;

  const scripts = buildScripts(deal, market, fmt, pmt);
  const toggle = (key) => setOpenLine(openLine === key ? null : key);
  const bounds = {
    price: { min: Math.round(deal.asking * STEP_BOUNDS.price.minPct / 250) * 250, max: Math.round(deal.asking * STEP_BOUNDS.price.maxPct / 250) * 250 },
    trade: { min: Math.round(deal.trade.offer * STEP_BOUNDS.trade.minPct / 100) * 100, max: Math.round(Math.max(deal.trade.offer, 100) * STEP_BOUNDS.trade.maxPct / 100) * 100 },
  };

  const chipBtn = { flex: 1, minHeight: 34, border: `1px solid ${C.line}`, background: C.card, fontSize: 11, fontWeight: 700, color: C.ink, cursor: "pointer", padding: "0 2px" };
  const verdictLine = levLo + overMarket > 0 ? "Not at this number — but you have real room." : "This sheet is clean. Focus on price and financing.";
  const desktop = useDesktop();

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      {/* desktop caps the reading column; mobile is full-bleed */}
      <div ref={boxRef} style={{ flex: 1, overflowY: "auto", position: "relative", padding: desktop ? "0 16px" : "0 16px", minHeight: 0, width: desktop ? 640 : "auto", alignSelf: desktop ? "center" : "stretch", boxSizing: "border-box", maxWidth: "100%" }}>
        {/* sticky verdict strip */}
        <div style={{ position: "sticky", top: 0, zIndex: 5, background: C.paper, margin: "0 -16px", padding: "10px 16px 8px", borderBottom: `1px solid ${C.line}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <Kicker style={{ letterSpacing: "0.12em" }}>YOUR LEVERAGE</Kicker>
            <span style={{ fontFamily: mono, fontSize: 16, fontWeight: 800, color: C.green }}>
              {levHi > levLo ? `${fmt(levLo)}–${fmt(levHi)}` : fmt(levLo)}
            </span>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            {[["ver", "Verdict"], ["prob", "Problems"], ["mkt", "Market"], ["trd", "Trade"], ["say", "Scripts"]].map(([k, label]) => (
              <button key={k} onClick={() => go(k)} style={chipBtn}>{label}</button>
            ))}
          </div>
        </div>

        {/* verdict */}
        <div ref={refs.ver} style={{ paddingTop: 16 }}>
          <Kicker>QUOTE DECODED · {deal.dealer}</Kicker>
          <h2 style={{ fontFamily: heading, fontWeight: 600, fontSize: 21, margin: "4px 0 2px", letterSpacing: "-0.01em" }}>{deal.vehicle}</h2>
          <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 12 }}>
            {deal.miles ? `${deal.miles} · ` : ""}decoded quote{deal.daysOnLot ? ` · ${deal.daysOnLot} days on lot` : ""}
          </div>
          <div style={{ background: C.greenBg, padding: "14px 16px" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 8 }}>{verdictLine}</div>
            {[
              deal.junkTotal > 0 && ["Removable add-on fees", fmt(deal.junkTotal)],
              deal.taxError > 25 && ["Tax error in their favor", fmt(deal.taxError)],
              overMarket > 0 && [market ? "Above live market" : "Above your market estimate", fmt(overMarket)],
            ].filter(Boolean).map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0" }}>
                <span style={{ color: C.inkSoft }}>{k}</span>
                <span style={{ fontFamily: mono, fontWeight: 700 }}>{v}</span>
              </div>
            ))}
            {deal.daysOnLot && (
              <div style={{ fontSize: 12, color: C.ink, marginTop: 8 }}>This car has sat <b>{deal.daysOnLot} days</b>. Time is on your side, not theirs.</div>
            )}
          </div>
        </div>

        {/* problems */}
        <div ref={refs.prob} style={{ paddingTop: 22 }}>
          {deal.linesFlag.length > 0 && (
            <>
              <Kicker color={C.red} style={{ marginBottom: 4 }}>
                ASK TO REMOVE{deal.junkTotal > 0 ? ` · ${fmt(deal.junkTotal)}` : ""}{deal.taxError > 25 ? ` + ${fmt(deal.taxError)} TAX ERROR` : ""}
              </Kicker>
              {deal.linesFlag.map((l, i) => (
                <DecodeLine key={l.name} line={l} chip="FLAG" open={openLine === "FLAG" + i} onToggle={() => toggle("FLAG" + i)} />
              ))}
            </>
          )}
          <Kicker color={C.amber} style={{ margin: "18px 0 4px" }}>PUSH ON THESE</Kicker>
          {deal.linesCheck.map((l, i) => (
            <DecodeLine key={l.name} line={l} chip="CHECK" open={openLine === "CHECK" + i} onToggle={() => toggle("CHECK" + i)} />
          ))}
          {deal.fairRows.map((r) => (
            <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 44, color: C.inkSoft }}>
              <span style={{ background: C.greenBg, color: C.green, fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", padding: "4px 8px" }}>FAIR</span>
              <span style={{ flex: 1, fontSize: 13 }}>{r.name}</span>
              <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: C.ink }}>{fmt(r.amt)}</span>
            </div>
          ))}
        </div>

        {/* market */}
        <div ref={refs.mkt} style={{ paddingTop: 22 }}>
          <Kicker style={{ marginBottom: 8 }}>
            {market ? `LIVE MARKET CHECK · MARKETCHECK · 100 MI OF ${deal.zip}` : "MARKET CHECK"}
          </Kicker>
          {market ? (
            <>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                {[
                  [String(market.count), "ACTIVE COMPS"],
                  [fmt(market.median), "MEDIAN"],
                  [`$${(market.low / 1000).toFixed(1)}–${(market.high / 1000).toFixed(1)}k`, "RANGE"],
                ].map(([v, k]) => (
                  <div key={k} style={{ flex: 1, border: `1px solid ${C.line}`, background: C.card, padding: "10px 6px", textAlign: "center" }}>
                    <div style={{ fontFamily: mono, fontSize: 14, fontWeight: 800 }}>{v}</div>
                    <div style={{ fontSize: 10, color: C.inkSoft, fontWeight: 700 }}>{k}</div>
                  </div>
                ))}
              </div>
              {overMarket > 0 ? (
                <div style={{ background: C.amberBg, padding: "11px 14px", fontSize: 13, fontWeight: 700, color: C.amberDark }}>
                  This quote is {fmt(overMarket)} above the live median. Anchor your counter at or below {fmt(market.median)}.
                </div>
              ) : (
                <div style={{ background: C.greenBg, padding: "11px 14px", fontSize: 13, fontWeight: 700, color: C.green }}>
                  At or below the live median. The price is fair — focus on fees and financing.
                </div>
              )}
              {/* named comps: the receipts. Deal Pass. */}
              <div style={{ marginTop: 10 }}>
                {hasPass ? (
                  (market.comps || []).length ? (
                    (market.comps || []).slice(0, 4).map((c, i) => (
                      <div key={i} style={{ padding: "7px 0", borderBottom: `1px dashed ${C.line}` }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "baseline", fontSize: 12.5 }}>
                          <span style={{ fontWeight: 700, flex: 1 }}>{c.name}</span>
                          <span style={{ fontFamily: mono, fontWeight: 800 }}>{fmt(c.price)}</span>
                          <span style={{ color: C.inkSoft, fontFamily: mono, fontSize: 11 }}>{Math.round(c.miles / 1000)}k mi · {c.days}d</span>
                        </div>
                        {c.source && <div style={{ fontFamily: mono, fontSize: 10, color: C.inkSoft, marginTop: 2 }}>{c.source}</div>}
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: 12, color: C.inkSoft }}>Named comps arrive with a live MarketCheck key.</div>
                  )
                ) : (
                  <button onClick={() => onGate("comps")} style={{ width: "100%", border: `1px dashed ${C.dash}`, background: "none", minHeight: 48, display: "flex", alignItems: "center", gap: 8, padding: "0 12px", cursor: "pointer" }}>
                    <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: C.ink, textAlign: "left" }}>
                      {market.comps?.length || 4} named comps — dealer, miles, days on lot
                    </span>
                    <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: "0.1em", background: C.accentTint, color: C.accentText, padding: "3px 7px" }}>DEAL PASS</span>
                  </button>
                )}
              </div>
              {dm && (
                <div style={{ border: `1px solid ${C.line}`, background: C.card, padding: "12px 14px", marginTop: 10 }}>
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, color: C.ink }}>
                    Dealers buy used inventory at ~85–90% of market. Their est. all-in on this car is{" "}
                    <b style={{ fontFamily: mono }}>{fmt(dm.acq)}</b> — the ask bakes in{" "}
                    <b style={{ fontFamily: mono, color: C.amber }}>≈{fmt(Math.max(0, deal.asking - dm.acq))} profit</b> vs a normal $2–3k. A fair deal at {fmt(dm.fair)} still feeds everyone.
                  </div>
                </div>
              )}
            </>
          ) : marketState === "loading" ? (
            <div style={{ border: `1px dashed ${C.dash}`, padding: "14px 16px", fontSize: 12.5, color: C.inkSoft, lineHeight: 1.5 }}>
              Checking live listings near {deal.zip}…
            </div>
          ) : (
            <div style={{ border: `1px dashed ${C.dash}`, padding: "14px 16px", fontSize: 12.5, color: C.inkSoft, lineHeight: 1.5 }}>
              No live data for this vehicle yet{deal.marketEst ? "" : " and no estimate entered"}. Pull comps for the same year, trim, and miles on AutoTrader or CarGurus and use the middle of the pack as your anchor.
            </div>
          )}
        </div>

        {/* trade — negative equity is harm prevention, never gated */}
        <div ref={refs.trd} style={{ paddingTop: 22 }}>
          <Kicker style={{ marginBottom: 6 }}>YOUR TRADE · {deal.trade.car.toUpperCase()}</Kicker>
          {deal.trade.offer > 0 ? (
            <>
              {[
                ["Their offer", fmt(deal.trade.offer)],
                ["Loan payoff", fmt(deal.trade.payoff)],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0", borderBottom: `1px dashed ${C.line}` }}>
                  <span style={{ color: C.inkSoft }}>{k}</span>
                  <span style={{ fontFamily: mono, fontWeight: 700 }}>{v}</span>
                </div>
              ))}
              {deal.negEq > 0 && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, padding: "7px 0", fontWeight: 800, color: C.red }}>
                    <span>Negative equity rolled into new loan</span>
                    <span style={{ fontFamily: mono }}>+{fmt(deal.negEq)}</span>
                  </div>
                  {/* harm prevention — always free, never gated */}
                  <button onClick={onFreshStart} style={{ width: "100%", minHeight: 44, border: `1px dashed ${C.dash}`, background: "none", fontSize: 12.5, fontWeight: 700, color: C.accentText, cursor: "pointer", textAlign: "left", padding: "0 12px" }}>
                    Should you even buy yet? See the wait-it-out plan →
                  </button>
                </>
              )}
            </>
          ) : (
            <div style={{ fontSize: 12.5, color: C.inkSoft, padding: "4px 0 8px" }}>No trade on this deal.</div>
          )}
          <div style={{ border: `1px solid ${C.line}`, background: C.card, padding: 14, marginTop: 8 }}>
            <Kicker color={C.accentText} style={{ letterSpacing: "0.12em", marginBottom: 6 }}>THE ONE NUMBER — DON'T LET THEM SPLIT IT</Kicker>
            <div style={{ fontSize: 12.5, lineHeight: 1.5, color: C.inkSoft, marginBottom: 12 }}>
              Price and trade are one conversation. Enter any offer they make; only the spread matters.
            </div>
            <StepperRow
              label="Vehicle price" value={price} fmt={fmt} stepLabel="$250"
              onDown={() => setPrice(Math.max(bounds.price.min, price - 250))}
              onUp={() => setPrice(Math.min(bounds.price.max, price + 250))}
            />
            <StepperRow
              label="Their trade offer" value={trade} fmt={fmt} stepLabel="$100"
              onDown={() => setTrade(Math.max(bounds.trade.min, trade - 100))}
              onUp={() => setTrade(Math.min(bounds.trade.max, trade + 100))}
            />
            <div style={{ background: C.paper, padding: "10px 12px" }}>
              {[
                ["The spread (price − trade)", fmt(spread)],
                ["TX tax — 6.25% of the spread", fmt(tax)],
                ["Doc + title/reg (junk removed)", fmt(deal.cleanFees)],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "3px 0" }}>
                  <span style={{ color: C.inkSoft }}>{k}</span>
                  <span style={{ fontFamily: mono, fontWeight: 700 }}>{v}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "7px 0 0", fontWeight: 800, borderTop: `1px solid ${C.line}`, marginTop: 5 }}>
                <span>Your real number</span>
                <span style={{ fontFamily: mono }}>{fmt(real)}</span>
              </div>
            </div>
            <div style={{ background: deltaBg, color: deltaFg, padding: "10px 12px", fontSize: 12.5, fontWeight: 700, marginTop: 8 }}>{deltaMsg}</div>
          </div>
        </div>

        {/* ── scripts ──────────────────────────────────────────────
            The first script is free, in full, and copyable — always. It
            is the anchor, the one that comes out of your mouth first, and
            handing it over is what makes the paywall an argument rather
            than a toll booth. The rest are blurred behind the pass: you
            can see they exist and count them, you cannot read them. */}
        <div ref={refs.say} style={{ padding: "22px 0 88px" }}>
          <div style={{ background: C.ink, color: "#fff", padding: 16 }}>
            <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.14em", opacity: 0.7, marginBottom: 10 }}>
              YOUR SCRIPTS — {market ? "LIVE MARKET NUMBERS" : "SAY IT LIKE THIS"}
            </div>

            {scripts.map((sc, i) => {
              const locked = i > 0 && !hasPass;
              return (
                <div key={sc.t} style={{ borderTop: i ? "1px solid rgba(255,255,255,0.14)" : "none", paddingTop: i ? 14 : 0, marginTop: i ? 14 : 0, position: "relative" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: "0.1em", opacity: 0.75 }}>{sc.t.toUpperCase()}</span>
                    {i === 0 && (
                      <span style={{ fontFamily: mono, fontSize: 8.5, letterSpacing: "0.06em", background: C.onNavySuccess, color: C.ink, padding: "2px 6px" }}>FREE</span>
                    )}
                    {!locked && (
                      <button
                        onClick={() => copyScript(i, sc.body)}
                        style={{ marginLeft: "auto", minHeight: 32, padding: "0 10px", border: "1px solid rgba(255,255,255,0.35)", background: "none", color: "#fff", fontFamily: mono, fontSize: 9.5, letterSpacing: "0.06em", cursor: "pointer" }}
                      >
                        {copied === i ? "COPIED" : "COPY"}
                      </button>
                    )}
                  </div>
                  <div
                    aria-hidden={locked ? "true" : undefined}
                    style={{
                      fontSize: 14, lineHeight: 1.6, fontStyle: "italic",
                      filter: locked ? "blur(5px)" : "none",
                      userSelect: locked ? "none" : "auto",
                      pointerEvents: locked ? "none" : "auto",
                    }}
                  >
                    {sc.body}
                  </div>
                  {locked && (
                    <button
                      onClick={() => onGate("scripts")}
                      aria-label={`Unlock ${sc.t} with the Deal Pass`}
                      style={{
                        position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                        border: "none", background: "rgba(22,35,59,0.35)", color: "#fff",
                        fontFamily: mono, fontSize: 10.5, letterSpacing: "0.08em", fontWeight: 700, cursor: "pointer",
                      }}
                    >
                      🔒 DEAL PASS
                    </button>
                  )}
                </div>
              );
            })}

            {!hasPass && (
              <button onClick={() => onGate("scripts")} style={{ width: "100%", minHeight: 48, marginTop: 16, border: "none", background: "#fff", color: C.ink, fontFamily: heading, fontWeight: 600, fontSize: 16, letterSpacing: "0.03em", cursor: "pointer" }}>
                UNLOCK THE REST · DEAL PASS
              </button>
            )}

            <button onClick={() => onGate("practice")} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, marginTop: 8, border: "1px dashed rgba(255,255,255,0.35)", background: "none", color: "#fff", padding: "10px 12px", cursor: "pointer" }}>
              <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, textAlign: "left" }}>Practice this conversation</span>
              <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: "0.1em", background: "rgba(255,255,255,0.14)", padding: "3px 7px" }}>
                {hasPass ? "COMING SOON" : "DEAL PASS"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* persistent bottom bar */}
      <div style={{ borderTop: `1px solid ${C.line}`, background: C.paper, padding: "10px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <div>
          <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: "0.1em", color: C.inkSoft }}>
            {dm ? "YOUR TARGET, FAIR PRICE" : "YOUR LEVERAGE"}
          </div>
          <div style={{ fontFamily: mono, fontSize: 15, fontWeight: 800 }}>{dm ? fmt(dm.fair) : fmt(levLo)}</div>
        </div>
        <PrimaryBtn onClick={() => go("say")} style={{ flex: 1, width: "auto" }}>
          {hasPass ? "BUILD MY COUNTER-OFFER →" : "SEE MY FREE SCRIPT →"}
        </PrimaryBtn>
      </div>
    </div>
  );
}
