import type { DiscoveryResult } from "@shared/matrix";

import { apiRequest } from "../lib/api";
import { requireSessionState } from "../lib/session";

export interface MxidParts {
  domain: string;
  name: string;
}

export const splitMxid = (mxid: string | null | undefined): MxidParts | undefined => {
  if (typeof mxid !== "string") {
    return undefined;
  }

  const result = /^@(?<name>[a-zA-Z0-9._=\-/]+):(?<domain>[a-zA-Z0-9.-]+)$/.exec(mxid)?.groups;
  if (!result?.name || !result.domain) {
    return undefined;
  }

  return {
    domain: result.domain,
    name: result.name,
  };
};

export const isValidBaseUrl = (value: unknown): value is string => {
  if (typeof value !== "string") {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

export const discoverHomeserver = async (input: { baseUrl?: string; domain?: string }) =>
  apiRequest<DiscoveryResult>("/api/auth/discover", {
    body: JSON.stringify(input),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

export const getWellKnownUrl = async (domain: string) => {
  const result = await discoverHomeserver({ domain });
  return result.baseUrl;
};

export const getServerVersion = async (baseUrl: string) => {
  const result = await discoverHomeserver({ baseUrl });
  return result.serverVersion ?? "";
};

export const getSupportedFeatures = async (baseUrl: string) => {
  const result = await discoverHomeserver({ baseUrl });
  return {
    versions: result.matrixVersions,
  };
};

export const getSupportedLoginFlows = async (baseUrl: string) => {
  const result = await discoverHomeserver({ baseUrl });
  return result.loginFlows;
};

export const getMediaUrl = (mediaId: string) => {
  const [serverName, remoteMediaId] = mediaId.split("/", 2);
  return `/api/media/download/${encodeURIComponent(serverName)}/${encodeURIComponent(remoteMediaId)}`;
};

export const getMediaThumbnailUrl = (mxcUrl: string, width = 24, height = 24) => {
  const match = /^mxc:\/\/([^/]+)\/([^/#?]+)/.exec(mxcUrl);

  if (!match) {
    return null;
  }

  const [, serverName, mediaId] = match;
  const search = new URLSearchParams({
    height: String(height),
    method: "scale",
    width: String(width),
  });

  return `/api/media/thumbnail/${encodeURIComponent(serverName)}/${encodeURIComponent(mediaId)}?${search.toString()}`;
};

export function generateRandomMxId(): string {
  const { homeServer } = requireSessionState();
  const characters = "0123456789abcdefghijklmnopqrstuvwxyz";
  const localpart = Array.from(crypto.getRandomValues(new Uint32Array(8)))
    .map(value => characters[value % characters.length])
    .join("");

  return `@${localpart}:${homeServer}`;
}

export function generateRandomPassword(length = 20): string {
  const characters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz~!@-#$";

  return Array.from(crypto.getRandomValues(new Uint32Array(length)))
    .map(value => characters[value % characters.length])
    .join("");
}
