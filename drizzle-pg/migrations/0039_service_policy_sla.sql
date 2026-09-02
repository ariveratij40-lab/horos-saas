-- ============================================================================
-- HOROS APP-008B
-- Canonical service policy + SLA foundation
-- ============================================================================

CREATE TABLE "service_policies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "branch_id" uuid,
  "policy_number" varchar(100) NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" text,
  "status" varchar(32) DEFAULT 'draft' NOT NULL,
  "policy_type" varchar(32) DEFAULT 'maintenance' NOT NULL,
  "start_date" date NOT NULL,
  "end_date" date NOT NULL,
  "renewal_date" date,
  "monthly_value" numeric(14, 2),
  "annual_value" numeric(14, 2),
  "currency" varchar(3) DEFAULT 'MXN' NOT NULL,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "service_policies_tenant_id_id_uq"
    UNIQUE ("tenant_id", "id")
);
--> statement-breakpoint

ALTER TABLE "service_policies"
ADD CONSTRAINT "service_policies_tenant_fk"
FOREIGN KEY ("tenant_id")
REFERENCES "public"."tenants"("id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "service_policies"
ADD CONSTRAINT "service_policies_tenant_branch_fk"
FOREIGN KEY ("tenant_id", "branch_id")
REFERENCES "public"."branches"("tenant_id", "id")
ON DELETE restrict
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "service_policies"
ADD CONSTRAINT "service_policies_status_ck"
CHECK (
  "status" IN (
    'draft',
    'active',
    'suspended',
    'expired',
    'cancelled'
  )
);
--> statement-breakpoint

ALTER TABLE "service_policies"
ADD CONSTRAINT "service_policies_type_ck"
CHECK (
  "policy_type" IN (
    'maintenance',
    'warranty',
    'support',
    'comprehensive'
  )
);
--> statement-breakpoint

ALTER TABLE "service_policies"
ADD CONSTRAINT "service_policies_dates_ck"
CHECK ("end_date" >= "start_date");
--> statement-breakpoint

ALTER TABLE "service_policies"
ADD CONSTRAINT "service_policies_renewal_ck"
CHECK (
  "renewal_date" IS NULL
  OR "renewal_date" >= "start_date"
);
--> statement-breakpoint

ALTER TABLE "service_policies"
ADD CONSTRAINT "service_policies_values_ck"
CHECK (
  ("monthly_value" IS NULL OR "monthly_value" >= 0)
  AND ("annual_value" IS NULL OR "annual_value" >= 0)
);
--> statement-breakpoint

CREATE UNIQUE INDEX "service_policies_tenant_number_uq"
ON "service_policies" ("tenant_id", "policy_number");
--> statement-breakpoint

CREATE INDEX "service_policies_tenant_status_idx"
ON "service_policies" ("tenant_id", "status");
--> statement-breakpoint

CREATE INDEX "service_policies_tenant_branch_idx"
ON "service_policies" ("tenant_id", "branch_id");
--> statement-breakpoint

CREATE TABLE "service_policy_services" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "policy_id" uuid NOT NULL,
  "service_code" varchar(64),
  "service_name" varchar(255) NOT NULL,
  "description" text,
  "frequency" varchar(32) DEFAULT 'on_demand' NOT NULL,
  "is_included" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "service_policy_services_tenant_id_id_uq"
    UNIQUE ("tenant_id", "id")
);
--> statement-breakpoint

