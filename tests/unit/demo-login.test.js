import { describe, it, expect, beforeEach, afterEach } from "vitest";
import handler, { samePhone, demoConfig, demoUserFor } from "../../api/demo-login.js";

const call = async (body) => {
  let status = 200, out = null;
  const res = { status(c) { status = c; return this; }, json(o) { out = o; return this; } };
  await handler({ method: "POST", query: {}, body }, res);
  return { status, out };
};

describe("demo sign-in", () => {
  const saved = { ...process.env };
  beforeEach(() => { process.env.DEMO_PHONE = "9715550100"; process.env.DEMO_CODE = "246810"; });
  afterEach(() => { process.env = { ...saved }; });

  it("treats formatting differences as the same number", () => {
    expect(samePhone("+1 (971) 555-0100", "9715550100")).toBe(true);
    expect(samePhone("19715550100", "9715550100")).toBe(true);
    expect(samePhone("9715550101", "9715550100")).toBe(false);
  });

  it("is off unless both env vars are set", () => {
    expect(demoConfig({ DEMO_PHONE: "9715550100" })).toBeNull();
    expect(demoConfig({ DEMO_CODE: "123456" })).toBeNull();
  });

  it("recognizes only the configured number", async () => {
    expect((await call({ action: "check", phone: "+19715550100" })).out.demo).toBe(true);
    expect((await call({ action: "check", phone: "+12815550100" })).out.demo).toBe(false);
  });

  it("signs in with the right code and refuses a wrong one", async () => {
    const ok = await call({ action: "verify", phone: "+19715550100", code: "246810" });
    expect(ok.out.ok).toBe(true);
    expect(ok.out.user.demo).toBe(true);
    expect(ok.out.user.id).toMatch(/^demo-/);
    const bad = await call({ action: "verify", phone: "+19715550100", code: "000000" });
    expect(bad.status).toBe(401);
  });

  it("never puts the phone number in the user id", () => {
    expect(demoUserFor("9715550100").id).not.toContain("9715550100");
  });
});
