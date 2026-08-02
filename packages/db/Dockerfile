FROM postgres:18.4-alpine

LABEL maintainer="Starter"
LABEL description="PostgreSQL 18.4 for Starter monorepo"

ENV POSTGRES_USER=starter
ENV POSTGRES_DB=starter
ENV POSTGRES_INITDB_ARGS="--data-checksums"

EXPOSE 5432

HEALTHCHECK --interval=5s --timeout=5s --retries=5 \
  CMD pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"
