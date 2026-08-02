#!/bin/sh
# Runs once on first Postgres init (as the superuser/owner defined by POSTGRES_USER).
# Creates the least-privilege application role used by the backend at runtime: it can
# only read/write data (DML), never change the schema (DDL) and is not a superuser.
# The migrate image connects as the owner (POSTGRES_USER) to run DDL; ALTER DEFAULT
# PRIVILEGES makes every table the owner creates later automatically grant DML to the
# app role, so no manual grant is needed after each migration.
set -eu

if [ -z "${COMPANY_BRAIN_APP_PASSWORD:-}" ]; then
  echo "COMPANY_BRAIN_APP_PASSWORD is required to provision the application DB role." >&2
  exit 1
fi

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'company-brain_app') THEN
    CREATE ROLE "company-brain_app" LOGIN PASSWORD '${COMPANY_BRAIN_APP_PASSWORD}';
  END IF;
END
\$\$;

GRANT CONNECT ON DATABASE "$POSTGRES_DB" TO "company-brain_app";
GRANT USAGE ON SCHEMA public TO "company-brain_app";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "company-brain_app";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "company-brain_app";

ALTER DEFAULT PRIVILEGES FOR ROLE "$POSTGRES_USER" IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "company-brain_app";
ALTER DEFAULT PRIVILEGES FOR ROLE "$POSTGRES_USER" IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO "company-brain_app";
SQL

echo "Provisioned least-privilege role company-brain_app."
