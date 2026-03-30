import { randomBytes } from "node:crypto";

export type AccessGateMode = "disabled" | "trusted-header";

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

const nodeEnv = process.env.NODE_ENV ?? "development";
const accessGateMode = (process.env.ACCESS_GATE_MODE ?? (nodeEnv === "production" ? "trusted-header" : "disabled")) as AccessGateMode;

if (nodeEnv === "production" && accessGateMode !== "trusted-header") {
  throw new Error("Production requires ACCESS_GATE_MODE=trusted-header. Direct public exposure is unsupported.");
}

if (nodeEnv === "production" && !process.env.ACCESS_GATE_HEADER_NAME) {
  throw new Error("Production requires ACCESS_GATE_HEADER_NAME when ACCESS_GATE_MODE=trusted-header.");
}

export const env = {
  ACCESS_GATE_HEADER_NAME: process.env.ACCESS_GATE_HEADER_NAME ?? "x-authenticated-user-email",
  ACCESS_GATE_MODE: accessGateMode,
  ALLOW_PRIVATE_TARGETS: toBoolean(process.env.ALLOW_PRIVATE_TARGETS, true),
  COOKIE_NAME: "matrix_admin_session",
  MAX_JSON_BYTES: toNumber(process.env.MAX_JSON_BYTES, 2 * 1024 * 1024),
  MAX_MEDIA_BYTES: toNumber(process.env.MAX_MEDIA_BYTES, 50 * 1024 * 1024),
  NODE_ENV: nodeEnv,
  PORT: toNumber(process.env.PORT, 8787),
  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL ?? "http://localhost:5173",
  SESSION_SECRET: process.env.SESSION_SECRET ?? randomBytes(32).toString("hex"),
  SESSION_TTL_HOURS: toNumber(process.env.SESSION_TTL_HOURS, 12),
  UPSTREAM_TIMEOUT_MS: toNumber(process.env.UPSTREAM_TIMEOUT_MS, 10_000),
} as const;

export const isProduction = env.NODE_ENV === "production";
