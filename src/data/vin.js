/* Adding a car from any site. No marketplace exposes a buyer's saved
   cars, so the honest path is the one that works everywhere: the buyer
   pastes a link or a VIN (or shares it from the app on Android), we find
   the VIN, and look it up.

   Pure functions so the parsing is testable. Shared by the client and
   the /api/listing function. */

const VIN_CHARS = /[A-HJ-NPR-Z0-9]{17}/g; // no I, O or Q, by the VIN standard

const TRANSLIT = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
};
const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

/* The 9th character is a check digit on every North American VIN since
   1981. Checking it keeps a random 17-character ID in a URL from being
   mistaken for a VIN. */
export function isValidVin(raw) {
  const v = String(raw || "").toUpperCase();
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(v)) return false;
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const c = v[i];
    const n = /\d/.test(c) ? Number(c) : TRANSLIT[c];
    sum += n * WEIGHTS[i];
  }
  const r = sum % 11;
  return v[8] === (r === 10 ? "X" : String(r));
}

/* The first valid VIN anywhere in a pasted link or shared text. */
export function extractVin(text) {
  const s = String(text || "").toUpperCase();
  for (const m of s.matchAll(VIN_CHARS)) {
    if (isValidVin(m[0])) return m[0];
  }
  return null;
}

/* "2021 Honda CR-V EX on Autotrader https://..." -> a best guess at the
   car, so a shared link with no VIN still pre-fills something. Only the
   year is trusted as a number; the rest is shown back for the buyer to
   confirm, never used to look anything up on its own. */
export function guessTitle(text) {
  const m = String(text || "").match(/\b(19[89]\d|20[0-3]\d)\s+([A-Z][A-Za-z-]+)\s+([A-Za-z0-9-]+(?:\s+[A-Za-z0-9-]+)?)/);
  if (!m) return null;
  return { year: Number(m[1]), make: m[2], model: m[3].replace(/\s+(on|at|for|from)$/i, "") };
}

/* Which site a link came from, for the source badge in the Garage. */
const SITES = [
  [/autotrader\./i, "AUTOTRADER"],
  [/cargurus\./i, "CARGURUS"],
  [/cars\.com/i, "CARS.COM"],
  [/carvana\./i, "CARVANA"],
  [/carmax\./i, "CARMAX"],
  [/facebook\.|fb\.com|fb\.me/i, "FB MARKETPLACE"],
  [/craigslist\./i, "CRAIGSLIST"],
];
export function sourceFromLink(text) {
  const url = String(text || "").match(/https?:\/\/\S+/i)?.[0] || "";
  if (!url) return null;
  for (const [re, name] of SITES) if (re.test(url)) return name;
  try { return new URL(url).hostname.replace(/^www\./, "").toUpperCase(); } catch { return "LINK"; }
}

/* What the paste box should do next with what the buyer gave it. */
export function readPaste(text) {
  const s = String(text || "").trim();
  if (!s) return { kind: "empty" };
  const vin = extractVin(s);
  const source = sourceFromLink(s);
  if (vin) return { kind: "vin", vin, source: source || "VIN" };
  if (/^[A-Z0-9]{11,17}$/i.test(s.replace(/\s/g, "")))
    return { kind: "bad-vin", reason: "That's not a full VIN. It's 17 characters, usually on the listing near the price or specs." };
  return { kind: "no-vin", source, guess: guessTitle(s) };
}
