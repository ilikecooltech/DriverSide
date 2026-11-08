/* Screen changes in a one-page app are silent to screen readers unless we
   say so. On every screen change after the first, move focus to the new
   screen's main heading (made focusable with tabindex=-1) and name the
   browser tab after it. Pure helper for the title so it's testable. */
export function screenTitle(name) {
  const n = String(name || "").trim();
  return n ? `${n} · DriverSide` : "DriverSide — the only one at the table on your side";
}

export function focusMainHeading(root = typeof document !== "undefined" ? document.getElementById("ds-main") : null) {
  if (!root) return false;
  /* Screens that open on top of another (a car page over Shop) render
     after it, so the last visible h1 is the one for where you are. */
  const all = [...root.querySelectorAll("h1")].filter((el) => el.getClientRects().length > 0 || el.classList.contains("ds-sr"));
  const h = all[all.length - 1];
  if (!h) { root.focus?.({ preventScroll: true }); return false; }
  if (!h.hasAttribute("tabindex")) h.setAttribute("tabindex", "-1");
  h.focus({ preventScroll: false });
  return true;
}
