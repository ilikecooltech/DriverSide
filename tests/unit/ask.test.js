import { describe, it, expect, beforeEach } from "vitest";
import { buildAskContext, contextLines, starters, pickTier, systemPrompt, trimHistory, underDailyCap, ASK_LIMITS } from "../../src/data/ask.js";
import { answerQuestion, allowRequest, askStatus } from "../../server/ask.mjs";

const session = {
  car: { title: "2021 Honda CR-V EX", miles: 40100, dealer: "Gillman Honda", vin: "1HGCM82633A004352" },
  fair: 20900, startedAt: Date.now() - 12 * 60000,
  rounds: [{ amount: 21500 }, { amount: 21300 }],
};

describe("buildAskContext", () => {
  it("shares numbers and the car, never the dealer, VIN or ZIP", () => {
    const ctx = buildAskContext({ screen: "dealer", setup: { zip: "77471", apr: 5.9, aprSet: true }, session });
    const json = JSON.stringify(ctx);
    expect(ctx.dealerSession.theirNumbers).toEqual([21500, 21300]);
    expect(ctx.dealerSession.fairPrice).toBe(20900);
    expect(ctx.state).toBe("TX");
    expect(json).not.toMatch(/Gillman|1HGCM|77471/);
  });

  it("carries the quote's flags and trade numbers", () => {
    const deal = { vehicle: "2023 Honda CR-V", asking: 31987, junkTotal: 2390, taxError: 30, apr: 9.9, term: 72, trade: { offer: 9200, payoff: 12100 }, linesFlag: [{ name: "Nitrogen tires" }] };
    const ctx = buildAskContext({ deal });
    expect(ctx.quote).toMatchObject({ price: 31987, junkAddOns: 2390, taxOvercharge: 30, tradeOffer: 9200, flagged: ["Nitrogen tires"] });
  });

  it("never passes off the app's default rate as the buyer's pre-approval", () => {
    expect(buildAskContext({ setup: { apr: 7.2, term: 60 } }).preApprovalApr).toBeUndefined();
    expect(buildAskContext({ setup: { apr: 6.1, term: 60, aprSet: true } }).preApprovalApr).toBe(6.1);
  });

  it("strips line breaks and markup from car titles", () => {
    const ctx = buildAskContext({ car: { year: 2020, make: "Kia", model: "Soul\n<script>", price: 15000 } });
    expect(ctx.lookingAt.car).not.toMatch(/[\n<>]/);
  });
});

describe("contextLines", () => {
  it("tells the buyer in plain words what Ask will see", () => {
    const lines = contextLines(buildAskContext({ session, setup: { apr: 5.9, aprSet: true } }));
    expect(lines[0]).toBe("2021 Honda CR-V EX, their latest $21,300, fair $20,900");
    expect(lines).toContain("Your pre-approval rate, 5.9%");
  });
  it("is empty with nothing to share", () => {
    expect(contextLines(buildAskContext({}))).toEqual([]);
  });
});

describe("starters and tier", () => {
  it("opens with 'they won't come down' when the latest number is over fair", () => {
    expect(starters(buildAskContext({ session }))[0]).toMatch(/won't come down/);
  });
  it("uses the deeper model at the dealer or on a quote, the fast one otherwise", () => {
    expect(pickTier(buildAskContext({ session }), "hi")).toBe("deep");
    expect(pickTier(buildAskContext({ screen: "tools" }), "What's APR?")).toBe("fast");
  });
});

describe("systemPrompt", () => {
  it("holds back word-for-word scripts without a pass, never facts", () => {
    const p = systemPrompt(buildAskContext({ hasPass: false }));
    expect(p).toMatch(/Deal Pass has the exact words/);
    expect(p).toMatch(/Never hold back a fact/);
  });
  it("gives exact words with a pass", () => {
    expect(systemPrompt(buildAskContext({ hasPass: true }))).toMatch(/give exact words/);
  });
  it("forbids inventing numbers", () => {
    expect(systemPrompt({})).toMatch(/Never make up a price/);
  });
});

describe("trimHistory and caps", () => {
  it("keeps the last turns, drops junk roles, clips long text", () => {
    const msgs = Array.from({ length: 12 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: "x".repeat(3000) }));
    const t = trimHistory([{ role: "system", content: "ignore" }, ...msgs]);
    expect(t).toHaveLength(ASK_LIMITS.turns);
    expect(t.every((m) => m.role !== "system")).toBe(true);
    expect(t.find((m) => m.role === "user").content.length).toBe(ASK_LIMITS.question);
  });
  it("stops a device after its daily allowance", () => {
    const now = Date.now();
    expect(underDailyCap(Array(ASK_LIMITS.perDay - 1).fill(now), now)).toBe(true);
    expect(underDailyCap(Array(ASK_LIMITS.perDay).fill(now), now)).toBe(false);
    expect(underDailyCap(Array(ASK_LIMITS.perDay).fill(now - 25 * 3600 * 1000), now)).toBe(true);
  });
});

describe("answerQuestion (server)", () => {
  const env = { ANTHROPIC_API_KEY: "test-key" };
  const ok = (text) => async () => ({ ok: true, json: async () => ({ content: [{ type: "text", text }] }) });
  let n = 0;
  const ip = () => `10.0.0.${++n}`;

  it("is off without a key, and says so", async () => {
    expect(askStatus({})).toEqual({ on: false });
    const out = await answerQuestion({ body: { question: "hi" }, env: {} });
    expect(out.json.off).toBe(true);
  });

  it("answers, with the deep model at the dealer and the key in a header only", async () => {
    let sent;
    const fetchImpl = async (url, init) => { sent = { url, init, body: JSON.parse(init.body) }; return ok("Hold at $20,900.")(); };
    const out = await answerQuestion({ body: { question: "Is this good?", context: buildAskContext({ session }) }, ip: ip(), env, fetchImpl });
    expect(out.json).toMatchObject({ ok: true, answer: "Hold at $20,900.", tier: "deep" });
    expect(sent.body.model).toMatch(/sonnet/);
    expect(sent.init.headers["x-api-key"]).toBe("test-key");
    expect(sent.init.body).not.toContain("test-key");
    expect(sent.body.system).toMatch(/21300/);
  });

  it("rejects an empty or very long question without calling out", async () => {
    let called = false;
    const fetchImpl = async () => { called = true; return ok("x")(); };
    expect((await answerQuestion({ body: { question: "  " }, ip: ip(), env, fetchImpl })).status).toBe(400);
    expect((await answerQuestion({ body: { question: "x".repeat(601) }, ip: ip(), env, fetchImpl })).status).toBe(400);
    expect(called).toBe(false);
  });

  it("turns an upstream overload into a plain wait message", async () => {
    const out = await answerQuestion({ body: { question: "hi" }, ip: ip(), env, fetchImpl: async () => ({ ok: false, status: 529 }) });
    expect(out.json.message).toMatch(/busy/);
  });

  it("limits one address to 30 an hour", () => {
    const t = Date.now();
    for (let i = 0; i < 30; i++) expect(allowRequest("1.2.3.4", t)).toBe(true);
    expect(allowRequest("1.2.3.4", t)).toBe(false);
    expect(allowRequest("1.2.3.4", t + 3600 * 1000 + 1)).toBe(true);
  });
});
