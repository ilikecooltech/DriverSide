import { chromium } from "playwright";
import { existsSync } from "node:fs";

/* End-to-end regression suite. Walks the whole product the way a buyer
   would: sign in, decode, hit every paywall gate, run the modes, land on
   an outcome. Runs against the built app on :8787.
   Usage: npm run build && npm run server, then `npm run test:e2e`. */

// Use a preinstalled browser when one is present (sandboxes/CI images),
// otherwise let Playwright resolve its own download.
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
const expect = async (s, label) => { if (!(await body()).includes(s)) throw new Error(`${label}: missing "${s}"`); };
const expectNot = async (s, label) => { if ((await body()).includes(s)) throw new Error(`${label}: should NOT contain "${s}"`); };

await page.goto(BASE, { waitUntil: "networkidle" });

// ---- login: welcome -> guest door -> in
await expect("THE ONLY ONE AT THE TABLE ON YOUR SIDE", "login welcome");
await page.getByRole("button", { name: /continue as guest/ }).click();
await expect("Nothing leaves this phone", "guest landing");
await page.getByRole("button", { name: /START DECODING/ }).click();

// ---- onboarding: cues, routing, edit path
await expect("Five taps", "Q1 cue");
for (const t of ["My family changed", "Trade or sell", "Lowest total cost", "A few times", "Safety"]) {
  await page.getByRole("button", { name: new RegExp(t) }).click();
}
await expect("Family Hauler", "reveal");
await page.getByRole("button", { name: /Not quite/ }).click();
await page.getByRole("button", { name: /Trade or sell/ }).click();
await page.getByRole("button", { name: /I owe more/ }).click();
await expect("Fresh Start", "edit-path rerouting");
await page.getByRole("button", { name: /SOUNDS LIKE ME/ }).click();

// ---- FREE TIER: first decode (mock CR-V) is complete
await expect("Photograph it", "capture state");
await page.getByRole("button", { name: /PHOTOGRAPH THE QUOTE/ }).click();
await page.waitForSelector("text=and up to $3,761", { timeout: 12000 });
await page.getByRole("button", { name: /SEE THE FULL DECODE/ }).click();
await page.waitForSelector("text=YOUR LEVERAGE", { timeout: 3000 });
await expect("ASK TO REMOVE", "decoder groups");
await expect("Anchor your counter at or below", "market anchor (free)");
// gates visible, content gated
await expect("GENERATE MY SCRIPTS · DEAL PASS", "scripts gate");
await expect("named comps — dealer, miles, days on lot", "comps gate");
await expectNot("prep fee, nitrogen", "unredacted script text must be gated");
await expectNot("hondaoflakejackson", "comp names must be gated");
// negative equity (harm prevention) is FREE
await expect("Negative equity rolled into new loan", "harm prevention free");
await page.screenshot({ path: "/tmp/shot-free-decoder.png" });

// ---- GATE 2: generate my scripts -> paywall sells with own leverage
await page.getByRole("button", { name: /GENERATE MY SCRIPTS/ }).click();
await expect("$2,174", "paywall uses own leverage number");
await expect("PROTOTYPE · NO REAL PURCHASE", "prototype note");
await page.getByRole("button", { name: "Not now" }).click();
await expect("YOUR LEVERAGE", "paywall close returns to decoder");

// ---- GATE 1: second decode -> paywall -> buy -> manual entry
await page.getByRole("button", { name: "+ NEW QUOTE" }).click();
await expect("second decode is where the negotiation actually starts", "second-decode gate");
await page.getByRole("button", { name: /GET THE DEAL PASS/ }).click();
await expect("Photograph it", "post-purchase returns to capture");
await expect("· DEAL PASS", "pass badge");

// ---- item 1: scripts now carry live market numbers + named comps
// re-decode the mock to check unlocked script content
await page.getByRole("button", { name: /PHOTOGRAPH THE QUOTE/ }).click();
await page.waitForSelector("text=and up to $3,761", { timeout: 12000 });
await page.getByRole("button", { name: /SEE THE FULL DECODE/ }).click();
await page.waitForSelector("text=LIVE MARKET NUMBERS", { timeout: 4000 });
await expect("hondaoflakejackson", "named comps unlocked");
await page.getByRole("button", { name: "Walk away" }).click();
await expect("listed about $1,053 over the live market median", "walk-away uses live median delta");
await expect("$30,038 at hondaoflakejackson.com", "walk-away names a live comp");
await expect("My number is $30,934", "walk-away anchors at live median");
await page.screenshot({ path: "/tmp/shot-live-scripts.png" });

