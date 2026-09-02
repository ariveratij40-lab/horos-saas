CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "departments_tenant_code_uq" UNIQUE("tenant_id","code"),
	CONSTRAINT "departments_tenant_id_id_uq" UNIQUE("tenant_id","id")
);
--> statement-breakpoint
CREATE TABLE "system_infrastructure_dependencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"branch_system_id" uuid NOT NULL,
	"location_id" uuid,
	"telecom_space_id" uuid,
	"rack_id" uuid,
	"asset_id" uuid,
	"dependency_role" varchar(64) DEFAULT 'supporting' NOT NULL,
	"is_critical" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "system_infrastructure_dependencies_tenant_id_id_uq" UNIQUE("tenant_id","id")
);
--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "normative_status" varchar(32) DEFAULT 'pending_assessment' NOT NULL;--> statement-breakpoint
ALTER TABLE "branch_systems" ADD COLUMN "department_id" uuid;--> statement-breakpoint
ALTER TABLE "branch_systems" ADD COLUMN "department_code" varchar(128);--> statement-breakpoint
ALTER TABLE "branch_systems" ADD COLUMN "display_name" varchar(255);--> statement-breakpoint
ALTER TABLE "branch_systems" ADD COLUMN "functional_status" varchar(32) DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "branch_systems" ADD COLUMN "normative_status" varchar(32) DEFAULT 'pending_assessment' NOT NULL;--> statement-breakpoint
ALTER TABLE "branch_systems" ADD COLUMN "documentation_level" varchar(32) DEFAULT 'basic' NOT NULL;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_infrastructure_dependencies" ADD CONSTRAINT "system_infrastructure_dependencies_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_infrastructure_dependencies" ADD CONSTRAINT "system_infrastructure_dependencies_tenant_system_fk" FOREIGN KEY ("tenant_id","branch_system_id") REFERENCES "public"."branch_systems"("tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_infrastructure_dependencies" ADD CONSTRAINT "system_infrastructure_dependencies_tenant_location_fk" FOREIGN KEY ("tenant_id","location_id") REFERENCES "public"."locations"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_infrastructure_dependencies" ADD CONSTRAINT "system_infrastructure_dependencies_tenant_space_fk" FOREIGN KEY ("tenant_id","telecom_space_id") REFERENCES "public"."telecom_spaces"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_infrastructure_dependencies" ADD CONSTRAINT "system_infrastructure_dependencies_tenant_rack_fk" FOREIGN KEY ("tenant_id","rack_id") REFERENCES "public"."racks"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_infrastructure_dependencies" ADD CONSTRAINT "system_infrastructure_dependencies_tenant_asset_fk" FOREIGN KEY ("tenant_id","asset_id") REFERENCES "public"."assets"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "departments_tenant_idx" ON "departments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "system_infrastructure_dependencies_tenant_idx" ON "system_infrastructure_dependencies" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "system_infrastructure_dependencies_branch_system_idx" ON "system_infrastructure_dependencies" USING btree ("branch_system_id");--> statement-breakpoint
ALTER TABLE "branch_systems" ADD CONSTRAINT "branch_systems_tenant_department_fk" FOREIGN KEY ("tenant_id","department_id") REFERENCES "public"."departments"("tenant_id","id") ON DELETE restrict ON UPDATE no action;
-- ============================================================================
-- HOROS APP-007C.2C HARDENING
-- ============================================================================

ALTER TABLE "departments"
ADD CONSTRAINT "departments_status_check"
CHECK (
  "status" IN (
    'active',
    'inactive'
  )
);

ALTER TABLE "branch_systems"
ADD CONSTRAINT "branch_systems_functional_status_check"
CHECK (
  "functional_status" IN (
    'operational',
    'degraded',
    'non_operational',
    'out_of_service',
    'unknown'
  )
);

