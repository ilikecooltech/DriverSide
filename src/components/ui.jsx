import React from "react";
import { C, mono, heading } from "../theme.js";

/* Desktop breakpoint hook — the app is mobile-first; ≥900px widens the
   shell and switches the Garage to a two-column grid. */
export function useDesktop() {
  const [desktop, setDesktop] = React.useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 900px)").matches
  );
  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 900px)");
    const fn = (e) => setDesktop(e.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return desktop;
}

/* Verdict chip — always carries text, never color alone. */
/* ── Missing-photo cartoon ────────────────────────────────────────────
   A grey box that says NO PHOTO reads like the app is broken. A car with
   a face reads like the listing is. The joke is aimed at the dealer who
   couldn't be bothered to photograph a $30,000 vehicle — which is the
   side of the table we're on — never at the shopper looking at it.

   Dry, not zany: this sits next to a price and a match score, and it has
   to survive being seen twenty times in one scroll. */
export const MISSING_PHOTO_LINES = [
  "No photo. The dealer took the day off.",
  "Camera shy. Or the dealer is.",
  "Not pictured. Still very much a car.",
  "The dealer skipped the photo. Bold.",
  "Somebody forgot to take the picture.",
  "Photo missing. Ask them why.",
  "No glamour shot for this one.",
  "Trust us, it has wheels.",
];

/* Keyed off the vehicle so a card keeps its line across re-renders and
   re-ranks, and two cards on screen rarely wear the same one. Stable by
   construction — a random pick would flicker on every render. */
export function missingPhotoLine(seed) {
  const s = String(seed || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return MISSING_PHOTO_LINES[h % MISSING_PHOTO_LINES.length];
}

/* Side-view cartoon car: one big eye in the window, a small frown at the
   bumper, and a dashed frame standing in for the photo nobody took.
   Inline SVG on purpose — no asset to 404, and it inherits the palette. */
function MissingPhotoArt({ line }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute", inset: 0, display: "flex",
        flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 14, padding: "0 16px", textAlign: "center",
      }}
    >
      <svg viewBox="0 0 132 62" width="172" height="81" role="presentation" focusable="false">
        {/* the photo that isn't there */}
        <rect x="1" y="1" width="130" height="60" fill="none" stroke={C.dash}
              strokeWidth="1.5" strokeDasharray="5 4" opacity="0.55" />
        {/* road */}
        <line x1="18" y1="50" x2="114" y2="50" stroke={C.dash} strokeWidth="1.5" opacity="0.7" />
        {/* body + cabin */}
        <path d="M24 44 L24 34 Q24 30 29 29 L44 29 L54 20 Q56 18 60 18 L82 18 Q86 18 88 21 L95 29 L106 31 Q110 32 110 36 L110 44 Z"
              fill={C.card} stroke={C.inkSoft} strokeWidth="2" strokeLinejoin="round" />
        {/* windows */}
        <path d="M57 27 L64 21 L74 21 L74 27 Z" fill={C.neutralTint} stroke={C.inkSoft} strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M78 27 L78 21 L83 21 L88 27 Z" fill={C.neutralTint} stroke={C.inkSoft} strokeWidth="1.5" strokeLinejoin="round" />
        {/* the eye — this is the whole joke */}
        <circle cx="65" cy="25" r="3.6" fill="#fff" stroke={C.ink} strokeWidth="1.2" />
        <circle cx="66.2" cy="25.6" r="1.7" fill={C.ink} />
        {/* small unimpressed mouth near the bumper */}
        <path d="M98 39 Q102 36.5 106 39" fill="none" stroke={C.inkSoft} strokeWidth="1.6" strokeLinecap="round" />
        {/* wheels */}
        <circle cx="41" cy="44" r="7" fill={C.card} stroke={C.inkSoft} strokeWidth="2" />
        <circle cx="41" cy="44" r="2.2" fill={C.dash} />
        <circle cx="92" cy="44" r="7" fill={C.card} stroke={C.inkSoft} strokeWidth="2" />
        <circle cx="92" cy="44" r="2.2" fill={C.dash} />
      </svg>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.inkSoft, lineHeight: 1.35, maxWidth: 240 }}>
        {line}
      </div>
    </div>
  );
}

/* ── Vehicle photo ────────────────────────────────────────────────────
   A results card is a row of numbers until you can see the car, so the
   photo carries real weight — but only MarketCheck's cached copy is
   trustworthy enough to render (see cachedPhoto in api/shop.js).

   Three states, one fixed box: the frame reserves its space from the
   first paint at a constant 16:10, so a photo arriving late never
   reflows the list under the reader's thumb. No src, or a src that
   fails, settles on the same quiet placeholder rather than a broken
   image — sample inventory has no photos at all, and that has to look
   deliberate. Decorative-but-named: the alt text is the vehicle, since
   that is what the picture is of. */
