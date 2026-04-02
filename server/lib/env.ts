import { randomBytes } from "node:crypto";

export type AccessGateMode = "disabled" | "trusted-header";
export type CookieSecureMode = "auto" | boolean;
const defaultAccessGateHeaderName = "x-authenticated-user-email";

const toBoolean = (value: string | undefined, fallback: boolean) => {
  if (typeof value !== "string") {
    return fallback;
  }

  return value.toLowerCase() === "true";
};

const toNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toAccessGateMode = (value: string | undefined): AccessGateMode => (
  value === "trusted-header" ? "trusted-header" : "disabled"
);

const toCookieSecureMode = (value: string | undefined): CookieSecureMode => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return "auto";
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === "true") {
    return true;
  }

  if (normalized === "false") {
    return false;
  }

  return "auto";
};

const nodeEnv = process.env.NODE_ENV ?? "development";
const accessGateMode = toAccessGateMode(process.env.ACCESS_GATE_MODE);
const accessGateHeaderName = process.env.ACCESS_GATE_HEADER_NAME?.trim() || defaultAccessGateHeaderName;
const publicBaseUrl = process.env.PUBLIC_BASE_URL ?? "http://localhost:5173";

export const env = {
  ACCESS_GATE_HEADER_NAME: accessGateHeaderName,
  ACCESS_GATE_MODE: accessGateMode,
  ALLOW_PRIVATE_TARGETS: toBoolean(process.env.ALLOW_PRIVATE_TARGETS, true),
  COOKIE_NAME: "matrix_admin_session",
  COOKIE_SECURE: toCookieSecureMode(process.env.COOKIE_SECURE),
  HOST: process.env.HOST ?? "127.0.0.1",
  MAX_JSON_BYTES: toNumber(process.env.MAX_JSON_BYTES, 2 * 1024 * 1024),
  MAX_MEDIA_BYTES: toNumber(process.env.MAX_MEDIA_BYTES, 50 * 1024 * 1024),
  NODE_ENV: nodeEnv,
  PORT: toNumber(process.env.PORT, 8787),
  PUBLIC_BASE_URL: publicBaseUrl,
  SESSION_SECRET: process.env.SESSION_SECRET ?? randomBytes(32).toString("hex"),
  SESSION_TTL_HOURS: toNumber(process.env.SESSION_TTL_HOURS, 12),
  UPSTREAM_TIMEOUT_MS: toNumber(process.env.UPSTREAM_TIMEOUT_MS, 10_000),
} as const;

export const isProduction = env.NODE_ENV === "production";
