#!/bin/sh
set -eu

: "${POSTGRES_USER:?POSTGRES_USER required}"
: "${POSTGRES_DB:?POSTGRES_DB required}"

psql \
  -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" <<'SQL'

DO $$
BEGIN

  IF NOT EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'horos_provisioner'
  ) THEN

    CREATE ROLE horos_provisioner
      NOLOGIN
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOINHERIT
      NOBYPASSRLS;

  END IF;

END
$$;

SQL
