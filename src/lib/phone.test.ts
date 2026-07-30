import { describe, it, expect } from "vitest";
import { normalizePhone, validatePhone, phoneKey } from "@/lib/phone";

describe("normalizePhone", () => {
  it("converts local Kenyan formats to E.164", () => {
    expect(normalizePhone("0712345678")).toBe("+254712345678");
    expect(normalizePhone("0712 345 678")).toBe("+254712345678");
    expect(normalizePhone("254712345678")).toBe("+254712345678");
    expect(normalizePhone("+254712345678")).toBe("+254712345678");
    expect(normalizePhone("712345678")).toBe("+254712345678");
  });
  it("returns empty for blank input", () => {
    expect(normalizePhone("   ")).toBe("");
  });
});

describe("validatePhone", () => {
  it("rejects empty and invalid numbers", () => {
    expect(validatePhone("")).toMatch(/required/i);
    expect(validatePhone("   ")).toMatch(/required/i);
    expect(validatePhone("12345")).toBeTruthy();
    expect(validatePhone("abc")).toBeTruthy();
    expect(validatePhone("+2547123")).toBeTruthy();
    expect(validatePhone("+2547123456789")).toBeTruthy();
  });
  it("accepts valid numbers", () => {
    expect(validatePhone("0712345678")).toBeNull();
    expect(validatePhone("+254712345678")).toBeNull();
    expect(validatePhone("+447911123456")).toBeNull();
  });
});

describe("phoneKey", () => {
  it("compares numbers ignoring formatting", () => {
    expect(phoneKey("+254 712-345 678")).toBe(phoneKey("254712345678"));
  });
});
