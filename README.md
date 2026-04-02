# Matrix Admin

Matrix Synapse homeserver admin panel built with `react-admin + Vite + Hono`.

## Development

```bash
pnpm install
cp .env.example .env
pnpm dev
```

This starts:

- Vite frontend on `http://localhost:5173`
- Internal Hono BFF on `127.0.0.1:8787` (not exposed externally)

The Vite dev server proxies `/api/*` requests to the Hono server.

## Production build

```bash
pnpm build
pnpm start
```

`pnpm start` runs:

- Vite preview on `0.0.0.0:${FRONTEND_PORT:-5173}` (externally exposed)
- Hono BFF on `127.0.0.1:${PORT:-8787}` (internal only)

The frontend server proxies `/api/*` and `/healthz` to the internal Hono BFF.

## Docker

```bash
docker build -t matrix-admin .
docker run --rm -p 5173:5173 --env-file .env matrix-admin
```

The container only exposes the Vite frontend port (`5173` by default).
Hono BFF stays internal and is reached via frontend proxy.

## Docker Compose

Production compose file: [`deploy/docker-compose.prod.yml`](deploy/docker-compose.prod.yml)

```bash
# Prepare deploy bundle (same shape as CI deploy)
mkdir -p .deploy
cp deploy/docker-compose.prod.yml .deploy/docker-compose.yml
cp deploy/.env.production.example .deploy/.env
```

Update `.deploy/.env` with your real production values (especially `PUBLIC_BASE_URL` and `SESSION_SECRET`).
You can also set `DATA_VOLUME_NAME` (default: `matrix-admin-data`) to control the Docker named volume mounted at `/data`.

Then run:

```bash
cd .deploy
IMAGE_NAME=yuchanshin/matrix-admin IMAGE_TAG=latest docker compose up -d
```

Useful operations:

```bash
cd .deploy
IMAGE_NAME=yuchanshin/matrix-admin IMAGE_TAG=latest docker compose pull
IMAGE_NAME=yuchanshin/matrix-admin IMAGE_TAG=latest docker compose up -d --remove-orphans
docker compose logs -f
docker compose down
docker volume inspect matrix-admin-data # or your DATA_VOLUME_NAME value
```

## CI/CD

GitHub Actions workflow: [`.github/workflows/docker-cicd.yml`](.github/workflows/docker-cicd.yml)

- Every PR and push runs `pnpm typecheck`, `pnpm test`, `pnpm build`, and `docker build`
- A published GitHub Release pushes `docker.io/yuchanshin/matrix-admin:<release-tag>` and `docker.io/yuchanshin/matrix-admin:latest`
- A push to `main` pushes `docker.io/yuchanshin/matrix-admin:test-<UTC timestamp>` and `docker.io/yuchanshin/matrix-admin:test-latest`
- If deploy secrets are configured, the same `main` push uploads [`deploy/docker-compose.prod.yml`](deploy/docker-compose.prod.yml) to the server and redeploys with `test-latest`

### Required GitHub secrets for CD

- `DEPLOY_HOST`
- `DEPLOY_PORT` (optional, defaults to `22`)
- `DEPLOY_USER`
- `DEPLOY_SSH_KEY`
- `DEPLOY_KNOWN_HOSTS`
- `DEPLOY_PATH`
- `DOCKERHUB_TOKEN`
- `PROD_ENV_FILE`

`PROD_ENV_FILE` should contain the contents of your production `.env`. You can start from [`deploy/.env.production.example`](deploy/.env.production.example).

The production compose file binds the frontend to `127.0.0.1:${APP_PORT}` by default so it stays behind your external access gate or reverse proxy.

## Required environment variables

- `SESSION_SECRET`
- `PUBLIC_BASE_URL`
- `ALLOW_PRIVATE_TARGETS`
- `SESSION_TTL_HOURS`

## Authentication required troubleshooting

If login succeeds but later API calls return `Authentication required.`, check cookie security settings:

- For HTTPS deployments: set `PUBLIC_BASE_URL=https://...` and keep `COOKIE_SECURE=true`
- For HTTP-only environments: set `COOKIE_SECURE=false`

By default, `COOKIE_SECURE` is inferred from `PUBLIC_BASE_URL` protocol.

## Optional runtime ports

- `FRONTEND_PORT` (default: `5173`) - exposed Vite frontend port
- `PORT` (default: `8787`) - internal Hono BFF port

Access gate is disabled by default (`ACCESS_GATE_MODE=disabled`), so requests are handled by the app's own session login.
If you want to enforce an upstream gate later, set `ACCESS_GATE_MODE=trusted-header` and optionally `ACCESS_GATE_HEADER_NAME` (default: `x-authenticated-user-email`).
