-- ============================================================================
-- HOROS APP-010A
-- Canonical maintenance work orders + digital technical memory foundation
-- ============================================================================

-- Exact assets covered by a service policy.
CREATE TABLE "service_policy_assets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "policy_id" uuid NOT NULL,
  "asset_id" uuid NOT NULL,
  "coverage_status" varchar(24) DEFAULT 'included' NOT NULL,
  "coverage_notes" text,
  "effective_from" date,
  "effective_to" date,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "service_policy_assets_tenant_id_id_uq"
    UNIQUE ("tenant_id", "id")
);
--> statement-breakpoint

ALTER TABLE "service_policy_assets"
ADD CONSTRAINT "service_policy_assets_tenant_fk"
FOREIGN KEY ("tenant_id")
REFERENCES "public"."tenants"("id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "service_policy_assets"
ADD CONSTRAINT "service_policy_assets_tenant_policy_fk"
FOREIGN KEY ("tenant_id", "policy_id")
REFERENCES "public"."service_policies"("tenant_id", "id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "service_policy_assets"
ADD CONSTRAINT "service_policy_assets_tenant_asset_fk"
FOREIGN KEY ("tenant_id", "asset_id")
REFERENCES "public"."assets"("tenant_id", "id")
ON DELETE restrict
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "service_policy_assets"
ADD CONSTRAINT "service_policy_assets_status_ck"
CHECK (
  "coverage_status" IN (
    'included',
    'excluded',
    'suspended'
  )
);
--> statement-breakpoint

ALTER TABLE "service_policy_assets"
ADD CONSTRAINT "service_policy_assets_dates_ck"
CHECK (
  "effective_to" IS NULL
  OR "effective_from" IS NULL
  OR "effective_to" >= "effective_from"
);
--> statement-breakpoint

CREATE UNIQUE INDEX "service_policy_assets_policy_asset_uq"
ON "service_policy_assets" (
  "tenant_id",
  "policy_id",
  "asset_id"
);
--> statement-breakpoint

CREATE INDEX "service_policy_assets_asset_idx"
ON "service_policy_assets" (
  "tenant_id",
  "asset_id",
  "coverage_status"
);
--> statement-breakpoint

-- Maintenance execution header.
CREATE TABLE "maintenance_work_orders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "branch_id" uuid NOT NULL,
  "policy_id" uuid,
  "service_ticket_id" uuid,
  "branch_system_id" uuid,
  "work_order_number" varchar(64) NOT NULL,
  "title" varchar(255) NOT NULL,
  "maintenance_type" varchar(24) DEFAULT 'preventive' NOT NULL,
  "status" varchar(24) DEFAULT 'draft' NOT NULL,
  "objective" text,
  "scheduled_start" timestamp with time zone,
  "scheduled_end" timestamp with time zone,
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "assigned_to_user_id" uuid,
  "created_by_user_id" uuid,
  "customer_contact_name" varchar(255),
  "summary" text,
  "general_findings" text,
  "corrective_actions" text,
  "recommendations" text,
  "customer_accepted_at" timestamp with time zone,
  "customer_acceptance_notes" text,
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
ADD CONSTRAINT "maintenance_work_orders_tenant_policy_fk"
FOREIGN KEY ("tenant_id", "policy_id")
REFERENCES "public"."service_policies"("tenant_id", "id")
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
ADD CONSTRAINT "maintenance_work_orders_tenant_system_fk"
FOREIGN KEY ("tenant_id", "branch_system_id")
REFERENCES "public"."branch_systems"("tenant_id", "id")
ON DELETE restrict
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_work_orders"
ADD CONSTRAINT "maintenance_work_orders_assignee_fk"
FOREIGN KEY ("assigned_to_user_id")
REFERENCES "public"."users"("id")
ON DELETE set null
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_work_orders"
ADD CONSTRAINT "maintenance_work_orders_creator_fk"
FOREIGN KEY ("created_by_user_id")
REFERENCES "public"."users"("id")
ON DELETE set null
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
    'draft',
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
  "scheduled_end" IS NULL
  OR "scheduled_start" IS NULL
  OR "scheduled_end" >= "scheduled_start"
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
ON "maintenance_work_orders" (
  "tenant_id",
  "work_order_number"
);
--> statement-breakpoint

CREATE INDEX "maintenance_work_orders_status_idx"
ON "maintenance_work_orders" (
  "tenant_id",
  "status",
  "scheduled_start"
);
--> statement-breakpoint

CREATE INDEX "maintenance_work_orders_policy_idx"
ON "maintenance_work_orders" (
  "tenant_id",
  "policy_id",
  "created_at" DESC
);
--> statement-breakpoint

-- Assets actually planned/inspected/serviced in one execution.
CREATE TABLE "maintenance_work_order_assets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "work_order_id" uuid NOT NULL,
  "asset_id" uuid NOT NULL,
  "sequence" integer DEFAULT 0 NOT NULL,
  "status" varchar(32) DEFAULT 'pending' NOT NULL,
  "condition_before" text,
  "condition_after" text,
  "work_performed" text,
  "technician_notes" text,
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "maintenance_work_order_assets_tenant_id_id_uq"
    UNIQUE ("tenant_id", "id"),
  CONSTRAINT "maintenance_work_order_assets_tenant_order_id_uq"
    UNIQUE ("tenant_id", "work_order_id", "id")
);
--> statement-breakpoint

ALTER TABLE "maintenance_work_order_assets"
ADD CONSTRAINT "maintenance_work_order_assets_tenant_fk"
FOREIGN KEY ("tenant_id")
REFERENCES "public"."tenants"("id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_work_order_assets"
ADD CONSTRAINT "maintenance_work_order_assets_tenant_order_fk"
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
    'serviced',
    'skipped',
    'follow_up_required'
  )
);
--> statement-breakpoint

