FROM node:20-alpine AS build

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY index.html ./
COPY tsconfig.json tsconfig.eslint.json tsconfig.vite.json ./
COPY vite.config.ts ./
COPY vite.preview.config.mjs ./
COPY public ./public
COPY scripts ./scripts
COPY server ./server
COPY shared ./shared
COPY src ./src

RUN pnpm build
RUN pnpm prune --prod

FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8787
ENV HOST=127.0.0.1
ENV FRONTEND_PORT=5173
ENV FRONTEND_HOST=0.0.0.0

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/vite.preview.config.mjs ./vite.preview.config.mjs

USER node

EXPOSE 5173

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${FRONTEND_PORT}/healthz" >/dev/null || exit 1

CMD ["node", "scripts/start-prod.mjs"]
