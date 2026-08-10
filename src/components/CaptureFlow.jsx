import React, { useEffect, useRef, useState } from "react";
import { C, mono, heading, fmt, stripes, reducedMotion } from "../theme.js";
import { SCAN_STEPS } from "../data/decode.js";
import { Kicker, PrimaryBtn, GhostBtn } from "./ui.jsx";

/* First run: capture → the 42-second wait as a receipt of work → the reveal.
   The count-up gives the leverage number one beat of drama. No confetti. */

const LEVERAGE_LO = 2174;

export function CaptureFlow({ onSeeDecode, onManual, pace = 650 }) {
  const [phase, setPhase] = useState("capture");
  const [scan, setScan] = useState(-1);
  const [num, setNum] = useState(0);
  const [countDone, setCountDone] = useState(false);
  const timers = useRef([]);

  const clearAll = () => {
    timers.current.forEach((t) => { clearTimeout(t); clearInterval(t); });
    timers.current = [];
  };
  useEffect(() => clearAll, []);

  const start = () => {
    clearAll();
    if (reducedMotion()) {
      setPhase("reveal"); setNum(LEVERAGE_LO); setCountDone(true);
      return;
    }
    setPhase("scanning"); setScan(0); setNum(0); setCountDone(false);
    const step = (i) => {
      timers.current.push(setTimeout(() => {
        if (i < SCAN_STEPS.length) { setScan(i); step(i + 1); }
        else {
          setPhase("reveal");
          const t0 = Date.now(), dur = 1100;
          const iv = setInterval(() => {
            const k = Math.min(1, (Date.now() - t0) / dur);
            const e = 1 - Math.pow(1 - k, 3);
            setNum(Math.round(LEVERAGE_LO * e));
            if (k >= 1) { clearInterval(iv); setCountDone(true); }
          }, 30);
          timers.current.push(iv);
        }
      }, i === 0 ? 300 : pace));
    };
    step(0);
  };

  const replay = () => { clearAll(); setPhase("capture"); setScan(-1); setNum(0); setCountDone(false); };

  if (phase === "capture")
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "24px 20px", gap: 16, minHeight: 0 }}>
        <h1 style={{ fontFamily: heading, fontWeight: 600, fontSize: 28, lineHeight: 1.12, margin: "8px 0 0", letterSpacing: "-0.015em" }}>
          They printed their side<br />of the story.<br />Photograph it.
        </h1>
        <div style={{ fontSize: 14, lineHeight: 1.55, color: C.inkSoft }}>
          Any dealer quote, worksheet, or "four-square." We read every line and tell you which ones are real — before you sign anything.
        </div>
        <div style={{ flex: 1, minHeight: 140, border: `1px dashed ${C.dash}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, background: stripes }}>
          <div style={{ width: 56, height: 56, border: `2px solid ${C.ink}`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>◉</div>
          <Kicker style={{ letterSpacing: "0.1em" }}>THE DEALER'S SHEET GOES HERE</Kicker>
        </div>
        <PrimaryBtn onClick={start} height={52} style={{ fontSize: 18 }}>PHOTOGRAPH THE QUOTE</PrimaryBtn>
        <div style={{ display: "flex", gap: 8 }}>
          <GhostBtn onClick={start} style={{ flex: 1, width: "auto" }}>Upload a photo</GhostBtn>
          <GhostBtn onClick={onManual} style={{ flex: 1, width: "auto" }}>Type it in — 30 seconds</GhostBtn>
        </div>
      </div>
    );

  if (phase === "scanning")
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "24px 20px", minHeight: 0 }}>
        <Kicker>DECODING · 2023 HONDA CR-V EX-L</Kicker>
        <h1 style={{ fontFamily: heading, fontWeight: 600, fontSize: 24, margin: "6px 0 20px", lineHeight: 1.15 }}>
          Checking their math<br />against the market…
        </h1>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {SCAN_STEPS.map((t, i) => {
            const mk = i < scan ? "✓" : i === scan ? "▸" : "·";
            const mkColor = i < scan ? C.green : i === scan ? C.accentText : C.dash;
            return (
              <div key={t} style={{ display: "flex", gap: 12, alignItems: "baseline", minHeight: 34, opacity: i <= scan ? 1 : 0.28 }}>
                <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 800, color: mkColor, width: 16 }}>{mk}</span>
                <span style={{ fontFamily: mono, fontSize: 12.5, color: C.ink, flex: 1 }}>{t}</span>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: "auto", borderTop: `1px dashed ${C.line}`, paddingTop: 12, fontSize: 12, color: C.inkSoft, lineHeight: 1.5 }}>
          While you wait: don't discuss monthly payment yet. The number that matters is out-the-door.
        </div>
      </div>
    );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "24px 20px", gap: 14, minHeight: 0, overflowY: "auto" }}>
      <Kicker>DECODED · 10 LINES · 14 COMPS · 42 SEC</Kicker>
      <div style={{ background: C.greenBg, padding: "26px 16px", textAlign: "center" }}>
        <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.12em", color: C.green, fontWeight: 700 }}>YOUR LEVERAGE</div>
        <div style={{ fontFamily: mono, fontSize: 42, fontWeight: 800, color: C.green, margin: "6px 0 2px" }}>{fmt(num)}</div>
        {countDone && <div style={{ fontFamily: mono, fontSize: 15, fontWeight: 700, color: C.green }}>and up to $3,761</div>}
        <div style={{ fontSize: 12.5, color: C.ink, marginTop: 10 }}>found on their sheet, in their math, at their asking price</div>
      </div>
      {countDone && (
        <div>
          {[
            ["Add-on fees to remove", "$1,792", C.red],
            ["Tax computed wrong — their favor", "$382", C.red],
            ["Above 14 live comps", "$1,587", C.amber],
          ].map(([k, v, color]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, padding: "8px 0", borderBottom: `1px dashed ${C.line}` }}>
              <span>{k}</span>
              <span style={{ fontFamily: mono, fontWeight: 800, color }}>{v}</span>
            </div>
          ))}
          <PrimaryBtn onClick={onSeeDecode} height={52} style={{ fontSize: 18, marginTop: 14 }}>SEE THE FULL DECODE →</PrimaryBtn>
          <GhostBtn onClick={replay} style={{ marginTop: 4 }}>↺ Replay the sequence</GhostBtn>
        </div>
      )}
    </div>
  );
}
