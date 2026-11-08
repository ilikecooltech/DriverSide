import React, { useEffect, useRef, useState } from "react";
import { C, mono, fmt } from "../theme.js";
import { readPaste, extractVin } from "../data/vin.js";
import { toGarageItem } from "../data/shopping.js";
import { track } from "../lib/analytics.js";
import { Kicker, PrimaryBtn, GhostBtn, Slider, FieldError } from "./ui.jsx";

/* Add a car from any site. No marketplace lets an app read a buyer's
   saved cars, so this is the path that works everywhere: paste a link or
   a VIN (or share it to DriverSide on Android), we find the VIN and look
   the car up. Live listing first; a plain decode for private sellers,
   where the buyer slides in the price. Nothing is ever made up. */

const lab = { display: "block", fontFamily: mono, fontSize: 12, letterSpacing: "0.06em", color: C.inkSoft, marginBottom: 4, textTransform: "uppercase" };
const field = { width: "100%", boxSizing: "border-box", minHeight: 48, padding: "8px 12px", border: `1.5px solid ${C.line}`, background: C.paper, fontSize: 15, color: C.ink };
const note = (tone, text) => (
  <div style={{ background: tone === "warn" ? C.amberBg : C.neutralTint, color: tone === "warn" ? C.amberDark : C.ink, padding: "10px 12px", fontSize: 13, fontWeight: 600, lineHeight: 1.45 }}>{text}</div>
);

