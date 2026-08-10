# Testing

Two suites. Unit and regression tests run in about two seconds with no
browser and no network; the end-to-end suite drives the built app in a
real browser. CI runs both on every push, which matters because a push to
`main` deploys straight to production.

```bash
npm test          # unit + regression (vitest, ~2s)
npm run test:watch
npm run build && npm run server   # in one terminal
npm run test:e2e                  # in another
```

## What's covered

`tests/unit/deal-engine.test.js` — the deal engine, tested hardest because
every verdict a buyer acts on comes from it: TX tax on price-minus-trade,
overcharge detection with exact deltas, the $25 rounding tolerance,
add-on totals, doc-fee thresholds, negative equity, amount financed,
spread anchoring, and vehicle parsing.

`tests/unit/scripts.test.js` — the words the buyer says out loud. Live
median and named comps appear; the interest delta is computed from the
deal's own principal; nothing renders `undefined`, `NaN`, or a template
artifact under any combination of missing data.

`tests/unit/archetypes.test.js` — routing as a product promise. Fresh
Start must win whenever the buyer is underwater or cutting costs, and no
other signal may override it. Exhaustive sweep over all 360 answer
combinations confirms every outcome maps to a real archetype.

`tests/unit/finance.test.js` — `pmt` against standard amortization, 0%
financing, dealer economics, plan numbers (open < target ≤ walk, never
above the sticker), the garage fit heuristic, and the one-number
calculator's anti-four-square math.

`tests/unit/market-api.test.js` — the endpoint, with `fetch` mocked. Live
comps, median on even and odd samples, trim widening, honest `none`
responses, error and network degradation, payload caps, and a check that
the API key never appears in a response.

`tests/regression/fixed-bugs.test.js` — one test per bug that actually
shipped, each named for the symptom a user would have seen. Plus two
invariants from the product docs: harm prevention is never paywalled, and
verdicts anchor to the original quote.

`smoke.mjs` — the full journey: guest sign-in, onboarding with the
archetype edit path, capture to reveal, all four paywall gates, Deal Pass
unlock, manual entry for a second vehicle, prep and table modes, the
walked and signed outcomes, profile, sign-out, and the desktop layout.

## Bugs this suite caught on its first run

Six failures across three real defects, all fixed:

**Phantom negative equity.** Entering a loan payoff while keeping the car
produced a roll-in that didn't exist and inflated the amount financed.
Negative equity now requires an actual trade offer.

**An impossible walk-away number.** With no market data the plan set
"walk if the price stays above" $800 *higher* than the asking price — a
trigger that could never fire. Target and walk are now capped at the
sticker, and the fallback is flagged as an estimate.

**A broken script on a clean sheet.** With no add-ons and no tax error the
first script rendered "That's ." — and the buyer would have read it aloud.
A clean sheet now gets its own script about price.

## Conventions

Tests assert on behavior a buyer would notice, not on implementation. The
e2e suite ignores font-CDN failures (sandboxes block them) but fails on
any other network error or console error. CI deliberately runs without
`MARKETCHECK_API_KEY` so the suite never depends on a live vendor or
spends quota — snapshot mode must always be enough to go green.
