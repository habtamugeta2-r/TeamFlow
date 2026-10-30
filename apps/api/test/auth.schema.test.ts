import { describe, expect, it } from "vitest";
import {
  registerSchema,
  loginSchema,
} from "../src/modules/auth/auth.schemas.js";

describe("registerSchema", () => {
  it("normalizes the name and email", () => {
    const result = registerSchema.parse({
      name: "  Alex Doe  ",
      email: "  ALEX@example.com ",
      password: "secure-password",
    });

    expect(result).toEqual({
      name: "Alex Doe",
      email: "alex@example.com",
      password: "secure-password",
    });
  });

  it("rejects invalid names, emails, and short passwords", () => {
    const result = registerSchema.safeParse({
      name: "A",
      email: "not-an-email",
      password: "short",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toHaveLength(3);
    }
  });

  it("rejects passwords longer than the supported maximum", () => {
    const result = registerSchema.safeParse({
      name: "Alex Doe",
      email: "alex@example.com",
      password: "p".repeat(1025),
    });

    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("rejects short passwords and invalid emails", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "short",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toHaveLength(2);
    }
  });

  it("rejects passwords longer than the supported maximum", () => {
    const result = loginSchema.safeParse({
      email: "alex@example.com",
      password: "p".repeat(1025),
    });

    expect(result.success).toBe(false);
  });
});
