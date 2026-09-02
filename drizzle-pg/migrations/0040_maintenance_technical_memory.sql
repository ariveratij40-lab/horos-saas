-- ============================================================================
-- HOROS APP-010A
-- Canonical maintenance + digital technical memory foundation
-- ============================================================================

CREATE TABLE "maintenance_work_orders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "branch_id" uuid NOT NULL,
  "branch_system_id" uuid,
  "policy_id" uuid,
  "policy_service_id" uuid,
  "service_ticket_id" uuid,
  "work_order_number" varchar(100) NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text,
  "maintenance_type" varchar(32) DEFAULT 'preventive' NOT NULL,
  "status" varchar(32) DEFAULT 'planned' NOT NULL,
  "scheduled_start_at" timestamp with time zone,
  "scheduled_end_at" timestamp with time zone,
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "assigned_to_user_id" uuid,
  "created_by_user_id" uuid,
  "summary" text,
  "internal_notes" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "maintenance_work_orders_tenant_id_id_uq"
    UNIQUE ("tenant_id", "id")
);
--> statement-breakpoint

ALTER TABLE "maintenance_work_orders"
ADD CONSTRAINT "maintenance_work_orders_tenant_fk"
FOREIGN KEY ("tenant_id")
REFERENCES "public"."tenants"("id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_work_orders"
ADD CONSTRAINT "maintenance_work_orders_tenant_branch_fk"
FOREIGN KEY ("tenant_id", "branch_id")
REFERENCES "public"."branches"("tenant_id", "id")
ON DELETE restrict
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_work_orders"
ADD CONSTRAINT "maintenance_work_orders_tenant_system_fk"
FOREIGN KEY ("tenant_id", "branch_system_id")
REFERENCES "public"."branch_systems"("tenant_id", "id")
ON DELETE restrict
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_work_orders"
ADD CONSTRAINT "maintenance_work_orders_tenant_policy_fk"
FOREIGN KEY ("tenant_id", "policy_id")
REFERENCES "public"."service_policies"("tenant_id", "id")
ON DELETE restrict
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_work_orders"
ADD CONSTRAINT "maintenance_work_orders_tenant_policy_service_fk"
FOREIGN KEY ("tenant_id", "policy_service_id")
REFERENCES "public"."service_policy_services"("tenant_id", "id")
ON DELETE restrict
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_work_orders"
ADD CONSTRAINT "maintenance_work_orders_tenant_ticket_fk"
FOREIGN KEY ("tenant_id", "service_ticket_id")
REFERENCES "public"."service_tickets"("tenant_id", "id")
ON DELETE restrict
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_work_orders"
ADD CONSTRAINT "maintenance_work_orders_tenant_assignee_fk"
FOREIGN KEY ("tenant_id", "assigned_to_user_id")
REFERENCES "public"."tenant_users"("tenant_id", "user_id")
ON DELETE restrict
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_work_orders"
ADD CONSTRAINT "maintenance_work_orders_tenant_creator_fk"
FOREIGN KEY ("tenant_id", "created_by_user_id")
REFERENCES "public"."tenant_users"("tenant_id", "user_id")
ON DELETE restrict
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_work_orders"
ADD CONSTRAINT "maintenance_work_orders_type_ck"
CHECK (
  "maintenance_type" IN (
    'preventive',
    'corrective',
    'predictive',
    'inspection'
  )
);
--> statement-breakpoint

ALTER TABLE "maintenance_work_orders"
ADD CONSTRAINT "maintenance_work_orders_status_ck"
CHECK (
  "status" IN (
    'planned',
    'in_progress',
    'completed',
    'cancelled'
  )
);
--> statement-breakpoint

ALTER TABLE "maintenance_work_orders"
ADD CONSTRAINT "maintenance_work_orders_schedule_ck"
CHECK (
  "scheduled_end_at" IS NULL
  OR "scheduled_start_at" IS NULL
  OR "scheduled_end_at" >= "scheduled_start_at"
);
--> statement-breakpoint

ALTER TABLE "maintenance_work_orders"
ADD CONSTRAINT "maintenance_work_orders_execution_ck"
CHECK (
  "completed_at" IS NULL
  OR "started_at" IS NULL
  OR "completed_at" >= "started_at"
);
--> statement-breakpoint

CREATE UNIQUE INDEX "maintenance_work_orders_tenant_number_uq"
ON "maintenance_work_orders" ("tenant_id", "work_order_number");
--> statement-breakpoint

CREATE INDEX "maintenance_work_orders_tenant_status_idx"
ON "maintenance_work_orders" ("tenant_id", "status", "scheduled_start_at");
--> statement-breakpoint

CREATE INDEX "maintenance_work_orders_branch_idx"
ON "maintenance_work_orders" ("tenant_id", "branch_id", "scheduled_start_at");
--> statement-breakpoint

CREATE INDEX "maintenance_work_orders_policy_idx"
ON "maintenance_work_orders" ("tenant_id", "policy_id")
WHERE "policy_id" IS NOT NULL;
--> statement-breakpoint

CREATE INDEX "maintenance_work_orders_ticket_idx"
ON "maintenance_work_orders" ("tenant_id", "service_ticket_id")
WHERE "service_ticket_id" IS NOT NULL;
--> statement-breakpoint

CREATE TABLE "maintenance_work_order_assets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "work_order_id" uuid NOT NULL,
  "asset_id" uuid NOT NULL,
  "sequence_no" integer DEFAULT 0 NOT NULL,
  "status" varchar(32) DEFAULT 'pending' NOT NULL,
  "condition_before" varchar(32),
  "condition_after" varchar(32),
  "inspection_notes" text,
  "work_performed" text,
  "result_notes" text,
  "inspected_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "maintenance_work_order_assets_tenant_id_id_uq"
    UNIQUE ("tenant_id", "id")
);
--> statement-breakpoint

