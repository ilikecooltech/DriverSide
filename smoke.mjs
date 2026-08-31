import { chromium } from "playwright";
import { existsSync } from "node:fs";

/* End-to-end regression suite. Walks the product in the order a buyer
   does: sign in, set a goal, shop it, build a garage, then go to the
   dealer and decode. Runs against the built app on :8787.
   Usage: npm run build && npm run server, then `npm run test:e2e`. */

const SANDBOX_CHROMIUM = "/opt/pw-browsers/chromium";
const browser = await chromium.launch(
  existsSync(SANDBOX_CHROMIUM) ? { executablePath: SANDBOX_CHROMIUM } : {}
);
const BASE = process.env.SMOKE_URL || "http://localhost:8787/";
const page = await browser.newPage({ viewport: { width: 480, height: 900 } });

const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const failed = [];
page.on("requestfailed", (r) => failed.push(r.url()));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

const body = async () => await page.textContent("body");
/* Failures report what the page actually showed — a bare "missing X" tells
   you nothing when the app took a different branch than you expected. */
const expect = async (s, label) => {
  const t = await body();
  if (!t.includes(s)) {
    const shown = t.slice(0, 220).replace(/\s+/g, " ").trim() || "(nothing — the app failed to render)";
    const crash = errors.length ? `\n   js errors: ${errors.slice(0, 3).join(" | ")}` : "";
    throw new Error(`${label}: missing "${s}"\n   page showed: ${shown}${crash}`);
  }
};
const expectNot = async (s, label) => { if ((await body()).includes(s)) throw new Error(`${label}: should NOT contain "${s}"`); };
const btn = (name) => page.getByRole("button", { name });

/* Start from a clean, signed-out app. When Supabase keys are configured
   the session survives a storage wipe often enough to matter, and an
   already-signed-in app skips the login screen entirely — so sign out
   through the UI rather than assuming. */
await page.goto(BASE, { waitUntil: "domcontentloaded" });
await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch { /* private mode */ } });
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(900); // let the async session check settle
if (!(await body()).includes("You brought backup")) {
  const profile = btn("Profile");
  if (await profile.count()) {
    await profile.click();
    const out = btn("Sign out");
    if (await out.count()) await out.click();
    await page.waitForTimeout(600);
  }
}

// ═══ START — five doors, guest-first, one account line ═══
await expect("Buying a car? Good. You brought backup.", "start hero");
await expect("Start wherever you are.", "journey doors");
await expect("NO ACCOUNT NEEDED", "trust chips");
await expectNot("Continue with Google", "social login is deferred");
await expectNot("Continue with Apple", "social login is deferred");
/* The duplicate-CTA bug this screen replaced: the old landing offered
   "SKIP FOR NOW" and "continue as guest" as separate buttons for the same
   door. Neither phrase may come back. */
await expectNot("Skip for now", "no duplicate guest CTA");
await expectNot("continue as guest", "no duplicate guest CTA");
/* The account is one quiet line. Walk into it and back out — sending a
   real code needs Supabase keys the smoke run has no business using. */
await btn(/^Sign in$/).click();
await expect("PHONE OR EMAIL", "otp identifier step");
await btn(/SEND MY CODE/).click();
await expect("Enter your phone number or email", "otp rejects an empty field");
await btn(/Not now — just let me in/).click();
await expect("Start wherever you are.", "back to the doors, still a guest");
/* Shop is the one door that needs a goal first — it ranks against one. */
await btn(/SHOP BY GOAL/).click();

// ═══ ONBOARDING — cues, routing, edit path ═══
await expect("Five taps", "Q1 cue");
for (const t of ["My family changed", "Trade or sell", "Lowest total cost", "A few times", "Safety"]) {
  await btn(new RegExp(t)).click();
}
await expect("Family Hauler", "archetype reveal");
await btn(/Not quite/).click();
await btn(/Trade or sell/).click();
await btn(/I owe more/).click();
await expect("Fresh Start", "edit path reroutes to Fresh Start");
await btn(/SOUNDS LIKE ME/).click();