export function VehicleImage({ src, alt, ratio = "16 / 10" }) {
  const [state, setState] = React.useState(src ? "loading" : "empty");

  // A new card can reuse this slot as the list re-ranks.
  React.useEffect(() => { setState(src ? "loading" : "empty"); }, [src]);

  const frame = {
    position: "relative",
    width: "100%",
    aspectRatio: ratio,
    background: C.neutralTint,
    borderBottom: `1px solid ${C.line}`,
    overflow: "hidden",
  };

  return (
    <div style={frame}>
      {state === "loading" && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute", inset: 0, display: "flex",
            alignItems: "center", justifyContent: "center",
            fontFamily: mono, fontSize: 9.5, letterSpacing: "0.12em",
            color: C.dash,
          }}
        >
          LOADING…
        </div>
      )}
      {state === "empty" && <MissingPhotoArt line={missingPhotoLine(alt)} />}
      {src && (
        <img
          src={src}
          alt={alt || ""}
          loading="lazy"
          decoding="async"
          onLoad={() => setState("ready")}
          onError={() => setState("empty")}
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            objectFit: "cover", display: "block",
            opacity: state === "ready" ? 1 : 0,
            transition: "opacity 160ms ease-out",
          }}
        />
      )}
    </div>
  );
}

export function Chip({ verdict }) {
  const m = {
    green: { bg: C.greenBg, fg: C.green, t: "FAIR" },
    amber: { bg: C.amberBg, fg: C.amber, t: "CHECK" },
    red: { bg: C.redBg, fg: C.red, t: "FLAG" },
  }[verdict];
  return (
    <span style={{ background: m.bg, color: m.fg, fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", padding: "4px 8px", whiteSpace: "nowrap" }}>
      {m.t}
    </span>
  );
}

/* Mono uppercase section kicker. */
export function Kicker({ color = C.inkSoft, style, children }) {
  return (
    <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.14em", color, fontWeight: 700, textTransform: "uppercase", ...style }}>
      {children}
    </div>
  );
}

/* Blueprint registration marks — 11×11 "+" at each corner, offset −6px. */
export function Corners({ color = "rgba(22,35,59,0.55)" }) {
  const mark = (pos) => (
    <span key={Object.keys(pos).join()} aria-hidden="true" style={{ position: "absolute", width: 11, height: 11, ...pos }}>
      <span style={{ position: "absolute", left: 5, top: 0, width: 1, height: "100%", background: color }} />
      <span style={{ position: "absolute", top: 5, left: 0, width: "100%", height: 1, background: color }} />
    </span>
  );
  return (
    <>
      {mark({ top: -6, left: -6 })}
      {mark({ top: -6, right: -6 })}
      {mark({ bottom: -6, left: -6 })}
      {mark({ bottom: -6, right: -6 })}
    </>
  );
}

/* The one solid primary button per screen — steel, Barlow Condensed. */
export function PrimaryBtn({ onClick, children, height = 48, style }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ minHeight: height, border: "none", background: hover ? C.accentHover : C.accent, color: "#fff", fontFamily: heading, fontWeight: 600, fontSize: 17, letterSpacing: "0.03em", cursor: "pointer", width: "100%", ...style }}
    >
      {children}
    </button>
  );
}

/* Text-only secondary action. */
export function GhostBtn({ onClick, children, style }) {
  return (
    <button onClick={onClick} style={{ minHeight: 44, border: "none", background: "none", color: C.accentText, fontSize: 13, fontWeight: 700, cursor: "pointer", width: "100%", ...style }}>
      {children}
    </button>
  );
}

/* Expandable verdict line — 48px row, real button with aria-expanded. */
export function DecodeLine({ line, chip, open, onToggle }) {
  const chipMap = { FLAG: { bg: C.redBg, fg: C.red }, CHECK: { bg: C.amberBg, fg: C.amber } };
  const { bg, fg } = chipMap[chip];
  return (
    <div style={{ borderBottom: `1px dashed ${C.line}` }}>
      <button
        onClick={onToggle}
        aria-expanded={open}
        style={{ width: "100%", minHeight: 48, background: "none", border: "none", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", color: C.ink, padding: "4px 0", textAlign: "left" }}
      >
        <span style={{ background: bg, color: fg, fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", padding: "4px 8px", whiteSpace: "nowrap" }}>{chip}</span>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{line.name}</span>
        <span style={{ fontFamily: mono, fontSize: 14, fontWeight: 700 }}>{"$" + line.amt.toLocaleString()}</span>
        <span aria-hidden="true" style={{ fontFamily: mono, color: C.inkSoft, width: 12, textAlign: "center" }}>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div style={{ padding: "0 0 12px", fontSize: 13, lineHeight: 1.5, color: C.inkSoft }}>
          <span style={{ fontWeight: 700, color: fg }}>{line.short}. </span>
          {line.why}
        </div>
      )}
    </div>
  );
}

/* − / + stepper row (44px targets; sliders removed by design). */
export function StepperRow({ label, value, fmt, onDown, onUp, stepLabel }) {
  const btn = { width: 44, height: 44, border: `1px solid ${C.line}`, background: C.paper, fontSize: 18, fontWeight: 700, cursor: "pointer", color: C.ink };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
      <span style={{ flex: 1, fontSize: 13, fontWeight: 700 }}>{label}</span>
      <button onClick={onDown} aria-label={`Lower ${label.toLowerCase()} ${stepLabel}`} style={btn}>−</button>
      <span style={{ fontFamily: mono, fontSize: 15, fontWeight: 800, width: 74, textAlign: "center" }}>{fmt(value)}</span>
      <button onClick={onUp} aria-label={`Raise ${label.toLowerCase()} ${stepLabel}`} style={btn}>+</button>
    </div>
  );
}