export function AddFromLink({ initial = "", onAdd, onCancel, onByHand }) {
  const [text, setText] = useState(initial);
  const [vin, setVin] = useState("");
  const [state, setState] = useState({ step: "paste" }); // paste | looking | live | decoded | ask-vin | error
  const [price, setPrice] = useState("");
  const [miles, setMiles] = useState("");
  const ran = useRef(false);

  const lookup = async (theVin, source) => {
    setState({ step: "looking", source });
    try {
      const r = await fetch(`/api/listing?vin=${encodeURIComponent(theVin)}`).then((x) => x.json());
      if (r?.source === "live") { setState({ step: "live", source, listing: r.listing }); track("car_link_found", { kind: "live", source }); return; }
      if (r?.source === "decoded") { setState({ step: "decoded", source, car: r.car }); track("car_link_found", { kind: "decoded", source }); return; }
      setState({ step: "error", source, message: r?.note || "We couldn't find that VIN. Check it against the listing." });
      track("car_link_found", { kind: "none", source });
    } catch {
      setState({ step: "error", source, message: "Couldn't look that up right now. Try again in a moment." });
    }
  };

  const go = (raw = text) => {
    const r = readPaste(raw);
    const fail = (message) => { setState({ step: "error", message }); setTimeout(() => document.getElementById("link-paste")?.focus(), 0); };
    if (r.kind === "empty") { fail("Paste a link or a VIN first."); return; }
    if (r.kind === "bad-vin") { fail(r.reason); return; }
    if (r.kind === "no-vin") { setState({ step: "ask-vin", source: r.source, guess: r.guess }); track("car_link_no_vin", { source: r.source }); return; }
    lookup(r.vin, r.source);
  };

  /* A link shared in from another app arrives as `initial`: look it up
     straight away, once. */
  useEffect(() => {
    if (initial && !ran.current) { ran.current = true; go(initial); }
    /* Opened by a tap: the button that opened it is gone, so focus the box. */
    else if (!initial) document.getElementById("link-paste")?.focus();
  }, [initial]);

  const save = (car) => { onAdd(car); track("car_link_saved", { source: state.source || null, kind: state.step }); };
  const srcBadge = state.source && state.source !== "VIN" ? state.source : "FROM A LINK";

  return (
    <div style={{ border: `1px solid ${C.accent}`, background: C.card, padding: 14, marginBottom: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      <Kicker color={C.accentText} style={{ letterSpacing: "0.08em" }}>ADD A CAR FROM ANY SITE</Kicker>

      {["paste", "error", "looking"].includes(state.step) && (
        <>
          <div style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.5 }}>
            Paste the listing's link or its VIN. AutoTrader, CarGurus, Cars.com, Carvana, Facebook, a dealer's site: any of them.
          </div>
          <label htmlFor="link-paste" style={lab}>Link or VIN</label>
          <input
            id="link-paste" value={text} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && state.step !== "looking" && go()}
            placeholder="https://… or 1HGCM82633A004352"
            inputMode="url" autoComplete="off" autoCapitalize="off" spellCheck={false}
            aria-invalid={state.step === "error"}
            aria-describedby={state.step === "error" ? "link-paste-error" : undefined}
            style={{ ...field, fontFamily: mono, fontSize: 14 }}
          />
          {state.step === "error" && <FieldError id="link-paste-error">{state.message}</FieldError>}
          <PrimaryBtn onClick={() => state.step !== "looking" && go()} height={50}>{state.step === "looking" ? "LOOKING IT UP…" : "FIND THIS CAR"}</PrimaryBtn>
        </>
      )}

      {state.step === "ask-vin" && (
        <>
          {note("info", `${state.guess ? `Looks like a ${state.guess.year} ${state.guess.make} ${state.guess.model}` : "Got the link"}${state.source ? ` from ${state.source.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase())}` : ""}. That site keeps the VIN off the link, so we need it to look the car up.`)}
          <div style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.5 }}>Open the listing and copy the VIN. It's 17 characters, usually with the specs or near the price.</div>
          <label htmlFor="link-vin" style={lab}>VIN</label>
          <input id="link-vin" value={vin} onChange={(e) => setVin(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 17))}
            placeholder="17 characters" autoComplete="off"
            aria-invalid={Boolean(state.bad)} aria-describedby={state.bad ? "link-vin-error" : undefined}
            style={{ ...field, fontFamily: mono, letterSpacing: "0.04em" }} />
          {state.bad && <FieldError id="link-vin-error">That VIN doesn't check out. Compare it with the listing, character by character.</FieldError>}
          <PrimaryBtn onClick={() => { const v = extractVin(vin); if (v) lookup(v, state.source); else { setState({ ...state, bad: true }); document.getElementById("link-vin")?.focus(); } }} height={50}>FIND THIS CAR</PrimaryBtn>
          <GhostBtn onClick={onByHand}>No VIN? Add it by hand</GhostBtn>
        </>
      )}

      {state.step === "live" && (() => {
        const l = state.listing;
        return (
          <>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              {l.image && <img src={l.image} alt="" style={{ width: 96, height: 72, objectFit: "cover", flexShrink: 0, border: `1px solid ${C.line}` }} />}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15.5, fontWeight: 700 }}>{[l.year, l.make, l.model, l.trim].filter(Boolean).join(" ")}</div>
                <div style={{ fontSize: 13, color: C.inkSoft, marginTop: 2 }}>{[fmt(l.price), l.miles ? `${Math.round(l.miles / 1000)}k mi` : null, l.dealer].filter(Boolean).join(" · ")}</div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: C.inkSoft }}>Found it listed live. Saved with today's price and dealer.</div>
            <PrimaryBtn onClick={() => save(toGarageItem(l, srcBadge))} height={50}>SAVE TO GARAGE</PrimaryBtn>
          </>
        );
      })()}

      {state.step === "decoded" && (() => {
        const c = state.car;
        const ready = Number(price) > 0;
        return (
          <>
            <div style={{ fontSize: 15.5, fontWeight: 700 }}>{[c.year, c.make, c.model, c.trim].filter(Boolean).join(" ")}</div>
            <div style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.5 }}>
              It's not in dealer listings (private sellers usually aren't), so add the asking price from the listing.
            </div>
            <Slider id="link-price" label="Asking price" pre="$" value={price} onChange={setPrice} min={2000} max={100000} step={250} rest={20000} />
            <Slider id="link-miles" label="Miles (optional)" suf="mi" value={miles} onChange={setMiles} min={0} max={250000} step={1000} rest={60000} />
            <PrimaryBtn onClick={() => ready && save(toGarageItem({
              id: `vin-${c.vin}`, year: c.year, make: c.make, model: c.model, trim: c.trim,
              price: Number(price), miles: Number(miles) || 0, bodyType: c.bodyType || undefined,
              dealer: state.source === "FB MARKETPLACE" || state.source === "CRAIGSLIST" ? "Private seller" : "",
            }, srcBadge))} height={50} style={{ opacity: ready ? 1 : 0.45 }}>SAVE TO GARAGE</PrimaryBtn>
          </>
        );
      })()}

      <GhostBtn onClick={onCancel}>Cancel</GhostBtn>
    </div>
  );
}
