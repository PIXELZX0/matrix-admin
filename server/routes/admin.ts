import type { Context } from "hono";
import { Hono } from "hono";
import { z } from "zod";

import type { DashboardSummary } from "@shared/matrix";

import { HttpError } from "../lib/http-error";
import { matrixJsonRequest } from "../lib/matrix-client";
import type { SessionRecord } from "../lib/session-store";

type AdminBindings = { Variables: { session: SessionRecord | null; sessionId: string | null } };
type AdminContext = Context<AdminBindings>;

const serverNoticeSchema = z.object({
  body: z.string().min(1),
  id: z.string().min(1),
});

const registrationTokenCreateSchema = z.object({
  expiry_time: z.number().nullable().optional(),
  length: z.number().int().min(1).max(64).optional(),
  token: z.string().optional(),
  uses_allowed: z.number().int().nullable().optional(),
});

const registrationTokenUpdateSchema = z.object({
  expiry_time: z.number().nullable().optional(),
  uses_allowed: z.number().int().nullable().optional(),
});

const deleteMediaSchema = z.object({
  before_ts: z.union([z.number(), z.string()]),
  keep_profiles: z.boolean().default(true),
  size_gt: z.number().nonnegative().default(0),
});

const getSession = (c: AdminContext) => {
  const session = c.get("session");

  if (!session) {
    throw new HttpError("Authentication required.", 401);
  }

  return session;
};

const readJsonBody = async <T>(c: AdminContext, schema: z.ZodSchema<T>) => {
  const parsed = schema.safeParse(await c.req.json());

  if (!parsed.success) {
    throw new HttpError("Invalid request body.", 400, parsed.error.flatten());
  }

  return parsed.data;
};

const toQuery = (c: AdminContext) =>
  Object.fromEntries(Object.entries(c.req.query()).filter(([, value]) => value !== undefined && value !== ""));

const requestJson = async (
  session: SessionRecord,
  path: string,
  options?: {
    body?: unknown;
    method?: string;
    query?: Record<string, unknown>;
  }
) =>
  matrixJsonRequest({
    accessToken: session.accessToken,
    baseUrl: session.baseUrl,
    body: options?.body,
    method: options?.method,
    path,
    query: options?.query,
  });

export const adminRoutes = new Hono<AdminBindings>();

adminRoutes.get("/dashboard", async c => {
  const session = getSession(c);
  const [serverVersionResult, matrixVersionsResult, usersResult, roomsResult, reportsResult, destinationsResult] =
    await Promise.all([
      requestJson(session, "/_synapse/admin/v1/server_version").catch(() => null),
      requestJson(session, "/_matrix/client/versions"),
      requestJson(session, "/_synapse/admin/v2/users", { query: { from: 0, limit: 1 } }),
      requestJson(session, "/_synapse/admin/v1/rooms", { query: { from: 0, limit: 1 } }),
      requestJson(session, "/_synapse/admin/v1/event_reports", { query: { from: 0, limit: 1 } }),
      requestJson(session, "/_synapse/admin/v1/federation/destinations", { query: { from: 0, limit: 100 } }),
    ]);

  const destinations = Array.isArray(destinationsResult.json.destinations)
    ? (destinationsResult.json.destinations as Array<{ failure_ts?: number; retry_last_ts?: number }>)
    : [];

  const summary: DashboardSummary = {
    destinationCount: Number(destinationsResult.json.total ?? destinations.length),
    failingDestinationCount: destinations.filter(
      destination => Number(destination.failure_ts ?? 0) > 0 || Number(destination.retry_last_ts ?? 0) > 0
    ).length,
    matrixVersions: Array.isArray(matrixVersionsResult.json.versions)
      ? (matrixVersionsResult.json.versions as string[])
      : [],
    openReportCount: Number(reportsResult.json.total ?? 0),
    roomCount: Number(roomsResult.json.total_rooms ?? 0),
    serverVersion: serverVersionResult?.json.server_version as string | undefined,
    userCount: Number(usersResult.json.total ?? 0),
  };

  return c.json(summary);
});

adminRoutes.get("/users", async c => {
  const session = getSession(c);
  const { json } = await requestJson(session, "/_synapse/admin/v2/users", { query: toQuery(c) });
  return c.json(json);
});

adminRoutes.post("/users", async c => {
  const session = getSession(c);
  const body = await c.req.json();
  const userId = body.id;

  if (typeof userId !== "string" || userId.length === 0) {
    throw new HttpError("User id is required.", 400);
  }

  const mxid = userId.startsWith("@") ? userId : `@${userId}:${session.homeServer}`;
  const { json } = await requestJson(session, `/_synapse/admin/v2/users/${encodeURIComponent(mxid)}`, {
    body,
    method: "PUT",
  });

  return c.json(json);
});

adminRoutes.get("/users/:id", async c => {
  const session = getSession(c);
  const { json } = await requestJson(session, `/_synapse/admin/v2/users/${encodeURIComponent(c.req.param("id"))}`);
  return c.json(json);
});

