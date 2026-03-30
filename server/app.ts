import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Context, MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";
import { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";

import { adminRoutes } from "./routes/admin";
import { authRoutes } from "./routes/auth";
import { mediaRoutes } from "./routes/media";
import { env } from "./lib/env";
import { HttpError, isHttpError } from "./lib/http-error";
import { getSession, verifySignedSessionValue } from "./lib/session-store";

export type AppBindings = {
  Variables: {
    session: ReturnType<typeof getSession>;
    sessionId: string | null;
  };
};

type AppContext = Context<AppBindings>;

const requireAccessGate: MiddlewareHandler<AppBindings> = async (c, next) => {
  if (env.ACCESS_GATE_MODE === "trusted-header" && !c.req.header(env.ACCESS_GATE_HEADER_NAME)) {
    throw new HttpError("Access denied. Requests must pass through the configured access gate.", 403);
  }

  await next();
};

const attachSession: MiddlewareHandler<AppBindings> = async (c, next) => {
  const rawCookie = getCookie(c, env.COOKIE_NAME);
  const sessionId = verifySignedSessionValue(rawCookie);

  c.set("sessionId", sessionId);
  c.set("session", getSession(sessionId));

  await next();
};

const requireSession: MiddlewareHandler<AppBindings> = async (c, next) => {
  if (!c.get("session")) {
    throw new HttpError("Authentication required.", 401);
  }

  await next();
};

const requireCsrf: MiddlewareHandler<AppBindings> = async (c, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(c.req.method)) {
    await next();
    return;
  }

  const session = c.get("session");

  if (!session) {
    throw new HttpError("Authentication required.", 401);
  }

  if (c.req.header("x-csrf-token") !== session.csrfToken) {
    throw new HttpError("Invalid CSRF token.", 403);
  }

  await next();
};

export const createApp = ({ serveClient = env.NODE_ENV === "production" } = {}) => {
  const app = new Hono<AppBindings>();

  app.use("*", attachSession);
  app.use("*", requireAccessGate);
  app.use("/api/auth/logout", requireSession, requireCsrf);
  app.use("/api/admin/*", requireSession, requireCsrf);
  app.use("/api/media/*", requireSession, requireCsrf);
  app.onError((error, c) => {
    if (isHttpError(error)) {
      return c.json({ error: error.message, details: error.details }, error.status as never);
    }

    console.error(error);
    return c.json({ error: "Internal server error." }, 500);
  });

  app.route("/api/auth", authRoutes);
  app.route("/api/admin", adminRoutes);
  app.route("/api/media", mediaRoutes);

  if (serveClient) {
    app.use("/assets/*", serveStatic({ root: "./dist" }));
    app.use("/images/*", serveStatic({ root: "./dist" }));
    app.use("/data/*", serveStatic({ root: "./dist" }));
    app.use("/favicon.ico", serveStatic({ root: "./dist" }));
    app.use("/manifest.json", serveStatic({ root: "./dist" }));

    app.get("*", async c => {
      const indexHtml = await readFile(path.resolve(process.cwd(), "dist/index.html"), "utf8");
      return c.html(indexHtml);
    });
  } else {
    app.get("/", c => c.json({ ok: true }));
  }

  return app;
};
