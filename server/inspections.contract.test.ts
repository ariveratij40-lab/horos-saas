import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration=readFileSync("drizzle-pg/migrations/0045_components_inspections_checklists.sql","utf8");
const router=readFileSync("server/routers/inspections.ts","utf8");
const schema=readFileSync("drizzle-pg/schema.ts","utf8");
const ui=readFileSync("client/src/pages/Inspections.tsx","utf8");

describe("GOV-001E canonical inspections contract",()=>{
  it("uses only the canonical finding model and snapshots executed items",()=>{
    expect(migration).toContain("REFERENCES maintenance_findings");
    expect(migration).not.toMatch(/CREATE TABLE (inspection|checklist|defect|issue)_findings/);
    expect(migration).toContain("item_code_snapshot");
    expect(migration).toContain("horos_snapshot_inspection_items");
  });
  it("enforces tenant, branch, lifecycle, typed response, and deletion controls",()=>{
    for(const table of ["asset_components","inspection_templates","inspection_template_items","inspections","inspection_results","inspection_events"]){
      expect(migration).toContain(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
      expect(migration).toContain(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
    }
    expect(migration).toContain("Published template is immutable");
    expect(migration).toContain("Completed inspection results are immutable");
    expect(migration).toContain("Component hierarchy cycle");
    expect(migration).toContain("REVOKE ALL ON asset_components");
  });
  it("derives tenant and trusted inspector from canonical session context",()=>{
    expect(router).toContain("ctx.pgTenant.tenantId");
    expect(router).toContain("ctx.pgTenant.externalSubject");
    expect(router).toContain("Active canonical user membership is required");
    expect(router).not.toContain("input.tenantId}::uuid");
  });
  it("exposes component, template, inspection, and finding association operations",()=>{
    for(const operation of ["listComponents","getComponent","createComponent","updateComponent","deactivateComponent","replaceComponent","listTemplates","getTemplate","createTemplate","addItem","updateItem","reorderItems","publishTemplate","newTemplateVersion","retireTemplate","listInspections","getInspection","createInspection","startInspection","saveResult","completeInspection","cancelInspection","associateFinding"]) expect(router).toContain(`${operation}:`);
  });
  it("keeps schema declarations aligned and provides responsive immutable UI",()=>{
    for(const symbol of ["assetComponents","inspectionTemplates","inspectionTemplateItems","inspections","inspectionResults","inspectionEvents"]) expect(schema).toContain(`export const ${symbol}`);
    expect(ui).toContain("Histórico inmutable");
    expect(ui).toContain("NEEDS_FINDING_WORKFLOW");
    expect(ui).toContain("overflow-x-hidden");
    expect(ui).toContain("¿Completar? Después no podrá modificarse.");
  });
});
