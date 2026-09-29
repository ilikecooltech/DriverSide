import React, { useEffect, useState } from "react";
import { D, mono, heading, fmt } from "../theme.js";
import { Slider } from "./ui.jsx";
import { elapsed, tableRows, yourMove, scripts, SCRIPT_TABS, CHECKS, offerRange, otdTarget } from "../data/dealer.js";

/* Dealer mode. Dark on purpose (see D in theme.js): at a dealer the phone
   comes out between sentences under showroom lights, so the screen has
   to be read at a glance. Two screens: pick the car, then the live
   session with the numbers, the words to say and the checklist. */

const h2 = { margin: 0, fontFamily: heading, fontWeight: 700, fontSize: 30, letterSpacing: "-0.015em", lineHeight: 1.08, color: D.ink };
const h3 = { margin: 0, fontFamily: heading, fontWeight: 600, fontSize: 19, color: D.ink };
const cardS = { border: `1px solid ${D.rule}`, background: D.card, color: D.ink };
const btnLight = { minHeight: 48, padding: "0 16px", border: "none", background: D.ink, color: D.bg, fontSize: 15, fontWeight: 700, cursor: "pointer" };
const btnGhost = { minHeight: 48, padding: "0 14px", border: `1px solid ${D.rule}`, background: "transparent", color: D.ink, fontSize: 14, fontWeight: 600, cursor: "pointer" };
const wrap = { flex: 1, overflowY: "auto", minHeight: 0, padding: "20px 16px 28px", display: "flex", flexDirection: "column", gap: 14, background: D.bg, color: D.ink };

const Chevron = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={D.link} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
);

const thisYear = new Date().getFullYear();

