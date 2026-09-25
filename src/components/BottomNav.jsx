import React from "react";
import { C, mono, sans } from "../theme.js";

/* Primary navigation, moved to the bottom of the viewport.

   The reason is where this app gets used: standing at a desk, one-handed,
   phone low. A top tab strip is the hardest place on the screen to reach
   in that posture, and "At the Dealer" is exactly the tab someone needs
   while they cannot look down for long.

   Fixed to the viewport but constrained to the app column, so on a wide
   screen it sits under the content rather than spanning the whole window.
   Safe-area padding keeps it clear of the home indicator; Shell reserves
   the matching space so nothing is ever hidden behind it. */

export const NAV_HEIGHT = 58;

/* `live` marks a destination with something happening right now — today
   only Dealer, when a decode is mid-session. `pending` marks a surface a
   later phase builds; it stays reachable and says so rather than being a
   dead tab. */
export const NAV_ITEMS = [
  { key: "start", label: "Start" },
  { key: "shop", label: "Shop" },
  { key: "garage", label: "Garage" },
  { key: "tools", label: "Tools" },
  { key: "dealer", label: "Dealer", live: true },
];

/* Line icons, drawn in currentColor so they follow the active state. The
   brand uses no emoji: they render differently on every phone and read
   as decoration, not navigation. */
export const ICON_PATHS = {
  start: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z",
  shop: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4",
  garage: "M3 21V9l9-5 9 5v12M7 21v-7h10v7M7 17h10",
  tools: "M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8 7h8M8 11h2M12 11h2M8 15h2M12 15h2M8 18h2M12 18h4",
  dealer: "M4 21V10M20 21V10M2 10l10-6 10 6M9 21v-5h6v5",
};

export function NavIcon({ name, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}

/* A dealer session is "live" while a decoded sheet is open and has not
   reached an outcome. Walked, receipt and fresh start are endings, so the
   dot goes out — it marks work in progress, never "you once used this
   tab". Exported so the rule is tested rather than trusted. */
export const DEAL_ENDED = ["walked", "receipt", "freshstart"];

export function isDealerSessionLive(deal, dealView) {
  return Boolean(deal) && !DEAL_ENDED.includes(dealView);
}

export function BottomNav({ tab, onGo, desktop, dealerLive = false }) {
  return (
    <nav
      aria-label="Primary"
      style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: desktop ? 760 : 520,
        zIndex: 20,
        background: C.card,
        borderTop: `1px solid ${C.line}`,
        borderLeft: `1px solid ${C.line}`,
        borderRight: `1px solid ${C.line}`,
        boxShadow: "0 -4px 18px rgba(22,35,59,0.10)",
        display: "flex",
        paddingBottom: "env(safe-area-inset-bottom)",
        fontFamily: sans,
      }}
    >
      {NAV_ITEMS.map((it) => {
        const on = tab === it.key;
        const showDot = it.live && dealerLive;
        return (
          <button
            key={it.key}
            onClick={() => onGo(it.key)}
            /* aria-current marks the active destination for a screen
               reader; the label is real text under the icon, so the icon
               itself is decorative. */
            aria-current={on ? "page" : undefined}
            style={{
              flex: 1,
              minHeight: NAV_HEIGHT,
              background: "none",
              border: "none",
              borderTop: on ? `3px solid ${C.accent}` : "3px solid transparent",
              cursor: "pointer",
              padding: "7px 2px 8px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              fontFamily: sans,
              fontSize: 11,
              letterSpacing: "0.01em",
              color: on ? C.ink : C.inkSoft,
              fontWeight: on ? 700 : 400,
            }}
          >
            <span aria-hidden="true" style={{ lineHeight: 1, position: "relative", display: "block" }}>
              <NavIcon name={it.key} />
              {showDot && (
                <span
                  className="ds-pulse"
                  style={{
                    position: "absolute",
                    top: -2,
                    right: -6,
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: C.green,
                    display: "block",
                  }}
                />
              )}
            </span>
            <span>
              {it.label}
              {/* Said out loud rather than implied by a dot alone. */}
              {showDot && <span style={{ position: "absolute", left: -9999 }}>, session in progress</span>}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
