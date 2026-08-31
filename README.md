# DriverSide — concept demo (redesigned core loop + monetization)

*The only one at the table on your side.*

Vite/React build of the redesigned core loop (screens 1a/1c/1d/1e from the
UX pass) plus backlog items 1 and 2: capture → scan → leverage reveal,
Deal Decoder with sticky verdict strip + anchor nav, manual-entry decode
for any deal, Deal Pass paywall states, onboarding with an earned
archetype reveal, and the Garage.

## Monetization states (per docs/monetization.md)

Free: first decode complete (all lines, leverage, market range and anchor),
the one-number calculator, and all harm prevention (negative equity is
never gated). Deal Pass gates, contextual only: second decode, "generate
my scripts", practice mode, named-comps reveal. The paywall sells with the
user's own leverage number; purchase is simulated in the prototype.

## Live numbers in scripts (backlog item 1)

Scripts build from the live market fetch: the walk-away quotes the real
median, the gap above it, and 1-2 named comps with dealer names. The
pre-approval script computes the interest delta on the deal's actual
principal, APR, and term against the 7.2%/60 CU benchmark.

## Manual entry (backlog item 2)

"Type it in — 30 seconds" from the capture screen. Vehicle, ZIP, price,
fees, tax, rate/term, trade. The engine re-runs TX tax on price minus
trade (correct tax lands FAIR, an error lands FLAG with the exact delta),
flags doc fees over $250, lumps add-ons as removable, computes leverage,
and fetches market data for the parsed vehicle. Vehicles without data get
an honest no-data state, never fake numbers.

Design language: Monroney window sticker × "Industry" blueprint grammar —
square corners everywhere, hairline borders, Barlow Condensed headings,
mono data, one steel (#5980a6) primary action per screen. Verdict chips
always carry text; steppers replace sliders; expandable lines are real
buttons with `aria-expanded`; `prefers-reduced-motion` skips animations.

## Run it

```bash
npm install

# Development (two terminals):
npm run server   # API on :8787
npm run dev      # Vite on :5173, proxies /api → :8787

# Production (one port):
npm run build
npm start        # serves app + API on :8787

node smoke.mjs   # headless click-through of the whole core loop
```

## Live market data

The Decoder's market section auto-fetches `/api/market`. Without a key the
server serves a real Aug 8, 2026 MarketCheck snapshot; set
`MARKETCHECK_API_KEY` in `.env` (see `.env.example`) for live listings.
Leverage numbers derive from the live median, so the sticky strip updates
with real data.

## Layout

```
src/
  App.jsx                    shell, tabs, deal + monetization state, gates
  theme.js                   tokens (paper/ink/verdicts/steel), fonts, pmt()
  data/decode.js             deal engine: buildDeal(), MOCK_DEAL, dealerMath(),
                             buildScripts() with live numbers, parseVehicle()
  data/archetypes.js         5 questions w/ purpose cues, 7 archetypes, routing
  lib/
    supabase.js              auth client (env-driven; simulated with no keys),
                             phone/email OTP send + verify, identifier parsing
    account.js               what actually needs an account — the guest-door table
    analytics.js             PostHog wrapper + event taxonomy (no-op with no key)
  components/
    ui.jsx                   Chip, Kicker, Corners, PrimaryBtn, DecodeLine, Stepper
    Login.jsx                4b — guest-first door; account = phone/email OTP
    OtpForm.jsx              the shared code door: identifier → 6-digit → session
    SignInPrompt.jsx         the account ask, at the point of need (guest → account)
    CaptureFlow.jsx          1c — capture → scanning → count-up reveal
    ManualEntry.jsx          30-second form → buildDeal() → full decode
    Decoder.jsx              1a — renders any deal; gates scripts/comps/practice
    Paywall.jsx              Deal Pass screen, sells with own leverage number
    Modes.jsx                4a mode switch, 2a Prep Mode, 2b Table Mode
    Outcomes.jsx             3a walked, 3b the receipt, 3c Fresh Start plan
    Profile.jsx              4c — connections, setup, alerts, the promise
    Onboarding.jsx           1d — questions + reveal + edit path
    Garage.jsx               1e — empty state + fit-sorted list
api/
  market.js                  Vercel serverless /api/market (see DEPLOY.md)
server/
  index.mjs                  Express: /api/market proxy + static serving;
                             honest no-data response for uncached vehicles
  snapshot.mjs               real Aug 8, 2026 MarketCheck pull (fallback)
```

Not yet built (designed, in the redesign package): Prep/Table modes,
walked/signed/Fresh-Start outcome screens, mode switch, login/guest,
profile. The full spec lives in the design handoff README.
