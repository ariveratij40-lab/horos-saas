import { execFileSync } from "node:child_process";
import type { Express, Request, Response } from "express";

import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

import * as db from "../db";
import { resolveCanonicalTenantForSubject } from "../db.pg";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

export const DEV_LOCAL_OPEN_ID = "dev_local_horos_admin";
const DEV_EMAIL = "admin.local@horos.test";
const DEV_NAME = "Administrador Local HOROS";
const DEV_PG_CONTAINER = "horos_postgres_dev";

let devCanonicalMigrationsChecked = false;

function isLoopbackRequest(req: Request): boolean {
  const hostname = req.hostname.toLowerCase();
  const remoteAddress = req.socket.remoteAddress ?? "";

  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    remoteAddress === "127.0.0.1" ||
    remoteAddress === "::1" ||
    remoteAddress === "::ffff:127.0.0.1"
  );
}

function dockerOutput(args: string[]): string {
  return execFileSync("docker", args, {
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  }).trim();
}

function resolveDevPgEndpoint() {
  const portBinding = dockerOutput([
    "port",
    DEV_PG_CONTAINER,
    "5432/tcp",
  ]);

  const portMatch = portBinding.match(/:(\d+)$/m);
  if (!portMatch) {
    throw new Error("Unable to resolve the local HOROS PostgreSQL port");
  }

  const databaseName =
    dockerOutput([
      "exec",
      DEV_PG_CONTAINER,
      "printenv",
      "POSTGRES_DB",
    ]) || "horos_dev";

  return {
    port: portMatch[1],
    databaseName,
  };
}

/**
 * Apply pending canonical PostgreSQL migrations once per local server process
 * using the development container's administrative role. The generated URL is
 * passed only to the migration child process; HOROS runtime itself continues
 * to use horos_runtime and RLS.
 */
function ensureDevCanonicalMigrations() {
  if (devCanonicalMigrationsChecked) {
    return;
  }

  const adminPassword = dockerOutput([
    "exec",
    DEV_PG_CONTAINER,
    "printenv",
    "POSTGRES_PASSWORD",
  ]);

  if (!adminPassword) {
    throw new Error("HOROS dev PostgreSQL administrator password is unavailable");
  }

  const { port, databaseName } = resolveDevPgEndpoint();

  const adminUrl =
    `postgres://horos_dev:${encodeURIComponent(adminPassword)}`
    + `@127.0.0.1:${port}/${encodeURIComponent(databaseName)}`;

  execFileSync(
    "pnpm",
    ["pg:migrate"],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        HOROS_PG_DATABASE_URL: adminUrl,
      },
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
    },
  );

  devCanonicalMigrationsChecked = true;
}

/**
 * Local development normally starts the canonical PostgreSQL database through
 * infra/dev/docker-compose.yml. The application process is intentionally not
 * given those credentials by Docker Compose, so derive the runtime-only URL
 * from the local container when HOROS_PG_DATABASE_URL was not explicitly set.
 *
 * This path is only reachable from development-only local identity handling.
 * The password is never logged or persisted by HOROS.
 */
function ensureCanonicalPgRuntimeConnection() {
  if (process.env.HOROS_PG_DATABASE_URL) {
    return;
  }

  const runtimePassword = dockerOutput([
    "exec",
    DEV_PG_CONTAINER,
    "printenv",
    "HOROS_RUNTIME_PASSWORD",
  ]);

  if (!runtimePassword) {
    throw new Error("HOROS runtime password is unavailable in the dev container");
  }

  const { port, databaseName } = resolveDevPgEndpoint();

  const password = encodeURIComponent(runtimePassword);
  const database = encodeURIComponent(databaseName);

  process.env.HOROS_PG_DATABASE_URL =
    `postgres://horos_runtime:${password}@127.0.0.1:${port}/${database}`;
}

/**
 * Prepares the dedicated localhost PostgreSQL runtime without mutating identity
 * fixtures. It is safe to call from the pgProtectedProcedure boundary: schema
 * migration runs at most once per process and runtime credentials remain the
 * least-privilege horos_runtime role.
 */
export function prepareDevLocalCanonicalRuntime(
  externalSubject: string,
): boolean {
  if (
    process.env.NODE_ENV !== "development" ||
    externalSubject !== DEV_LOCAL_OPEN_ID
  ) {
    return false;
  }

  ensureDevCanonicalMigrations();
  ensureCanonicalPgRuntimeConnection();

  return true;
}

