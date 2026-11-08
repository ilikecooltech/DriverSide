/* One polite live region for the whole app (rendered by Shell as
   #ds-announce). Screens call announce() when something changes that a
   screen reader user can't see happen: a car saved, a number logged, a
   script copied. Clearing first makes a repeat of the same words speak. */
export function announce(message) {
  if (typeof document === "undefined") return;
  const el = document.getElementById("ds-announce");
  if (!el) return;
  el.textContent = "";
  setTimeout(() => { el.textContent = String(message || ""); }, 60);
}
