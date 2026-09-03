import postgres, {
  type TransactionSql,
} from "postgres";

import { drizzle } from "drizzle-orm/postgres-js";

import * as schema from "../drizzle-pg/schema";

type SqlClient = ReturnType<typeof postgres>;

let sqlClient: SqlClient | null = null;

let pgDb:
  | ReturnType<typeof drizzle>
  | null = null;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireTenantId(
  tenantId: string,
): string {
  const normalized = tenantId.trim();

  if (!UUID_RE.test(normalized)) {
    throw new Error(
      "A valid PostgreSQL tenant UUID is required",
    );
  }

  return normalized;
}

function getConnectionString(): string {
  const connectionString =
    process.env.HOROS_PG_DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "HOROS_PG_DATABASE_URL is required",
    );
  }

  return connectionString;
}

function getSqlClient(): SqlClient {
  if (!sqlClient) {
    sqlClient = postgres(
      getConnectionString(),
      {
        max: 5,
        prepare: false,
      },
    );
  }

  return sqlClient;
}

/**
 * Raw PostgreSQL Drizzle access.
 *
 * IMPORTANT:
 * This function does NOT establish tenant context.
 *
 * Tenant-owned application operations must use
 * withTenantTransaction().
 */
export function getPgDb() {
  if (!pgDb) {
    pgDb = drizzle(
      getSqlClient(),
      { schema },
    );
  }

  return pgDb;
}

/**
 * Executes one callback inside a PostgreSQL transaction
 * with tenant context established transaction-locally.
 *
 * set_config(..., true) is equivalent to SET LOCAL:
 * the context disappears automatically when the
 * transaction commits or rolls back.
 */
export async function withTenantTransaction<T>(
  tenantId: string,
  callback: (
    tx: TransactionSql,
  ) => Promise<T>,
): Promise<T> {
  const normalizedTenantId =
    requireTenantId(tenantId);

  const sql = getSqlClient();

  let completed = false;
  let callbackResult: T;

  await sql.begin(async tx => {
    await tx`
      SELECT set_config(
        'app.current_tenant_id',
        ${normalizedTenantId},
        true
      )
    `;

    const contextRows = await tx<{
      tenant_id: string | null;
    }[]>`
      SELECT
        NULLIF(
          current_setting(
            'app.current_tenant_id',
            true
          ),
          ''
        ) AS tenant_id
    `;

    if (
      contextRows.length !== 1 ||
      contextRows[0]?.tenant_id !==
        normalizedTenantId
    ) {
      throw new Error(
        "PostgreSQL tenant context could not be established",
      );
    }

    callbackResult =
      await callback(tx);

    completed = true;

    /*
     * postgres.js has special result unwrapping semantics
     * for transaction callbacks. The application result
     * is deliberately captured outside the callback.
     */
    return [];
  });

  if (!completed) {
    throw new Error(
      "PostgreSQL tenant transaction did not complete",
    );
  }

  return callbackResult!;
}

export async function withTenantBranchTransaction<T>(
  tenantId: string,
  branchId: string,
  callback: (tx: TransactionSql) => Promise<T>,
): Promise<T> {
  const normalizedTenantId = requireTenantId(tenantId);
  const normalizedBranchId = requireTenantId(branchId);
  const sql = getSqlClient();
  let completed = false;
  let callbackResult: T;
  await sql.begin(async tx => {
    await tx`SELECT set_config('app.current_tenant_id', ${normalizedTenantId}, true), set_config('app.current_branch_id', ${normalizedBranchId}, true)`;
    const context = await tx<{ tenantId: string; branchId: string }[]>`
      SELECT current_setting('app.current_tenant_id', true) AS "tenantId", current_setting('app.current_branch_id', true) AS "branchId"`;
    if (context[0]?.tenantId !== normalizedTenantId || context[0]?.branchId !== normalizedBranchId) throw new Error("PostgreSQL topology context could not be established");
    callbackResult = await callback(tx);
    completed = true;
    return [];
  });
  if (!completed) throw new Error("PostgreSQL topology transaction did not complete");
  return callbackResult!;
}

/**
 * Executes an intentionally non-tenant PostgreSQL
 * operation.
 *
 * This must never be used against tenant-owned
 * canonical tables.
 */
export async function withRuntimeDb<T>(
  callback: (
    sql: SqlClient,
  ) => Promise<T>,
): Promise<T> {
  return callback(
    getSqlClient(),
  );
}

export async function closePgDb() {
  if (sqlClient) {
    await sqlClient.end();
  }

  sqlClient = null;
  pgDb = null;
}

export type CanonicalTenantIdentity = {
  tenantId: string;
  tenantCode: string;
  tenantRole: string;
  externalSubject: string;
};

/**
 * Resolves exactly one active canonical tenant membership
 * for an authenticated external subject.
 *
 * Fail-closed rules:
 * - subject must be non-empty
 * - canonical user must exist and be active
 * - exactly one active tenant membership must exist
 * - tenant must itself be active
 *
 * No legacy numeric tenant fallback is permitted.
 */
export async function resolveCanonicalTenantForSubject(
  externalSubject: string,
): Promise<CanonicalTenantIdentity> {
  const normalizedSubject =
    externalSubject.trim();

  if (!normalizedSubject) {
    throw new Error(
      "Authenticated external subject is required",
    );
  }

  const rows =
    await withRuntimeDb(async sql => {
      return sql<{
        tenant_id: string;
        tenant_code: string;
        tenant_role: string;
        external_subject: string;
      }[]>`
        SELECT
          tenant_id::text AS tenant_id,
          tenant_code,
          tenant_role,
          external_subject
        FROM horos_resolve_tenant_identity(
          ${normalizedSubject}
        )
      `;
    });

  if (rows.length !== 1) {
    throw new Error(
      "Canonical tenant resolver returned unexpected cardinality",
    );
  }

  const row = rows[0];

  return {
    tenantId: requireTenantId(
      row.tenant_id,
    ),
    tenantCode: row.tenant_code,
    tenantRole: row.tenant_role,
    externalSubject:
      row.external_subject,
  };
}

/**
 * Resolves canonical identity first and then establishes
 * PostgreSQL tenant transaction context.
 */
export async function withSubjectTenantTransaction<T>(
  externalSubject: string,
  callback: (
    tx: TransactionSql,
    identity: CanonicalTenantIdentity,
  ) => Promise<T>,
): Promise<T> {
  const identity =
    await resolveCanonicalTenantForSubject(
      externalSubject,
    );

  return withTenantTransaction(
    identity.tenantId,
    tx => callback(
      tx,
      identity,
    ),
  );
}
