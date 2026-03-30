import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { env } from "./env";

export interface SessionRecord {
  accessToken: string;
  baseUrl: string;
  createdAt: number;
  csrfToken: string;
  displayName: string;
  expiresAt: number;
  homeServer: string;
  id: string;
  userId: string;
}

interface PendingSsoLogin {
  baseUrl: string;
  expiresAt: number;
  id: string;
}

const sessions = new Map<string, SessionRecord>();
const pendingSsoLogins = new Map<string, PendingSsoLogin>();
const ssoTtlMs = 10 * 60 * 1000;

const createId = (size = 32) => randomBytes(size).toString("base64url");

const sign = (value: string) => createHmac("sha256", env.SESSION_SECRET).update(value).digest("base64url");

const pruneExpired = () => {
  const now = Date.now();

  for (const [id, session] of sessions.entries()) {
    if (session.expiresAt <= now) {
      sessions.delete(id);
    }
  }

  for (const [id, state] of pendingSsoLogins.entries()) {
    if (state.expiresAt <= now) {
      pendingSsoLogins.delete(id);
    }
  }
};

export const createSignedSessionValue = (sessionId: string) => `${sessionId}.${sign(sessionId)}`;

export const verifySignedSessionValue = (value: string | undefined) => {
  if (!value) {
    return null;
  }

  const [sessionId, signature] = value.split(".");

  if (!sessionId || !signature) {
    return null;
  }

  const expected = sign(sessionId);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) {
    return null;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer) ? sessionId : null;
};

export const createSession = (input: Omit<SessionRecord, "createdAt" | "csrfToken" | "expiresAt" | "id">) => {
  pruneExpired();

  const now = Date.now();
  const session: SessionRecord = {
    ...input,
    createdAt: now,
    csrfToken: createId(24),
    expiresAt: now + env.SESSION_TTL_HOURS * 60 * 60 * 1000,
    id: createId(),
  };

  sessions.set(session.id, session);
  return session;
};

export const getSession = (sessionId: string | null) => {
  pruneExpired();
  if (!sessionId) {
    return null;
  }

  return sessions.get(sessionId) ?? null;
};

export const destroySession = (sessionId: string | null) => {
  if (!sessionId) {
    return;
  }

  sessions.delete(sessionId);
};

export const createPendingSsoLogin = (baseUrl: string) => {
  pruneExpired();

  const state: PendingSsoLogin = {
    baseUrl,
    expiresAt: Date.now() + ssoTtlMs,
    id: createId(24),
  };

  pendingSsoLogins.set(state.id, state);
  return state;
};

export const consumePendingSsoLogin = (stateId: string) => {
  pruneExpired();

  const state = pendingSsoLogins.get(stateId) ?? null;
  pendingSsoLogins.delete(stateId);
  return state;
};

export const resetSessionStore = () => {
  sessions.clear();
  pendingSsoLogins.clear();
};
