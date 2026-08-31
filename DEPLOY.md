# Deploying DriverSide

The app runs three ways with zero code changes: fully offline prototype
(no env keys), local dev with the Express server, or production on Vercel
with Supabase auth and PostHog analytics. Every integration degrades
gracefully when its key is missing.

## 1. Vercel (hosting + the API)

```bash
npm i -g vercel
cd driverside-app
vercel login          # your account
vercel link           # create the project (name: driverside)
vercel                # first preview deploy
vercel --prod         # production
```

`vercel.json` is already configured (Vite build, dist output). The
`api/market.js` serverless function replaces the local Express server in
production; same request/response contract, so the client code doesn't
know the difference.

Environment variables (Vercel dashboard -> Project -> Settings ->
Environment Variables, or `vercel env add`):

| Name | Scope | Notes |
|---|---|---|
| MARKETCHECK_API_KEY | server only | Rotate the Aug 9 exposed key FIRST (CLAUDE.md rule). Never prefix with VITE_. |
| VITE_SUPABASE_URL | client | From Supabase, step 2 |
| VITE_SUPABASE_ANON_KEY | client | Public by design; RLS is the boundary |
| VITE_POSTHOG_KEY | client | From PostHog, step 3 |

## 2. Supabase (logins)

Sign-in is a one-time code to a **phone number or an email** — no
password, no social buttons. Both channels are `signInWithOtp` +
`verifyOtp`; the parse that decides which channel a typed identifier is
lives in `src/lib/supabase.js` and is unit-tested.

1. Create a project at supabase.com (free tier is fine to start).
2. Settings -> API: copy the project URL and anon key into the env vars.
3. Authentication -> Providers -> **Email**: enable. This is the channel
   that works out of the box — no third party, no spend.
   - To send a 6-digit code instead of only a magic link, edit
     Authentication -> Emails -> **Magic Link** template to include
     `{{ .Token }}`. Supabase ships that template with the link only; the
     app's code field stays empty-handed until the token is in there.
     (The link still works — either way in signs the buyer in.)
4. Authentication -> Providers -> **Phone**: enable, and configure an SMS
   provider (Twilio, MessageBird, Vonage, Textlocal). **No SMS is sent
   until this is done** — Supabase has no built-in SMS sender, so the
   phone half of the login screen returns "provider not enabled" and the
   app tells the buyer to use email instead. This is a paid third-party
   step; email OTP carries the product until it's set up.
   - Twilio is the usual choice: Account SID, Auth Token, and a Message
     Service SID pasted into the Supabase Phone provider form.
5. Authentication -> URL Configuration: set Site URL to the production
   domain and add the Vercel preview URLs to the redirect allow list
   (needed for the magic-link path; the code path doesn't redirect).
6. The app auto-detects the session on load (`getSession`) and on
   `onAuthStateChange`, so a verified code signs the buyer in in place.

### Deferred: social sign-in and subscriptions

Google/Apple OAuth is **off** and hidden — waiting on certification (an
Apple Developer account at $99/yr, a Google Cloud OAuth client) and the
paid subscription work it goes with. Nothing was deleted:

- `signInWithProvider()` in `src/lib/supabase.js` is intact.
- The button markup was retired with the Phase 1 Start screen; re-adding
  it to `src/components/Start.jsx` behind `socialLoginEnabled` is the
  remaining work. `signInWithProvider()` itself is untouched.
- Set `VITE_ENABLE_SOCIAL_LOGIN=true` (Vercel env or `.env.local`) and
  enable the provider in Supabase to bring both back — no code change.

Guest mode never touches Supabase — that's by design (first-class guest
door, everything on-device).

## 2b. The guest door

Guest is the default way in, not a downgrade: the decoder, the goal, the
garage and the scripts all run on-device with no sign-in. `ACCOUNT_REQUIRED`
in `src/lib/account.js` is the single table of what genuinely needs an
account — today just alerts (they fire with the app closed) and browser-
extension sync (a second device has to find the same garage). Reaching for
one of those opens `SignInPrompt` at that moment, and signing in **keeps
everything the guest already built** — `adoptSession` only ever adds.

`dealPass` sits in the table at `false` while subscriptions are deferred;
flip it to `true` when checkout writes an entitlement keyed to a Supabase
user id, and the gate works with no other change.

## 3. PostHog (metrics)

1. Create a project at posthog.com (US cloud). Copy the project API key
   into VITE_POSTHOG_KEY.
2. Events are already instrumented, mapped to the wedge success metrics
   in CLAUDE.md:

| Metric (CLAUDE.md) | Event |
|---|---|
| Quotes analyzed per week | quote_decoded |
| % returning with a second quote (negotiation proxy) | quote_redecoded |
| Self-reported savings | outcome_signed (kept amount when wired) |
| Share rate on decoded card | decode_shared (fires when share ships) |
| Monetization funnel | gate_hit -> paywall_viewed -> deal_pass_purchased |
| Journey | auth_completed, onboarding_completed, mode_opened, outcome_walked, freshstart_plan_started, refi_watch_set |

3. Suggested first dashboards: decode funnel (capture -> decoded ->
   gate_hit -> purchased), archetype distribution from
   onboarding_completed, and weekly quote_decoded count.
4. Identity: signed-in users are identified by Supabase user id; guests
   stay anonymous (person_profiles: identified_only keeps guest volume
   from inflating billable persons).

## 4. What else the product needs (not yet set up)

Near-term, before real users:
- Payments: Stripe for the Deal Pass ($39-59 one-time) and the Own It
  subscription. Checkout + webhook -> a `passes` table in Supabase keyed
  by user id and vehicle. The prototype's simulated purchase swaps out
  for this in one place (App.jsx onBuy).
- Persistence: Supabase Postgres for decoded deals, garage cars, and the
  archetype, with row-level security per user. Today everything is
  in-memory; a refresh loses state. This is the biggest gap.
- Error tracking: Sentry (free tier) on both the client and the API
  function. You can't fix what you can't see.
- Domain: buy the production domain when the name decision lands
  (BACKLOG item 11 — DriverSide is a placeholder; don't buy DriverSide).

Soon after:
- Transactional email: Supabase magic links use their SMTP by default
  (fine to start); move to Resend when you want branded emails and the
  price-drop / day-60 alert emails.
- Alerts backend: a Vercel cron hitting MarketCheck daily for watched
  listings, writing to Supabase, notifying via email/push. Powers Watch
  Mode and the Garage alerts for real.
- Rate limiting on /api/market (Vercel KV or Upstash) so a scraper can't
  drain the MarketCheck quota.
- Legal: privacy policy and terms (the app makes strong privacy promises
  in the UI — they need a real document behind them), and a review of TX
  requirements before charging money for deal advice.
- OCR (backlog item 4): the capture flow currently simulates; a vision
  API behind a serverless function fills it in. Define the line-item
  taxonomy first per the backlog.

## Local dev (unchanged)

```bash
npm install
npm run server   # Express API on :8787 (same contract as api/market.js)
npm run dev      # Vite on :5173, proxies /api
# or: npm run build && npm start
node smoke.mjs   # full headless click-through
```
