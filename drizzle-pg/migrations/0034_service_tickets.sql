CREATE TABLE "service_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"asset_id" uuid,
	"ticket_number" varchar(64) NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"operational_status" varchar(32) DEFAULT 'open' NOT NULL,
	"contractual_status" varchar(32) DEFAULT 'pending_approval' NOT NULL,
	"priority" varchar(16) DEFAULT 'medium' NOT NULL,
	"category" varchar(32) DEFAULT 'corrective' NOT NULL,
	"response_deadline" timestamp with time zone,
	"resolution_deadline" timestamp with time zone,
	"responded_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"estimated_cost" numeric(14, 2),
	"actual_cost" numeric(14, 2),
	"is_billable" boolean DEFAULT false NOT NULL,
	"notes" text,
	"sla_tier" varchar(16),
	"sla_deadline_hours" integer,
	"evidence_image_url" text,
	"evidence_image_key" varchar(500),
	"resolution_notes" text,
	"resolution_evidence_urls" jsonb,
	"resolution_signature_url" text,
	"resolution_report_url" text,
	"resolution_report_key" varchar(500),
	"resolved_by_name" varchar(255),
	"notification_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_tickets_tenant_id_id_uq" UNIQUE("tenant_id","id")
);
--> statement-breakpoint
ALTER TABLE "service_tickets" ADD CONSTRAINT "service_tickets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_tickets" ADD CONSTRAINT "service_tickets_tenant_branch_fk" FOREIGN KEY ("tenant_id","branch_id") REFERENCES "public"."branches"("tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_tickets" ADD CONSTRAINT "service_tickets_tenant_asset_fk" FOREIGN KEY ("tenant_id","asset_id") REFERENCES "public"."assets"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "service_tickets_tenant_ticket_number_uq" ON "service_tickets" USING btree ("tenant_id","ticket_number");--> statement-breakpoint
CREATE INDEX "service_tickets_tenant_idx" ON "service_tickets" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "service_tickets_branch_idx" ON "service_tickets" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "service_tickets_asset_idx" ON "service_tickets" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "service_tickets_operational_status_idx" ON "service_tickets" USING btree ("operational_status");--> statement-breakpoint
CREATE INDEX "service_tickets_created_at_idx" ON "service_tickets" USING btree ("created_at");
--> statement-breakpoint

ALTER TABLE "service_tickets"
ADD CONSTRAINT "service_tickets_operational_status_ck"
CHECK (
  "operational_status" IN (
    'open',
    'assigned',
    'in_progress',
    'pending',
    'resolved',
    'closed',
    'cancelled'
  )
);

--> statement-breakpoint

ALTER TABLE "service_tickets"
ADD CONSTRAINT "service_tickets_contractual_status_ck"
CHECK (
  "contractual_status" IN (
    'pending_approval',
    'approved',
    'rejected',
    'not_required'
  )
);

--> statement-breakpoint

ALTER TABLE "service_tickets"
ADD CONSTRAINT "service_tickets_priority_ck"
CHECK (
  "priority" IN (
    'critical',
    'high',
    'medium',
    'low'
  )
);

--> statement-breakpoint

ALTER TABLE "service_tickets"
ADD CONSTRAINT "service_tickets_category_ck"
CHECK (
  "category" IN (
    'corrective',
    'preventive',
    'incident',
    'service_request',
    'inspection',
    'other'
  )
);

--> statement-breakpoint

ALTER TABLE "service_tickets"
ADD CONSTRAINT "service_tickets_estimated_cost_ck"
CHECK (
  "estimated_cost" IS NULL
  OR "estimated_cost" >= 0
);

--> statement-breakpoint

ALTER TABLE "service_tickets"
ADD CONSTRAINT "service_tickets_actual_cost_ck"
CHECK (
  "actual_cost" IS NULL
  OR "actual_cost" >= 0
);

--> statement-breakpoint

ALTER TABLE "service_tickets"
ADD CONSTRAINT "service_tickets_sla_deadline_hours_ck"
CHECK (
  "sla_deadline_hours" IS NULL
  OR "sla_deadline_hours" > 0
);

--> statement-breakpoint

ALTER TABLE "service_tickets"
ADD CONSTRAINT "service_tickets_resolution_after_response_ck"
CHECK (
  "resolved_at" IS NULL
  OR "responded_at" IS NULL
  OR "resolved_at" >= "responded_at"
);

--> statement-breakpoint

ALTER TABLE "service_tickets"
ADD CONSTRAINT "service_tickets_closed_after_resolution_ck"
CHECK (
  "closed_at" IS NULL
  OR "resolved_at" IS NULL
  OR "closed_at" >= "resolved_at"
);

--> statement-breakpoint

ALTER TABLE "service_tickets"
ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint

ALTER TABLE "service_tickets"
FORCE ROW LEVEL SECURITY;

--> statement-breakpoint

CREATE POLICY "service_tickets_tenant_isolation"
ON "service_tickets"
FOR ALL
TO horos_runtime
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

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE "service_tickets"
TO horos_runtime;
