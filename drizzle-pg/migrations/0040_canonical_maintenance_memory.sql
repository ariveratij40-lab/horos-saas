-- ============================================================================
-- HOROS APP-010A
-- Canonical maintenance + technical memory foundation
-- ============================================================================

CREATE TABLE "maintenance_orders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "branch_id" uuid NOT NULL,
  "policy_id" uuid,
  "service_ticket_id" uuid,
  "system_id" uuid,
  "order_number" varchar(64) NOT NULL,
  "title" varchar(500) NOT NULL,
  "description" text,
  "maintenance_type" varchar(32) DEFAULT 'preventive' NOT NULL,
  "status" varchar(32) DEFAULT 'planned' NOT NULL,
  "scheduled_start" timestamp with time zone,
  "scheduled_end" timestamp with time zone,
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "customer_contact_name" varchar(255),
  "customer_contact_email" varchar(320),
  "technical_summary" text,
  "closure_notes" text,
  "actual_cost" numeric(14, 2),
  "currency" varchar(3) DEFAULT 'MXN' NOT NULL,
  "created_by_user_id" uuid,
  "completed_by_user_id" uuid,
  "created_by_name" varchar(255),
  "completed_by_name" varchar(255),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "maintenance_orders_tenant_id_id_uq" UNIQUE ("tenant_id", "id")
);
--> statement-breakpoint

ALTER TABLE "maintenance_orders"
ADD CONSTRAINT "maintenance_orders_tenant_fk"
FOREIGN KEY ("tenant_id")
REFERENCES "public"."tenants"("id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_orders"
ADD CONSTRAINT "maintenance_orders_tenant_branch_fk"
FOREIGN KEY ("tenant_id", "branch_id")
REFERENCES "public"."branches"("tenant_id", "id")
ON DELETE restrict
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_orders"
ADD CONSTRAINT "maintenance_orders_tenant_policy_fk"
FOREIGN KEY ("tenant_id", "policy_id")
REFERENCES "public"."service_policies"("tenant_id", "id")
ON DELETE restrict
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_orders"
ADD CONSTRAINT "maintenance_orders_tenant_ticket_fk"
FOREIGN KEY ("tenant_id", "service_ticket_id")
REFERENCES "public"."service_tickets"("tenant_id", "id")
ON DELETE restrict
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_orders"
ADD CONSTRAINT "maintenance_orders_system_fk"
FOREIGN KEY ("system_id")
REFERENCES "public"."systems_catalog"("id")
ON DELETE restrict
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_orders"
ADD CONSTRAINT "maintenance_orders_created_by_membership_fk"
FOREIGN KEY ("tenant_id", "created_by_user_id")
REFERENCES "public"."tenant_users"("tenant_id", "user_id")
ON DELETE restrict
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_orders"
ADD CONSTRAINT "maintenance_orders_completed_by_membership_fk"
FOREIGN KEY ("tenant_id", "completed_by_user_id")
REFERENCES "public"."tenant_users"("tenant_id", "user_id")
ON DELETE restrict
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_orders"
ADD CONSTRAINT "maintenance_orders_type_ck"
CHECK (
  "maintenance_type" IN (
    'preventive',
    'corrective',
    'predictive',
    'inspection'
  )
);
--> statement-breakpoint

ALTER TABLE "maintenance_orders"
ADD CONSTRAINT "maintenance_orders_status_ck"
CHECK (
  "status" IN (
    'planned',
    'scheduled',
    'in_progress',
    'review',
    'completed',
    'cancelled'
  )
);
--> statement-breakpoint

ALTER TABLE "maintenance_orders"
ADD CONSTRAINT "maintenance_orders_schedule_ck"
CHECK (
  "scheduled_end" IS NULL
  OR "scheduled_start" IS NULL
  OR "scheduled_end" >= "scheduled_start"
);
--> statement-breakpoint

ALTER TABLE "maintenance_orders"
ADD CONSTRAINT "maintenance_orders_execution_ck"
CHECK (
  "completed_at" IS NULL
  OR "started_at" IS NULL
  OR "completed_at" >= "started_at"
);
--> statement-breakpoint

ALTER TABLE "maintenance_orders"
ADD CONSTRAINT "maintenance_orders_cost_ck"
CHECK (
  "actual_cost" IS NULL
  OR "actual_cost" >= 0
);
--> statement-breakpoint

CREATE UNIQUE INDEX "maintenance_orders_tenant_number_uq"
ON "maintenance_orders" ("tenant_id", "order_number");
--> statement-breakpoint

CREATE INDEX "maintenance_orders_tenant_status_idx"
ON "maintenance_orders" ("tenant_id", "status", "created_at" DESC);
--> statement-breakpoint

CREATE INDEX "maintenance_orders_branch_idx"
ON "maintenance_orders" ("tenant_id", "branch_id", "created_at" DESC);
--> statement-breakpoint

CREATE INDEX "maintenance_orders_policy_idx"
ON "maintenance_orders" ("tenant_id", "policy_id")
WHERE "policy_id" IS NOT NULL;
--> statement-breakpoint

CREATE INDEX "maintenance_orders_ticket_idx"
ON "maintenance_orders" ("tenant_id", "service_ticket_id")
WHERE "service_ticket_id" IS NOT NULL;
--> statement-breakpoint

CREATE TABLE "maintenance_order_technicians" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "maintenance_order_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "role" varchar(32) DEFAULT 'technician' NOT NULL,
  "assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "maintenance_order_technicians_tenant_id_id_uq" UNIQUE ("tenant_id", "id")
);
--> statement-breakpoint

