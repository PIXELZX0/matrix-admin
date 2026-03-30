import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearSessionState, setSessionState } from "../lib/session";
import { createResource, deleteMedia, mxcUrlToHttp } from "./dataProvider";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: {
      "content-type": "application/json",
    },
    status,
  });

describe("dataProvider helpers", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    setSessionState({
      authenticated: true,
      baseUrl: "https://matrix.example.com",
      csrfToken: "csrf-token",
      homeServer: "example.com",
      identity: {
        fullName: "Alice",
        id: "@alice:example.com",
      },
    });
  });

  afterEach(() => {
    clearSessionState();
  });

  it("converts MXC URLs to internal thumbnail URLs", () => {
    expect(mxcUrlToHttp("mxc://matrix.example.com/abc123")).toBe(
      "/api/media/thumbnail/matrix.example.com/abc123?height=24&method=scale&width=24"
    );
  });

  it("publishes room directory entries through the internal admin route", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ room_id: "!room:example.com" }));

    await createResource("room_directory", { id: "!room:example.com" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/admin/room-directory/!room%3Aexample.com/publish");
    expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe("PUT");
  });

  it("sends csrf headers on destructive media maintenance calls", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ deleted_media: [], total: 0 }));

    await deleteMedia({
      before_ts: 123,
      keep_profiles: true,
      size_gt: 10,
    });

    const headers = new Headers((fetchMock.mock.calls[0][1] as RequestInit).headers);
    expect(headers.get("X-CSRF-Token")).toBe("csrf-token");
  });
});
