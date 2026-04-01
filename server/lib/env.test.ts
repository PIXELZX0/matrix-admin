// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

describe("environment config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("falls back to default access-gate header name in production when missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ACCESS_GATE_MODE", "trusted-header");
    vi.stubEnv("ACCESS_GATE_HEADER_NAME", "");

    const { env } = await import("./env");

    expect(env.ACCESS_GATE_HEADER_NAME).toBe("x-authenticated-user-email");
  });

  it("defaults access-gate mode to disabled in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const { env } = await import("./env");

    expect(env.ACCESS_GATE_MODE).toBe("disabled");
  });

  it("keeps trusted-header mode when explicitly configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ACCESS_GATE_MODE", "trusted-header");

    const { env } = await import("./env");

    expect(env.ACCESS_GATE_MODE).toBe("trusted-header");
  });

  it("binds server host to localhost by default", async () => {
    const { env } = await import("./env");

    expect(env.HOST).toBe("127.0.0.1");
  });
});