/* ── Which car? ── */
export function DealerHome({ cars = [], onStart, onPhoto, onType, starting = false }) {
  const [other, setOther] = useState(false);
  const [v, setV] = useState({ year: "", make: "", model: "", price: "" });
  const ready = /^(19|20)\d{2}$/.test(v.year) && v.make.trim() && v.model.trim() && Number(v.price) > 0;
  const field = { width: "100%", boxSizing: "border-box", minHeight: 48, padding: "0 12px", border: `1px solid ${D.rule}`, background: D.bg, color: D.ink, fontSize: 16 };
  const lab = { display: "block", fontFamily: mono, fontSize: 10, letterSpacing: "0.1em", color: D.ink2, marginBottom: 4 };

  return (
    <div style={wrap}>
      <h2 style={h2}>Which car are you looking at?</h2>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: D.ink2 }}>
        We'll pull its fair price, the words to say and your walk-away number. Everything stays on this phone.
      </p>

      {cars.map((c) => (
        <button key={c.id} onClick={() => onStart(c)} disabled={starting}
          style={{ ...cardS, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: 16, textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}>
          <span style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>{c.title}</span>
            <span style={{ fontSize: 13, color: D.ink2 }}>{[c.dealer, c.price ? fmt(c.price) : null].filter(Boolean).join(" · ")}</span>
          </span>
          <Chevron />
        </button>
      ))}
      {cars.length === 0 && !other && (
        <div style={{ ...cardS, padding: 16, fontSize: 14, color: D.ink2, lineHeight: 1.5 }}>Nothing in your Garage yet. Add the car you're looking at below.</div>
      )}

      {!other ? (
        <button onClick={() => setOther(true)} style={{ ...btnGhost, textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          A car that's not in my Garage <Chevron />
        </button>
      ) : (
        <div style={{ ...cardS, padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label htmlFor="dl-year" style={lab}>YEAR</label>
              <select id="dl-year" value={v.year} onChange={(e) => setV({ ...v, year: e.target.value })} style={field}>
                <option value="">Year</option>
                {Array.from({ length: thisYear + 2 - 2005 }, (_, i) => String(thisYear + 1 - i)).map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="dl-make" style={lab}>MAKE</label>
              <input id="dl-make" value={v.make} onChange={(e) => setV({ ...v, make: e.target.value })} placeholder="Honda" style={field} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="dl-model" style={lab}>MODEL AND TRIM</label>
              <input id="dl-model" value={v.model} onChange={(e) => setV({ ...v, model: e.target.value })} placeholder="CR-V EX" style={field} />
            </div>
          </div>
          <Slider dark id="dl-price" label="Their asking price" pre="$" value={v.price} onChange={(x) => setV({ ...v, price: x })} min={5000} max={100000} step={250} rest={28000} />
          <button onClick={() => {
            if (!ready) return;
            const [model, ...trim] = v.model.trim().split(/\s+/);
            onStart({ year: Number(v.year), make: v.make.trim(), model, trim: trim.join(" "), price: Number(v.price) });
          }} style={{ ...btnLight, opacity: ready ? 1 : 0.45 }}>
            {starting ? "PULLING THE MARKET…" : "START SESSION"}
          </button>
        </div>
      )}

      <div style={{ borderTop: `1px solid ${D.rule}`, paddingTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.12em", color: D.ink2 }}>THEY ALREADY HANDED YOU A QUOTE?</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onPhoto} style={{ ...btnGhost, flex: 1 }}>Photograph it</button>
          <button onClick={onType} style={{ ...btnGhost, flex: 1 }}>Type it in</button>
        </div>
      </div>
    </div>
  );
}

/* ── The live session ── */
export function DealerLive({ session, zip, apr, onUpdate, onEnd, onPhoto, onType }) {
  const [now, setNow] = useState(Date.now());
  const [offer, setOffer] = useState("");
  const [copied, setCopied] = useState(false);
  const [ending, setEnding] = useState(false);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const c = session.car;
  const fair = session.fair;
  const otd = otdTarget(fair, zip);
  const rows = tableRows(session);
  const say = scripts(session, { zip, apr });
  const range = offerRange(session);

  const logOffer = () => {
    const n = Number(offer);
    if (!(n > 0)) return;
    onUpdate({ ...session, rounds: [...session.rounds, { amount: n, at: Date.now(), label: `Their number ${session.rounds.length + 1}` }] });
    setOffer("");
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(say[session.script]); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ }
  };

  const tile = (label, value, tone) => (
    <div style={{ padding: 12, background: tone === "target" ? D.raised : D.card, border: `1px solid ${tone === "target" ? D.link : D.rule}`, display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.08em", color: tone === "target" ? D.link : D.ink2 }}>{label}</span>
      <span style={{ fontFamily: heading, fontWeight: 700, fontSize: 22, fontVariantNumeric: "tabular-nums", color: tone === "fair" ? D.success : D.ink }}>{value}</span>
    </div>
  );

  return (
    <div style={wrap}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className="ds-pulse" aria-hidden="true" style={{ width: 10, height: 10, borderRadius: "50%", background: D.alert, flexShrink: 0 }} />
        <span style={{ fontFamily: mono, fontSize: 12, letterSpacing: "0.1em" }}>LIVE · {elapsed(session.startedAt, now)}</span>
        {c.dealer && <span style={{ fontSize: 13, color: D.ink2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.dealer}</span>}
      </div>
      <div style={{ fontFamily: heading, fontWeight: 700, fontSize: 26, letterSpacing: "-0.015em", lineHeight: 1.1 }}>{c.title}</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
        {tile("THEIR ASK", c.price ? fmt(c.price) : "—")}
        {tile("FAIR", fair ? fmt(fair) : "n/a", "fair")}
        {tile("YOUR OTD", otd ? fmt(otd) : "n/a", "target")}
      </div>
      {fair ? (
        <div style={{ fontSize: 12, color: D.ink2, marginTop: -6 }}>
          Fair is the middle of {session.market?.count ? `${session.market.count.toLocaleString()} ` : ""}similar listings near you{otd && otd !== fair ? ", plus Texas sales tax for out the door" : ""}.
        </div>
      ) : (
        <div style={{ fontSize: 12, color: D.ink2, marginTop: -6 }}>No live market for this one. Photograph their sheet and we'll check every line.</div>
      )}

      {/* The table: every number they give you */}
      <section aria-label="The table" style={{ ...cardS, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h3 style={h3}>The table</h3>
          <span style={{ fontSize: 12, color: D.ink2 }}>Every number they give you</span>
        </div>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${D.rule}` }}>
            <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontFamily: mono, fontSize: 11, color: D.ink2 }}>{r.label}</span>
              <span style={{ fontSize: 17, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmt(r.amount)}</span>
            </span>
            {r.gapText && <span style={{ fontFamily: mono, fontSize: 11.5, fontWeight: 700, padding: "3px 7px", color: r.tone === "over" ? D.bg : D.bg, background: r.tone === "over" ? D.alert : D.success }}>{r.gapText}</span>}
          </div>
        ))}
        <Slider dark id="dl-offer" label="Their new number" pre="$" value={offer} onChange={setOffer} min={range.min} max={range.max} step={range.step} rest={rows.length ? rows[rows.length - 1].amount : range.min} />
        <button onClick={logOffer} style={{ ...btnLight, opacity: Number(offer) > 0 ? 1 : 0.45 }}>LOG IT</button>
        <div style={{ fontSize: 14, lineHeight: 1.5 }}><b style={{ color: D.link }}>Your move:</b> {yourMove(session, zip)}</div>
      </section>

      {/* Say this */}
      <section aria-label="Say this" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h3 style={h3}>Say this</h3>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {SCRIPT_TABS.map((t) => {
            const on = session.script === t.key;
            return (
              <button key={t.key} onClick={() => { onUpdate({ ...session, script: t.key }); setCopied(false); }} aria-pressed={on}
                style={{ minHeight: 44, padding: "0 12px", fontSize: 13, fontWeight: 600, cursor: "pointer", border: `1px solid ${on ? D.ink : D.rule}`, background: on ? D.ink : "transparent", color: on ? D.bg : D.ink }}>
                {t.label}
              </button>
            );
          })}
        </div>
        <div style={{ padding: 16, background: D.ink, color: D.bg, display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ margin: 0, fontSize: 19, lineHeight: 1.4, fontWeight: 500 }}>{say[session.script]}</p>
          <button onClick={copy} style={{ alignSelf: "flex-start", minHeight: 44, padding: "0 14px", border: `1px solid ${D.bg}`, background: "transparent", color: D.bg, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </section>

      {/* Before you sign */}
      <section aria-label="Before you sign" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <h3 style={{ ...h3, marginBottom: 4 }}>Before you sign</h3>
        {CHECKS.map((t, k) => {
          const on = Boolean(session.checks[k]);
          return (
            <button key={k} role="checkbox" aria-checked={on} onClick={() => onUpdate({ ...session, checks: { ...session.checks, [k]: !on } })}
              style={{ ...cardS, display: "flex", gap: 12, alignItems: "flex-start", padding: 12, textAlign: "left", cursor: "pointer", fontFamily: "inherit", minHeight: 48 }}>
              <span aria-hidden="true" style={{ flexShrink: 0, width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, boxSizing: "border-box", ...(on ? { background: D.success, color: D.bg, border: `2px solid ${D.success}` } : { border: `2px solid ${D.ink2}`, color: "transparent" }) }}>✓</span>
              <span style={{ fontSize: 14, lineHeight: 1.45, ...(on ? { color: D.ink2, textDecoration: "line-through" } : {}) }}>{t}</span>
            </button>
          );
        })}
      </section>

      {/* Their paperwork goes through the decoder */}
      <section aria-label="Their quote" style={{ borderTop: `1px solid ${D.rule}`, paddingTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.12em", color: D.ink2 }}>THEY HANDED YOU A QUOTE?</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onPhoto} style={{ ...btnGhost, flex: 1 }}>Photograph it</button>
          <button onClick={onType} style={{ ...btnGhost, flex: 1 }}>Type it in</button>
        </div>
      </section>

      {!ending ? (
        <button onClick={() => setEnding(true)} style={{ ...btnGhost, marginTop: 4 }}>End this session</button>
      ) : (
        <section aria-label="How did it go?" style={{ ...cardS, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          <h3 style={h3}>How did it go?</h3>
          <button onClick={() => onEnd("bought")} style={btnLight}>I bought it</button>
          <button onClick={() => onEnd("walked")} style={btnGhost}>I walked away</button>
          <button onClick={() => onEnd("later")} style={btnGhost}>Still deciding. End for now</button>
          <button onClick={() => setEnding(false)} style={{ ...btnGhost, border: "none", color: D.link }}>Keep the session going</button>
        </section>
      )}
    </div>
  );
}
