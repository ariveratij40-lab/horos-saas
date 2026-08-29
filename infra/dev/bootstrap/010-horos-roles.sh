#!/bin/sh
set -eu

: "${POSTGRES_USER:?POSTGRES_USER required}"
: "${POSTGRES_DB:?POSTGRES_DB required}"
: "${HOROS_RUNTIME_PASSWORD:?HOROS_RUNTIME_PASSWORD required}"
: "${HOROS_MIGRATOR_PASSWORD:?HOROS_MIGRATOR_PASSWORD required}"

psql \
  -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --set=runtime_password="$HOROS_RUNTIME_PASSWORD" \
  --set=migrator_password="$HOROS_MIGRATOR_PASSWORD" <<'SQL'

SELECT format(
  'CREATE ROLE horos_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS PASSWORD %L',
  :'runtime_password'
)
WHERE NOT EXISTS (
  SELECT 1 FROM pg_roles
  WHERE rolname = 'horos_runtime'
)
\gexec

SELECT format(
  'CREATE ROLE horos_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS PASSWORD %L',
  :'migrator_password'
)
WHERE NOT EXISTS (
  SELECT 1 FROM pg_roles
  WHERE rolname = 'horos_migrator'
)
\gexec

GRANT CONNECT ON DATABASE horos_dev
TO horos_runtime;

GRANT CONNECT ON DATABASE horos_dev
TO horos_migrator;

GRANT USAGE ON SCHEMA public
TO horos_runtime;

GRANT USAGE ON SCHEMA public
TO horos_migrator;

SQL
