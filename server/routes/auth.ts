import { setCookie, deleteCookie } from "hono/cookie";
import { Hono } from "hono";
import { z } from "zod";

import type { DiscoveryResult, SessionView } from "@shared/matrix";

import { env, isProduction } from "../lib/env";
import { HttpError } from "../lib/http-error";
import { buildSsoRedirectUrl, discoverHomeserver, loginWithPassword, loginWithToken, logoutFromHomeserver, resolveWellKnownBaseUrl } from "../lib/matrix-client";
import {
  consumePendingSsoLogin,
  createPendingSsoLogin,
  createSession,
  createSignedSessionValue,
  destroySession,
  SessionRecord,
} from "../lib/session-store";
import { assertAllowedBaseUrl } from "../lib/target-validation";

const discoverSchema = z.object({
  baseUrl: z.string().optional(),
  domain: z.string().optional(),
});

const loginSchema = z.object({
  baseUrl: z.string(),
  password: z.string().min(1),
  username: z.string().min(1),
});

const getSessionView = (session: SessionRecord | null): SessionView => {
  if (!session) {
    return { authenticated: false };
  }

  return {
    authenticated: true,
    baseUrl: session.baseUrl,
    csrfToken: session.csrfToken,
    homeServer: session.homeServer,
    identity: {
      fullName: session.displayName,
      id: session.userId,
    },
  };
};

const setSessionCookie = (cookieStore: { header: (name: string, value: string, options?: Record<string, unknown>) => void }, session: SessionRecord) => {
  setCookie(cookieStore as never, env.COOKIE_NAME, createSignedSessionValue(session.id), {
    httpOnly: true,
    maxAge: env.SESSION_TTL_HOURS * 60 * 60,
    path: "/",
    sameSite: "Lax",
    secure: isProduction,
  });
};

export const authRoutes = new Hono<{ Variables: { session: SessionRecord | null; sessionId: string | null } }>();

authRoutes.post("/discover", async c => {
  const parsed = discoverSchema.safeParse(await c.req.json());

  if (!parsed.success) {
    throw new HttpError("Invalid discovery request.", 400, parsed.error.flatten());
  }

  const baseUrl =
    typeof parsed.data.baseUrl === "string" && parsed.data.baseUrl.length > 0
      ? parsed.data.baseUrl
      : parsed.data.domain
        ? await resolveWellKnownBaseUrl(parsed.data.domain)
        : null;

  if (!baseUrl) {
    throw new HttpError("Either baseUrl or domain is required.", 400);
  }

  const discovery = (await discoverHomeserver(baseUrl)) satisfies DiscoveryResult;
  return c.json(discovery);
});

authRoutes.post("/login", async c => {
  const parsed = loginSchema.safeParse(await c.req.json());

  if (!parsed.success) {
    throw new HttpError("Invalid login request.", 400, parsed.error.flatten());
  }

  const baseUrl = await assertAllowedBaseUrl(parsed.data.baseUrl, env.ALLOW_PRIVATE_TARGETS);
  const { json } = await loginWithPassword(baseUrl, parsed.data.username, parsed.data.password);
  const userId = String(json.user_id);
  const session = createSession({
    accessToken: String(json.access_token),
    baseUrl,
    displayName: userId,
    homeServer: String(json.home_server),
    userId,
  });

  setSessionCookie(c, session);
  return c.json(getSessionView(session));
});

authRoutes.get("/sso/start", async c => {
  const baseUrl = c.req.query("baseUrl");

  if (!baseUrl) {
    throw new HttpError("baseUrl is required.", 400);
  }

  const normalizedBaseUrl = await assertAllowedBaseUrl(baseUrl, env.ALLOW_PRIVATE_TARGETS);
  const state = createPendingSsoLogin(normalizedBaseUrl);
  const redirectUrl = `${env.PUBLIC_BASE_URL}/api/auth/sso/callback?state=${state.id}`;

  return c.redirect(await buildSsoRedirectUrl(normalizedBaseUrl, redirectUrl));
});

authRoutes.get("/sso/callback", async c => {
  const stateId = c.req.query("state");
  const loginToken = c.req.query("loginToken");

  if (!stateId || !loginToken) {
    throw new HttpError("Missing SSO callback parameters.", 400);
  }

  const state = consumePendingSsoLogin(stateId);
  if (!state) {
    throw new HttpError("SSO login state is missing or expired.", 400);
  }

  const { json } = await loginWithToken(state.baseUrl, loginToken);
  const userId = String(json.user_id);
  const session = createSession({
    accessToken: String(json.access_token),
    baseUrl: state.baseUrl,
    displayName: userId,
    homeServer: String(json.home_server),
    userId,
  });

  setSessionCookie(c, session);
  return c.redirect(`${env.PUBLIC_BASE_URL}/`);
});

authRoutes.get("/session", c => c.json(getSessionView(c.get("session"))));

authRoutes.post("/logout", async c => {
  const session = c.get("session");
  const sessionId = c.get("sessionId");

  if (session) {
    await logoutFromHomeserver(session.baseUrl, session.accessToken).catch(() => undefined);
  }

  destroySession(sessionId);
  deleteCookie(c, env.COOKIE_NAME, {
    path: "/",
    secure: isProduction,
  });

  return c.json({ ok: true });
});