ALTER TABLE "maintenance_order_technicians"
ADD CONSTRAINT "maintenance_order_technicians_tenant_order_fk"
FOREIGN KEY ("tenant_id", "maintenance_order_id")
REFERENCES "public"."maintenance_orders"("tenant_id", "id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_order_technicians"
ADD CONSTRAINT "maintenance_order_technicians_membership_fk"
FOREIGN KEY ("tenant_id", "user_id")
REFERENCES "public"."tenant_users"("tenant_id", "user_id")
ON DELETE restrict
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_order_technicians"
ADD CONSTRAINT "maintenance_order_technicians_role_ck"
CHECK ("role" IN ('lead', 'technician', 'observer'));
--> statement-breakpoint

CREATE UNIQUE INDEX "maintenance_order_technicians_order_user_uq"
ON "maintenance_order_technicians" (
  "tenant_id",
  "maintenance_order_id",
  "user_id"
);
--> statement-breakpoint

CREATE TABLE "maintenance_order_assets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "maintenance_order_id" uuid NOT NULL,
  "asset_id" uuid NOT NULL,
  "sequence" integer DEFAULT 0 NOT NULL,
  "scope_status" varchar(32) DEFAULT 'planned' NOT NULL,
  "asset_code_snapshot" varchar(128) NOT NULL,
  "asset_type_code_snapshot" varchar(64) NOT NULL,
  "asset_type_name_snapshot" varchar(255) NOT NULL,
  "location_snapshot" text,
  "manufacturer_snapshot" varchar(255),
  "model_snapshot" varchar(255),
  "serial_number_snapshot" varchar(255),
  "condition_before" text,
  "condition_after" text,
  "work_summary" text,
  "notes" text,
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "maintenance_order_assets_tenant_id_id_uq" UNIQUE ("tenant_id", "id")
);
--> statement-breakpoint

ALTER TABLE "maintenance_order_assets"
ADD CONSTRAINT "maintenance_order_assets_tenant_order_fk"
FOREIGN KEY ("tenant_id", "maintenance_order_id")
REFERENCES "public"."maintenance_orders"("tenant_id", "id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_order_assets"
ADD CONSTRAINT "maintenance_order_assets_tenant_asset_fk"
FOREIGN KEY ("tenant_id", "asset_id")
REFERENCES "public"."assets"("tenant_id", "id")
ON DELETE restrict
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_order_assets"
ADD CONSTRAINT "maintenance_order_assets_scope_status_ck"
CHECK (
  "scope_status" IN (
    'planned',
    'in_progress',
    'completed',
    'skipped',
    'not_applicable'
  )
);
--> statement-breakpoint

ALTER TABLE "maintenance_order_assets"
ADD CONSTRAINT "maintenance_order_assets_execution_ck"
CHECK (
  "completed_at" IS NULL
  OR "started_at" IS NULL
  OR "completed_at" >= "started_at"
);
--> statement-breakpoint

CREATE UNIQUE INDEX "maintenance_order_assets_order_asset_uq"
ON "maintenance_order_assets" (
  "tenant_id",
  "maintenance_order_id",
  "asset_id"
);
--> statement-breakpoint

CREATE INDEX "maintenance_order_assets_order_sequence_idx"
ON "maintenance_order_assets" (
  "tenant_id",
  "maintenance_order_id",
  "sequence",
  "asset_code_snapshot"
);
--> statement-breakpoint

CREATE TABLE "maintenance_findings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "maintenance_order_id" uuid NOT NULL,
  "maintenance_order_asset_id" uuid,
  "category" varchar(64) DEFAULT 'other' NOT NULL,
  "severity" varchar(16) DEFAULT 'medium' NOT NULL,
  "status" varchar(32) DEFAULT 'open' NOT NULL,
  "title" varchar(500) NOT NULL,
  "description" text NOT NULL,
  "root_cause" text,
  "recommendation" text,
  "requires_follow_up" boolean DEFAULT false NOT NULL,
  "follow_up_due_at" timestamp with time zone,
  "created_by_user_id" uuid,
  "created_by_name" varchar(255),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "maintenance_findings_tenant_id_id_uq" UNIQUE ("tenant_id", "id")
);
--> statement-breakpoint

