import * as argon2 from "argon2";
import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../src/db/prisma.js";
import {
  AuthServiceError,
  createAuthService,
} from "../src/modules/auth/auth.service.js";

vi.mock("argon2", () => ({
  hash: vi.fn(),
  verify: vi.fn().mockResolvedValue(false),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("authenticateUser", () => {
  it("performs a decoy password verification for unknown accounts", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(null);
    const authService = createAuthService(prisma);

    await expect(
      authService.authenticateUser({
        email: "unknown@example.com",
        password: "secure-password",
      }),
    ).rejects.toMatchObject({
      name: "AuthServiceError",
      reason: "INVALID_CREDENTIALS",
    } satisfies Partial<AuthServiceError>);

    expect(argon2.verify).toHaveBeenCalledOnce();
    expect(vi.mocked(argon2.verify).mock.calls[0]?.[1]).toBe("secure-password");
  });
});
