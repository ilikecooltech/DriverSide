import { describe, it, expect } from "vitest";
import { scoreArchetype, ARCHETYPES, QUESTIONS } from "../../src/data/archetypes.js";

/* Routing is a product promise, not a preference. Fresh Start must win
   whenever the buyer is underwater — that is the fiduciary line in
   CLAUDE.md, and no other signal may override it. */

describe("Fresh Start precedence", () => {
  it("routes an underwater trade to Fresh Start", () => {
    expect(scoreArchetype({ current: "trade-under" })).toBe("freshstart");
  });

  it("routes cost-cutting to Fresh Start", () => {
    expect(scoreArchetype({ why: "costs" })).toBe("freshstart");
  });

  it("beats every other signal", () => {
    const loud = { why: "family", exp: "first", rank: "safety", money: "max" };
    expect(scoreArchetype(loud)).not.toBe("freshstart");
    expect(scoreArchetype({ ...loud, current: "trade-under" })).toBe("freshstart");
    expect(scoreArchetype({ ...loud, why: "costs" })).toBe("freshstart");
  });
});

describe("routing rules", () => {
  const cases = [
    ["first-time buyer", { exp: "first" }, "firstride"],
    ["family changed", { why: "family" }, "hauler"],
    ["safety first", { rank: "safety" }, "hauler"],
    ["needs it for work", { why: "work" }, "worktruck"],
    ["capability first", { rank: "capability" }, "worktruck"],
    ["loves cars", { why: "love" }, "enthusiast"],
    ["feel first", { rank: "feel" }, "enthusiast"],
    ["wants nicer", { why: "nicer" }, "upgrade"],
    ["no strong signal", { current: "keep", money: "tco" }, "commuter"],
  ];
  for (const [label, answers, expected] of cases) {
    it(`routes ${label} to ${expected}`, () => {
      expect(scoreArchetype(answers)).toBe(expected);
    });
  }

  it("puts a first-time buyer ahead of family/safety", () => {
    expect(scoreArchetype({ exp: "first", why: "family", rank: "safety" })).toBe("firstride");
  });

  it("always returns a real archetype, even with no answers", () => {
    expect(ARCHETYPES[scoreArchetype({})]).toBeTruthy();
  });
});

describe("archetype content", () => {
  it("every routable archetype exists and is complete", () => {
    for (const key of Object.keys(ARCHETYPES)) {
      const a = ARCHETYPES[key];
      expect(a.name, key).toBeTruthy();
      expect(a.tag, key).toBeTruthy();
      expect(a.desc, key).toBeTruthy();
      expect(a.opts, key).toHaveLength(4);
    }
  });

  it("covers all seven", () => {
    expect(Object.keys(ARCHETYPES)).toHaveLength(7);
  });

  it("every routing outcome maps to a defined archetype", () => {
    const outcomes = new Set();
    for (const why of ["died", "family", "costs", "nicer", "work", "love"])
      for (const current of ["trade-under", "trade-ok", "keep", "none"])
        for (const exp of ["first", "few", "many"])
          for (const rank of ["cost", "reliability", "safety", "capability", "feel"])
            outcomes.add(scoreArchetype({ why, current, exp, rank }));
    for (const key of outcomes) expect(ARCHETYPES[key], key).toBeTruthy();
  });
});

describe("onboarding questions", () => {
  it("is exactly five taps, as promised in the copy", () => {
    expect(QUESTIONS).toHaveLength(5);
  });

  it("every question carries a purpose cue and real options", () => {
    for (const q of QUESTIONS) {
      expect(q.cue, q.id).toBeTruthy();
      expect(q.q, q.id).toBeTruthy();
      expect(q.opts.length, q.id).toBeGreaterThanOrEqual(3);
      for (const [v, t] of q.opts) {
        expect(v, q.id).toBeTruthy();
        expect(t, q.id).toBeTruthy();
      }
    }
  });

  it("question ids match what the router reads", () => {
    expect(QUESTIONS.map((q) => q.id)).toEqual(["why", "current", "money", "exp", "rank"]);
  });
});