adminRoutes.put("/users/:id", async c => {
  const session = getSession(c);
  const { json } = await requestJson(session, `/_synapse/admin/v2/users/${encodeURIComponent(c.req.param("id"))}`, {
    body: await c.req.json(),
    method: "PUT",
  });

  return c.json(json);
});

adminRoutes.delete("/users/:id", async c => {
  const session = getSession(c);
  const { json } = await requestJson(session, `/_synapse/admin/v1/deactivate/${encodeURIComponent(c.req.param("id"))}`, {
    body: { erase: true },
    method: "POST",
  });

  return c.json(json);
});

adminRoutes.get("/users/:id/devices", async c => {
  const session = getSession(c);
  const { json } = await requestJson(
    session,
    `/_synapse/admin/v2/users/${encodeURIComponent(c.req.param("id"))}/devices`,
    { query: toQuery(c) }
  );

  return c.json(json);
});

adminRoutes.delete("/users/:userId/devices/:deviceId", async c => {
  const session = getSession(c);
  const { json } = await requestJson(
    session,
    `/_synapse/admin/v2/users/${encodeURIComponent(c.req.param("userId"))}/devices/${encodeURIComponent(
      c.req.param("deviceId")
    )}`,
    { method: "DELETE" }
  );

  return c.json(json);
});

adminRoutes.get("/users/connections/:id", async c => {
  const session = getSession(c);
  const { json } = await requestJson(session, `/_synapse/admin/v1/whois/${encodeURIComponent(c.req.param("id"))}`);
  return c.json(json);
});

adminRoutes.get("/users/:id/pushers", async c => {
  const session = getSession(c);
  const { json } = await requestJson(session, `/_synapse/admin/v1/users/${encodeURIComponent(c.req.param("id"))}/pushers`);
  return c.json(json);
});

adminRoutes.get("/users/:id/joined-rooms", async c => {
  const session = getSession(c);
  const { json } = await requestJson(
    session,
    `/_synapse/admin/v1/users/${encodeURIComponent(c.req.param("id"))}/joined_rooms`
  );
  return c.json(json);
});

adminRoutes.get("/users/:id/media", async c => {
  const session = getSession(c);
  const { json } = await requestJson(session, `/_synapse/admin/v1/users/${encodeURIComponent(c.req.param("id"))}/media`, {
    query: toQuery(c),
  });

  return c.json(json);
});

adminRoutes.post("/users/server-notices", async c => {
  const session = getSession(c);
  const body = await readJsonBody(c, serverNoticeSchema);
  const { json } = await requestJson(session, "/_synapse/admin/v1/send_server_notice", {
    body: {
      content: {
        body: body.body,
        msgtype: "m.text",
      },
      user_id: body.id,
    },
    method: "POST",
  });

  return c.json(json);
});

adminRoutes.get("/rooms", async c => {
  const session = getSession(c);
  const { json } = await requestJson(session, "/_synapse/admin/v1/rooms", { query: toQuery(c) });
  return c.json(json);
});

adminRoutes.get("/rooms/:id", async c => {
  const session = getSession(c);
  const { json } = await requestJson(session, `/_synapse/admin/v1/rooms/${encodeURIComponent(c.req.param("id"))}`);
  return c.json(json);
});

adminRoutes.delete("/rooms/:id", async c => {
  const session = getSession(c);
  const { json } = await requestJson(session, `/_synapse/admin/v2/rooms/${encodeURIComponent(c.req.param("id"))}`, {
    body: { block: false },
    method: "DELETE",
  });

  return c.json(json);
});

adminRoutes.get("/rooms/:id/members", async c => {
  const session = getSession(c);
  const { json } = await requestJson(session, `/_synapse/admin/v1/rooms/${encodeURIComponent(c.req.param("id"))}/members`, {
    query: toQuery(c),
  });
  return c.json(json);
});

adminRoutes.get("/rooms/:id/state", async c => {
  const session = getSession(c);
  const { json } = await requestJson(session, `/_synapse/admin/v1/rooms/${encodeURIComponent(c.req.param("id"))}/state`);
  return c.json(json);
});

adminRoutes.get("/rooms/:id/forward-extremities", async c => {
  const session = getSession(c);
  const { json } = await requestJson(
    session,
    `/_synapse/admin/v1/rooms/${encodeURIComponent(c.req.param("id"))}/forward_extremities`,
    { query: toQuery(c) }
  );
  return c.json(json);
});

adminRoutes.get("/reports", async c => {
  const session = getSession(c);
  const { json } = await requestJson(session, "/_synapse/admin/v1/event_reports", { query: toQuery(c) });
  return c.json(json);
});

adminRoutes.get("/room-directory", async c => {
  const session = getSession(c);
  const { json } = await requestJson(session, "/_matrix/client/r0/publicRooms", { query: toQuery(c) });
  return c.json(json);
});

adminRoutes.put("/room-directory/:id/publish", async c => {
  const session = getSession(c);
  const { json } = await requestJson(
    session,
    `/_matrix/client/r0/directory/list/room/${encodeURIComponent(c.req.param("id"))}`,
    {
      body: { visibility: "public" },
      method: "PUT",
    }
  );

  return c.json(json);
});

