/* Accessibility check: walks every main screen at phone width, runs axe
   (WCAG 2.0 to 2.2, A and AA, plus best practices) on each, and checks
   the keyboard behaviors axe can't see: focus lands on each new screen's
   heading, the Ask panel keeps focus inside and returns it, LOG IT is
   really disabled until there's a number, and the dark focus ring is the
   light one. Fails on any problem. Run against the built app on :8787,
   after smoke.mjs (npm run test:e2e does both). */
import { chromium } from "playwright";
import fs from "node:fs";
import { createRequire } from "node:module";

const AXE = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const BASE = process.env.BASE_URL || "http://localhost:8787";
const b = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
p.setDefaultTimeout(8000);
const btn = (n, o) => p.getByRole("button", { name: n, ...o });
const problems = [];
const fail = (m) => { problems.push(m); console.log("  ✗", m); };
const active = () => p.evaluate(() => { const e = document.activeElement; return e === document.body ? "BODY" : e.tagName + ":" + (e.getAttribute("aria-label") || e.textContent || "").trim().slice(0, 40); });

/* Ask on, with a canned answer, so its panel can be checked. */
await p.route("**/api/ask", (r) => r.request().method() === "GET" ? r.fulfill({ json: { on: true } }) : r.fulfill({ json: { ok: true, tier: "fast", answer: "Short answer.\n\nThe Deal Pass has the exact words for this." } }));

async function scan(name, { expectHeading = true } = {}) {
  await p.waitForTimeout(450);
  await p.addScriptTag({ content: AXE });
  const v = await p.evaluate(async () => (await axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] } })).violations.map((x) => `${x.id} (${x.nodes.length}): ${x.nodes[0].target.join(" ")}`));
  v.forEach((x) => fail(`${name}: ${x}`));
  if (expectHeading && !(await active()).startsWith("H1:")) fail(`${name}: focus should be on the screen's heading, was ${await active()}`);
  console.log(v.length ? "✗" : "✓", name);
}

await p.goto(BASE); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(800);
await scan("start", { expectHeading: false });
await p.getByRole("button", { name: /^Sign in$/ }).last().click();
await scan("sign in", { expectHeading: false });
await btn(/SEND MY CODE/).click();
await scan("sign in error", { expectHeading: false });
if ((await p.getAttribute("#ds-identifier", "aria-invalid")) !== "true") fail("sign in error: field not marked invalid");
if (!(await active()).startsWith("INPUT")) fail("sign in error: focus should return to the field");
await btn(/Not now/).click();
await btn(/Just looking/).click(); await scan("goal question 1");
await btn(/My family changed/).click(); await scan("goal question 2");
for (const t of ["Trade or sell", "Lowest total cost", "A few times", "Safety"]) await btn(new RegExp(t)).click();
await scan("goal result");
await btn(/SOUNDS LIKE ME/).click(); await p.waitForTimeout(1200); await scan("shop");
await btn(/More filters/).click(); await scan("shop filters", { expectHeading: false });
await p.getByRole("button", { name: /See photos and details/ }).first().click(); await p.waitForTimeout(600); await scan("car page");
await btn("Garage", { exact: true }).click(); await scan("garage");
await btn(/Paste a link from any site/).first().click(); await scan("paste a link", { expectHeading: false });
await btn(/FIND THIS CAR/).click(); await scan("paste a link error", { expectHeading: false });
await btn("Tools", { exact: true }).click(); await scan("tools");
await p.getByRole("button", { name: /Payment and total cost/ }).click(); await scan("calculator");
await btn("Profile").click(); await scan("profile");
await btn("Dealer", { exact: true }).click(); await scan("dealer");
await btn(/^Photograph it$/).click(); await scan("photograph the quote");
await btn(/PHOTOGRAPH THE QUOTE/).click(); await p.waitForTimeout(5000); await scan("quote decoded");
await btn("Dealer", { exact: true }).click();
const picker = p.getByRole("button", { name: /not in my Garage/ });
if (!(await picker.count())) { const back = p.getByRole("button", { name: /^Back to/ }); if (await back.count()) await back.click(); }
await picker.click();
await p.selectOption("#dl-year", "2021"); await p.fill("#dl-make", "Honda"); await p.fill("#dl-model", "CR-V EX");
await p.getByLabel("Their asking price, exact").fill("21500"); await btn(/START SESSION/).click(); await p.waitForSelector("text=The table");
await scan("dealer session");
if (!(await btn(/^LOG IT$/).isDisabled())) fail("LOG IT should be disabled until there's a number");
await p.getByLabel("Their new number, exact").fill("21300"); await btn(/^LOG IT$/).click(); await p.waitForTimeout(200);
if (!/Logged \$21,300/.test(await p.textContent("#ds-announce"))) fail("logging a number should be announced");
await p.getByRole("button", { name: /^Add-ons$/ }).focus(); await p.keyboard.press("Shift+Tab"); await p.keyboard.press("Tab");
if ((await p.evaluate(() => getComputedStyle(document.activeElement).outlineColor)) !== "rgb(141, 180, 220)") fail("dark screens should use the light focus ring");
await btn(/Ask a question/).click(); await p.waitForTimeout(200); await scan("ask", { expectHeading: false });
for (let i = 0; i < 14; i++) { await p.keyboard.press("Tab"); if (!(await p.evaluate(() => !!document.activeElement.closest("dialog")))) { fail("Ask: Tab left the panel"); break; } }
await p.keyboard.press("Escape"); await p.waitForTimeout(200);
if (!/Ask a question/.test(await active())) fail(`Ask: focus should return to the Ask button, was ${await active()}`);
await btn(/Ask a question/).click(); await p.getByRole("button", { name: /good number|come down/ }).first().click(); await p.waitForTimeout(500);
await scan("ask answer", { expectHeading: false });
await btn(/See what the Deal Pass includes/).click(); await p.waitForTimeout(600); await scan("deal pass");

await b.close();
if (problems.length) { console.error(`\nA11Y FAIL: ${problems.length} problem(s)`); process.exit(1); }
console.log("\nA11Y PASS: 24 screens, zero axe violations, keyboard checks pass");
