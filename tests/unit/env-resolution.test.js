import { describe, it, expect } from "vitest";
import { pickEnv, SUPABASE_URL_NAMES, SUPABASE_ANON_NAMES } from "../../vite.config.js";

/* The build resolves Supabase config from whichever names the environment
   actually used. Two things have to hold: it finds the keys when they're
   there under any supported name, and it never reaches a secret. */

describe("pickEnv", () => {
  it("prefers the VITE_ name when it's set", () => {
    const env = { VITE_SUPABASE_URL: "https://vite.example", SUPABASE_URL: "https://other.example" };
    expect(pickEnv(env, ...SUPABASE_URL_NAMES)).toBe("https://vite.example");
  });

  it("falls back to the integration's unprefixed name", () => {
    // This is the Preview case that shipped keyless.
    const env = { SUPABASE_URL: "https://proj.supabase.co", SUPABASE_ANON_KEY: "anon-key" };
    expect(pickEnv(env, ...SUPABASE_URL_NAMES)).toBe("https://proj.supabase.co");
    expect(pickEnv(env, ...SUPABASE_ANON_NAMES)).toBe("anon-key");
  });

  it("skips names that are present but empty or whitespace", () => {
    const env = { VITE_SUPABASE_URL: "   ", SUPABASE_URL: "https://proj.supabase.co" };
    expect(pickEnv(env, ...SUPABASE_URL_NAMES)).toBe("https://proj.supabase.co");
  });

  it("returns empty when nothing is configured, rather than throwing", () => {
    expect(pickEnv({}, ...SUPABASE_URL_NAMES)).toBe("");
    expect(pickEnv(undefined, ...SUPABASE_URL_NAMES)).toBe("");
  });
});

describe("what the client bundle may never receive", () => {
  /* Anything on these lists is inlined into public JS. A service-role or
     secret key there is a full database compromise, so the guard is the
     list itself — not a code review. */
  const FORBIDDEN = [
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SECRET_KEY",
    "SUPABASE_JWT_SECRET",
    "POSTGRES_PASSWORD",
    "POSTGRES_URL",
    "POSTGRES_URL_NON_POOLING",
    "POSTGRES_PRISMA_URL",
  ];

  it("never lists a secret as a source", () => {
    for (const name of [...SUPABASE_URL_NAMES, ...SUPABASE_ANON_NAMES]) {
      expect(FORBIDDEN, `"${name}" must not be a client-bundled source`).not.toContain(name);
    }
  });

  it("does not resolve a secret even when it's the only thing set", () => {
    const env = Object.fromEntries(FORBIDDEN.map((k) => [k, "super-secret"]));
    expect(pickEnv(env, ...SUPABASE_URL_NAMES)).toBe("");
    expect(pickEnv(env, ...SUPABASE_ANON_NAMES)).toBe("");
  });
});
