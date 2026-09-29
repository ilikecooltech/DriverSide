/* DriverSide brand: "the window sticker, on your side."

   Paper and ink carry the page; color only ever means something. Square
   corners (4px at most), hairline borders, registration marks on framed
   cards, Barlow Condensed for headlines and prices. One highlighter per
   screen marks the number that matters. See the brand board on the
   design canvas for the reasoning and the contrast checks.

   Every text/background pair here passes WCAG AA for body text:
   ink/paper 14.7, accent/paper 6.7, white/accent 7.2, green/greenBg 5.8,
   amber/amberBg 4.8, red/redBg 4.9, ink/highlight 12.2. */

/* The light values. Components read C (below), which points at CSS
   variables with these as fallbacks, so a dark container can re-skin any
   screen without touching it. */
export const C_HEX = {
  paper: "#FAF7F0",
  card: "#FFFFFF",
  ink: "#16233B",
  inkSoft: "#5A6478",
  line: "#E4DFD3",
  dash: "#B9B2A2",
  green: "#146A40",
  greenFill: "#1B7F4D",
  greenBg: "#E6F2EB",
  amber: "#9A5B0F",
  amberDark: "#7A4A0C",
  amberBg: "#FBF0DC",
  red: "#B23A2E",
  redBg: "#F8E6E3",
  accent: "#2B5A87",
  accentHover: "#1F4A70",
  accentText: "#1F4A70",
  accentTint: "#E6EEF6",
  neutralTint: "#F1ECE1",
  onNavySuccess: "#6FCF9F",
  /* The highlighter: one number per screen. Always under ink text. */
  highlight: "#FFE08A",
  /* Text on an ink-filled block. */
  onInk: "#FFFFFF",
  stripe1: "#FAF9F4",
  stripe2: "#F4F2E9",
};

/* Dealer mode (dark) values for the same names. Fills that carry white
   text (accent, greenFill) stay deep; text colors go light. */
export const C_DARK = {
  paper: "#0F1826",
  card: "#1A2536",
  ink: "#EEF1F5",
  inkSoft: "#A9B4C4",
  line: "#2A3649",
  dash: "#4A5A72",
  green: "#6FCF9F",
  greenFill: "#1B7F4D",
  greenBg: "#15352A",
  amber: "#F2C46B",
  amberDark: "#F2DDB0",
  amberBg: "#3A2E17",
  red: "#F08C7E",
  redBg: "#3A1F1E",
  accent: "#3E6E9E",
  accentHover: "#4B7DB0",
  accentText: "#8DB4DC",
  accentTint: "#22304A",
  neutralTint: "#22304A",
  onNavySuccess: "#6FCF9F",
  highlight: "rgba(255,224,138,0.28)",
  onInk: "#0F1826",
  stripe1: "#141F30",
  stripe2: "#18253A",
};

const cssName = (k) => `--c-${k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}`;
export const C = Object.fromEntries(Object.entries(C_HEX).map(([k, v]) => [k, `var(${cssName(k)}, ${v})`]));

/* The stylesheet that defines both sets. `.ds-dark` on any container
   turns everything inside it dark. */
export const themeCss = () => {
  const decl = (vals) => Object.entries(vals).map(([k, v]) => `${cssName(k)}:${v};`).join("");
  return `:root{${decl(C_HEX)}}.ds-dark{${decl(C_DARK)}color-scheme:dark;}`;
};

/* Dealer mode: the same brand at night. At a dealer the phone is out
   under showroom lights, glanced at between sentences, so the screen goes
   dark, the numbers get bigger, and color only marks what to act on.
   Pairs pass AA: ink/bg 15.6, ink2/bg 8.4, link/bg 8.6, success/bg 9.9. */
export const D = {
  bg: "#0F1826",
  card: "#1A2536",
  raised: "#22304A",
  ink: "#EEF1F5",
  ink2: "#A9B4C4",
  rule: "#2A3649",
  link: "#8DB4DC",
  success: "#6FCF9F",
  alert: "#F08C7E",
  warnBg: "#3A2E17",
  warnInk: "#F2DDB0",
};

/* Box-shadow underline that reads as a highlighter stroke. */
export const highlight = (depth = 0.4) => ({ boxShadow: `inset 0 -${depth}em 0 ${C.highlight}` });

export const mono =
  "ui-monospace,'SF Mono','Cascadia Mono','Roboto Mono',Menlo,monospace";
export const sans = "Barlow, 'Segoe UI', system-ui, sans-serif";
export const heading = "'Barlow Condensed', sans-serif";

export const stripes = `repeating-linear-gradient(45deg,${C.stripe1},${C.stripe1} 10px,${C.stripe2} 10px,${C.stripe2} 20px)`;

export const fmt = (n) => "$" + Math.round(n).toLocaleString();

export function pmt(principal, apr, months) {
  const r = apr / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

export const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
