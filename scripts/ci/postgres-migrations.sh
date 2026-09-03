#!/bin/sh
set -eu

: "${TEST_POSTGRES_ADMIN_URL:?TEST_POSTGRES_ADMIN_URL is required}"

ROOT_URL=${TEST_POSTGRES_ADMIN_URL%/*}
CLEAN_DB=horos_stab_clean
UPGRADE_DB=horos_stab_upgrade

psql_admin() {
  psql "$TEST_POSTGRES_ADMIN_URL" -X -v ON_ERROR_STOP=1 "$@"
}

reset_database() {
  database=$1
  psql_admin -c "DROP DATABASE IF EXISTS ${database} WITH (FORCE)" >/dev/null
  psql_admin -c "CREATE DATABASE ${database}" >/dev/null
}

prepare_roles() {
  psql_admin <<'SQL' >/dev/null
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'horos_runtime') THEN
    CREATE ROLE horos_runtime NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'horos_provisioner') THEN
    CREATE ROLE horos_provisioner NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'horos_identity_resolver') THEN
    CREATE ROLE horos_identity_resolver NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
END
$$;
SQL
}

prepare_roles
node scripts/ci/check-migration-journal.mjs

reset_database "$CLEAN_DB"
HOROS_PG_DATABASE_URL="${ROOT_URL}/${CLEAN_DB}" pnpm pg:migrate
clean_count=$(psql "${ROOT_URL}/${CLEAN_DB}" -X -Atqc 'SELECT count(*) FROM drizzle.__drizzle_migrations')
expected_count=$(find drizzle-pg/migrations -maxdepth 1 -type f -name '[0-9][0-9][0-9][0-9]_*.sql' | wc -l | tr -d ' ')
test "$clean_count" = "$expected_count"
psql "${ROOT_URL}/${CLEAN_DB}" -X -f scripts/ci/system-solutions-integrity.sql >/dev/null
psql "${ROOT_URL}/${CLEAN_DB}" -X -f scripts/ci/nomenclature-alias-integrity.sql >/dev/null
psql "${ROOT_URL}/${CLEAN_DB}" -X -f scripts/ci/topology-integrity.sql >/dev/null
psql "${ROOT_URL}/${CLEAN_DB}" -X -f scripts/ci/inspection-integrity.sql >/dev/null
psql "${ROOT_URL}/${CLEAN_DB}" -X -f scripts/ci/maintenance-evidence-integrity.sql >/dev/null
psql "${ROOT_URL}/${CLEAN_DB}" -X -f scripts/ci/secure-evidence-integrity.sql >/dev/null

reset_database "$UPGRADE_DB"
for migration in drizzle-pg/migrations/[0-9][0-9][0-9][0-9]_*.sql; do
  tag=$(basename "$migration" .sql)
  number=${tag%%_*}
  if [ "$number" -le 45 ]; then
    psql "${ROOT_URL}/${UPGRADE_DB}" -X -v ON_ERROR_STOP=1 -f "$migration" >/dev/null
  fi
done
psql "${ROOT_URL}/${UPGRADE_DB}" -X -v ON_ERROR_STOP=1 -f drizzle-pg/migrations/0046_evidence_integrity_secure_files.sql >/dev/null
psql "${ROOT_URL}/${UPGRADE_DB}" -X -f scripts/ci/system-solutions-integrity.sql >/dev/null
psql "${ROOT_URL}/${UPGRADE_DB}" -X -f scripts/ci/nomenclature-alias-integrity.sql >/dev/null
psql "${ROOT_URL}/${UPGRADE_DB}" -X -f scripts/ci/topology-integrity.sql >/dev/null
psql "${ROOT_URL}/${UPGRADE_DB}" -X -f scripts/ci/inspection-integrity.sql >/dev/null
psql "${ROOT_URL}/${UPGRADE_DB}" -X -f scripts/ci/maintenance-evidence-integrity.sql >/dev/null
psql "${ROOT_URL}/${UPGRADE_DB}" -X -f scripts/ci/secure-evidence-integrity.sql >/dev/null

echo "PostgreSQL clean migration and 0045-to-0046 upgrade checks passed"
