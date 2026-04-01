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
- Hono BFF on `http://localhost:8787`

The Vite dev server proxies `/api/*` requests to the Hono server.

## Production build

```bash
pnpm build
pnpm start
```

## Docker

```bash
docker build -t matrix-admin .
docker run --rm -p 8787:8787 --env-file .env matrix-admin
```

The container serves the Vite build and the Hono server together on `8787`.

## CI/CD

GitHub Actions workflow: [`.github/workflows/docker-cicd.yml`](.github/workflows/docker-cicd.yml)

- Every PR and push runs `pnpm typecheck`, `pnpm test`, `pnpm build`, and `docker build`
- A push to `main` publishes `docker.io/yuchanshin/matrix-admin:latest` and `docker.io/yuchanshin/matrix-admin:sha-<commit>` when Docker Hub secrets are configured
- If deploy secrets are configured, the same `main` push uploads [`deploy/docker-compose.prod.yml`](deploy/docker-compose.prod.yml) to the server and redeploys with Docker Compose

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

The production compose file binds the app to `127.0.0.1:${APP_PORT}` by default so it stays behind your external access gate or reverse proxy.

## Required environment variables

- `SESSION_SECRET`
- `PUBLIC_BASE_URL`
- `ACCESS_GATE_MODE`
- `ACCESS_GATE_HEADER_NAME`
- `ALLOW_PRIVATE_TARGETS`
- `SESSION_TTL_HOURS`

In production, `ACCESS_GATE_MODE=trusted-header` is required. Direct public exposure without an external access gate is intentionally blocked.