ALTER TABLE "maintenance_work_order_assets"
ADD CONSTRAINT "maintenance_work_order_assets_execution_ck"
CHECK (
  "completed_at" IS NULL
  OR "started_at" IS NULL
  OR "completed_at" >= "started_at"
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

-- Structured technical findings. Can be order-level or asset-level.
CREATE TABLE "maintenance_findings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "work_order_id" uuid NOT NULL,
  "work_order_asset_id" uuid,
  "finding_type" varchar(32) DEFAULT 'anomaly' NOT NULL,
  "severity" varchar(16) DEFAULT 'medium' NOT NULL,
  "status" varchar(24) DEFAULT 'open' NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text,
  "diagnosis" text,
  "action_taken" text,
  "recommendation" text,
  "requires_follow_up" boolean DEFAULT false NOT NULL,
  "capex_recommended" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "maintenance_findings_tenant_id_id_uq"
    UNIQUE ("tenant_id", "id"),
  CONSTRAINT "maintenance_findings_tenant_order_id_uq"
    UNIQUE ("tenant_id", "work_order_id", "id")
);
--> statement-breakpoint

ALTER TABLE "maintenance_findings"
ADD CONSTRAINT "maintenance_findings_tenant_fk"
FOREIGN KEY ("tenant_id")
REFERENCES "public"."tenants"("id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_findings"
ADD CONSTRAINT "maintenance_findings_tenant_order_fk"
FOREIGN KEY ("tenant_id", "work_order_id")
REFERENCES "public"."maintenance_work_orders"("tenant_id", "id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_findings"
ADD CONSTRAINT "maintenance_findings_tenant_order_asset_fk"
FOREIGN KEY ("tenant_id", "work_order_id", "work_order_asset_id")
REFERENCES "public"."maintenance_work_order_assets"(
  "tenant_id",
  "work_order_id",
  "id"
)
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_findings"
ADD CONSTRAINT "maintenance_findings_type_ck"
CHECK (
  "finding_type" IN (
    'anomaly',
    'damage',
    'degradation',
    'configuration',
    'recommendation',
    'other'
  )
);
--> statement-breakpoint

ALTER TABLE "maintenance_findings"
ADD CONSTRAINT "maintenance_findings_severity_ck"
CHECK (
  "severity" IN (
    'info',
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
    'resolved',
    'monitor',
    'recommended'
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

-- Before / during / after evidence and supporting documents.
CREATE TABLE "maintenance_evidence" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "work_order_id" uuid NOT NULL,
  "work_order_asset_id" uuid,
  "finding_id" uuid,
  "evidence_phase" varchar(16) DEFAULT 'general' NOT NULL,
  "media_type" varchar(24) DEFAULT 'photo' NOT NULL,
  "file_name" varchar(255) NOT NULL,
  "mime_type" varchar(128),
  "storage_key" varchar(1024) NOT NULL,
  "file_url" text,
  "caption" text,
  "taken_at" timestamp with time zone,
  "uploaded_by_user_id" uuid,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "maintenance_evidence_tenant_id_id_uq"
    UNIQUE ("tenant_id", "id")
);
--> statement-breakpoint

ALTER TABLE "maintenance_evidence"
ADD CONSTRAINT "maintenance_evidence_tenant_fk"
FOREIGN KEY ("tenant_id")
REFERENCES "public"."tenants"("id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_evidence"
ADD CONSTRAINT "maintenance_evidence_tenant_order_fk"
FOREIGN KEY ("tenant_id", "work_order_id")
REFERENCES "public"."maintenance_work_orders"("tenant_id", "id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_evidence"
ADD CONSTRAINT "maintenance_evidence_tenant_order_asset_fk"
FOREIGN KEY ("tenant_id", "work_order_id", "work_order_asset_id")
REFERENCES "public"."maintenance_work_order_assets"(
  "tenant_id",
  "work_order_id",
  "id"
)
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_evidence"
ADD CONSTRAINT "maintenance_evidence_tenant_order_finding_fk"
FOREIGN KEY ("tenant_id", "work_order_id", "finding_id")
REFERENCES "public"."maintenance_findings"(
  "tenant_id",
  "work_order_id",
  "id"
)
ON DELETE set null
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_evidence"
ADD CONSTRAINT "maintenance_evidence_uploader_fk"
FOREIGN KEY ("uploaded_by_user_id")
REFERENCES "public"."users"("id")
ON DELETE set null
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_evidence"
ADD CONSTRAINT "maintenance_evidence_phase_ck"
CHECK (
  "evidence_phase" IN (
    'before',
    'during',
    'after',
    'general'
  )
);
--> statement-breakpoint

ALTER TABLE "maintenance_evidence"
ADD CONSTRAINT "maintenance_evidence_media_ck"
CHECK (
  "media_type" IN (
    'photo',
    'document',
    'signature'
  )
);
--> statement-breakpoint

CREATE INDEX "maintenance_evidence_order_asset_idx"
ON "maintenance_evidence" (
  "tenant_id",
  "work_order_id",
  "work_order_asset_id",
  "evidence_phase",
  "sort_order"
);
--> statement-breakpoint

-- Immutable operational ledger for the work order.
CREATE TABLE "maintenance_work_order_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "work_order_id" uuid NOT NULL,
  "event_type" varchar(48) NOT NULL,
  "actor_user_id" uuid,
  "actor_name" varchar(255),
  "message" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "maintenance_work_order_events_tenant_id_id_uq"
    UNIQUE ("tenant_id", "id")
);
--> statement-breakpoint

ALTER TABLE "maintenance_work_order_events"
ADD CONSTRAINT "maintenance_work_order_events_tenant_fk"
FOREIGN KEY ("tenant_id")
REFERENCES "public"."tenants"("id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_work_order_events"
ADD CONSTRAINT "maintenance_work_order_events_tenant_order_fk"
FOREIGN KEY ("tenant_id", "work_order_id")
REFERENCES "public"."maintenance_work_orders"("tenant_id", "id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_work_order_events"
ADD CONSTRAINT "maintenance_work_order_events_actor_fk"
FOREIGN KEY ("actor_user_id")
REFERENCES "public"."users"("id")
ON DELETE set null
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "maintenance_work_order_events"
ADD CONSTRAINT "maintenance_work_order_events_type_ck"
CHECK (
  "event_type" IN (
    'created',
    'planned',
    'started',
    'asset_added',
    'asset_updated',
    'finding_added',
    'evidence_added',
    'completed',
    'cancelled',
    'customer_accepted'
  )
);
--> statement-breakpoint

CREATE INDEX "maintenance_work_order_events_order_created_idx"
ON "maintenance_work_order_events" (
  "tenant_id",
  "work_order_id",
  "created_at",
  "id"
);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Tenant isolation. All new tenant-owned tables are FORCE RLS.
-- ---------------------------------------------------------------------------
ALTER TABLE "service_policy_assets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "service_policy_assets" FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_policy_assets_tenant_isolation"
ON "service_policy_assets"
FOR ALL TO horos_runtime
USING (
  "tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
)
WITH CHECK (
  "tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
);
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

ALTER TABLE "maintenance_work_order_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "maintenance_work_order_events" FORCE ROW LEVEL SECURITY;
CREATE POLICY "maintenance_work_order_events_tenant_isolation"
ON "maintenance_work_order_events"
FOR ALL TO horos_runtime
USING (
  "tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
)
WITH CHECK (
  "tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
);
--> statement-breakpoint

-- Least-privilege runtime grants.
REVOKE ALL ON TABLE "service_policy_assets" FROM horos_runtime;
REVOKE ALL ON TABLE "maintenance_work_orders" FROM horos_runtime;
REVOKE ALL ON TABLE "maintenance_work_order_assets" FROM horos_runtime;
REVOKE ALL ON TABLE "maintenance_findings" FROM horos_runtime;
REVOKE ALL ON TABLE "maintenance_evidence" FROM horos_runtime;
REVOKE ALL ON TABLE "maintenance_work_order_events" FROM horos_runtime;
--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE "service_policy_assets"
TO horos_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE "maintenance_work_orders"
TO horos_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE "maintenance_work_order_assets"
TO horos_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE "maintenance_findings"
TO horos_runtime;
GRANT SELECT, INSERT, DELETE
ON TABLE "maintenance_evidence"
TO horos_runtime;
GRANT SELECT, INSERT
ON TABLE "maintenance_work_order_events"
TO horos_runtime;
