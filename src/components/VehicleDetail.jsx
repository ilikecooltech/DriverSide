import React, { useEffect, useMemo, useRef, useState } from "react";
import { C, mono, heading, fmt, reducedMotion, highlight } from "../theme.js";
import { carShareText, shareOut } from "../lib/share.js";
import { valueLabel, segmentMedian } from "../data/shopping.js";
import { TX_TAX } from "../data/decode.js";
import { Kicker, PrimaryBtn, VehicleImage } from "./ui.jsx";

/* The vehicle page. Before this, a Shop card was a dead end: one photo,
   no VIN, no way to act on the car. This is where a buyer decides whether
   a car is worth the drive, so it answers four things in order:
     what it looks like  -> every photo the listing has
     is the price fair   -> against the other listings in this search
     what's my leverage  -> facts a buyer can say out loud at the desk
     what will I pay     -> an out-the-door floor, not a monthly payment
   Read at the top, act at the bottom: Save and "I'm at this dealer" sit
   in a bar that stays on screen. */

const TEXAS_ZIP = /^(7[5-9]\d{3}|885\d{2})$/;

export function peersFor(vehicle, listings) {
  const others = (listings || []).filter((l) => l.id !== vehicle.id && l.price > 0);
  const sameModel = others.filter((l) => l.make === vehicle.make && l.model === vehicle.model);
  if (sameModel.length >= 4) return { peers: sameModel, label: `${vehicle.make} ${vehicle.model}s` };
  const sameBody = others.filter((l) => l.bodyType === vehicle.bodyType);
  return { peers: sameBody, label: `${(vehicle.bodyType || "car").toLowerCase()}s` };
}

/* Only facts from the data. Each line is something a buyer can repeat at
   the desk without it being a guess. */
export function leverageFor(vehicle, peers, median) {
  const out = [];
  const better = peers
    /* "About the same money" counts: $12 more for 43k fewer miles is
       still the best line a buyer has. */
    .filter((l) => l.make === vehicle.make && l.model === vehicle.model && l.price <= vehicle.price * 1.02 && vehicle.miles - l.miles >= 5000)
    .sort((a, b) => a.price - b.price)[0];
  if (better) {
    const fewer = Math.round((vehicle.miles - better.miles) / 1000);
    const diff = better.price - vehicle.price;
    const money = Math.abs(diff) < 100 ? "about the same price" : diff < 0 ? `${fmt(-diff)} less` : `${fmt(diff)} more`;
    out.push(`A ${[better.year, better.make, better.model, better.trim].filter(Boolean).join(" ")} with ${Math.round(better.miles / 1000)}k miles is listed at ${fmt(better.price)} at ${better.dealer}. That's ${fewer}k fewer miles for ${money}.`);
  }
  if (median && vehicle.price - median > median * 0.02)
    out.push(`It's ${fmt(vehicle.price - median)} over the middle asking price of similar cars in this search (${fmt(median)}).`);
  if (vehicle.days >= 45)
    out.push(`It has been on this lot ${vehicle.days} days. The longer a car sits, the more it costs the dealer to keep it.`);
  if (vehicle.certified)
    out.push("It's certified pre-owned. Ask for the inspection checklist and exactly what the warranty covers.");
  return out;
}

export function outTheDoor(price, zip) {
  const tx = TEXAS_ZIP.test(String(zip || ""));
  const tax = tx ? Math.round(price * TX_TAX) : null;
  return { tx, tax, floor: price + (tax || 0) };
}