// ---- item 2: manual entry produces a full decode for a different car
await page.getByRole("button", { name: "+ NEW QUOTE" }).click(); // pass active: no gate
await page.getByRole("button", { name: /Type it in/ }).click();
await expect("MANUAL ENTRY · 30 SECONDS", "manual entry form");
const fill = async (label, val) => {
  const el = page.locator(`text=${label}`).locator("xpath=following-sibling::input");
  await el.fill(val);
};
await fill("Year", "2022");
await fill("Make", "Toyota");
await fill("Model", "RAV4");
await fill("Trim (optional)", "XLE");
await fill("ZIP", "77471");
await fill("Vehicle price", "27995");
await fill("Doc fee", "499");
await fill("Title & registration", "108");
await fill("Dealer add-ons total", "1100");
await fill("Sales tax on the sheet", "1750");
await fill("Their APR %", "9.4");
await fill("Term (months)", "72");
await fill("Their trade offer ($0 if none)", "0");
await fill("Your loan payoff ($0 if none)", "0");
await page.getByRole("button", { name: "DECODE THIS DEAL" }).click();
await page.waitForSelector("text=2022 Toyota RAV4 XLE", { timeout: 3000 });
await expect("Dealer add-ons (as listed on the sheet)", "manual FLAG line");
// tax check: 6.25% of 27,995 = 1,750 -> correct, must be FAIR not FLAG
await expect("Sales tax — matches 6.25% of price minus trade", "correct tax is FAIR");
await page.getByRole("button", { name: /Doc fee/ }).click();
await expect("Above TX typical", "doc fee flagged CHECK");
// no cached data for RAV4 -> honest no-data market state
await expect("No live data for this vehicle yet", "honest no-data market");
await expect("No trade on this deal", "no-trade state");
await page.screenshot({ path: "/tmp/shot-manual-decode.png" });

// ---- harm prevention link: manual deal has no trade -> back to CR-V for negEq
await page.getByRole("button", { name: "+ NEW QUOTE" }).click();
await page.getByRole("button", { name: /PHOTOGRAPH THE QUOTE/ }).click();
await page.waitForSelector("text=and up to $3,761", { timeout: 12000 });
await page.getByRole("button", { name: /SEE THE FULL DECODE/ }).click();
await page.waitForSelector("text=YOUR LEVERAGE", { timeout: 3000 });
await page.getByRole("button", { name: /wait-it-out plan/ }).click();
await expect("Our honest read", "fresh start screen");
await expect("don't buy yet", "fresh start headline");
// stepper: +$100 extra -> months drop from 16 to 10
await expect("16 months", "fresh start base months");
for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "More extra payment" }).click();
await expect("10 months", "fresh start stepper math");
await expect("Roll the $2,900 into a new loan", "roll-in priced as FLAG");
await page.screenshot({ path: "/tmp/shot-freshstart.png" });
await page.getByRole("button", { name: /START THE PLAN/ }).click();
await expect("SORTED BY FIT", "fresh start routes to garage");

// ---- modes: switch -> prep -> table
await page.getByRole("button", { name: "Deal Decoder" }).click();
await page.getByRole("button", { name: "MODES" }).click();
await expect("Where are you", "mode switch");
await expect("Location is used on-device", "location disclosure");
await page.getByRole("button", { name: /OPEN PREP MODE/ }).click();
await expect("at this table, not theirs.", "prep headline");
await expect("YOUR NUMBERS — PUT THEM ON PAPER", "prep numbers card");
// prep checklist counts
await page.getByRole("button", { name: /credit-union pre-approval/ }).click();
await expect("1/4 DONE", "prep checklist counter");
await page.screenshot({ path: "/tmp/shot-prep.png" });
await page.getByRole("button", { name: /SWITCH TO TABLE MODE/ }).click();
await expect("TAP EACH ONE THEY CONCEDE", "table mode");
await expect("You can leave. They can't.", "table bottom bar");
// win two concessions -> tally moves
await page.getByRole("button", { name: /Dealer prep/ }).click();
await page.getByRole("button", { name: /Nitrogen/ }).click();
await expect("$694", "concession tally (395+299)");
await page.screenshot({ path: "/tmp/shot-table.png" });
await page.getByRole("button", { name: "Full decode" }).click();
await expect("ASK TO REMOVE", "table -> full decode");