// ═══ SHOP — the new landing. Goal drives the list. ═══
await expect("SHOPPING FOR YOUR GOAL", "shop lands after onboarding");

/* ═══ GOAL FLOW — "Change goal" must open the editor AND let you out ═══
   The editor used to be a one-way door: five questions with no cancel, so
   tapping "Change goal" by accident meant re-answering all of them. */
await btn(/Change goal/).click();
await expect("Five taps", "'Change goal' opens the goal editor");
await btn(/Keep my current goal/).click();
await expect("SHOPPING FOR YOUR GOAL", "backing out returns to Shop");
await expect("Fresh Start", "backing out keeps the existing goal");
await page.waitForSelector("text=MATCHES · SORTED BY FIT", { timeout: 8000 });

await expect("Fresh Start", "shop shows the goal");
await page.waitForSelector("text=MATCHES · SORTED BY FIT", { timeout: 5000 });
await expect("SAMPLE INVENTORY", "sample data labeled honestly");
await expect("MATCH", "match scores render");
await expect("BEST MATCH", "top result stamped");
await page.screenshot({ path: "/tmp/shot-shop.png" });

// filters: body type chip changes the result set
await btn("Pickup").click();
await page.waitForTimeout(400);
await expect("Pickup", "body filter applied");
await btn("Pickup").click(); // back off
await page.waitForTimeout(400);

// more filters open, reset restores goal defaults
await btn(/More filters/).click();
await expect("Max price", "filter panel");
await expect("Search radius (mi)", "radius filter");
await btn(/Reset to what fits my goal/).click();
await btn(/Hide filters/).click();

// save two cars to the garage
const saveButtons = page.getByRole("button", { name: "SAVE TO GARAGE" });
await saveButtons.first().click();
await expect("✓ IN YOUR GARAGE", "save confirms in place");
await saveButtons.first().click();

// ═══ GARAGE — ranking, removal, sources ═══
await btn(/^Garage/).click();
await expect("SAVED · SCORED FOR FRESH START", "garage header");
await expect("MY RANK", "rank control present");
await expect("SHOPPED", "source badge");
await page.screenshot({ path: "/tmp/shot-garage.png" });

// re-rank: move the first car to position 2
const firstTitle = await page.locator("div").filter({ hasText: /^\d{4} \w/ }).first().textContent();
await page.locator("select").first().selectOption("2");
await page.waitForTimeout(300);
const afterTitle = await page.locator("div").filter({ hasText: /^\d{4} \w/ }).first().textContent();
if (firstTitle === afterTitle) throw new Error("rank dropdown did not reorder the garage");

// ═══ PROFILE — top nav, connections, editable setup ═══
await btn("Profile").click();
await expect("WHERE YOU SHOP", "profile connections");
await expect("DEMO IMPORT", "import honestly labeled");
await expect("We make money when you subscribe", "business model stated");

// connect a marketplace -> imports its saved cars
await page.getByRole("button", { name: "CONNECT", exact: true }).first().click();
await expect("✓ CONNECTED", "connection toggles on");
await btn("Profile").click(); // close profile
await btn(/^Garage/).click();
await expect("AUTOTRADER", "imported cars carry their source");
await page.screenshot({ path: "/tmp/shot-garage-imported.png" });

// disconnect removes exactly what it imported
await btn("Profile").click();
await page.getByRole("button", { name: "✓ CONNECTED" }).first().click();
await btn("Profile").click();
await btn(/^Garage/).click();
await expectNot("AUTOTRADER", "disconnect removes imported cars");

// editable shopping setup
await btn("Profile").click();
await btn("Edit all").click();
await expect("EDIT YOUR SHOPPING SETUP", "setup editor opens");
const setField = async (label, val) => {
  await page.locator(`text=${label}`).locator("xpath=following-sibling::input").fill(val);
};
await setField("ZIP", "78701");
await setField("Pre-approval APR %", "5.9");
await btn("SAVE SETUP").click();
await expect("78701", "ZIP saved");
await expect("5.9%", "APR saved");
await page.screenshot({ path: "/tmp/shot-profile.png" });
await btn("Profile").click();

