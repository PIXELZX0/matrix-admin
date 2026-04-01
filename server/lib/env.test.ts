// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

describe("environment config", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("falls back to default access-gate header name in production when missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ACCESS_GATE_MODE", "trusted-header");
    vi.stubEnv("ACCESS_GATE_HEADER_NAME", "");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const { env } = await import("./env");

    expect(env.ACCESS_GATE_HEADER_NAME).toBe("x-authenticated-user-email");
    expect(warn).toHaveBeenCalledWith(
      'Production is missing ACCESS_GATE_HEADER_NAME. Falling back to "x-authenticated-user-email".',
    );
  });

  it("rejects production when access-gate mode is not trusted-header", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ACCESS_GATE_MODE", "disabled");
    vi.stubEnv("ACCESS_GATE_HEADER_NAME", "x-authenticated-user-email");

    await expect(import("./env")).rejects.toThrow(
      "Production requires ACCESS_GATE_MODE=trusted-header. Direct public exposure is unsupported.",
    );
  });
});