// ---- outcomes: walked with callback sim, receipt with computed kept
await page.getByRole("button", { name: "MODES" }).click();
await page.getByRole("button", { name: /I walked/ }).click();
await expect("That was the strongest move", "walked headline");
await page.getByRole("button", { name: /Simulate: the dealer calls back/ }).click();
await expect("Repeat your number once, then be quiet", "callback coaching");
await page.screenshot({ path: "/tmp/shot-walked.png" });
await page.getByRole("button", { name: /GARAGE CARS/ }).click();
await expect("SORTED BY FIT", "walked -> garage");
await page.getByRole("button", { name: "Deal Decoder" }).click();
await page.getByRole("button", { name: "MODES" }).click();
await page.getByRole("button", { name: /I signed/ }).click();
await expect("VS THEIR FIRST SHEET, YOU KEPT", "receipt");
await expect("The receipt is the product", "receipt sign-off");
await page.screenshot({ path: "/tmp/shot-receipt.png" });

// ---- profile: identity, connections, promise, sign out
await page.getByRole("button", { name: "Profile" }).click();
await expect("WHERE YOU SHOP", "profile connections");
await expect("We make money when you subscribe", "business-model promise");
await expect("on this device only", "guest identity");
await page.getByRole("button", { name: "CONNECT", exact: true }).first().click();
await expect("✓ CONNECTED", "connection toggle");
await page.getByRole("button", { name: "Sign out" }).click();
await expect("THE ONLY ONE AT THE TABLE ON YOUR SIDE", "sign out -> login");

// ---- garage: add-vehicle flow (fresh session state)
await page.getByRole("button", { name: /continue as guest/ }).click();
await page.getByRole("button", { name: /START DECODING/ }).click();
await page.getByRole("button", { name: "Garage" }).click();
await expect("SORTED BY FIT", "garage list");
await page.getByRole("button", { name: /Save another from any site/ }).click();
await expect("WE'LL PRICE IT AGAINST THE MARKET", "add-vehicle form");
const gfill = async (label, val) => {
  const el = page.locator(`text=${label}`).locator("xpath=following-sibling::input");
  await el.fill(val);
};
await gfill("Year", "2021");
await gfill("Make", "Subaru");
await gfill("Model", "Outback");
await gfill("Listed price", "26500");
await page.getByRole("button", { name: "SAVE TO GARAGE" }).click();
await page.waitForSelector("text=2021 Subaru Outback", { timeout: 5000 });
await expect("4 SAVED", "garage count updated");
await expect("No live market data yet", "honest no-data note (snapshot mode)");
await page.screenshot({ path: "/tmp/shot-garage-add.png" });

// ---- desktop layout: widen viewport, garage goes 2-col, app still works
await page.setViewportSize({ width: 1280, height: 900 });
await page.waitForTimeout(400);
await expect("2021 Subaru Outback", "desktop garage renders");
await page.screenshot({ path: "/tmp/shot-desktop-garage.png" });
await page.getByRole("button", { name: "Deal Decoder" }).click();
await expect("Photograph it", "desktop deal tab renders");
await page.screenshot({ path: "/tmp/shot-desktop-capture.png" });

await browser.close();
const realFails = failed.filter((u) => !u.includes("fonts.g"));
const realErrors = errors.filter((e) => !(e.includes("Failed to load resource") && realFails.length === 0));
if (realFails.length) throw new Error("Failed requests: " + realFails.join(" | "));
if (realErrors.length) throw new Error("Console errors: " + realErrors.join(" | "));
console.log("SMOKE PASS — free first decode complete, 4 gates working, pass unlock, live-number scripts w/ named comps, manual entry decodes a second vehicle with honest no-data market");
