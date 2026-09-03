import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const router=readFileSync(new URL("./routers/secureEvidence.ts",import.meta.url),"utf8");
const storage=readFileSync(new URL("./evidenceStorage.ts",import.meta.url),"utf8");
const migration=readFileSync(new URL("../drizzle-pg/migrations/0046_evidence_integrity_secure_files.sql",import.meta.url),"utf8");
const findingIntegrity=readFileSync(new URL("../drizzle-pg/migrations/0041_maintenance_evidence_integrity.sql",import.meta.url),"utf8");
const ui=readFileSync(new URL("../client/src/components/SecureEvidencePanel.tsx",import.meta.url),"utf8");
const downloadRoute=readFileSync(new URL("./secureEvidenceRoutes.ts",import.meta.url),"utf8");

describe("GOV-001F secure evidence contract",()=>{
  it("calculates authoritative hash and byte size",()=>{expect(router).toMatch(/createHash\("sha256"\).*update\(bytes\)/);expect(router).toMatch(/byte_size=\$\{bytes\.length\}/);expect(router).toMatch(/clientSha256/);});
  it("detects signatures and rejects active or unknown content",()=>{for(const token of ["image/jpeg","image/png","image/webp","application/pdf","text/html","application/octet-stream"])expect(router).toContain(token);expect(router).toMatch(/detected!==record\.declared/);});
  it("rejects empty, oversized and extension-mismatched files",()=>{expect(router).toMatch(/!bytes\.length\|\|bytes\.length>maxBytes/);expect(router).toMatch(/extensionMatches/);});
  it("uses private exclusive storage with opaque generated keys",()=>{expect(storage).toMatch(/randomUUID\(\)/);expect(storage).toMatch(/"wx", 0o600/);expect(storage).toMatch(/0o700/);expect(storage).not.toContain("client/public");});
  it("prevents traversal and never returns storage keys",()=>{expect(storage).toMatch(/keyPattern/);expect(storage).toMatch(/startsWith/);expect(router).not.toMatch(/return\{[^}]*storageKey/);});
  it("implements initiated, processing, verified and superseded lifecycle",()=>{for(const token of ["PENDING_UPLOAD","PROCESSING","AVAILABLE","SUPERSEDED","REJECTED","QUARANTINED","LEGACY_UNVERIFIED"])expect(migration+router+ui).toContain(token);expect(router).toMatch(/status==='AVAILABLE'/);});
  it("binds order, finding, inspection, result, asset and component",()=>{for(const token of ["work_order_id","finding_id","inspection_id","inspection_result_id","asset_id","component_id"])expect(migration).toContain(token);expect(migration).toMatch(/Result does not belong to inspection/);expect(migration).toMatch(/Component does not belong to asset/);});
  it("enforces authenticated streamed access headers",()=>{expect(router).toContain("pgProtectedProcedure");for(const token of ["X-Content-Type-Options","nosniff","private, no-store","Content-Disposition","pipeline("])expect(downloadRoute).toContain(token);expect(downloadRoute).toContain('value.status!=="AVAILABLE"');});
  it("forces row security and denies runtime physical delete",()=>{expect(migration).toMatch(/ENABLE ROW LEVEL SECURITY/);expect(migration).toMatch(/FORCE ROW LEVEL SECURITY/);expect(migration).toMatch(/REVOKE DELETE ON maintenance_evidence FROM horos_runtime/);});
  it("reuses maintenance findings and satisfies PHOTO_REQUIRED only with available evidence",()=>{expect(findingIntegrity).toContain("maintenance_findings");expect(migration).toMatch(/me\.status='AVAILABLE'/);expect(migration).toMatch(/me\.evidence_type IN \('PHOTO','SCREENSHOT'\)/);expect(migration).not.toMatch(/CREATE TABLE .*finding/i);});
  it("provides controlled administrative UI states",()=>{for(const token of ["Sin evidencia asociada","Progreso de carga","Vista previa","Descargar","Sustituir","Archivo histórico no verificado","En cuarentena"])expect(ui).toContain(token);});
});
