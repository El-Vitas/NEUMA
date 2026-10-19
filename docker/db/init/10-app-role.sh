#!/bin/sh
# Runs once on first Postgres init (as the superuser/owner defined by POSTGRES_USER).
# Creates the least-privilege application role used by the backend at runtime: it can
# only read/write data (DML), never change the schema (DDL) and is not a superuser.
# The migrate image connects as the owner (POSTGRES_USER) to run DDL; ALTER DEFAULT
# PRIVILEGES makes every table the owner creates later automatically grant DML to the
# app role, so no manual grant is needed after each migration.
set -eu

if [ -z "${NEUMA_APP_PASSWORD:-}" ]; then
  echo "NEUMA_APP_PASSWORD is required to provision the application DB role." >&2
  exit 1
fi

# The password travels as a psql variable and is quoted by Postgres itself (format %L), so a generated
# password holding a quote can neither break nor inject into the statement.
psql -v ON_ERROR_STOP=1 -v app_password="$NEUMA_APP_PASSWORD" --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<SQL
SELECT format('CREATE ROLE "neuma_app" LOGIN PASSWORD %L', :'app_password')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'neuma_app')
\gexec

GRANT CONNECT ON DATABASE "$POSTGRES_DB" TO "neuma_app";
GRANT USAGE ON SCHEMA public TO "neuma_app";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "neuma_app";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "neuma_app";

ALTER DEFAULT PRIVILEGES FOR ROLE "$POSTGRES_USER" IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "neuma_app";
ALTER DEFAULT PRIVILEGES FOR ROLE "$POSTGRES_USER" IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO "neuma_app";
SQL

echo "Provisioned least-privilege role neuma_app."