export function VehicleDetail({ vehicle, listings, zip, saved, onSave, onAtDealer, watching = false, onWatch, onShared }) {
  const [shareNote, setShareNote] = useState(null);
  const photos = useMemo(() => {
    const list = Array.isArray(vehicle.photos) && vehicle.photos.length ? vehicle.photos : vehicle.image ? [vehicle.image] : [];
    return list;
  }, [vehicle]);
  const title = [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(" ");

  const { peers, label } = useMemo(() => peersFor(vehicle, listings), [vehicle, listings]);
  const median = useMemo(() => segmentMedian(peers), [peers]);
  const val = valueLabel(vehicle.price, median);
  const tone = val.tone === "good" ? C.green : val.tone === "warn" ? C.amber : C.inkSoft;
  const lev = useMemo(() => leverageFor(vehicle, peers, median), [vehicle, peers, median]);
  const otd = outTheDoor(vehicle.price, zip);

  const lo = peers.length ? Math.min(...peers.map((p) => p.price), vehicle.price) : null;
  const hi = peers.length ? Math.max(...peers.map((p) => p.price), vehicle.price) : null;
  const pos = (x) => (hi > lo ? ((x - lo) / (hi - lo)) * 100 : 50);

  const specs = [
    ["ENGINE", vehicle.engine],
    ["DRIVE", vehicle.drivetrain],
    ["TRANSMISSION", vehicle.transmission],
    ["MPG", vehicle.mpgCity && vehicle.mpgHwy ? `${vehicle.mpgCity} city / ${vehicle.mpgHwy} hwy` : null],
    ["SEATS", vehicle.seats],
    ["COLORS", [vehicle.exterior, vehicle.interior].filter(Boolean).join(" / ") || null],
    ["MILES", vehicle.miles ? vehicle.miles.toLocaleString() : null],
    ["ON LOT", vehicle.days ? `${vehicle.days} days` : null],
    ["VIN", vehicle.vin],
    ["STOCK #", vehicle.stockNo],
  ].filter(([, v]) => v !== null && v !== undefined && v !== "");

  const where = [vehicle.dealer, [vehicle.dealerCity, vehicle.dealerState].filter(Boolean).join(", "), vehicle.dist != null ? `${Math.round(vehicle.dist)} mi` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div style={{ flex: 1, overflowY: "auto", minHeight: 0, display: "flex", flexDirection: "column" }}>
      <Gallery photos={photos} title={title} />

      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <div style={{ fontFamily: heading, fontWeight: 600, fontSize: 26, lineHeight: 1.1 }}>{title}</div>
          <div style={{ fontSize: 13, color: C.inkSoft, marginTop: 4 }}>
            {vehicle.miles ? `${vehicle.miles.toLocaleString()} mi` : ""}
            {vehicle.bodyType ? ` · ${vehicle.bodyType}` : ""}
            {vehicle.certified ? " · Certified pre-owned" : ""}
          </div>
          {where && <div style={{ fontSize: 13, color: C.inkSoft, marginTop: 2 }}>{where}</div>}
        </div>

        {/* Price against this search's own listings. Asking prices, and it says so. */}
        <section aria-label="Price" style={{ border: `1px solid ${C.line}`, background: C.card, padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
            <div>
              <Kicker>THEY'RE ASKING</Kicker>
              <div style={{ fontFamily: mono, fontSize: 26, fontWeight: 800, marginTop: 2 }}>{fmt(vehicle.price)}</div>
            </div>
            {median && (
              <div style={{ textAlign: "right" }}>
                <Kicker>MIDDLE OF THE MARKET</Kicker>
                <div style={{ fontFamily: mono, fontSize: 20, fontWeight: 800, marginTop: 2, color: C.inkSoft }}>{fmt(median)}</div>
              </div>
            )}
          </div>
          {median && hi > lo && (
            <div aria-hidden="true" style={{ position: "relative", height: 28, margin: "14px 0 4px" }}>
              <div style={{ position: "absolute", left: 0, right: 0, top: 12, height: 4, background: C.line }} />
              <div style={{ position: "absolute", top: 6, left: `calc(${pos(median)}% - 1px)`, width: 2, height: 16, background: C.inkSoft }} />
              <div style={{ position: "absolute", top: 5, left: `calc(${pos(vehicle.price)}% - 9px)`, width: 18, height: 18, background: C.ink, border: `3px solid ${C.card}`, boxSizing: "border-box" }} />
            </div>
          )}
          {median && hi > lo && (
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: mono, fontSize: 10.5, color: C.inkSoft }}>
              <span>{fmt(lo)}</span><span>{fmt(hi)}</span>
            </div>
          )}
          <div style={{ fontSize: 13, fontWeight: 700, color: tone, marginTop: 10 }}>{val.text}</div>
          <div style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 4, lineHeight: 1.45 }}>
            {median
              ? `Compared with the asking prices of ${peers.length} other ${label} in this search. Asking prices, not sold prices.`
              : "Not enough similar cars in this search to judge the price yet."}
          </div>
        </section>

        {/* Watch needs an account (texts reach you while the app is closed);
            a second opinion never does. */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {onWatch && (
            <button
              onClick={() => onWatch(vehicle)}
              aria-pressed={watching}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", border: `1px solid ${watching ? C.accent : C.line}`, background: watching ? C.accentTint : C.card, cursor: "pointer", textAlign: "left", color: C.ink, fontFamily: "inherit" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" /></svg>
              <span>
                <b style={{ display: "block", fontSize: 14.5 }}>{watching ? "Watching this price" : "Watch this price"}</b>
                <span style={{ display: "block", fontSize: 12.5, color: C.inkSoft, marginTop: 2, lineHeight: 1.4 }}>
                  {watching ? "We'll let you know if it drops or hits 60 days on the lot. Tap to stop." : "Get a heads-up if it drops or hits 60 days on the lot."}
                </span>
              </span>
            </button>
          )}
          <button
            onClick={async () => {
              const r = await shareOut({ title: title, text: carShareText(vehicle, median) });
              setShareNote(r === "copied" ? "Copied. Paste it into a text." : r === "failed" ? "Couldn't open sharing on this device." : null);
              onShared?.("car", r);
            }}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", border: `1px solid ${C.line}`, background: C.card, cursor: "pointer", textAlign: "left", color: C.ink, fontFamily: "inherit" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13" /></svg>
            <span>
              <b style={{ display: "block", fontSize: 14.5 }}>Get a second opinion</b>
              <span style={{ display: "block", fontSize: 12.5, color: C.inkSoft, marginTop: 2, lineHeight: 1.4 }}>Send this car to someone you trust. They don't need the app.</span>
            </span>
          </button>
          {shareNote && <div role="status" style={{ fontSize: 12.5, color: C.green, fontWeight: 700 }}>{shareNote}</div>}
        </div>

        <section aria-label="Your leverage">
          <Kicker style={{ marginBottom: 8 }}>YOUR LEVERAGE</Kicker>
          {lev.length ? (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {lev.map((t) => (
                <li key={t} style={{ background: C.accentTint, padding: "11px 12px", fontSize: 13.5, lineHeight: 1.5, color: C.ink }}>{t}</li>
              ))}
            </ul>
          ) : (
            <div style={{ border: `1px dashed ${C.dash}`, padding: "11px 12px", fontSize: 13, lineHeight: 1.5, color: C.inkSoft }}>
              Nothing stands out yet. Get the out-the-door price in writing and compare it with one other car.
            </div>
          )}
        </section>

        {specs.length > 0 && (
          <section aria-label="The car">
            <Kicker style={{ marginBottom: 8 }}>THE CAR</Kicker>
            <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: C.line, border: `1px solid ${C.line}` }}>
              {specs.map(([k, v]) => (
                <div key={k} style={{ background: C.card, padding: "9px 11px" }}>
                  <dt style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: "0.1em", color: C.inkSoft }}>{k}</dt>
                  <dd style={{ margin: "2px 0 0", fontSize: 13.5, fontWeight: 700, wordBreak: "break-word" }}>{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <section aria-label="Out the door">
          <Kicker style={{ marginBottom: 8 }}>OUT THE DOOR, AT LEAST</Kicker>
          <div style={{ border: `1px solid ${C.line}`, background: C.card, padding: "12px 14px", fontSize: 13.5, display: "flex", flexDirection: "column", gap: 7 }}>
            <Row k="Asking price" v={fmt(vehicle.price)} />
            <Row k={otd.tx ? "Texas sales tax (6.25%)" : "Sales tax"} v={otd.tx ? fmt(otd.tax) : "Depends on your state"} />
            <Row k="Dealer fees" v="Ask for them itemized" />
            <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 7 }}>
              <Row k="Before fees, title and registration" v={fmt(otd.floor)} bold mark />
            </div>
          </div>
          <div style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 6, lineHeight: 1.45 }}>
            Negotiate this number, never the monthly payment.
          </div>
        </section>

        {vehicle.url && (
          <a href={vehicle.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13.5, fontWeight: 700, color: C.accentText }}>
            See the dealer's listing ↗
          </a>
        )}
      </div>

      {/* Act at the bottom. Sticky, so the two actions never scroll away. */}
      <div style={{ position: "sticky", bottom: 0, marginTop: "auto", display: "flex", gap: 8, padding: "10px 16px", background: C.paper, borderTop: `1px solid ${C.line}` }}>
        <button
          onClick={() => !saved && onSave(vehicle)}
          disabled={saved}
          style={{
            minHeight: 50, padding: "0 14px", cursor: saved ? "default" : "pointer",
            border: `1px solid ${saved ? C.green : C.ink}`, background: saved ? C.greenBg : C.card,
            color: saved ? C.green : C.ink, fontSize: 13, fontWeight: 700, whiteSpace: "nowrap",
          }}
        >
          {saved ? "✓ IN YOUR GARAGE" : "SAVE"}
        </button>
        <PrimaryBtn onClick={() => onAtDealer(vehicle)} height={50} style={{ flex: 1 }}>
          I'M AT THIS DEALER →
        </PrimaryBtn>
      </div>
    </div>
  );
}

