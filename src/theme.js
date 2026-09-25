/* DriverSide brand: "the window sticker, on your side."

   Paper and ink carry the page; color only ever means something. Square
   corners (4px at most), hairline borders, registration marks on framed
   cards, Barlow Condensed for headlines and prices. One highlighter per
   screen marks the number that matters. See the brand board on the
   design canvas for the reasoning and the contrast checks.

   Every text/background pair here passes WCAG AA for body text:
   ink/paper 14.7, accent/paper 6.7, white/accent 7.2, green/greenBg 5.8,
   amber/amberBg 4.8, red/redBg 4.9, ink/highlight 12.2. */

export const C = {
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
};

/* Box-shadow underline that reads as a highlighter stroke. */
export const highlight = (depth = 0.4) => ({ boxShadow: `inset 0 -${depth}em 0 ${C.highlight}` });

export const mono =
  "ui-monospace,'SF Mono','Cascadia Mono','Roboto Mono',Menlo,monospace";
export const sans = "Barlow, 'Segoe UI', system-ui, sans-serif";
export const heading = "'Barlow Condensed', sans-serif";

export const stripes = `repeating-linear-gradient(45deg,#FAF9F4,#FAF9F4 10px,#F4F2E9 10px,#F4F2E9 20px)`;

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
