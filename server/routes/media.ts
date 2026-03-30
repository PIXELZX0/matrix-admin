import { Hono } from "hono";

import { HttpError } from "../lib/http-error";
import { matrixMediaRequest } from "../lib/matrix-client";
import type { SessionRecord } from "../lib/session-store";

const getSession = (c: { get: (key: "session") => SessionRecord | null }) => {
  const session = c.get("session");

  if (!session) {
    throw new HttpError("Authentication required.", 401);
  }

  return session;
};

export const mediaRoutes = new Hono<{ Variables: { session: SessionRecord | null; sessionId: string | null } }>();

mediaRoutes.get("/thumbnail/:serverName/:mediaId", async c => {
  const session = getSession(c);
  const response = await matrixMediaRequest({
    accessToken: session.accessToken,
    baseUrl: session.baseUrl,
    path: `/_matrix/media/r0/thumbnail/${encodeURIComponent(c.req.param("serverName"))}/${encodeURIComponent(
      c.req.param("mediaId")
    )}`,
    query: {
      height: c.req.query("height") ?? 24,
      method: c.req.query("method") ?? "scale",
      width: c.req.query("width") ?? 24,
    },
  });

  return new Response(response.body, {
    headers: {
      "Cache-Control": "private, max-age=300",
      "Content-Type": response.headers.get("content-type") ?? "application/octet-stream",
    },
    status: response.status,
  });
});

mediaRoutes.get("/download/:serverName/:mediaId", async c => {
  const session = getSession(c);
  const response = await matrixMediaRequest({
    accessToken: session.accessToken,
    baseUrl: session.baseUrl,
    path: `/_matrix/media/v1/download/${encodeURIComponent(c.req.param("serverName"))}/${encodeURIComponent(
      c.req.param("mediaId")
    )}`,
    query: {
      allow_redirect: "false",
    },
  });

  return new Response(response.body, {
    headers: {
      "Cache-Control": "private, max-age=300",
      "Content-Disposition": response.headers.get("content-disposition") ?? "inline",
      "Content-Type": response.headers.get("content-type") ?? "application/octet-stream",
    },
    status: response.status,
  });
});