ALTER TABLE "branch_systems"
ADD CONSTRAINT "branch_systems_normative_status_check"
CHECK (
  "normative_status" IN (
    'compliant',
    'partially_compliant',
    'non_compliant',
    'pending_assessment',
    'not_applicable'
  )
);

ALTER TABLE "branch_systems"
ADD CONSTRAINT "branch_systems_documentation_level_check"
CHECK (
  "documentation_level" IN (
    'basic',
    'structured',
    'detailed',
    'documented'
  )
);

ALTER TABLE "assets"
ADD CONSTRAINT "assets_normative_status_check"
CHECK (
  "normative_status" IN (
    'compliant',
    'partially_compliant',
    'non_compliant',
    'pending_assessment',
    'not_applicable'
  )
);

ALTER TABLE "system_infrastructure_dependencies"
ADD CONSTRAINT
  "system_infrastructure_dependencies_exactly_one_target_check"
CHECK (
  num_nonnulls(
    "location_id",
    "telecom_space_id",
    "rack_id",
    "asset_id"
  ) = 1
);

ALTER TABLE "system_infrastructure_dependencies"
ADD CONSTRAINT
  "system_infrastructure_dependencies_role_check"
CHECK (
  "dependency_role" IN (
    'hosting',
    'supporting',
    'network',
    'power',
    'backbone',
    'shared',
    'other'
  )
);

CREATE INDEX IF NOT EXISTS
  "system_infrastructure_dependencies_location_idx"
ON "system_infrastructure_dependencies"
  ("tenant_id", "location_id")
WHERE "location_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS
  "system_infrastructure_dependencies_space_idx"
ON "system_infrastructure_dependencies"
  ("tenant_id", "telecom_space_id")
WHERE "telecom_space_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS
  "system_infrastructure_dependencies_rack_idx"
ON "system_infrastructure_dependencies"
  ("tenant_id", "rack_id")
WHERE "rack_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS
  "system_infrastructure_dependencies_asset_idx"
ON "system_infrastructure_dependencies"
  ("tenant_id", "asset_id")
WHERE "asset_id" IS NOT NULL;

ALTER TABLE "departments"
ENABLE ROW LEVEL SECURITY;

ALTER TABLE "departments"
FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS
  "departments_tenant_isolation"
ON "departments";

CREATE POLICY
  "departments_tenant_isolation"
ON "departments"
FOR ALL
TO "horos_runtime"
USING (
  "tenant_id" =
    NULLIF(
      current_setting(
        'app.current_tenant_id',
        true
      ),
      ''
    )::uuid
)
WITH CHECK (
  "tenant_id" =
    NULLIF(
      current_setting(
        'app.current_tenant_id',
        true
      ),
      ''
    )::uuid
);

ALTER TABLE "system_infrastructure_dependencies"
ENABLE ROW LEVEL SECURITY;

ALTER TABLE "system_infrastructure_dependencies"
FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS
  "system_infrastructure_dependencies_tenant_isolation"
ON "system_infrastructure_dependencies";

CREATE POLICY
  "system_infrastructure_dependencies_tenant_isolation"
ON "system_infrastructure_dependencies"
FOR ALL
TO "horos_runtime"
USING (
  "tenant_id" =
    NULLIF(
      current_setting(
        'app.current_tenant_id',
        true
      ),
      ''
    )::uuid
)
WITH CHECK (
  "tenant_id" =
    NULLIF(
      current_setting(
        'app.current_tenant_id',
        true
      ),
      ''
    )::uuid
);

GRANT SELECT, INSERT, UPDATE, DELETE
ON "departments"
TO "horos_runtime";

GRANT SELECT, INSERT, UPDATE, DELETE
ON "system_infrastructure_dependencies"
TO "horos_runtime";

GRANT SELECT, INSERT, UPDATE, DELETE
ON "branch_systems"
TO "horos_runtime";

GRANT SELECT, INSERT, UPDATE, DELETE
ON "assets"
TO "horos_runtime";
