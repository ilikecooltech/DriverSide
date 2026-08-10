/* DriverSide visual language, post-redesign: the Monroney window sticker
   fused with the "Industry" blueprint grammar — square corners everywhere,
   hairline borders, registration marks on framed cards, Barlow Condensed
   headings, one steel accent per screen. */

export const C = {
  paper: "#FAF9F4",
  card: "#FFFFFF",
  ink: "#16233B",
  inkSoft: "#5A6478",
  line: "#E4E2D8",
  dash: "#B9B5A6",
  green: "#1B7F4D",
  greenBg: "#E9F4EE",
  amber: "#B26D14",
  amberDark: "#8a5510",
  amberBg: "#FBF1DF",
  red: "#B23A2E",
  redBg: "#F9E9E7",
  accent: "#5980a6",
  accentHover: "#4a6d90",
  accentText: "#3f5f80",
  accentTint: "#EAF0F6",
  neutralTint: "#F4F2E9",
  onNavySuccess: "#7FD4A8",
};

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
