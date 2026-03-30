import { HttpError } from "./http-error";
import { env } from "./env";
import { assertAllowedBaseUrl, normalizeBaseUrl } from "./target-validation";

const loginEndpoints = ["/_matrix/client/v3/login", "/_matrix/client/r0/login"];
const ssoEndpoints = ["/_matrix/client/v3/login/sso/redirect", "/_matrix/client/r0/login/sso/redirect"];

const buildMatrixUrl = (baseUrl: string, path: string, query?: Record<string, unknown>) => {
  const url = new URL(path, `${baseUrl}/`);

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    url.searchParams.set(key, String(value));
  }

  return url;
};

const parseJson = async (response: Response) => {
  const text = await response.text();

  if (text.length > env.MAX_JSON_BYTES) {
    throw new HttpError("Upstream JSON response exceeded the allowed size.", 502);
  }

  return text ? (JSON.parse(text) as Record<string, unknown>) : {};
};

const fetchMatrix = async (
  baseUrl: string,
  path: string,
  init: RequestInit = {},
  query?: Record<string, unknown>
) => {
  const allowedBaseUrl = await assertAllowedBaseUrl(baseUrl, env.ALLOW_PRIVATE_TARGETS);
  const response = await fetch(buildMatrixUrl(allowedBaseUrl, path, query), {
    ...init,
    redirect: "manual",
    signal: AbortSignal.timeout(env.UPSTREAM_TIMEOUT_MS),
  });

  if (response.status >= 300 && response.status < 400) {
    throw new HttpError("Upstream redirects are not allowed.", 502);
  }

  return response;
};

export const matrixJsonRequest = async (options: {
  accessToken?: string;
  baseUrl: string;
  body?: unknown;
  method?: string;
  path: string;
  query?: Record<string, unknown>;
}) => {
  const response = await fetchMatrix(
    options.baseUrl,
    options.path,
    {
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      headers: {
        Accept: "application/json",
        ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
      },
      method: options.method ?? "GET",
    },
    options.query
  );

  const json = await parseJson(response);

  if (!response.ok) {
    const message =
      typeof json.error === "string" ? json.error : `Synapse request failed with status ${response.status}.`;
    throw new HttpError(message, response.status, json);
  }

  return { json, response };
};

export const matrixMediaRequest = async (options: {
  accessToken: string;
  baseUrl: string;
  path: string;
  query?: Record<string, unknown>;
}) => {
  const response = await fetchMatrix(
    options.baseUrl,
    options.path,
    {
      headers: {
        Authorization: `Bearer ${options.accessToken}`,
      },
      method: "GET",
    },
    options.query
  );

  if (!response.ok) {
    const text = await response.text();
    throw new HttpError(text || "Failed to load media.", response.status);
  }

  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > env.MAX_MEDIA_BYTES) {
    throw new HttpError("Upstream media exceeded the allowed size.", 502);
  }

  return response;
};

const tryLoginEndpoint = async <T>(baseUrl: string, runner: (path: string) => Promise<T>) => {
  let lastError: unknown;

  for (const endpoint of loginEndpoints) {
    try {
      return await runner(endpoint);
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) {
        lastError = error;
        continue;
      }

      throw error;
    }
  }

  throw lastError instanceof Error ? lastError : new HttpError("No supported login endpoint found.", 502);
};

export const discoverHomeserver = async (baseUrl: string) => {
  const normalizedBaseUrl = await assertAllowedBaseUrl(baseUrl, env.ALLOW_PRIVATE_TARGETS);
  const [{ json: loginJson }, { json: versionsJson }, serverVersionResult] = await Promise.all([
    tryLoginEndpoint(normalizedBaseUrl, path => matrixJsonRequest({ baseUrl: normalizedBaseUrl, path })),
    matrixJsonRequest({ baseUrl: normalizedBaseUrl, path: "/_matrix/client/versions" }),
    matrixJsonRequest({ baseUrl: normalizedBaseUrl, path: "/_synapse/admin/v1/server_version" }).catch(() => null),
  ]);

  const loginFlows = ((loginJson.flows as unknown[]) ?? []) as Array<{ type: string }>;

  return {
    baseUrl: normalizedBaseUrl,
    loginFlows,
    matrixVersions: Array.isArray(versionsJson.versions) ? (versionsJson.versions as string[]) : [],
    serverVersion: serverVersionResult?.json.server_version as string | undefined,
    supportsPassword: loginFlows.some(flow => flow.type === "m.login.password"),
    supportsSso: loginFlows.some(flow => flow.type === "m.login.sso"),
  };
};

export const loginWithPassword = async (baseUrl: string, username: string, password: string) =>
  tryLoginEndpoint(baseUrl, path =>
    matrixJsonRequest({
      baseUrl,
      body: {
        identifier: {
          type: "m.id.user",
          user: username,
        },
        initial_device_display_name: "Matrix Admin",
        password,
        type: "m.login.password",
        user: username,
      },
      method: "POST",
      path,
    })
  );

export const loginWithToken = async (baseUrl: string, loginToken: string) =>
  tryLoginEndpoint(baseUrl, path =>
    matrixJsonRequest({
      baseUrl,
      body: {
        initial_device_display_name: "Matrix Admin",
        token: loginToken,
        type: "m.login.token",
      },
      method: "POST",
      path,
    })
  );

export const logoutFromHomeserver = async (baseUrl: string, accessToken: string) =>
  matrixJsonRequest({
    accessToken,
    baseUrl,
    method: "POST",
    path: "/_matrix/client/v3/logout",
  }).catch(async error => {
    if (error instanceof HttpError && error.status === 404) {
      await matrixJsonRequest({
        accessToken,
        baseUrl,
        method: "POST",
        path: "/_matrix/client/r0/logout",
      });
      return;
    }

    throw error;
  });

export const resolveWellKnownBaseUrl = async (domain: string) => {
  const fallback = normalizeBaseUrl(`https://${domain}`);
  const response = await fetch(buildMatrixUrl(fallback, "/.well-known/matrix/client"), {
    redirect: "manual",
    signal: AbortSignal.timeout(env.UPSTREAM_TIMEOUT_MS),
  }).catch(() => null);

  if (!response?.ok) {
    return fallback;
  }

  const json = (await parseJson(response)) as {
    "m.homeserver"?: {
      base_url?: string;
    };
  };

  const configuredBaseUrl = json["m.homeserver"]?.base_url;
  return typeof configuredBaseUrl === "string" ? normalizeBaseUrl(configuredBaseUrl) : fallback;
};

export const buildSsoRedirectUrl = async (baseUrl: string, redirectUrl: string) => {
  const normalizedBaseUrl = await assertAllowedBaseUrl(baseUrl, env.ALLOW_PRIVATE_TARGETS);

  return `${normalizedBaseUrl}${ssoEndpoints[1]}?redirectUrl=${encodeURIComponent(redirectUrl)}`;
};
