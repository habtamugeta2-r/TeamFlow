import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("API environment", () => {
  it("trims the database URL", async () => {
    vi.stubEnv("DATABASE_URL", " postgres://localhost/teamflow ");
    vi.resetModules();

    const { env } = await import("../src/config/env.js");

    expect(env.DATABASE_URL).toBe("postgres://localhost/teamflow");
  });

  it("rejects a whitespace-only database URL", async () => {
    vi.stubEnv("DATABASE_URL", "   ");
    vi.resetModules();

    await expect(import("../src/config/env.js")).rejects.toThrow(
      "Invalid API environment: DATABASE_URL",
    );
  });

  it.each([
    ["true", true],
    ["false", false],
    ["", false],
    [" 2 ", 2],
  ])("normalizes TRUST_PROXY=%s", async (value, expected) => {
    vi.stubEnv("TRUST_PROXY", value);
    vi.resetModules();

    const { env } = await import("../src/config/env.js");

    expect(env.TRUST_PROXY).toBe(expected);
  });

  it("rejects unsupported TRUST_PROXY values", async () => {
    vi.stubEnv("TRUST_PROXY", "yes");
    vi.resetModules();

    await expect(import("../src/config/env.js")).rejects.toThrow(
      "TRUST_PROXY: must be true, false, or a non-negative integer",
    );
  });
});
