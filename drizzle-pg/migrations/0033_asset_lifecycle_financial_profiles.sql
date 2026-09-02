CREATE TABLE "asset_financial_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"purchase_date" date,
	"purchase_cost" numeric(14, 2),
	"current_value" numeric(14, 2),
	"depreciation_rate" numeric(7, 4),
	"depreciation_method" varchar(32),
	"replacement_cost" numeric(14, 2),
	"maintenance_cost_yearly" numeric(14, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "asset_financial_profiles_tenant_asset_uq" UNIQUE("tenant_id","asset_id")
);
--> statement-breakpoint
CREATE TABLE "asset_lifecycle_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"criticality" varchar(16),
	"install_date" date,
	"warranty_expiry" date,
	"useful_life_years" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "asset_lifecycle_profiles_tenant_asset_uq" UNIQUE("tenant_id","asset_id")
);
--> statement-breakpoint
ALTER TABLE "asset_financial_profiles" ADD CONSTRAINT "asset_financial_profiles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_financial_profiles" ADD CONSTRAINT "asset_financial_profiles_tenant_asset_fk" FOREIGN KEY ("tenant_id","asset_id") REFERENCES "public"."assets"("tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_lifecycle_profiles" ADD CONSTRAINT "asset_lifecycle_profiles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_lifecycle_profiles" ADD CONSTRAINT "asset_lifecycle_profiles_tenant_asset_fk" FOREIGN KEY ("tenant_id","asset_id") REFERENCES "public"."assets"("tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "asset_financial_profiles_tenant_idx" ON "asset_financial_profiles" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "asset_financial_profiles_asset_idx" ON "asset_financial_profiles" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "asset_lifecycle_profiles_tenant_idx" ON "asset_lifecycle_profiles" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "asset_lifecycle_profiles_asset_idx" ON "asset_lifecycle_profiles" USING btree ("asset_id");
--> statement-breakpoint

-- ============================================================================
-- ASSET PROFILE DOMAIN CONSTRAINTS
-- ============================================================================

ALTER TABLE asset_lifecycle_profiles
ADD CONSTRAINT asset_lifecycle_profiles_criticality_ck
CHECK (
  criticality IS NULL
  OR criticality IN (
    'critical',
    'high',
    'medium',
    'low'
  )
);

--> statement-breakpoint

ALTER TABLE asset_lifecycle_profiles
ADD CONSTRAINT asset_lifecycle_profiles_useful_life_ck
CHECK (
  useful_life_years IS NULL
  OR useful_life_years > 0
);

--> statement-breakpoint

ALTER TABLE asset_lifecycle_profiles
ADD CONSTRAINT asset_lifecycle_profiles_warranty_date_ck
CHECK (
  warranty_expiry IS NULL
  OR install_date IS NULL
  OR warranty_expiry >= install_date
);

--> statement-breakpoint

ALTER TABLE asset_financial_profiles
ADD CONSTRAINT asset_financial_profiles_purchase_cost_ck
CHECK (
  purchase_cost IS NULL
  OR purchase_cost >= 0
);

--> statement-breakpoint

ALTER TABLE asset_financial_profiles
ADD CONSTRAINT asset_financial_profiles_current_value_ck
CHECK (
  current_value IS NULL
  OR current_value >= 0
);

--> statement-breakpoint

ALTER TABLE asset_financial_profiles
ADD CONSTRAINT asset_financial_profiles_depreciation_rate_ck
CHECK (
  depreciation_rate IS NULL
  OR (
    depreciation_rate >= 0
    AND depreciation_rate <= 1
  )
);

--> statement-breakpoint

ALTER TABLE asset_financial_profiles
ADD CONSTRAINT asset_financial_profiles_depreciation_method_ck
CHECK (
  depreciation_method IS NULL
  OR depreciation_method IN (
    'straight_line',
    'declining_balance',
    'sum_of_years'
  )
);

--> statement-breakpoint

ALTER TABLE asset_financial_profiles
ADD CONSTRAINT asset_financial_profiles_replacement_cost_ck
CHECK (
  replacement_cost IS NULL
  OR replacement_cost >= 0
);

--> statement-breakpoint

ALTER TABLE asset_financial_profiles
ADD CONSTRAINT asset_financial_profiles_maintenance_cost_ck
CHECK (
  maintenance_cost_yearly IS NULL
  OR maintenance_cost_yearly >= 0
);

--> statement-breakpoint

-- ============================================================================
-- RUNTIME TABLE PRIVILEGES
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE
ON asset_lifecycle_profiles
TO horos_runtime;

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE
ON asset_financial_profiles
TO horos_runtime;

--> statement-breakpoint

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE asset_lifecycle_profiles
ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint

ALTER TABLE asset_lifecycle_profiles
FORCE ROW LEVEL SECURITY;

--> statement-breakpoint

ALTER TABLE asset_financial_profiles
ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint

ALTER TABLE asset_financial_profiles
FORCE ROW LEVEL SECURITY;

--> statement-breakpoint

CREATE POLICY asset_lifecycle_profiles_tenant_isolation
ON asset_lifecycle_profiles
FOR ALL
TO horos_runtime
USING (
  tenant_id =
  NULLIF(
    current_setting(
      'app.current_tenant_id',
      true
    ),
    ''
  )::uuid
)
WITH CHECK (
  tenant_id =
  NULLIF(
    current_setting(
      'app.current_tenant_id',
      true
    ),
    ''
  )::uuid
);

--> statement-breakpoint

CREATE POLICY asset_financial_profiles_tenant_isolation
ON asset_financial_profiles
FOR ALL
TO horos_runtime
USING (
  tenant_id =
  NULLIF(
    current_setting(
      'app.current_tenant_id',
      true
    ),
    ''
  )::uuid
)
WITH CHECK (
  tenant_id =
  NULLIF(
    current_setting(
      'app.current_tenant_id',
      true
    ),
    ''
  )::uuid
);

