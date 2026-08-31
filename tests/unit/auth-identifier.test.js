import { describe, it, expect } from "vitest";
import { classifyIdentifier, normalizePhone, isEmail } from "../../src/lib/supabase.js";

/* One login field takes either channel, so the parse is the whole
   contract: get it wrong and a real buyer is told their own phone number
   isn't a phone number. Supabase requires E.164; people type 10 digits. */

describe("normalizePhone", () => {
  it("promotes a bare US 10-digit number to E.164", () => {
    expect(normalizePhone("5551234567")).toBe("+15551234567");
  });

  it("ignores the punctuation people actually type", () => {
    expect(normalizePhone("(555) 123-4567")).toBe("+15551234567");
    expect(normalizePhone("555.123.4567")).toBe("+15551234567");
  });

  it("accepts a leading US country code with or without the plus", () => {
    expect(normalizePhone("15551234567")).toBe("+15551234567");
    expect(normalizePhone("+1 555 123 4567")).toBe("+15551234567");
  });

  it("trusts an explicit non-US country code", () => {
    expect(normalizePhone("+44 20 7946 0958")).toBe("+442079460958");
  });

  it("rejects lengths that can't be a number", () => {
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("+1")).toBeNull();
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone(null)).toBeNull();
  });
});

describe("isEmail", () => {
  it("accepts an ordinary address", () => {
    expect(isEmail("buyer@example.com")).toBe(true);
  });

  it("rejects the near-misses", () => {
    expect(isEmail("buyer@example")).toBe(false);
    expect(isEmail("buyer example.com")).toBe(false);
    expect(isEmail("@example.com")).toBe(false);
  });
});

describe("classifyIdentifier", () => {
  it("routes an address to the email channel, lowercased", () => {
    expect(classifyIdentifier("  Buyer@Example.COM ")).toEqual({
      kind: "email",
      value: "buyer@example.com",
    });
  });

  it("routes digits to the phone channel in E.164", () => {
    expect(classifyIdentifier("(555) 123-4567")).toEqual({
      kind: "phone",
      value: "+15551234567",
    });
  });

  it("blames the email format when there's an @, not the phone format", () => {
    const r = classifyIdentifier("buyer@example");
    expect(r.kind).toBe("invalid");
    expect(r.reason).toMatch(/email/i);
  });

  it("blames the phone format when it's all digits", () => {
    const r = classifyIdentifier("12345");
    expect(r.kind).toBe("invalid");
    expect(r.reason).toMatch(/phone/i);
  });

  it("asks for either when the field is empty", () => {
    expect(classifyIdentifier("").kind).toBe("invalid");
    expect(classifyIdentifier("   ").kind).toBe("invalid");
  });
});
