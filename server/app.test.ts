// @vitest-environment node

import { lookup } from "node:dns/promises";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "./app";
import { resetSessionStore } from "./lib/session-store";

vi.mock("node:dns/promises", () => ({
  lookup: vi.fn(),
}));

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: {
      "content-type": "application/json",
    },
    status,
  });

describe("server auth and csrf flow", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    resetSessionStore();
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(lookup).mockResolvedValue([{ address: "8.8.8.8", family: 4 }] as never);
    fetchMock.mockReset();
  });

  it("creates a session cookie on login and enforces csrf on admin mutations", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        access_token: "access-token",
        home_server: "example.com",
        user_id: "@alice:example.com",
      })
    );

    const app = createApp({ serveClient: false });
    const loginResponse = await app.request("/api/auth/login", {
      body: JSON.stringify({
        baseUrl: "https://matrix.example.com",
        password: "secret",
        username: "alice",
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    });

    expect(loginResponse.status).toBe(200);
    const cookie = loginResponse.headers.get("set-cookie");
    expect(cookie).toContain("matrix_admin_session=");

    const sessionResponse = await app.request("/api/auth/session", {
      headers: {
        cookie: cookie ?? "",
      },
    });
    const sessionPayload = await sessionResponse.json();

    expect(sessionPayload.authenticated).toBe(true);
    expect(sessionPayload.csrfToken).toBeTruthy();

    const missingCsrfResponse = await app.request("/api/admin/registration-tokens", {
      body: JSON.stringify({}),
      headers: {
        "content-type": "application/json",
        cookie: cookie ?? "",
      },
      method: "POST",
    });

    expect(missingCsrfResponse.status).toBe(403);
  });
});