ALTER TABLE "maintenance_work_order_assets"
ADD CONSTRAINT "maintenance_work_order_assets_tenant_work_order_fk"
FOREIGN KEY ("tenant_id", "work_order_id")
REFERENCES "public"."maintenance_work_orders"("tenant_id", "id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_work_order_assets"
ADD CONSTRAINT "maintenance_work_order_assets_tenant_asset_fk"
FOREIGN KEY ("tenant_id", "asset_id")
REFERENCES "public"."assets"("tenant_id", "id")
ON DELETE restrict
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_work_order_assets"
ADD CONSTRAINT "maintenance_work_order_assets_status_ck"
CHECK (
  "status" IN (
    'pending',
    'inspected',
    'work_required',
    'completed',
    'not_accessible',
    'not_applicable'
  )
);
--> statement-breakpoint

ALTER TABLE "maintenance_work_order_assets"
ADD CONSTRAINT "maintenance_work_order_assets_condition_before_ck"
CHECK (
  "condition_before" IS NULL
  OR "condition_before" IN (
    'good',
    'degraded',
    'failed',
    'unknown'
  )
);
--> statement-breakpoint

ALTER TABLE "maintenance_work_order_assets"
ADD CONSTRAINT "maintenance_work_order_assets_condition_after_ck"
CHECK (
  "condition_after" IS NULL
  OR "condition_after" IN (
    'good',
    'degraded',
    'failed',
    'unknown'
  )
);
--> statement-breakpoint

CREATE UNIQUE INDEX "maintenance_work_order_assets_order_asset_uq"
ON "maintenance_work_order_assets" (
  "tenant_id",
  "work_order_id",
  "asset_id"
);
--> statement-breakpoint

CREATE INDEX "maintenance_work_order_assets_asset_idx"
ON "maintenance_work_order_assets" (
  "tenant_id",
  "asset_id",
  "created_at" DESC
);
--> statement-breakpoint

CREATE INDEX "maintenance_work_order_assets_status_idx"
ON "maintenance_work_order_assets" (
  "tenant_id",
  "work_order_id",
  "status"
);
--> statement-breakpoint

CREATE TABLE "maintenance_findings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "work_order_id" uuid NOT NULL,
  "work_order_asset_id" uuid,
  "asset_id" uuid,
  "finding_code" varchar(64),
  "title" varchar(255) NOT NULL,
  "description" text NOT NULL,
  "category" varchar(64),
  "severity" varchar(16) DEFAULT 'medium' NOT NULL,
  "status" varchar(32) DEFAULT 'open' NOT NULL,
  "diagnosis" text,
  "recommendation" text,
  "requires_follow_up" boolean DEFAULT false NOT NULL,
  "requires_capex" boolean DEFAULT false NOT NULL,
  "reported_at" timestamp with time zone DEFAULT now() NOT NULL,
  "resolved_at" timestamp with time zone,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "maintenance_findings_tenant_id_id_uq"
    UNIQUE ("tenant_id", "id")
);
--> statement-breakpoint

