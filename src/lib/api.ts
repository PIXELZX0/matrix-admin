import type { SessionView } from "@shared/matrix";

import { clearSessionState, getSessionState, setSessionState } from "./session";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const readJson = async (response: Response) => {
  const text = await response.text();
  return text ? (JSON.parse(text) as Record<string, unknown>) : {};
};

const buildHeaders = (input?: HeadersInit, includeCsrf = false) => {
  const headers = new Headers(input);

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  if (includeCsrf) {
    const session = getSessionState();
    if (session.authenticated && session.csrfToken) {
      headers.set("X-CSRF-Token", session.csrfToken);
    }
  }

  return headers;
};

export const apiRequest = async <T>(path: string, init: RequestInit = {}) => {
  const method = init.method ?? "GET";
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: buildHeaders(init.headers, !["GET", "HEAD", "OPTIONS"].includes(method)),
  });
  const json = await readJson(response);

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      clearSessionState();
    }

    throw new ApiError(
      typeof json.error === "string" ? json.error : `Request failed with status ${response.status}.`,
      response.status,
      json.details
    );
  }

  return json as T;
};

export const loadSession = async () => {
  const session = await apiRequest<SessionView>("/api/auth/session");
  setSessionState(session);
  return session;
};

export const updateSessionFromResponse = (session: SessionView) => {
  setSessionState(session);
  return session;
};
