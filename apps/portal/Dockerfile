# syntax=docker/dockerfile:1
# Portal image. Next.js is built with Bun and served from its standalone output.
# `turbo prune` reduces the monorepo to the portal's workspace subgraph so the
# image installs, builds and ships only what this app needs.

FROM docker.io/oven/bun:1.4.2-alpine AS base
WORKDIR /app

# Extract the portal subgraph: pruned manifests + lockfile land in out/json,
# pruned sources in out/full. turbo is a glibc binary, so Alpine needs libc6-compat.
FROM base AS pruner
RUN apk add --no-cache libc6-compat
RUN bun install -g turbo@2.11.7
COPY . .
RUN turbo prune @neuma/portal --docker

# Install every dependency (build tooling included) and build through Turbo, which
# compiles the workspace packages the portal imports before the app itself.
# Manifests precede sources so the install layer caches on lockfile changes only;
# the Next build cache is reused across builds via a cache mount. This whole stage
# is discarded — only the standalone output is copied into the runner.
FROM base AS builder
ARG BACKEND_URL=http://backend:3000
ENV BACKEND_URL=$BACKEND_URL
# The browser opens this socket itself, so it is the backend's public address, and Next bakes it in at build time.
ARG NEXT_PUBLIC_LIVE_WS_URL=ws://localhost:3000/api/v1/blocks/live
ENV NEXT_PUBLIC_LIVE_WS_URL=$NEXT_PUBLIC_LIVE_WS_URL
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=pruner /app/out/json/ ./
RUN --mount=type=cache,target=/root/.bun/install/cache bun install --frozen-lockfile
COPY --from=pruner /app/out/full/ ./
RUN --mount=type=cache,id=next-portal,target=/app/apps/portal/.next/cache \
    bunx turbo run build --filter=@neuma/portal
# Trim the standalone output here, before the runner copies it: a rm in the
# runner would only add a whiteout and leave the bytes in an earlier layer. This
# image is Alpine (musl), so the glibc sharp binaries Next traced never load;
# server source maps are debug-only.
RUN rm -rf \
      apps/portal/.next/standalone/node_modules/.bun/@img+sharp-libvips-linux-* \
      apps/portal/.next/standalone/node_modules/.bun/@img+sharp-linux-* \
    && find apps/portal/.next -name '*.map' -delete
# The portal ships no static files of its own today; an empty folder keeps the runner's copy valid either way.
RUN mkdir -p apps/portal/public

# Runtime image: the self-contained Next standalone server plus its static assets,
# served by Bun under an init process.
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3010
ENV HOSTNAME=0.0.0.0
RUN apk add --no-cache tini wget
COPY --from=builder /app/apps/portal/.next/standalone ./
COPY --from=builder /app/apps/portal/.next/static ./apps/portal/.next/static
COPY --from=builder /app/apps/portal/public ./apps/portal/public
USER bun
EXPOSE 3010
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3010}" >/dev/null 2>&1 || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["bun", "apps/portal/server.js"]