function Row({ k, v, bold, mark }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontWeight: bold ? 800 : 400 }}>
      <span>{k}</span>
      <span style={{ fontFamily: mono, textAlign: "right", ...(mark ? highlight(0.45) : {}) }}>{v}</span>
    </div>
  );
}

/* Swipe on a phone, arrows or thumbnails anywhere. Scroll-snap does the
   swiping natively, so there is no gesture code to get wrong. */
function Gallery({ photos, title }) {
  const strip = useRef(null);
  const [idx, setIdx] = useState(0);

  useEffect(() => { setIdx(0); if (strip.current) strip.current.scrollLeft = 0; }, [photos]);

  const go = (i) => {
    const el = strip.current;
    if (!el || !photos.length) return;
    const n = (i + photos.length) % photos.length;
    el.scrollTo({ left: n * el.clientWidth, behavior: reducedMotion() ? "auto" : "smooth" });
    setIdx(n);
  };
  const onScroll = () => {
    const el = strip.current;
    if (!el || !el.clientWidth) return;
    const n = Math.round(el.scrollLeft / el.clientWidth);
    if (n !== idx) setIdx(n);
  };

  if (photos.length <= 1)
    return (
      <div>
        <VehicleImage src={photos[0] || null} alt={title} ratio="4 / 3" />
        {photos.length === 1 && (
          <div style={{ fontSize: 12, color: C.amberDark, background: C.amberBg, padding: "8px 16px" }}>
            Only one photo posted. Ask the dealer for real photos before you drive over.
          </div>
        )}
      </div>
    );

  const arrow = {
    position: "absolute", top: "50%", transform: "translateY(-50%)", width: 44, height: 44,
    border: "none", background: "rgba(255,255,255,0.92)", color: C.ink, fontSize: 20, fontWeight: 700, cursor: "pointer",
  };

  return (
    <div>
      <div style={{ position: "relative" }}>
        <div
          ref={strip}
          onScroll={onScroll}
          role="region"
          aria-label={`${title} photos`}
          style={{ display: "flex", overflowX: "auto", scrollSnapType: "x mandatory", scrollbarWidth: "none" }}
        >
          {photos.map((src, i) => (
            <div key={src} style={{ flex: "0 0 100%", scrollSnapAlign: "start" }}>
              <VehicleImage src={src} alt={`${title}, photo ${i + 1} of ${photos.length}`} ratio="4 / 3" />
            </div>
          ))}
        </div>
        <button onClick={() => go(idx - 1)} aria-label="Previous photo" style={{ ...arrow, left: 8 }}>‹</button>
        <button onClick={() => go(idx + 1)} aria-label="Next photo" style={{ ...arrow, right: 8 }}>›</button>
        <span style={{ position: "absolute", right: 10, bottom: 10, background: "rgba(22,35,59,0.8)", color: "#fff", fontFamily: mono, fontSize: 11, padding: "3px 7px" }}>
          {idx + 1} / {photos.length}
        </span>
      </div>
      <div style={{ display: "flex", gap: 6, padding: "8px 16px 0", overflowX: "auto", scrollbarWidth: "none" }}>
        {photos.map((src, i) => (
          <button
            key={src}
            onClick={() => go(i)}
            aria-label={`Show photo ${i + 1}`}
            aria-current={i === idx ? "true" : undefined}
            style={{ flex: "0 0 64px", height: 48, padding: 0, border: `2px solid ${i === idx ? C.ink : "transparent"}`, background: C.neutralTint, cursor: "pointer", overflow: "hidden" }}
          >
            <img src={src} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </button>
        ))}
      </div>
    </div>
  );
}
