import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { appRouter } from "./routers";

const migration = readFileSync("drizzle-pg/migrations/0042_canonical_system_solutions.sql", "utf8");
const routerSource = readFileSync("server/routers/systemSolutions.ts", "utf8");

describe("GOV-001B canonical system solutions", () => {
  it("registers the complete canonical API while legacy integrations remain absent", () => {
    const procedures = Object.keys(appRouter._def.procedures);
    for (const name of ["canonicalContext", "canonicalList", "canonicalGet", "canonicalCompatibleAssets", "canonicalCreate", "canonicalUpdate", "canonicalSetStatus", "canonicalAssignAsset", "canonicalUnassignAsset"]) {
      expect(procedures).toContain(`systemSolutions.${name}`);
    }
    expect(procedures.some(path => path.startsWith("tenants."))).toBe(false);
    expect(procedures.some(path => path.startsWith("auth.localLogin"))).toBe(false);
  });

  it("derives tenant authority exclusively from canonical session context", () => {
    expect(routerSource).toContain("ctx.pgTenant.tenantId");
    expect(routerSource).not.toMatch(/input\.tenantId[^\n]*INSERT/);
    expect(routerSource).toContain("requireAdministrator(ctx.pgTenant.tenantRole)");
  });

  it("defines nullable asset relation, immutable identity, audit and no runtime delete", () => {
    expect(migration).toContain('ADD COLUMN "system_solution_id" uuid');
    expect(migration).toContain("System solution identity fields are immutable");
    expect(migration).toContain('CREATE TABLE "system_solution_events"');
    expect(migration).toContain("GRANT SELECT, INSERT, UPDATE ON TABLE system_solutions TO horos_runtime");
    expect(migration).not.toContain("GRANT DELETE ON TABLE system_solutions");
  });

  it("forces tenant RLS and validates branch-system and asset membership consistency", () => {
    expect(migration).toContain("ALTER TABLE system_solutions FORCE ROW LEVEL SECURITY");
    expect(migration).toContain('FOREIGN KEY ("tenant_id", "branch_id", "branch_system_id")');
    expect(migration).toContain("Asset is not a member of the solution system");
    expect(migration).toContain("Cannot remove the system membership used by the assigned solution");
  });
});
