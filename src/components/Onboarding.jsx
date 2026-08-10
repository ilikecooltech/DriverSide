import React, { useState } from "react";
import { C, mono, heading } from "../theme.js";
import { QUESTIONS, ARCHETYPES, scoreArchetype } from "../data/archetypes.js";
import { Kicker, Corners, PrimaryBtn, GhostBtn } from "./ui.jsx";

/* Onboarding — momentum through purpose, and an earned reveal.
   Each question carries a one-line reason it's asked; the archetype is
   framed as a reading of the buyer's own answers. The edit path changes
   any single answer without redoing the flow. */

export function Onboarding({ onConfirm }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [editing, setEditing] = useState(false);

  const done = step >= QUESTIONS.length;
  const q = QUESTIONS[Math.min(step, 4)];
  const arch = ARCHETYPES[scoreArchetype(answers)];

  const pick = (v) => {
    const next = { ...answers, [q.id]: v };
    let n = step + 1;
    while (n < 5 && next[QUESTIONS[n].id]) n++;
    setAnswers(next);
    setStep(n);
    setEditing(false);
  };

  if (!done)
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 20, minHeight: 0 }}>
        <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
          {QUESTIONS.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 4, background: i <= step ? C.accent : C.line }} />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
          <Kicker color={C.accentText} style={{ letterSpacing: "0.12em" }}>{q.label}</Kicker>
          <span style={{ fontFamily: mono, fontSize: 10, color: C.inkSoft }}>{Math.min(step, 4) + 1} OF 5</span>
        </div>
        <h1 style={{ fontFamily: heading, fontWeight: 600, fontSize: 24, lineHeight: 1.2, margin: "0 0 6px" }}>{q.q}</h1>
        <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 16 }}>{q.cue}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {q.opts.map(([v, t]) => {
            const sel = answers[q.id] === v;
            return (
              <button
                key={v}
                onClick={() => pick(v)}
                style={{ textAlign: "left", minHeight: 48, padding: "12px 14px", border: `1px solid ${sel ? C.accent : C.line}`, background: sel ? C.accentTint : C.card, fontSize: 14.5, fontWeight: 600, color: C.ink, cursor: "pointer" }}
              >
                {t}
              </button>
            );
          })}
        </div>
        {step > 0 && (
          <button onClick={() => setStep(Math.max(0, step - 1))} style={{ marginTop: "auto", alignSelf: "flex-start", minHeight: 44, background: "none", border: "none", color: C.inkSoft, fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 0 }}>
            ← Back
          </button>
        )}
      </div>
    );

  if (editing)
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 20, minHeight: 0 }}>
        <h1 style={{ fontFamily: heading, fontWeight: 600, fontSize: 22, margin: "0 0 4px" }}>Your five answers</h1>
        <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 14 }}>Change any one — the goal re-reads instantly.</div>
        {QUESTIONS.map((qq, i) => (
          <button
            key={qq.id}
            onClick={() => { setStep(i); setEditing(false); }}
            style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", minHeight: 52, border: "none", borderBottom: `1px dashed ${C.line}`, background: "none", cursor: "pointer", textAlign: "left", padding: "6px 0" }}
          >
            <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: "0.1em", color: C.inkSoft, width: 88 }}>{qq.label.replace(" · ", " — ")}</span>
            <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: C.ink }}>{(qq.opts.find(([v]) => v === answers[qq.id]) || [null, "—"])[1]}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.accentText }}>Change</span>
          </button>
        ))}
        <PrimaryBtn onClick={() => setEditing(false)} height={50} style={{ marginTop: "auto" }}>DONE — BACK TO MY GOAL</PrimaryBtn>
      </div>
    );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 20, minHeight: 0, overflowY: "auto" }}>
      <div style={{ position: "relative", background: C.ink, color: "#fff", padding: "26px 22px", border: `1px solid ${C.line}` }}>
        <Corners color="rgba(255,255,255,0.45)" />
        <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.16em", opacity: 0.7, marginBottom: 12 }}>READ FROM YOUR FIVE ANSWERS</div>
        <div style={{ fontFamily: heading, fontWeight: 600, fontSize: 42, lineHeight: 1 }}>{arch.name}</div>
        <div style={{ fontSize: 14, opacity: 0.85, margin: "8px 0 14px" }}>{arch.tag}</div>
        <div style={{ fontSize: 13.5, lineHeight: 1.55, opacity: 0.92 }}>{arch.desc}</div>
      </div>
      <Kicker style={{ letterSpacing: "0.12em", margin: "18px 0 8px" }}>SO EVERY NUMBER WE SHOW YOU OPTIMIZES</Kicker>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {arch.opts.map((t) => (
          <span key={t} style={{ border: `1px solid ${C.line}`, background: C.card, fontSize: 12.5, fontWeight: 600, padding: "8px 12px" }}>✓ {t}</span>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: "auto", paddingTop: 18 }}>
        <PrimaryBtn onClick={() => onConfirm(arch)} height={50}>SOUNDS LIKE ME →</PrimaryBtn>
        <GhostBtn onClick={() => setEditing(true)}>Not quite — change an answer</GhostBtn>
      </div>
    </div>
  );
}
