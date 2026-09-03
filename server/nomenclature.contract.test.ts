import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";

const migration = readFileSync(
  "drizzle-pg/migrations/0043_canonical_nomenclature_aliases.sql",
  "utf8"
);
const routerSource = readFileSync("server/routers/nomenclature.ts", "utf8");

describe("GOV-001C canonical nomenclature", () => {
  it("registers alias management, exact resolution and candidate search", () => {
    const procedures = Object.keys(appRouter._def.procedures);
    for (const operation of [
      "listAliases",
      "addAlias",
      "updateAlias",
      "setAliasStatus",
      "resolve",
      "search",
    ]) {
      expect(procedures).toContain(`nomenclature.${operation}`);
    }
  });
  it("normalizes in PostgreSQL and enforces specific relational alias tables", () => {
    expect(migration).toContain("horos_normalize_alias");
    expect(migration).toContain("CREATE TABLE system_solution_aliases");
    expect(migration).toContain("CREATE TABLE asset_aliases");
    expect(migration).toContain("GENERATED ALWAYS AS");
    expect(migration).toContain("WHERE active");
  });
  it("derives tenant identity from session and never trusts normalized client input", () => {
    expect(routerSource).toContain("ctx.pgTenant.tenantId");
    expect(routerSource).not.toContain("input.normalizedValue");
    expect(routerSource).not.toMatch(/input\.tenantId[^\n]*VALUES/);
    expect(routerSource).toContain("requireAdmin(ctx.pgTenant.tenantRole)");
  });
  it("prioritizes UUID, canonical code, then active alias and keeps partial search as candidates", () => {
    expect(routerSource).toContain("'uuid' AS \"matchedBy\"");
    expect(routerSource).toContain("'code'");
    expect(routerSource).toContain("'alias'");
    expect(routerSource).toContain("a.active");
    expect(routerSource).toContain("LIMIT 50");
  });
  it("forces RLS and denies physical deletion", () => {
    expect(migration.match(/FORCE ROW LEVEL SECURITY/g)?.length).toBe(3);
    expect(migration).toContain(
      "REVOKE ALL ON system_solution_aliases, asset_aliases, asset_alias_events FROM horos_runtime"
    );
    expect(migration).not.toContain("GRANT DELETE");
  });
});