ALTER TABLE "maintenance_findings"
ADD CONSTRAINT "maintenance_findings_tenant_work_order_fk"
FOREIGN KEY ("tenant_id", "work_order_id")
REFERENCES "public"."maintenance_work_orders"("tenant_id", "id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_findings"
ADD CONSTRAINT "maintenance_findings_tenant_order_asset_fk"
FOREIGN KEY ("tenant_id", "work_order_asset_id")
REFERENCES "public"."maintenance_work_order_assets"("tenant_id", "id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_findings"
ADD CONSTRAINT "maintenance_findings_tenant_asset_fk"
FOREIGN KEY ("tenant_id", "asset_id")
REFERENCES "public"."assets"("tenant_id", "id")
ON DELETE restrict
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_findings"
ADD CONSTRAINT "maintenance_findings_severity_ck"
CHECK (
  "severity" IN (
    'low',
    'medium',
    'high',
    'critical'
  )
);
--> statement-breakpoint

ALTER TABLE "maintenance_findings"
ADD CONSTRAINT "maintenance_findings_status_ck"
CHECK (
  "status" IN (
    'open',
    'monitoring',
    'resolved',
    'accepted_risk',
    'cancelled'
  )
);
--> statement-breakpoint

CREATE INDEX "maintenance_findings_order_idx"
ON "maintenance_findings" (
  "tenant_id",
  "work_order_id",
  "severity",
  "status"
);
--> statement-breakpoint

CREATE INDEX "maintenance_findings_asset_idx"
ON "maintenance_findings" (
  "tenant_id",
  "asset_id",
  "created_at" DESC
)
WHERE "asset_id" IS NOT NULL;
--> statement-breakpoint

CREATE TABLE "maintenance_actions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "work_order_id" uuid NOT NULL,
  "work_order_asset_id" uuid,
  "finding_id" uuid,
  "action_type" varchar(32) DEFAULT 'corrective' NOT NULL,
  "description" text NOT NULL,
  "result" text,
  "status" varchar(32) DEFAULT 'completed' NOT NULL,
  "performed_by_user_id" uuid,
  "performed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "follow_up_due_at" timestamp with time zone,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "maintenance_actions_tenant_id_id_uq"
    UNIQUE ("tenant_id", "id")
);
--> statement-breakpoint

ALTER TABLE "maintenance_actions"
ADD CONSTRAINT "maintenance_actions_tenant_work_order_fk"
FOREIGN KEY ("tenant_id", "work_order_id")
REFERENCES "public"."maintenance_work_orders"("tenant_id", "id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_actions"
ADD CONSTRAINT "maintenance_actions_tenant_order_asset_fk"
FOREIGN KEY ("tenant_id", "work_order_asset_id")
REFERENCES "public"."maintenance_work_order_assets"("tenant_id", "id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_actions"
ADD CONSTRAINT "maintenance_actions_tenant_finding_fk"
FOREIGN KEY ("tenant_id", "finding_id")
REFERENCES "public"."maintenance_findings"("tenant_id", "id")
ON DELETE set null
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_actions"
ADD CONSTRAINT "maintenance_actions_tenant_performer_fk"
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
    'preventive',
    'corrective',
    'replacement',
    'configuration',
    'recommendation'
  )
);
--> statement-breakpoint

ALTER TABLE "maintenance_actions"
ADD CONSTRAINT "maintenance_actions_status_ck"
CHECK (
  "status" IN (
    'planned',
    'in_progress',
    'completed',
    'cancelled'
  )
);
--> statement-breakpoint

CREATE INDEX "maintenance_actions_order_idx"
ON "maintenance_actions" (
  "tenant_id",
  "work_order_id",
  "performed_at" DESC
);
--> statement-breakpoint

CREATE INDEX "maintenance_actions_finding_idx"
ON "maintenance_actions" (
  "tenant_id",
  "finding_id"
)
WHERE "finding_id" IS NOT NULL;
--> statement-breakpoint

CREATE TABLE "maintenance_evidence" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "work_order_id" uuid NOT NULL,
  "work_order_asset_id" uuid,
  "finding_id" uuid,
  "action_id" uuid,
  "evidence_stage" varchar(16) DEFAULT 'other' NOT NULL,
  "evidence_type" varchar(32) DEFAULT 'photo' NOT NULL,
  "storage_key" text NOT NULL,
  "original_filename" varchar(512),
  "mime_type" varchar(128),
  "checksum" varchar(128),
  "caption" text,
  "captured_at" timestamp with time zone,
  "captured_by_user_id" uuid,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "maintenance_evidence_tenant_id_id_uq"
    UNIQUE ("tenant_id", "id")
);
--> statement-breakpoint

