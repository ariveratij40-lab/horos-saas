ALTER TABLE "tenants" ADD COLUMN "legacy_tenant_id" integer;--> statement-breakpoint
CREATE UNIQUE INDEX "tenants_legacy_tenant_id_uq" ON "tenants" USING btree ("legacy_tenant_id");