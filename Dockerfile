# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# deps: install every workspace dependency (dev included) for the build stage
# ---------------------------------------------------------------------------
FROM oven/bun:1.4.3-slim AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/web/package.json packages/web/
RUN bun install --frozen-lockfile

# ---------------------------------------------------------------------------
# build: production build of the SPA (the server runs from source under bun)
# ---------------------------------------------------------------------------
FROM deps AS build
COPY . .
RUN bun run build

# ---------------------------------------------------------------------------
# prod-deps: runtime node_modules only
# ---------------------------------------------------------------------------
FROM oven/bun:1.4.3-slim AS prod-deps
WORKDIR /app
COPY package.json bun.lock ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/web/package.json packages/web/
RUN bun install --frozen-lockfile --production

# ---------------------------------------------------------------------------
# runtime
# ---------------------------------------------------------------------------
FROM oven/bun:1.4.3-slim AS runtime

LABEL org.opencontainers.image.title="Octotally" \
      org.opencontainers.image.description="GitHub involvement tracker: every issue, PR and discussion you are part of, filtered to what still needs you." \
      org.opencontainers.image.source="https://github.com/rojosinalma/octotally" \
      org.opencontainers.image.url="https://github.com/rojosinalma/octotally" \
      org.opencontainers.image.licenses="AGPL-3.0-only"

# The base image ships a `bun` user with uid 1000; rename it so the container user is `octotally`.
RUN usermod -l octotally -d /home/octotally -m bun \
 && groupmod -n octotally bun \
 && mkdir -p /data /app \
 && chown octotally:octotally /data /app

WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/data \
    WEB_DIST=/app/packages/web/dist

# Bun >= 1.3 installs in isolated mode: the store lives in node_modules/.bun and every workspace
# package gets its own node_modules of symlinks into it, so all three trees are needed.
COPY --from=prod-deps --chown=octotally:octotally /app/node_modules ./node_modules
COPY --from=prod-deps --chown=octotally:octotally /app/packages/shared/node_modules packages/shared/node_modules
COPY --from=prod-deps --chown=octotally:octotally /app/packages/server/node_modules packages/server/node_modules
COPY --chown=octotally:octotally package.json octoforge.json ./
COPY --chown=octotally:octotally packages/shared/package.json packages/shared/
COPY --chown=octotally:octotally packages/shared/src packages/shared/src
COPY --chown=octotally:octotally packages/server/package.json packages/server/
COPY --chown=octotally:octotally packages/server/src packages/server/src
COPY --chown=octotally:octotally packages/server/drizzle packages/server/drizzle
COPY --from=build --chown=octotally:octotally /app/packages/web/dist packages/web/dist

USER octotally
VOLUME /data
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["bun", "packages/server/src/index.ts"]
