import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";

const migration=readFileSync("drizzle-pg/migrations/0044_canonical_asset_topology.sql","utf8");
const schema=readFileSync("drizzle-pg/schema.ts","utf8");
const routerSource=readFileSync("server/routers/topology.ts","utf8");

describe("GOV-001D canonical topology",()=>{
  it("exposes complete port, link and relationship administration",()=>{
    const procedures=Object.keys(appRouter._def.procedures);
    for(const name of ["listPorts","getPort","createPort","updatePort","setPortActive","listLinks","getLink","createLink","updateLink","setLinkActive","listRelationships","getRelationship","createRelationship","updateRelationship","setRelationshipActive"])
      expect(procedures).toContain(`topology.${name}`);
  });
  it("derives tenant authority from session and establishes branch context",()=>{
    expect(routerSource).toContain("ctx.pgTenant.tenantId");
    expect(routerSource).not.toMatch(/input\.tenantId[^\n]*INSERT/);
    expect(routerSource).toContain("requireAdmin(ctx.pgTenant.tenantRole)");
    expect(migration).toContain("app.current_branch_id");
  });
  it("keeps ports, links and functional relationships distinct",()=>{
    for(const table of ["asset_ports","asset_links","asset_relationships","asset_topology_events"]){expect(migration).toContain(`CREATE TABLE ${table}`);expect(schema).toContain(`\"${table}\"`);}
    expect(migration).not.toContain("INSERT INTO asset_ports");
    expect(migration).not.toContain("INSERT INTO asset_links");
  });
  it("fails closed for invalid endpoints and hierarchy",()=>{
    for(const invariant of ["asset_links_distinct_endpoints_ck","asset_links_endpoint_pair_active_uq","horos_validate_asset_link","PARENT_OF cycle is not permitted","asset_relationships_connected_active_uq"]) expect(migration).toContain(invariant);
  });
  it("forces RLS and grants no physical deletion",()=>{
    expect(migration.match(/FORCE ROW LEVEL SECURITY/g)?.length).toBe(4);
    expect(migration).toContain("REVOKE ALL ON asset_ports,asset_links,asset_relationships,asset_topology_events FROM horos_runtime");
    expect(migration).not.toContain("GRANT DELETE");
  });
});
