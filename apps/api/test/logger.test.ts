import { afterEach, describe, expect, it, vi } from "vitest";
import { createLogger } from "../src/core/logger/logger.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createLogger", () => {
  it("writes structured metadata and serializes errors safely", () => {
    const output = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("database unavailable");

    createLogger().error("request failed", { error, requestId: "request-1" });

    expect(output).toHaveBeenCalledOnce();
    expect(output.mock.calls[0]?.[0]).toContain("ERROR request failed");
    expect(output.mock.calls[0]?.[0]).toContain(
      '"error":{"name":"Error","message":"database unavailable"}',
    );
    expect(output.mock.calls[0]?.[0]).toContain('"requestId":"request-1"');
  });

  it("serializes circular and bigint metadata safely", () => {
    const output = vi.spyOn(console, "error").mockImplementation(() => {});
    const metadata: Record<string, unknown> = { attempt: 2n };
    metadata.self = metadata;

    createLogger().error("request failed", metadata);

    expect(output).toHaveBeenCalledOnce();
    expect(output.mock.calls[0]?.[0]).toContain('"attempt":"2"');
    expect(output.mock.calls[0]?.[0]).toContain('"self":"[Circular]"');
  });

  it("respects the configured minimum log level", () => {
    const output = vi.spyOn(console, "info").mockImplementation(() => {});

    createLogger("warn").info("ignored");

    expect(output).not.toHaveBeenCalled();
  });
});
