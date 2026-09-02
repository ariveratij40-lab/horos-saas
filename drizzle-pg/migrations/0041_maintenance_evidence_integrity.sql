-- ============================================================================
-- HOROS APP-010A maintenance evidence integrity hardening
-- ============================================================================

ALTER TABLE "maintenance_evidence"
DROP CONSTRAINT "maintenance_evidence_tenant_order_finding_fk";
--> statement-breakpoint

ALTER TABLE "maintenance_evidence"
ADD CONSTRAINT "maintenance_evidence_tenant_order_finding_fk"
FOREIGN KEY (
  "tenant_id",
  "work_order_id",
  "finding_id"
)
REFERENCES "public"."maintenance_findings"(
  "tenant_id",
  "work_order_id",
  "id"
)
ON DELETE restrict
ON UPDATE no action;