adminRoutes.put("/room-directory/:id/unpublish", async c => {
  const session = getSession(c);
  const { json } = await requestJson(
    session,
    `/_matrix/client/r0/directory/list/room/${encodeURIComponent(c.req.param("id"))}`,
    {
      body: { visibility: "private" },
      method: "PUT",
    }
  );

  return c.json(json);
});

adminRoutes.get("/media/user-statistics", async c => {
  const session = getSession(c);
  const { json } = await requestJson(session, "/_synapse/admin/v1/statistics/users/media", { query: toQuery(c) });
  return c.json(json);
});

adminRoutes.post("/media/bulk-delete", async c => {
  const session = getSession(c);
  const body = await readJsonBody(c, deleteMediaSchema);
  const { json } = await requestJson(session, `/_synapse/admin/v1/media/${session.homeServer}/delete`, {
    method: "POST",
    query: body,
  });

  return c.json(json);
});

adminRoutes.delete("/media/:id", async c => {
  const session = getSession(c);
  const { json } = await requestJson(session, `/_synapse/admin/v1/media/${session.homeServer}/${encodeURIComponent(c.req.param("id"))}`, {
    method: "DELETE",
  });

  return c.json(json);
});

adminRoutes.post("/media/:id/protect", async c => {
  const session = getSession(c);
  const { json } = await requestJson(session, `/_synapse/admin/v1/media/protect/${encodeURIComponent(c.req.param("id"))}`, {
    method: "POST",
  });

  return c.json(json);
});

adminRoutes.post("/media/:id/unprotect", async c => {
  const session = getSession(c);
  const { json } = await requestJson(session, `/_synapse/admin/v1/media/unprotect/${encodeURIComponent(c.req.param("id"))}`, {
    method: "POST",
  });

  return c.json(json);
});

adminRoutes.post("/media/:id/quarantine", async c => {
  const session = getSession(c);
  const { json } = await requestJson(
    session,
    `/_synapse/admin/v1/media/quarantine/${session.homeServer}/${encodeURIComponent(c.req.param("id"))}`,
    {
      method: "POST",
    }
  );

  return c.json(json);
});

adminRoutes.post("/media/:id/unquarantine", async c => {
  const session = getSession(c);
  const { json } = await requestJson(
    session,
    `/_synapse/admin/v1/media/unquarantine/${session.homeServer}/${encodeURIComponent(c.req.param("id"))}`,
    {
      method: "POST",
    }
  );

  return c.json(json);
});

adminRoutes.get("/federation/destinations", async c => {
  const session = getSession(c);
  const { json } = await requestJson(session, "/_synapse/admin/v1/federation/destinations", { query: toQuery(c) });
  return c.json(json);
});

adminRoutes.post("/federation/destinations/:destination/reconnect", async c => {
  const session = getSession(c);
  const { json } = await requestJson(
    session,
    `/_synapse/admin/v1/federation/destinations/${encodeURIComponent(c.req.param("destination"))}/reset_connection`,
    { method: "POST" }
  );

  return c.json(json);
});

adminRoutes.get("/federation/destinations/:destination/rooms", async c => {
  const session = getSession(c);
  const { json } = await requestJson(
    session,
    `/_synapse/admin/v1/federation/destinations/${encodeURIComponent(c.req.param("destination"))}/rooms`,
    { query: toQuery(c) }
  );

  return c.json(json);
});

adminRoutes.get("/registration-tokens", async c => {
  const session = getSession(c);
  const { json } = await requestJson(session, "/_synapse/admin/v1/registration_tokens", { query: toQuery(c) });
  return c.json(json);
});

adminRoutes.post("/registration-tokens", async c => {
  const session = getSession(c);
  const body = await readJsonBody(c, registrationTokenCreateSchema);
  const { json } = await requestJson(session, "/_synapse/admin/v1/registration_tokens/new", {
    body,
    method: "POST",
  });

  return c.json(json);
});

adminRoutes.get("/registration-tokens/:id", async c => {
  const session = getSession(c);
  const { json } = await requestJson(
    session,
    `/_synapse/admin/v1/registration_tokens/${encodeURIComponent(c.req.param("id"))}`
  );

  return c.json(json);
});

adminRoutes.put("/registration-tokens/:id", async c => {
  const session = getSession(c);
  const body = await readJsonBody(c, registrationTokenUpdateSchema);
  const { json } = await requestJson(
    session,
    `/_synapse/admin/v1/registration_tokens/${encodeURIComponent(c.req.param("id"))}`,
    {
      body,
      method: "PUT",
    }
  );

  return c.json(json);
});

adminRoutes.delete("/registration-tokens/:id", async c => {
  const session = getSession(c);
  const { json } = await requestJson(
    session,
    `/_synapse/admin/v1/registration_tokens/${encodeURIComponent(c.req.param("id"))}`,
    {
      method: "DELETE",
    }
  );

  return c.json(json);
});
