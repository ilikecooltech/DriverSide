import { describe, it, expect, vi } from "vitest";
import { mergeStates, pickSynced, hasGuestData, loadCloud, saveCloud, makeSaver, deleteMyAccount, exportMyData } from "../../src/lib/cloud.js";

/* What a person keeps when a guest session on this phone meets an account
   that already has data. Rule: nothing is lost. */
describe("mergeStates", () => {
  const cloud = {
    archetypeKey: "family", archetype: { key: "family", name: "Family Hauler" },
    setup: { zip: "77471", apr: 6.1, aprSet: true },
    cars: [{ id: "a", title: "2021 Mazda CX-5" }],
    watching: ["a"],
    pass: { active: true, at: 100, tag: "paid_founding" },
  };
  const local = {
    archetypeKey: "commuter", archetype: { key: "commuter", name: "Commuter Math" },
    setup: { zip: "77001", term: 60 },
    cars: [{ id: "a", title: "2021 Mazda CX-5 (local copy)" }, { id: "b", title: "2022 RAV4" }],
    watching: ["b"],
    dealerSession: { startedAt: 500, car: { title: "2021 CR-V" } },
  };

  it("joins the garage: account cars first, new phone cars added, no duplicates", () => {
    const m = mergeStates(local, cloud);
    expect(m.cars.map((c) => c.id)).toEqual(["a", "b"]);
    expect(m.cars[0].title).toBe("2021 Mazda CX-5");
    expect(m.watching).toEqual(["a", "b"]);
  });

  it("keeps the account's goal and settings, filling gaps from the phone", () => {
    const m = mergeStates(local, cloud);
    expect(m.archetypeKey).toBe("family");
    expect(m.setup).toEqual({ zip: "77471", apr: 6.1, aprSet: true, term: 60 });
  });

  it("takes everything from the phone when the account is new", () => {
    const m = mergeStates(local, {});
    expect(m.archetypeKey).toBe("commuter");
    expect(m.cars).toHaveLength(2);
    expect(m.setup.zip).toBe("77001");
  });

  it("keeps a live dealer session and an active pass from either side", () => {
    const m = mergeStates(local, cloud);
    expect(m.dealerSession.startedAt).toBe(500);
    expect(m.pass.active).toBe(true);
    expect(mergeStates({ pass: { active: true, at: 9 } }, { pass: { active: false, at: 99 } }).pass.active).toBe(true);
  });

  it("ignores keys that aren't synced", () => {
    expect(pickSynced({ cars: [], decodeCount: 3, secret: "x" })).toEqual({ cars: [] });
  });

  it("knows whether a guest has anything worth bringing in", () => {
    expect(hasGuestData({})).toBe(false);
    expect(hasGuestData({ setup: { zip: "77471" } })).toBe(false);
    expect(hasGuestData({ cars: [{ id: "x" }] })).toBe(true);
  });
});

/* A small stand-in for the Supabase client. */
function fakeClient({ row = null, fail = false } = {}) {
  const calls = [];
  const q = (table) => {
    const chain = {
      select: () => chain, eq: () => chain,
      maybeSingle: async () => (fail ? { data: null, error: { message: "boom" } } : { data: table === "user_state" ? row : null, error: null }),
      upsert: async (v, o) => { calls.push({ table, v, o }); return fail ? { error: { message: "boom" } } : { error: null }; },
      then: (res) => Promise.resolve({ data: [], error: null }).then(res),
    };
    return chain;
  };
  return {
    calls,
    from: q,
    rpc: vi.fn(async () => (fail ? { error: { message: "nope" } } : { data: 1, error: null })),
    auth: { signOut: vi.fn(async () => ({})) },
  };
}

describe("cloud calls", () => {
  it("loads the account's document", async () => {
    const c = fakeClient({ row: { state: { cars: [{ id: "a" }] }, updated_at: "2026-11-08" } });
    expect(await loadCloud("u1", c)).toEqual({ ok: true, state: { cars: [{ id: "a" }] }, updatedAt: "2026-11-08" });
  });

  it("saves only synced keys, keyed to the user", async () => {
    const c = fakeClient();
    await saveCloud("u1", { cars: [], decodeCount: 4 }, c);
    expect(c.calls[0]).toEqual({ table: "user_state", v: { user_id: "u1", state: { cars: [] } }, o: { onConflict: "user_id" } });
  });

  it("reports failure instead of throwing", async () => {
    expect((await saveCloud("u1", {}, fakeClient({ fail: true }))).ok).toBe(false);
    expect((await loadCloud("u1", fakeClient({ fail: true }))).ok).toBe(false);
    expect((await loadCloud("u1", null)).reason).toBe("off");
  });

  it("deletes through the account's own function, then signs out", async () => {
    const c = fakeClient();
    expect((await deleteMyAccount(c)).ok).toBe(true);
    expect(c.rpc).toHaveBeenCalledWith("delete_my_account");
    expect(c.auth.signOut).toHaveBeenCalled();
  });

  it("exports a file with the account's email and saved data", async () => {
    const c = fakeClient({ row: { state: { cars: [{ id: "a" }] }, updated_at: "t" } });
    const out = await exportMyData({ userId: "u1", email: "ana@example.com" }, c);
    expect(out.account.email).toBe("ana@example.com");
    expect(out.saved.cars).toHaveLength(1);
    expect(out.exported_at).toMatch(/^\d{4}-/);
  });
});

describe("makeSaver", () => {
  it("turns a burst of edits into one save of the latest state", async () => {
    vi.useFakeTimers();
    const save = vi.fn(async (s) => s);
    const saver = makeSaver(save, 1000);
    saver({ n: 1 }); saver({ n: 2 }); const last = saver({ n: 3 });
    await vi.advanceTimersByTimeAsync(1000);
    expect(save).toHaveBeenCalledTimes(1);
    expect(await last).toEqual({ n: 3 });
    vi.useRealTimers();
  });
});