ALTER TABLE "maintenance_findings"
ADD CONSTRAINT "maintenance_findings_tenant_order_fk"
FOREIGN KEY ("tenant_id", "maintenance_order_id")
REFERENCES "public"."maintenance_orders"("tenant_id", "id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_findings"
ADD CONSTRAINT "maintenance_findings_tenant_order_asset_fk"
FOREIGN KEY ("tenant_id", "maintenance_order_asset_id")
REFERENCES "public"."maintenance_order_assets"("tenant_id", "id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_findings"
ADD CONSTRAINT "maintenance_findings_created_by_membership_fk"
FOREIGN KEY ("tenant_id", "created_by_user_id")
REFERENCES "public"."tenant_users"("tenant_id", "user_id")
ON DELETE restrict
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_findings"
ADD CONSTRAINT "maintenance_findings_category_ck"
CHECK (
  "category" IN (
    'damage',
    'misalignment',
    'connectivity',
    'configuration',
    'cabling',
    'environmental',
    'wear',
    'end_of_life',
    'other'
  )
);
--> statement-breakpoint

ALTER TABLE "maintenance_findings"
ADD CONSTRAINT "maintenance_findings_severity_ck"
CHECK ("severity" IN ('info', 'low', 'medium', 'high', 'critical'));
--> statement-breakpoint

ALTER TABLE "maintenance_findings"
ADD CONSTRAINT "maintenance_findings_status_ck"
CHECK (
  "status" IN (
    'open',
    'corrected',
    'monitor',
    'recommendation',
    'accepted_risk'
  )
);
--> statement-breakpoint

CREATE INDEX "maintenance_findings_order_idx"
ON "maintenance_findings" (
  "tenant_id",
  "maintenance_order_id",
  "severity",
  "created_at"
);
--> statement-breakpoint

CREATE INDEX "maintenance_findings_order_asset_idx"
ON "maintenance_findings" (
  "tenant_id",
  "maintenance_order_asset_id",
  "created_at"
)
WHERE "maintenance_order_asset_id" IS NOT NULL;
--> statement-breakpoint

CREATE TABLE "maintenance_actions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "maintenance_order_id" uuid NOT NULL,
  "finding_id" uuid NOT NULL,
  "action_type" varchar(32) DEFAULT 'other' NOT NULL,
  "status" varchar(32) DEFAULT 'planned' NOT NULL,
  "description" text NOT NULL,
  "outcome" text,
  "performed_by_user_id" uuid,
  "performed_by_name" varchar(255),
  "performed_at" timestamp with time zone,
  "labor_minutes" integer,
  "material_cost" numeric(14, 2),
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "maintenance_actions_tenant_id_id_uq" UNIQUE ("tenant_id", "id")
);
--> statement-breakpoint

ALTER TABLE "maintenance_actions"
ADD CONSTRAINT "maintenance_actions_tenant_order_fk"
FOREIGN KEY ("tenant_id", "maintenance_order_id")
REFERENCES "public"."maintenance_orders"("tenant_id", "id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_actions"
ADD CONSTRAINT "maintenance_actions_tenant_finding_fk"
FOREIGN KEY ("tenant_id", "finding_id")
REFERENCES "public"."maintenance_findings"("tenant_id", "id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_actions"
ADD CONSTRAINT "maintenance_actions_performed_by_membership_fk"
FOREIGN KEY ("tenant_id", "performed_by_user_id")
REFERENCES "public"."tenant_users"("tenant_id", "user_id")
ON DELETE restrict
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_actions"
ADD CONSTRAINT "maintenance_actions_type_ck"
CHECK (
  "action_type" IN (
    'inspection',
    'cleaning',
    'adjustment',
    'repair',
    'replacement',
    'configuration',
    'cabling',
    'testing',
    'migration',
    'recommendation',
    'other'
  )
);
--> statement-breakpoint

ALTER TABLE "maintenance_actions"
ADD CONSTRAINT "maintenance_actions_status_ck"
CHECK ("status" IN ('planned', 'in_progress', 'completed', 'not_required'));
--> statement-breakpoint

ALTER TABLE "maintenance_actions"
ADD CONSTRAINT "maintenance_actions_values_ck"
CHECK (
  ("labor_minutes" IS NULL OR "labor_minutes" >= 0)
  AND ("material_cost" IS NULL OR "material_cost" >= 0)
);
--> statement-breakpoint

CREATE INDEX "maintenance_actions_finding_idx"
ON "maintenance_actions" (
  "tenant_id",
  "finding_id",
  "created_at"
);
--> statement-breakpoint

CREATE TABLE "maintenance_evidence" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "maintenance_order_id" uuid NOT NULL,
  "maintenance_order_asset_id" uuid,
  "finding_id" uuid,
  "action_id" uuid,
  "stage" varchar(16) NOT NULL,
  "evidence_type" varchar(32) DEFAULT 'photo' NOT NULL,
  "storage_key" varchar(1000),
  "file_url" text,
  "file_name" varchar(500),
  "mime_type" varchar(255),
  "file_sha256" varchar(64),
  "caption" text,
  "captured_at" timestamp with time zone DEFAULT now() NOT NULL,
  "captured_by_user_id" uuid,
  "captured_by_name" varchar(255),
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "maintenance_evidence_tenant_id_id_uq" UNIQUE ("tenant_id", "id")
);
--> statement-breakpoint

ALTER TABLE "maintenance_evidence"
ADD CONSTRAINT "maintenance_evidence_tenant_order_fk"
FOREIGN KEY ("tenant_id", "maintenance_order_id")
REFERENCES "public"."maintenance_orders"("tenant_id", "id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_evidence"
ADD CONSTRAINT "maintenance_evidence_tenant_order_asset_fk"
FOREIGN KEY ("tenant_id", "maintenance_order_asset_id")
REFERENCES "public"."maintenance_order_assets"("tenant_id", "id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_evidence"
ADD CONSTRAINT "maintenance_evidence_tenant_finding_fk"
FOREIGN KEY ("tenant_id", "finding_id")
REFERENCES "public"."maintenance_findings"("tenant_id", "id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_evidence"
ADD CONSTRAINT "maintenance_evidence_tenant_action_fk"
FOREIGN KEY ("tenant_id", "action_id")
REFERENCES "public"."maintenance_actions"("tenant_id", "id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_evidence"
ADD CONSTRAINT "maintenance_evidence_captured_by_membership_fk"
FOREIGN KEY ("tenant_id", "captured_by_user_id")
REFERENCES "public"."tenant_users"("tenant_id", "user_id")
ON DELETE restrict
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_evidence"
ADD CONSTRAINT "maintenance_evidence_stage_ck"
CHECK ("stage" IN ('before', 'during', 'after', 'supporting'));
--> statement-breakpoint

ALTER TABLE "maintenance_evidence"
ADD CONSTRAINT "maintenance_evidence_type_ck"
CHECK ("evidence_type" IN ('photo', 'document', 'measurement', 'signature', 'other'));
--> statement-breakpoint

ALTER TABLE "maintenance_evidence"
ADD CONSTRAINT "maintenance_evidence_reference_ck"
CHECK (
  "storage_key" IS NOT NULL
  OR "file_url" IS NOT NULL
);
--> statement-breakpoint

ALTER TABLE "maintenance_evidence"
ADD CONSTRAINT "maintenance_evidence_sha256_ck"
CHECK (
  "file_sha256" IS NULL
  OR "file_sha256" ~ '^[0-9A-Fa-f]{64}$'
);
--> statement-breakpoint

CREATE INDEX "maintenance_evidence_order_asset_stage_idx"
ON "maintenance_evidence" (
  "tenant_id",
  "maintenance_order_id",
  "maintenance_order_asset_id",
  "stage",
  "captured_at"
);
--> statement-breakpoint

CREATE TABLE "maintenance_order_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "maintenance_order_id" uuid NOT NULL,
  "event_type" varchar(64) NOT NULL,
  "message" text,
  "actor_user_id" uuid,
  "actor_name" varchar(255),
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "maintenance_order_events_tenant_id_id_uq" UNIQUE ("tenant_id", "id")
);
--> statement-breakpoint

ALTER TABLE "maintenance_order_events"
ADD CONSTRAINT "maintenance_order_events_tenant_order_fk"
FOREIGN KEY ("tenant_id", "maintenance_order_id")
REFERENCES "public"."maintenance_orders"("tenant_id", "id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_order_events"
ADD CONSTRAINT "maintenance_order_events_actor_membership_fk"
FOREIGN KEY ("tenant_id", "actor_user_id")
REFERENCES "public"."tenant_users"("tenant_id", "user_id")
ON DELETE restrict
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_order_events"
ADD CONSTRAINT "maintenance_order_events_type_ck"
CHECK (
  "event_type" IN (
    'created',
    'status_changed',
    'technician_added',
    'asset_added',
    'asset_status_changed',
    'finding_added',
    'finding_updated',
    'action_added',
    'action_completed',
    'evidence_added',
    'comment_added',
    'completed',
    'reopened',
    'cancelled'
  )
);
--> statement-breakpoint

CREATE INDEX "maintenance_order_events_order_created_idx"
ON "maintenance_order_events" (
  "tenant_id",
  "maintenance_order_id",
  "created_at",
  "id"
);
--> statement-breakpoint

-- RLS -------------------------------------------------------------------------

ALTER TABLE "maintenance_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "maintenance_orders" FORCE ROW LEVEL SECURITY;
CREATE POLICY "maintenance_orders_tenant_isolation"
ON "maintenance_orders"
FOR ALL TO horos_runtime
USING (
  "tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
)
WITH CHECK (
  "tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
);
--> statement-breakpoint

ALTER TABLE "maintenance_order_technicians" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "maintenance_order_technicians" FORCE ROW LEVEL SECURITY;
CREATE POLICY "maintenance_order_technicians_tenant_isolation"
ON "maintenance_order_technicians"
FOR ALL TO horos_runtime
USING (
  "tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
)
WITH CHECK (
  "tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
);
--> statement-breakpoint

ALTER TABLE "maintenance_order_assets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "maintenance_order_assets" FORCE ROW LEVEL SECURITY;
CREATE POLICY "maintenance_order_assets_tenant_isolation"
ON "maintenance_order_assets"
FOR ALL TO horos_runtime
USING (
  "tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
)
WITH CHECK (
  "tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
);
--> statement-breakpoint

ALTER TABLE "maintenance_findings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "maintenance_findings" FORCE ROW LEVEL SECURITY;
CREATE POLICY "maintenance_findings_tenant_isolation"
ON "maintenance_findings"
FOR ALL TO horos_runtime
USING (
  "tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
)
WITH CHECK (
  "tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
);
--> statement-breakpoint

ALTER TABLE "maintenance_actions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "maintenance_actions" FORCE ROW LEVEL SECURITY;
CREATE POLICY "maintenance_actions_tenant_isolation"
ON "maintenance_actions"
FOR ALL TO horos_runtime
USING (
  "tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
)
WITH CHECK (
  "tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
);
--> statement-breakpoint

ALTER TABLE "maintenance_evidence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "maintenance_evidence" FORCE ROW LEVEL SECURITY;
CREATE POLICY "maintenance_evidence_tenant_isolation"
ON "maintenance_evidence"
FOR ALL TO horos_runtime
USING (
  "tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
)
WITH CHECK (
  "tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
);
--> statement-breakpoint

ALTER TABLE "maintenance_order_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "maintenance_order_events" FORCE ROW LEVEL SECURITY;
CREATE POLICY "maintenance_order_events_tenant_isolation"
ON "maintenance_order_events"
FOR ALL TO horos_runtime
USING (
  "tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
)
WITH CHECK (
  "tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
);
--> statement-breakpoint

REVOKE ALL ON TABLE "maintenance_orders" FROM horos_runtime;
REVOKE ALL ON TABLE "maintenance_order_technicians" FROM horos_runtime;
REVOKE ALL ON TABLE "maintenance_order_assets" FROM horos_runtime;
REVOKE ALL ON TABLE "maintenance_findings" FROM horos_runtime;
REVOKE ALL ON TABLE "maintenance_actions" FROM horos_runtime;
REVOKE ALL ON TABLE "maintenance_evidence" FROM horos_runtime;
REVOKE ALL ON TABLE "maintenance_order_events" FROM horos_runtime;
--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE "maintenance_orders"
TO horos_runtime;
GRANT SELECT, INSERT, DELETE
ON TABLE "maintenance_order_technicians"
TO horos_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE "maintenance_order_assets"
TO horos_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE "maintenance_findings"
TO horos_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE "maintenance_actions"
TO horos_runtime;
GRANT SELECT, INSERT, DELETE
ON TABLE "maintenance_evidence"
TO horos_runtime;
GRANT SELECT, INSERT
ON TABLE "maintenance_order_events"
TO horos_runtime;
