/* Ask: one question in, one answer out. Shared by api/ask.js and
   server/index.mjs so the two can't drift.

   - The Anthropic key stays server-side (ANTHROPIC_API_KEY). With no key,
     Ask reports itself off and the button doesn't show.
   - Two models: a fast one for general questions, a deeper one when a
     dealer session or a quote is in play (see pickTier in src/data/ask.js).
     Both are env-overridable so a model change is a setting, not a deploy.
   - Questions and answers are never logged or stored here. Only counts. */

import { ASK_LIMITS, pickTier, systemPrompt, trimHistory } from "../src/data/ask.js";

export const ASK_MODELS = {
  fast: () => process.env.ASK_MODEL_FAST || "claude-haiku-5-5",
  deep: () => process.env.ASK_MODEL_DEEP || "claude-sonnet-5-5",
};

/* Best effort per-instance limit: 30 questions an hour per address. The
   client also caps a device at 40 a day. */
const HOUR = 3600 * 1000;
const seen = new Map();
export function allowRequest(ip, now = Date.now(), max = 30) {
  const key = String(ip || "unknown");
  const recent = (seen.get(key) || []).filter((t) => now - t < HOUR);
  if (recent.length >= max) { seen.set(key, recent); return false; }
  recent.push(now);
  seen.set(key, recent);
  if (seen.size > 5000) seen.delete(seen.keys().next().value);
  return true;
}

export function askStatus(env = process.env) {
  return { on: Boolean(env.ANTHROPIC_API_KEY) };
}

export async function answerQuestion({ body = {}, ip = "", env = process.env, fetchImpl = fetch, now = Date.now() } = {}) {
  if (!env.ANTHROPIC_API_KEY) return { status: 503, json: { ok: false, off: true, message: "Ask isn't switched on yet." } };

  const question = String(body.question || "").trim();
  if (!question) return { status: 400, json: { ok: false, message: "Type a question first." } };
  if (question.length > ASK_LIMITS.question) return { status: 400, json: { ok: false, message: "That's a long one. Try it in a sentence or two." } };
  if (!allowRequest(ip, now)) return { status: 429, json: { ok: false, message: "That's a lot of questions in an hour. Give it a few minutes." } };

  /* The context comes from the buyer's own device; a cap keeps it small. */
  let ctx = body.context && typeof body.context === "object" ? body.context : {};
  if (JSON.stringify(ctx).length > 3000) ctx = { screen: String(ctx.screen || "").slice(0, 24) };

  const tier = pickTier(ctx, question);
  const model = ASK_MODELS[tier]();
  const messages = [...trimHistory(body.messages), { role: "user", content: question }];

  try {
    const r = await fetchImpl("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model, max_tokens: 700, system: systemPrompt(ctx), messages }),
    });
    if (!r.ok) {
      /* Status only. The body can echo the request, which holds the question. */
      console.error("Ask upstream error:", r.status);
      const busy = r.status === 429 || r.status === 529;
      return { status: 502, json: { ok: false, message: busy ? "Ask is busy right now. Try again in a minute." : "Ask couldn't answer that just now. Try again." } };
    }
    const data = await r.json();
    const answer = (data.content || []).filter((c) => c.type === "text").map((c) => c.text).join("\n").trim();
    if (!answer) return { status: 502, json: { ok: false, message: "Ask came back empty. Try asking another way." } };
    return { status: 200, json: { ok: true, answer, tier } };
  } catch (err) {
    console.error("Ask request failed:", err.name);
    return { status: 502, json: { ok: false, message: "Couldn't reach Ask. Check your connection and try again." } };
  }
}