function bootstrapCanonicalLocalIdentity() {
  const sql = `
BEGIN;

INSERT INTO tenants (
  code,
  name,
  status,
  is_active
)
VALUES (
  'HOROS_LOCAL',
  'HOROS Local Development',
  'active',
  true
)
ON CONFLICT (code)
DO UPDATE SET
  name = EXCLUDED.name,
  status = 'active',
  is_active = true,
  updated_at = now();

INSERT INTO users (
  external_subject,
  email,
  name,
  platform_role,
  is_active
)
VALUES (
  '${DEV_LOCAL_OPEN_ID}',
  '${DEV_EMAIL}',
  '${DEV_NAME}',
  'admin',
  true
)
ON CONFLICT (external_subject)
DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  platform_role = 'admin',
  is_active = true,
  updated_at = now();

INSERT INTO tenant_users (
  tenant_id,
  user_id,
  role,
  is_active
)
SELECT
  t.id,
  u.id,
  'admin',
  true
FROM tenants t
JOIN users u
  ON u.external_subject = '${DEV_LOCAL_OPEN_ID}'
WHERE t.code = 'HOROS_LOCAL'
ON CONFLICT (tenant_id, user_id)
DO UPDATE SET
  role = 'admin',
  is_active = true,
  updated_at = now();

INSERT INTO branches (
  tenant_id,
  code,
  name,
  country_code,
  state,
  city,
  timezone,
  status,
  is_active
)
SELECT
  id,
  'LOCAL-TIJ',
  'Sucursal Local Tijuana',
  'MX',
  'Baja California',
  'Tijuana',
  'America/Tijuana',
  'active',
  true
FROM tenants
WHERE code = 'HOROS_LOCAL'
ON CONFLICT (tenant_id, code)
DO UPDATE SET
  name = EXCLUDED.name,
  status = 'active',
  is_active = true,
  updated_at = now();

INSERT INTO departments (
  tenant_id,
  code,
  name,
  status
)
SELECT
  id,
  'IT',
  'Tecnologías de Información',
  'active'
FROM tenants
WHERE code = 'HOROS_LOCAL'
ON CONFLICT (tenant_id, code)
DO UPDATE SET
  name = EXCLUDED.name,
  status = 'active',
  updated_at = now();

COMMIT;
`;

  execFileSync(
    "docker",
    [
      "exec",
      "-i",
      DEV_PG_CONTAINER,
      "psql",
      "-v",
      "ON_ERROR_STOP=1",
      "-U",
      "horos_dev",
      "-d",
      "horos_dev",
    ],
    {
      input: sql,
      stdio: ["pipe", "pipe", "pipe"],
      encoding: "utf8",
    },
  );
}

/**
 * Repairs the canonical PostgreSQL identity used by the dedicated localhost
 * development session. This is deliberately fail-closed for every other
 * subject and is never available outside NODE_ENV=development.
 */
export function repairDevLocalCanonicalIdentity(
  externalSubject: string,
): boolean {
  if (!prepareDevLocalCanonicalRuntime(externalSubject)) {
    return false;
  }

  bootstrapCanonicalLocalIdentity();

  return true;
}

export function registerDevLocalAuthRoutes(app: Express) {
  app.get("/api/dev/login", async (req: Request, res: Response) => {
    if (process.env.NODE_ENV !== "development" || !isLoopbackRequest(req)) {
      res.status(404).end();
      return;
    }

    try {
      // Keep local development identity bootstrapping idempotent and use the
      // same repair path that pgProtectedProcedure can invoke if a long-lived
      // local session outlives a database/container reset.
      repairDevLocalCanonicalIdentity(DEV_LOCAL_OPEN_ID);

      await db.upsertUser({
        openId: DEV_LOCAL_OPEN_ID,
        name: DEV_NAME,
        email: DEV_EMAIL,
        loginMethod: "local-dev",
        role: "admin",
        lastSignedIn: new Date(),
      });

      const canonicalIdentity =
        await resolveCanonicalTenantForSubject(DEV_LOCAL_OPEN_ID);

      if (canonicalIdentity.tenantCode !== "HOROS_LOCAL") {
        throw new Error("Unexpected local canonical tenant");
      }

      const sessionToken = await sdk.signSession({
        openId: DEV_LOCAL_OPEN_ID,
        appId: "horos-local-dev",
        name: DEV_NAME,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      res.redirect(302, "/requests");
    } catch (error) {
      console.error("[DevAuth] Local login bootstrap failed", error);
      res.status(500).send(
        "No fue posible preparar el acceso local de HOROS. Verifique que horos_postgres_dev esté activo y que la base legacy esté disponible.",
      );
    }
  });
}