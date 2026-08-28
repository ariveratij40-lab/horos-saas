CREATE TABLE "branch_systems" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"system_id" uuid NOT NULL,
	"status" varchar(32) DEFAULT 'not_started' NOT NULL,
	"onboarding_started_at" timestamp with time zone,
	"activated_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branch_systems_tenant_branch_system_uq" UNIQUE("tenant_id","branch_id","system_id"),
	CONSTRAINT "branch_systems_tenant_id_id_uq" UNIQUE("tenant_id","id")
);
--> statement-breakpoint
ALTER TABLE "branch_systems" ADD CONSTRAINT "branch_systems_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_systems" ADD CONSTRAINT "branch_systems_system_id_systems_catalog_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."systems_catalog"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_systems" ADD CONSTRAINT "branch_systems_tenant_branch_fk" FOREIGN KEY ("tenant_id","branch_id") REFERENCES "public"."branches"("tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "branch_systems_tenant_idx" ON "branch_systems" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "branch_systems_branch_idx" ON "branch_systems" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "branch_systems_system_idx" ON "branch_systems" USING btree ("system_id");