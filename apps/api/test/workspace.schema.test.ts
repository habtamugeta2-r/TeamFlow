import { describe, expect, it } from "vitest";

import {
  createWorkspaceSchema,
  workspaceIdSchema,
} from "../src/modules/workspaces/workspace.schemas.js";

describe("createWorkspaceSchema", () => {
  it("accepts a valid name and trims whitespace", () => {
    const result = createWorkspaceSchema.safeParse({
      name: "  Engineering Team  ",
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.name).toBe("Engineering Team");
    }
  });

  it("rejects a name shorter than two characters", () => {
    const result = createWorkspaceSchema.safeParse({
      name: "A",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a name longer than 100 characters", () => {
    const result = createWorkspaceSchema.safeParse({
      name: "A".repeat(101),
    });

    expect(result.success).toBe(false);
  });
});

describe("workspaceIdSchema", () => {
  it("accepts a valid UUID", () => {
    const result = workspaceIdSchema.safeParse(
      "36cc274a-4dc3-4599-b9d6-2fa744a13019",
    );

    expect(result.success).toBe(true);
  });

  it("rejects an invalid workspace ID", () => {
    const result = workspaceIdSchema.safeParse("not-a-uuid");

    expect(result.success).toBe(false);
  });
});