ALTER TABLE "service_policy_services"
ADD CONSTRAINT "service_policy_services_tenant_fk"
FOREIGN KEY ("tenant_id")
REFERENCES "public"."tenants"("id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "service_policy_services"
ADD CONSTRAINT "service_policy_services_tenant_policy_fk"
FOREIGN KEY ("tenant_id", "policy_id")
REFERENCES "public"."service_policies"("tenant_id", "id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "service_policy_services"
ADD CONSTRAINT "service_policy_services_frequency_ck"
CHECK (
  "frequency" IN (
    'on_demand',
    'monthly',
    'quarterly',
    'biannual',
    'annual'
  )
);
--> statement-breakpoint

CREATE UNIQUE INDEX "service_policy_services_policy_code_uq"
ON "service_policy_services" (
  "tenant_id",
  "policy_id",
  "service_code"
)
WHERE "service_code" IS NOT NULL;
--> statement-breakpoint

CREATE INDEX "service_policy_services_policy_idx"
ON "service_policy_services" (
  "tenant_id",
  "policy_id"
);
--> statement-breakpoint

CREATE TABLE "service_policy_sla_rules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "policy_id" uuid NOT NULL,
  "name" varchar(255) NOT NULL,
  "priority" varchar(16) NOT NULL,
  "response_target_minutes" integer NOT NULL,
  "resolution_target_minutes" integer NOT NULL,
  "escalation_target_minutes" integer,
  "penalty_per_hour" numeric(14, 2),
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "service_policy_sla_rules_tenant_id_id_uq"
    UNIQUE ("tenant_id", "id"),
  CONSTRAINT "service_policy_sla_rules_tenant_policy_id_uq"
    UNIQUE ("tenant_id", "policy_id", "id")
);
--> statement-breakpoint

ALTER TABLE "service_policy_sla_rules"
ADD CONSTRAINT "service_policy_sla_rules_tenant_fk"
FOREIGN KEY ("tenant_id")
REFERENCES "public"."tenants"("id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "service_policy_sla_rules"
ADD CONSTRAINT "service_policy_sla_rules_tenant_policy_fk"
FOREIGN KEY ("tenant_id", "policy_id")
REFERENCES "public"."service_policies"("tenant_id", "id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "service_policy_sla_rules"
ADD CONSTRAINT "service_policy_sla_rules_priority_ck"
CHECK (
  "priority" IN (
    'critical',
    'high',
    'medium',
    'low'
  )
);
--> statement-breakpoint

ALTER TABLE "service_policy_sla_rules"
ADD CONSTRAINT "service_policy_sla_rules_targets_ck"
CHECK (
  "response_target_minutes" > 0
  AND "resolution_target_minutes" > 0
  AND "resolution_target_minutes" >= "response_target_minutes"
  AND (
    "escalation_target_minutes" IS NULL
    OR "escalation_target_minutes" > 0
  )
  AND (
    "penalty_per_hour" IS NULL
    OR "penalty_per_hour" >= 0
  )
);
--> statement-breakpoint

CREATE UNIQUE INDEX "service_policy_sla_rules_policy_priority_uq"
ON "service_policy_sla_rules" (
  "tenant_id",
  "policy_id",
  "priority"
);
--> statement-breakpoint

CREATE INDEX "service_policy_sla_rules_active_idx"
ON "service_policy_sla_rules" (
  "tenant_id",
  "policy_id",
  "is_active"
);
--> statement-breakpoint

CREATE TABLE "service_ticket_sla_snapshots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "service_ticket_id" uuid NOT NULL,
  "policy_id" uuid NOT NULL,
  "sla_rule_id" uuid NOT NULL,
  "policy_number_snapshot" varchar(100) NOT NULL,
  "policy_name_snapshot" varchar(255) NOT NULL,
  "rule_name_snapshot" varchar(255) NOT NULL,
  "priority_snapshot" varchar(16) NOT NULL,
  "response_target_minutes" integer NOT NULL,
  "resolution_target_minutes" integer NOT NULL,
  "escalation_target_minutes" integer,
  "sla_started_at" timestamp with time zone NOT NULL,
  "response_deadline" timestamp with time zone NOT NULL,
  "resolution_deadline" timestamp with time zone NOT NULL,
  "source" varchar(32) DEFAULT 'policy' NOT NULL,
  "actor_name" varchar(255),
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "service_ticket_sla_snapshots_tenant_id_id_uq"
    UNIQUE ("tenant_id", "id")
);
--> statement-breakpoint

ALTER TABLE "service_ticket_sla_snapshots"
ADD CONSTRAINT "service_ticket_sla_snapshots_tenant_fk"
FOREIGN KEY ("tenant_id")
REFERENCES "public"."tenants"("id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "service_ticket_sla_snapshots"
ADD CONSTRAINT "service_ticket_sla_snapshots_tenant_ticket_fk"
FOREIGN KEY ("tenant_id", "service_ticket_id")
REFERENCES "public"."service_tickets"("tenant_id", "id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "service_ticket_sla_snapshots"
ADD CONSTRAINT "service_ticket_sla_snapshots_tenant_policy_rule_fk"
FOREIGN KEY ("tenant_id", "policy_id", "sla_rule_id")
REFERENCES "public"."service_policy_sla_rules"(
  "tenant_id",
  "policy_id",
  "id"
)
ON DELETE restrict
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "service_ticket_sla_snapshots"
ADD CONSTRAINT "service_ticket_sla_snapshots_priority_ck"
CHECK (
  "priority_snapshot" IN (
    'critical',
    'high',
    'medium',
    'low'
  )
);
--> statement-breakpoint

ALTER TABLE "service_ticket_sla_snapshots"
ADD CONSTRAINT "service_ticket_sla_snapshots_targets_ck"
CHECK (
  "response_target_minutes" > 0
  AND "resolution_target_minutes" > 0
  AND "resolution_target_minutes" >= "response_target_minutes"
  AND (
    "escalation_target_minutes" IS NULL
    OR "escalation_target_minutes" > 0
  )
);
--> statement-breakpoint

ALTER TABLE "service_ticket_sla_snapshots"
ADD CONSTRAINT "service_ticket_sla_snapshots_deadlines_ck"
CHECK (
  "response_deadline" >= "sla_started_at"
  AND "resolution_deadline" >= "response_deadline"
);
--> statement-breakpoint

ALTER TABLE "service_ticket_sla_snapshots"
ADD CONSTRAINT "service_ticket_sla_snapshots_source_ck"
CHECK (
  "source" IN (
    'policy',
    'manual_override'
  )
);
--> statement-breakpoint

CREATE INDEX "service_ticket_sla_snapshots_ticket_created_idx"
ON "service_ticket_sla_snapshots" (
  "tenant_id",
  "service_ticket_id",
  "created_at" DESC,
  "id" DESC
);
--> statement-breakpoint

CREATE INDEX "service_ticket_sla_snapshots_policy_idx"
ON "service_ticket_sla_snapshots" (
  "tenant_id",
  "policy_id",
  "created_at" DESC
);
--> statement-breakpoint

ALTER TABLE "service_ticket_events"
DROP CONSTRAINT "service_ticket_events_type_ck";
--> statement-breakpoint

ALTER TABLE "service_ticket_events"
ADD CONSTRAINT "service_ticket_events_type_ck"
CHECK (
  "event_type" IN (
    'created',
    'status_changed',
    'assignment_changed',
    'comment_added',
    'resolution_added',
    'closed',
    'cancelled',
    'contractual_changed',
    'sla_applied'
  )
);
--> statement-breakpoint

ALTER TABLE "service_policies"
ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "service_policies"
FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "service_policies_tenant_isolation"
ON "service_policies"
FOR ALL
TO horos_runtime
USING (
  "tenant_id" = NULLIF(
    current_setting('app.current_tenant_id', true),
    ''
  )::uuid
)
WITH CHECK (
  "tenant_id" = NULLIF(
    current_setting('app.current_tenant_id', true),
    ''
  )::uuid
);
--> statement-breakpoint

ALTER TABLE "service_policy_services"
ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "service_policy_services"
FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "service_policy_services_tenant_isolation"
ON "service_policy_services"
FOR ALL
TO horos_runtime
USING (
  "tenant_id" = NULLIF(
    current_setting('app.current_tenant_id', true),
    ''
  )::uuid
)
WITH CHECK (
  "tenant_id" = NULLIF(
    current_setting('app.current_tenant_id', true),
    ''
  )::uuid
);
--> statement-breakpoint

ALTER TABLE "service_policy_sla_rules"
ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "service_policy_sla_rules"
FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "service_policy_sla_rules_tenant_isolation"
ON "service_policy_sla_rules"
FOR ALL
TO horos_runtime
USING (
  "tenant_id" = NULLIF(
    current_setting('app.current_tenant_id', true),
    ''
  )::uuid
)
WITH CHECK (
  "tenant_id" = NULLIF(
    current_setting('app.current_tenant_id', true),
    ''
  )::uuid
);
--> statement-breakpoint

ALTER TABLE "service_ticket_sla_snapshots"
ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "service_ticket_sla_snapshots"
FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "service_ticket_sla_snapshots_tenant_isolation"
ON "service_ticket_sla_snapshots"
FOR ALL
TO horos_runtime
USING (
  "tenant_id" = NULLIF(
    current_setting('app.current_tenant_id', true),
    ''
  )::uuid
)
WITH CHECK (
  "tenant_id" = NULLIF(
    current_setting('app.current_tenant_id', true),
    ''
  )::uuid
);
--> statement-breakpoint

REVOKE ALL ON TABLE "service_policies" FROM horos_runtime;
REVOKE ALL ON TABLE "service_policy_services" FROM horos_runtime;
REVOKE ALL ON TABLE "service_policy_sla_rules" FROM horos_runtime;
REVOKE ALL ON TABLE "service_ticket_sla_snapshots" FROM horos_runtime;
--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE "service_policies"
TO horos_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE "service_policy_services"
TO horos_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE "service_policy_sla_rules"
TO horos_runtime;
GRANT SELECT, INSERT
ON TABLE "service_ticket_sla_snapshots"
TO horos_runtime;
