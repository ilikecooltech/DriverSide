/* Two phones, one account. Builds against a stand-in Supabase so the
   real project is never touched:

     VITE_SUPABASE_URL=https://fakeproj.supabase.co VITE_SUPABASE_ANON_KEY=sb_publishable_test npm run build
     npm start &   # serves the build on :8787
     node sync.mjs

   Proves: a guest's car moves into the account on sign-in, a second phone
   gets the joined garage, the first phone picks up the second's car, the
   data download holds it all, and Delete my account clears the server and
   the phone. Rebuild without the fake env afterwards. */
import { chromium } from "playwright";
import fs from "node:fs";
import { createRequire } from "node:module";
const AXE = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const axe = async (p) => { await p.addScriptTag({ content: AXE }); return p.evaluate(async () => (await axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] } })).violations.map((x) => `${x.id}: ${x.nodes[0].target.join(" ")}`)); };
/* A stand-in for Supabase, shared by two browsers: auth codes, the
   user_state table, and the two account functions. */
const USER = { id: "11111111-1111-1111-1111-111111111111", email: "ana@example.com", aud: "authenticated", role: "authenticated" };
const db = { user_state: new Map(), deleted: false, signOuts: [] };
const session = () => ({ access_token: "tok", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "ref", user: USER });
async function backend(route) {
  const req = route.request(); const u = new URL(req.url()); const p = u.pathname; const m = req.method();
  const json = (body, status = 200, headers = {}) => route.fulfill({ status, contentType: "application/json", headers: { "access-control-allow-origin": "*", ...headers }, body: JSON.stringify(body) });
  if (m === "OPTIONS") return route.fulfill({ status: 200, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
  if (p === "/auth/v1/otp") return json({});
  if (p === "/auth/v1/verify") return json(session());
  if (p === "/auth/v1/user") return json(USER);
  if (p === "/auth/v1/logout") { db.signOuts.push(u.searchParams.get("scope") || "local"); return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*" } }); }
  if (p === "/rest/v1/user_state" && m === "GET") { const row = db.user_state.get(USER.id); return json(row ? { state: row, updated_at: new Date().toISOString() } : null); }
  if (p === "/rest/v1/user_state" && m === "POST") { const body = JSON.parse(req.postData()); const r = Array.isArray(body) ? body[0] : body; db.user_state.set(r.user_id, r.state); return json([], 201); }
  if (p === "/rest/v1/rpc/claim_my_passes") return json(0);
  if (p === "/rest/v1/rpc/delete_my_account") { db.deleted = true; db.user_state.delete(USER.id); return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*" } }); }
  if (p.startsWith("/rest/v1/")) return json(p.includes("profiles") ? { user_id: USER.id, email_opt_in: false } : []);
  return json({ msg: "unhandled " + p }, 404);
}
const b = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
let failed = 0;
const check = (ok, label, got) => { console.log(`${ok ? "PASS" : "FAIL"} ${label}${ok ? "" : ` (got ${JSON.stringify(got)})`}`); if (!ok) failed++; };
async function phone(name) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  await ctx.route("https://fakeproj.supabase.co/**", backend);
  const p = await ctx.newPage(); p.setDefaultTimeout(8000);
  p.on("pageerror", (e) => console.log(name, "PAGE ERROR", e.message));
  await p.goto("http://localhost:8787/"); await p.waitForTimeout(800);
  return p;
}
const btn = (p, n, o) => p.getByRole("button", { name: n, ...o });
async function onboardAndSave(p, nth) {
  await btn(p, /Just looking/).click();
  for (const t of ["My family changed", "Trade or sell", "Lowest total cost", "A few times", "Safety"]) await btn(p, new RegExp(t)).click();
  await btn(p, /SOUNDS LIKE ME/).click(); await p.waitForTimeout(1200);
  await p.getByRole("button", { name: /^SAVE/ }).nth(nth).click(); await p.waitForTimeout(300);
}
async function signIn(p) {
  await btn(p, "Profile").click();
  const s = p.getByRole("button", { name: /Create an account|Sign in|keep everything/i }).first(); await s.click();
  await p.fill("#ds-identifier", USER.email); await btn(p, /SEND MY CODE/).click();
  await p.getByLabel("6-digit code").fill("123456"); await p.keyboard.press("Enter"); await p.waitForTimeout(2500);
}
const garage = async (p) => { await btn(p, "Garage", { exact: true }).click(); await p.waitForTimeout(400); return p.evaluate(() => [...document.querySelectorAll("#ds-main *")].filter(e => /^\d{4} [A-Z]/.test(e.textContent.trim()) && e.children.length === 0).map(e => e.textContent.trim()).filter((v, i, a) => a.indexOf(v) === i).slice(0, 6)); };

// Phone A: guest saves car #1, then signs in.
const A = await phone("A");
await onboardAndSave(A, 0);
await signIn(A);
const a1 = (db.user_state.get(USER.id)?.cars || []).map(c => c.title);
check(a1.length === 1, "phone A guest car saved to the account", a1);
// Phone B: a different guest saves car #2, signs in with the same email.
const B = await phone("B");
await onboardAndSave(B, 1);
await signIn(B);
const bg = await garage(B);
check(bg.length === 2 && bg.includes(a1[0]), "phone B sees both cars after sign-in", bg);
const c2 = (db.user_state.get(USER.id)?.cars || []).map(c => c.title);
check(c2.length === 2, "account holds both cars", c2);
// Phone A reloads: gets B's car too.
await A.reload(); await A.waitForTimeout(2500);
const ag = await garage(A);
check(ag.length === 2, "phone A picks up phone B's car", ag);
// Account panel
await btn(B, "Profile").click(); await B.waitForTimeout(400);
const line = await B.locator("#acct-h + div").textContent();
check(line.includes(USER.email) && /saved to your account/.test(line), "account panel shows email and sync status", line);
const v1 = await axe(B);
check(!v1.length, "account panel has zero axe violations", v1);
const [dl] = await Promise.all([B.waitForEvent("download"), btn(B, /Download my data/).click()]);
const file = JSON.parse(await (await import("node:fs")).promises.readFile(await dl.path(), "utf8"));
check(dl.suggestedFilename() === "driverside-my-data.json" && file.account.email === USER.email && file.saved.cars?.length === 2, "Download my data has the account and both cars", { name: dl.suggestedFilename(), cars: file.saved.cars?.length });
await btn(B, /Delete my account/).click();
const f = await B.evaluate(() => document.activeElement.textContent);
check(f === "Keep my account", "delete confirm focuses the safe choice", f);
const v2 = await axe(B);
check(!v2.length, "delete confirm has zero axe violations", v2);
await btn(B, /Delete for good/).click(); await B.waitForTimeout(800);
check(db.deleted && !db.user_state.has(USER.id), "Delete my account clears the server", db.deleted);
const cleared = await B.evaluate(() => { const v = JSON.parse(localStorage.getItem("driverside.v1") || "{}"); return !v.cars?.length; });
check(cleared, "Delete my account clears the phone", cleared);
await b.close();
console.log(failed ? `${failed} sync check(s) failed` : "ALL SYNC CHECKS PASSED");
process.exit(failed ? 1 : 0);