ALTER TABLE "maintenance_evidence"
ADD CONSTRAINT "maintenance_evidence_tenant_work_order_fk"
FOREIGN KEY ("tenant_id", "work_order_id")
REFERENCES "public"."maintenance_work_orders"("tenant_id", "id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_evidence"
ADD CONSTRAINT "maintenance_evidence_tenant_order_asset_fk"
FOREIGN KEY ("tenant_id", "work_order_asset_id")
REFERENCES "public"."maintenance_work_order_assets"("tenant_id", "id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_evidence"
ADD CONSTRAINT "maintenance_evidence_tenant_finding_fk"
FOREIGN KEY ("tenant_id", "finding_id")
REFERENCES "public"."maintenance_findings"("tenant_id", "id")
ON DELETE set null
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_evidence"
ADD CONSTRAINT "maintenance_evidence_tenant_action_fk"
FOREIGN KEY ("tenant_id", "action_id")
REFERENCES "public"."maintenance_actions"("tenant_id", "id")
ON DELETE set null
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_evidence"
ADD CONSTRAINT "maintenance_evidence_tenant_capture_user_fk"
FOREIGN KEY ("tenant_id", "captured_by_user_id")
REFERENCES "public"."tenant_users"("tenant_id", "user_id")
ON DELETE restrict
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_evidence"
ADD CONSTRAINT "maintenance_evidence_stage_ck"
CHECK (
  "evidence_stage" IN (
    'before',
    'during',
    'after',
    'diagnostic',
    'other'
  )
);
--> statement-breakpoint

ALTER TABLE "maintenance_evidence"
ADD CONSTRAINT "maintenance_evidence_type_ck"
CHECK (
  "evidence_type" IN (
    'photo',
    'document',
    'measurement',
    'signature',
    'other'
  )
);
--> statement-breakpoint

CREATE INDEX "maintenance_evidence_order_asset_idx"
ON "maintenance_evidence" (
  "tenant_id",
  "work_order_id",
  "work_order_asset_id",
  "evidence_stage",
  "sort_order",
  "created_at"
);
--> statement-breakpoint

CREATE INDEX "maintenance_evidence_finding_idx"
ON "maintenance_evidence" (
  "tenant_id",
  "finding_id"
)
WHERE "finding_id" IS NOT NULL;
--> statement-breakpoint

CREATE INDEX "maintenance_evidence_action_idx"
ON "maintenance_evidence" (
  "tenant_id",
  "action_id"
)
WHERE "action_id" IS NOT NULL;
--> statement-breakpoint

ALTER TABLE "maintenance_work_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "maintenance_work_orders" FORCE ROW LEVEL SECURITY;
CREATE POLICY "maintenance_work_orders_tenant_isolation"
ON "maintenance_work_orders"
FOR ALL TO horos_runtime
USING (
  "tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
)
WITH CHECK (
  "tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
);
--> statement-breakpoint

ALTER TABLE "maintenance_work_order_assets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "maintenance_work_order_assets" FORCE ROW LEVEL SECURITY;
CREATE POLICY "maintenance_work_order_assets_tenant_isolation"
ON "maintenance_work_order_assets"
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

REVOKE ALL ON TABLE "maintenance_work_orders" FROM horos_runtime;
REVOKE ALL ON TABLE "maintenance_work_order_assets" FROM horos_runtime;
REVOKE ALL ON TABLE "maintenance_findings" FROM horos_runtime;
REVOKE ALL ON TABLE "maintenance_actions" FROM horos_runtime;
REVOKE ALL ON TABLE "maintenance_evidence" FROM horos_runtime;
--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE "maintenance_work_orders"
TO horos_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE "maintenance_work_order_assets"
TO horos_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE "maintenance_findings"
TO horos_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE "maintenance_actions"
TO horos_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE "maintenance_evidence"
TO horos_runtime;