// ═══ AT THE DEALER — decode, gates, modes, outcomes ═══
await btn("Dealer").click();
await expect("Photograph it", "capture state");
await btn(/PHOTOGRAPH THE QUOTE/).click();
await page.waitForSelector("text=and up to $3,761", { timeout: 12000 });
await btn(/SEE THE FULL DECODE/).click();
await page.waitForSelector("text=YOUR LEVERAGE", { timeout: 3000 });
await expect("ASK TO REMOVE", "grouped problems");
await expect("Anchor your counter at or below", "market anchor free");
await expect("GENERATE MY SCRIPTS · DEAL PASS", "scripts gated");
await expectNot("prep fee, nitrogen", "script text stays gated");
await expect("Negative equity rolled into new loan", "harm prevention free");
await page.screenshot({ path: "/tmp/shot-decoder.png" });

// gate: scripts -> paywall sells with the buyer's own number
await btn(/GENERATE MY SCRIPTS/).click();
await expect("$2,174", "paywall uses own leverage");
await btn("Not now").click();

// gate: second decode -> buy -> pass active
await btn("+ NEW QUOTE").click();
await expect("second decode is where the negotiation actually starts", "second-decode gate");
await btn(/GET THE DEAL PASS/).click();
await expect("· DEAL PASS", "pass badge");

// scripts now live, with live-market numbers and named comps
await btn(/PHOTOGRAPH THE QUOTE/).click();
await page.waitForSelector("text=and up to $3,761", { timeout: 12000 });
await btn(/SEE THE FULL DECODE/).click();
// Wait for the market data itself, not a header that renders before it.
await page.waitForSelector("text=hondaoflakejackson", { timeout: 10000 });
await expect("LIVE MARKET NUMBERS", "scripts unlocked with live numbers");
await btn("Walk away").click();
await expect("over the live market median", "walk-away uses live median");
await expect("My number is $30,934", "anchors at live median");

// manual entry decodes a different vehicle, structured fields
await btn("+ NEW QUOTE").click();
await btn(/Type it in/).click();
await expect("MANUAL ENTRY · 30 SECONDS", "manual entry");
for (const [label, val] of [
  ["Year", "2022"], ["Make", "Toyota"], ["Model", "RAV4"], ["Trim (optional)", "XLE"],
  ["ZIP", "77471"], ["Vehicle price", "27995"], ["Doc fee", "499"],
  ["Title & registration", "108"], ["Dealer add-ons total", "1100"],
  ["Sales tax on the sheet", "1750"], ["Their APR %", "9.4"], ["Term (months)", "72"],
  ["Their trade offer ($0 if none)", "0"], ["Your loan payoff ($0 if none)", "0"],
]) await setField(label, val);
await btn("DECODE THIS DEAL").click();
await page.waitForSelector("text=2022 Toyota RAV4 XLE", { timeout: 3000 });
await expect("Sales tax — matches 6.25% of price minus trade", "correct tax is FAIR");
await expect("No trade on this deal", "no-trade state");
await page.screenshot({ path: "/tmp/shot-manual.png" });

// modes: switch -> prep -> table
await btn("MODES").click();
await expect("Where are you", "mode switch");
await expect("Location is used on-device", "location disclosure");
await btn(/OPEN PREP MODE/).click();
await expect("YOUR NUMBERS — PUT THEM ON PAPER", "prep numbers");
await btn(/credit-union pre-approval/).click();
await expect("1/4 DONE", "prep checklist");
await btn(/SWITCH TO TABLE MODE/).click();
await expect("TAP EACH ONE THEY CONCEDE", "table mode");
await expect("You can leave. They can't.", "table bottom bar");
await page.screenshot({ path: "/tmp/shot-table.png" });

// outcomes: walked, then the receipt
await btn("Full decode").click();
await btn("MODES").click();
await btn(/I walked/).click();
await expect("That was the strongest move", "walked");
await btn(/Simulate: the dealer calls back/).click();
await expect("Repeat your number once, then be quiet", "callback coaching");
await btn(/GARAGE CARS/).click();
await expect("SCORED FOR", "walked routes to garage");

