/* Sharing, the network loop that needs no backend: a buyer sends a car or
   their garage to someone they trust. The phone's own share sheet when
   there is one (texts, WhatsApp, email); the clipboard otherwise.

   What gets shared is plain text the recipient can read without the app:
   the car, the price, what's fair, and a link to DriverSide. Nothing
   personal and nothing a dealer could use to identify the buyer. */

import { fmt } from "../theme.js";

const SITE = typeof window !== "undefined" ? window.location.origin : "https://driverside.vercel.app";

export function carShareText(v, median) {
  const title = [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ");
  const lines = [
    `What do you think of this one? ${title}${v.dealer ? `, ${v.dealer}` : ""}.`,
    `Asking ${fmt(v.price)}${median ? `, similar cars nearby ask about ${fmt(median)}` : ""}.`,
    v.miles ? `${Number(v.miles).toLocaleString()} miles${v.days ? `, ${v.days} days on the lot` : ""}.` : null,
    v.url ? `Listing: ${v.url}` : null,
    `Checked with DriverSide: ${SITE}`,
  ];
  return lines.filter(Boolean).join("\n");
}

export function garageShareText(cars) {
  const rows = cars.slice(0, 6).map((c, i) => `${i + 1}. ${c.title}: ${fmt(c.price)}${c.miles ? `, ${Math.round(c.miles / 1000)}k mi` : ""}`);
  return [`The cars I'm comparing:`, ...rows, `Which would you pick? Compared with DriverSide: ${SITE}`].join("\n");
}

/* Returns "shared", "copied", or "failed". A cancelled share sheet counts
   as shared: the buyer made a choice, and we don't nag. */
export async function shareOut({ title, text }) {
  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ title, text });
      return "shared";
    }
  } catch (e) {
    if (e && e.name === "AbortError") return "shared";
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}
