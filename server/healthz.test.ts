// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

describe("healthz endpoint", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("stays reachable without an access-gate header in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ACCESS_GATE_MODE", "trusted-header");
    vi.stubEnv("ACCESS_GATE_HEADER_NAME", "x-authenticated-user-email");

    const { createApp } = await import("./app");
    const response = await createApp({ serveClient: false }).request("/healthz");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it("does not block regular routes when trusted-header mode is enabled", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ACCESS_GATE_MODE", "trusted-header");
    vi.stubEnv("ACCESS_GATE_HEADER_NAME", "x-authenticated-user-email");

    const { createApp } = await import("./app");
    const response = await createApp({ serveClient: false }).request("/api/auth/session");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ authenticated: false });
  });
});