await btn("Dealer").click();
await btn("MODES").click();
await btn(/I signed/).click();
await expect("VS THEIR FIRST SHEET, YOU KEPT", "receipt");
await expect("The receipt is the product", "receipt sign-off");

// ═══ PERSISTENCE — the garage and setup survive a reload ═══
await page.reload({ waitUntil: "networkidle" });
/* A returning buyer lands on the resume card, not on onboarding. It
   reports only what is actually on the device — no invented price-drop
   history — and drops them straight back into the Garage. */
await expect("WELCOME BACK", "returning user sees the resume card");
await btn(/Continue in your Garage/).click();
await expect("SCORED FOR", "garage persisted across reload");
await page.getByRole("button", { name: "Shop", exact: true }).click();
await expect("SHOPPING FOR YOUR GOAL", "goal persisted — no re-onboarding");
await btn("Profile").click();
await expect("78701", "setup persisted across reload");

// ═══ GUEST GATE — the account ask lands at the point of need ═══
await expect("BROWSING AS A GUEST", "guest banner in profile");
await btn(/Price drops on garage cars/).click();
await expect("We can't text a phone we don't have", "alerts gate asks for an account");
await expect("PHONE OR EMAIL", "gate offers the same code door");
await btn(/keep going as a guest/).click();
await expect("BROWSING AS A GUEST", "dismissing the gate returns to the profile");

/* And the gate must actually convert. With no Supabase keys the code step
   is simulated, so sending is the whole flow — but the guest still has to
   come back as an account holder, with the garage they built intact. This
   is the regression: relying on onAuthChange alone left the prototype a
   guest forever and re-asked on every tap. */
await btn(/Price drops on garage cars/).click();
await page.fill("#ds-identifier", "buyer@example.com");
await btn(/SEND MY CODE/).click();
await page.waitForTimeout(500);
await expectNot("BROWSING AS A GUEST", "signing in through the gate clears guest mode");
await expect("78701", "the guest's setup survives the upgrade");

// ═══ DESKTOP ═══
await page.setViewportSize({ width: 1280, height: 900 });
await page.waitForTimeout(400);
await btn("Profile").click();
await page.getByRole("button", { name: "Shop", exact: true }).click();
await page.waitForSelector("text=MATCHES · SORTED BY FIT", { timeout: 5000 });
await page.screenshot({ path: "/tmp/shot-desktop-shop.png" });

await browser.close();

/* Fonts and analytics are allowed to fail: sandboxes block them, and so do
   plenty of real users' ad blockers. The product must work without either,
   which is exactly what this run just proved. */
const OPTIONAL = ["fonts.g", "posthog.com", "i.posthog"];
const realFails = failed.filter((u) => !OPTIONAL.some((o) => u.includes(o)));

/* Degradations our own code handles and logs on purpose. These are not
   defects — the product kept working — but they mean something is
   misconfigured, so they get reported loudly rather than swallowed. */
const HANDLED = ["Supabase init failed", "PostHog init failed"];
const handled = [...new Set(errors.filter((e) => HANDLED.some((h) => e.includes(h))))];
const realErrors = errors.filter(
  (e) =>
    !e.includes("Failed to load resource") &&
    !e.toLowerCase().includes("posthog") &&
    !HANDLED.some((h) => e.includes(h))
);
if (realFails.length) throw new Error("Failed requests: " + realFails.join(" | "));
if (realErrors.length) throw new Error("Console errors: " + realErrors.join(" | "));

console.log("SMOKE PASS — login, onboarding+reroute, shop w/ filters & save, garage rank/remove, connections import+disconnect, editable setup, decoder + 4 gates, manual entry, modes, outcomes, persistence, desktop");

if (handled.length) {
  console.log("\n⚠  CONFIGURATION WARNINGS — the app degraded gracefully, but fix these:");
  for (const h of handled) console.log("   • " + h);
  console.log("   Check the matching VITE_* value in .env.local and in Vercel.\n");
}
