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

## Required environment variables

- `SESSION_SECRET`
- `PUBLIC_BASE_URL`
- `ACCESS_GATE_MODE`
- `ACCESS_GATE_HEADER_NAME`
- `ALLOW_PRIVATE_TARGETS`
- `SESSION_TTL_HOURS`

In production, `ACCESS_GATE_MODE=trusted-header` is required. Direct public exposure without an external access gate is intentionally blocked.
