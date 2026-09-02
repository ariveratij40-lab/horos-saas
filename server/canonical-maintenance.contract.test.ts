import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  describe,
  expect,
  it,
} from "vitest";

import { appRouter } from "./routers";

function readProjectFile(relativePath: string) {
  return readFileSync(
    fileURLToPath(
      new URL(relativePath, import.meta.url),
    ),
    "utf8",
  );
}

describe("canonical maintenance digital technical memory contract", () => {
  const procedures = appRouter._def.procedures;

  it("exposes the canonical maintenance execution surface", () => {
    for (const name of [
      "canonicalMaintenance.canonicalList",
      "canonicalMaintenance.canonicalGet",
      "canonicalMaintenance.canonicalPolicyCoverage",
      "canonicalMaintenance.canonicalSetPolicyCoverage",
      "canonicalMaintenance.canonicalCreate",
      "canonicalMaintenance.canonicalAddAssets",
      "canonicalMaintenance.canonicalPlan",
      "canonicalMaintenance.canonicalStart",
      "canonicalMaintenance.canonicalUpdateAsset",
      "canonicalMaintenance.canonicalAddFinding",
      "canonicalMaintenance.canonicalAddEvidenceReference",
      "canonicalMaintenance.canonicalComplete",
      "canonicalMaintenance.canonicalCustomerAccept",
    ]) {
      expect(procedures[name]).toBeDefined();
    }
  });

  it("creates the six tenant-owned canonical maintenance tables with forced RLS", () => {
    const migration = readProjectFile(
      "../drizzle-pg/migrations/0040_canonical_maintenance_work_orders.sql",
    );

    for (const table of [
      "service_policy_assets",
      "maintenance_work_orders",
      "maintenance_work_order_assets",
      "maintenance_findings",
      "maintenance_evidence",
      "maintenance_work_order_events",
    ]) {
      expect(migration).toContain(`CREATE TABLE \"${table}\"`);
      expect(migration).toContain(
        `ALTER TABLE \"${table}\" FORCE ROW LEVEL SECURITY`,
      );
      expect(migration).toContain(
        `CREATE POLICY \"${table}_tenant_isolation\"`,
      );
    }
  });

  it("preserves policy-to-asset and work-order-to-asset tenant relationships", () => {
    const migration = readProjectFile(
      "../drizzle-pg/migrations/0040_canonical_maintenance_work_orders.sql",
    );

    expect(migration).toContain(
      'CONSTRAINT "service_policy_assets_tenant_policy_fk"',
    );
    expect(migration).toContain(
      'CONSTRAINT "service_policy_assets_tenant_asset_fk"',
    );
    expect(migration).toContain(
      'CONSTRAINT "maintenance_work_orders_tenant_policy_fk"',
    );
    expect(migration).toContain(
      'CONSTRAINT "maintenance_work_order_assets_tenant_order_fk"',
    );
    expect(migration).toContain(
      'CONSTRAINT "maintenance_work_order_assets_tenant_asset_fk"',
    );
  });

  it("models structured findings plus before/during/after technical evidence", () => {
    const migration = readProjectFile(
      "../drizzle-pg/migrations/0040_canonical_maintenance_work_orders.sql",
    );

    for (const phase of [
      "before",
      "during",
      "after",
      "general",
    ]) {
      expect(migration).toContain(`'${phase}'`);
    }

    for (const field of [
      '"diagnosis" text',
      '"action_taken" text',
      '"recommendation" text',
      '"requires_follow_up" boolean',
      '"capex_recommended" boolean',
    ]) {
      expect(migration).toContain(field);
    }
  });

  it("keeps the canonical router PostgreSQL-only and tenant-scoped", () => {
    const router = readProjectFile(
      "./routers/canonicalMaintenance.ts",
    );

    expect(router).toContain("pgProtectedProcedure");
    expect(router).toContain("withTenantTransaction");
    expect(router).toContain("ctx.pgTenant.tenantId");
    expect(router).not.toContain("getDb(");
    expect(router).not.toContain("ctx.user.tenantId ?? 1");
    expect(router).not.toContain("z.number()" + ".optional()");
  });

  it("prevents completion while maintenance assets remain pending", () => {
    const router = readProjectFile(
      "./routers/canonicalMaintenance.ts",
    );

    expect(router).toContain(
      "Every maintenance asset must be inspected, serviced, skipped, or marked for follow-up before completion",
    );
    expect(router).toContain("Maintenance work order planned");
    expect(router).toContain("Maintenance execution started");
    expect(router).toContain("Maintenance execution completed");
  });
});
