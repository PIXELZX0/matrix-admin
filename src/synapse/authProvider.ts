import type { AuthProvider } from "react-admin";

import type { SessionView } from "@shared/matrix";

import { ApiError, apiRequest, loadSession, updateSessionFromResponse } from "../lib/api";
import { clearSessionState, getSessionState } from "../lib/session";

interface LoginParams {
  baseUrl: string;
  password: string;
  username: string;
}

const ensureSession = async (): Promise<SessionView> => {
  const cached = getSessionState();

  if (cached.authenticated) {
    return cached;
  }

  return loadSession();
};

const authProvider: AuthProvider = {
  login: async ({ baseUrl, password, username }: LoginParams) => {
    const session = await apiRequest<SessionView>("/api/auth/login", {
      body: JSON.stringify({
        baseUrl,
        password,
        username,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    updateSessionFromResponse(session);
  },
  logout: async () => {
    try {
      await apiRequest("/api/auth/logout", {
        method: "POST",
      });
    } finally {
      clearSessionState();
    }
  },
  checkError: ({ status }: { status: number }) => {
    if (status === 401 || status === 403) {
      clearSessionState();
      return Promise.reject();
    }

    return Promise.resolve();
  },
  checkAuth: async () => {
    const session = await ensureSession();

    return session.authenticated ? Promise.resolve() : Promise.reject();
  },
  getPermissions: async () => undefined,
  getIdentity: async () => {
    const session = await ensureSession();

    if (!session.authenticated || !session.identity) {
      return Promise.reject();
    }

    return session.identity;
  },
  canAccess: async () => {
    try {
      const session = await ensureSession();
      return session.authenticated;
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        return false;
      }

      throw error;
    }
  },
};

export default authProvider;
