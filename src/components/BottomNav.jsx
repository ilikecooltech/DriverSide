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
  { key: "start", icon: "⌂", label: "Start" },
  { key: "shop", icon: "🔍", label: "Shop" },
  { key: "garage", icon: "🚗", label: "Garage" },
  { key: "finance", icon: "💵", label: "Finance", pending: true },
  { key: "dealer", icon: "🤝", label: "Dealer", live: true },
];

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
              borderTop: on ? `2px solid ${C.ink}` : "2px solid transparent",
              cursor: "pointer",
              padding: "7px 2px 8px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              fontFamily: mono,
              fontSize: 9.5,
              letterSpacing: "0.04em",
              color: on ? C.ink : C.inkSoft,
              fontWeight: on ? 700 : 400,
            }}
          >
            <span aria-hidden="true" style={{ fontSize: 17, lineHeight: 1, position: "relative", display: "block" }}>
              {it.icon}
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
