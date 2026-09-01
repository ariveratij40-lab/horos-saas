import { execFileSync } from "node:child_process";
import type { Express, Request, Response } from "express";

import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

import * as db from "../db";
import { resolveCanonicalTenantForSubject } from "../db.pg";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

const DEV_OPEN_ID = "dev_local_horos_admin";
const DEV_EMAIL = "admin.local@horos.test";
const DEV_NAME = "Administrador Local HOROS";

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
  '${DEV_OPEN_ID}',
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
  ON u.external_subject = '${DEV_OPEN_ID}'
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
      "horos_postgres_dev",
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

export function registerDevLocalAuthRoutes(app: Express) {
  app.get("/api/dev/login", async (req: Request, res: Response) => {
    if (process.env.NODE_ENV !== "development" || !isLoopbackRequest(req)) {
      res.status(404).end();
      return;
    }

    try {
      bootstrapCanonicalLocalIdentity();

      await db.upsertUser({
        openId: DEV_OPEN_ID,
        name: DEV_NAME,
        email: DEV_EMAIL,
        loginMethod: "local-dev",
        role: "admin",
        lastSignedIn: new Date(),
      });

      const canonicalIdentity =
        await resolveCanonicalTenantForSubject(DEV_OPEN_ID);

      if (canonicalIdentity.tenantCode !== "HOROS_LOCAL") {
        throw new Error("Unexpected local canonical tenant");
      }

      const sessionToken = await sdk.signSession({
        openId: DEV_OPEN_ID,
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
