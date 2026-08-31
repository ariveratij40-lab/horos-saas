CREATE TABLE "service_request_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"service_request_id" uuid NOT NULL,
	"attachment_type" varchar(32) DEFAULT 'document' NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"mime_type" varchar(128),
	"file_size" integer,
	"storage_key" varchar(1024) NOT NULL,
	"file_url" text,
	"description" text,
	"uploaded_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_request_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"service_request_id" uuid NOT NULL,
	"event_type" varchar(48) NOT NULL,
	"actor_user_id" uuid,
	"actor_name" varchar(255),
	"message" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_request_ticket_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"service_request_id" uuid NOT NULL,
	"service_ticket_id" uuid NOT NULL,
	"relation_type" varchar(32) DEFAULT 'converted' NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"request_number" varchar(64) NOT NULL,
	"request_type" varchar(40) NOT NULL,
	"status" varchar(32) DEFAULT 'draft' NOT NULL,
	"requested_by_user_id" uuid,
	"requester_name" varchar(255) NOT NULL,
	"requester_email" varchar(320),
	"requester_phone" varchar(64),
	"branch_id" uuid,
	"branch_system_id" uuid,
	"asset_id" uuid,
	"department_id" uuid,
	"title" varchar(255) NOT NULL,
	"description" text,
	"desired_date" date,
	"desired_start_time" time,
	"desired_end_time" time,
	"remote_allowed" boolean,
	"access_requirements" text,
	"safety_requirements" text,
	"personnel_requirements" text,
	"certification_requirements" text,
	"equipment_requirements" text,
	"tool_requirements" text,
	"clarity_status" varchar(32) DEFAULT 'not_evaluated' NOT NULL,
	"clarity_score" integer,
	"clarity_summary" text,
	"missing_information" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"requester_confirmed_at" timestamp with time zone,
	"commercial_status" varchar(32) DEFAULT 'not_required' NOT NULL,
	"estimated_amount" numeric(14, 2),
	"quoted_at" timestamp with time zone,
	"authorized_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"rejection_reason" text,
	"submitted_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_requests_tenant_id_id_uq" UNIQUE("tenant_id","id")
);
--> statement-breakpoint
ALTER TABLE "service_request_attachments" ADD CONSTRAINT "service_request_attachments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_request_attachments" ADD CONSTRAINT "service_request_attachments_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_request_attachments" ADD CONSTRAINT "service_request_attachments_tenant_request_fk" FOREIGN KEY ("tenant_id","service_request_id") REFERENCES "public"."service_requests"("tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_request_events" ADD CONSTRAINT "service_request_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_request_events" ADD CONSTRAINT "service_request_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_request_events" ADD CONSTRAINT "service_request_events_tenant_request_fk" FOREIGN KEY ("tenant_id","service_request_id") REFERENCES "public"."service_requests"("tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_request_ticket_links" ADD CONSTRAINT "service_request_ticket_links_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_request_ticket_links" ADD CONSTRAINT "service_request_ticket_links_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_request_ticket_links" ADD CONSTRAINT "service_request_ticket_links_tenant_request_fk" FOREIGN KEY ("tenant_id","service_request_id") REFERENCES "public"."service_requests"("tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_request_ticket_links" ADD CONSTRAINT "service_request_ticket_links_tenant_ticket_fk" FOREIGN KEY ("tenant_id","service_ticket_id") REFERENCES "public"."service_tickets"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_tenant_branch_fk" FOREIGN KEY ("tenant_id","branch_id") REFERENCES "public"."branches"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_tenant_system_fk" FOREIGN KEY ("tenant_id","branch_system_id") REFERENCES "public"."branch_systems"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_tenant_asset_fk" FOREIGN KEY ("tenant_id","asset_id") REFERENCES "public"."assets"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_tenant_department_fk" FOREIGN KEY ("tenant_id","department_id") REFERENCES "public"."departments"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "service_request_attachments_request_idx" ON "service_request_attachments" USING btree ("tenant_id","service_request_id");--> statement-breakpoint
CREATE INDEX "service_request_events_request_created_idx" ON "service_request_events" USING btree ("tenant_id","service_request_id","created_at");--> statement-breakpoint
CREATE INDEX "service_request_events_type_idx" ON "service_request_events" USING btree ("tenant_id","event_type");--> statement-breakpoint
CREATE UNIQUE INDEX "service_request_ticket_links_request_ticket_uq" ON "service_request_ticket_links" USING btree ("tenant_id","service_request_id","service_ticket_id");--> statement-breakpoint
CREATE INDEX "service_request_ticket_links_request_idx" ON "service_request_ticket_links" USING btree ("tenant_id","service_request_id");--> statement-breakpoint
CREATE INDEX "service_request_ticket_links_ticket_idx" ON "service_request_ticket_links" USING btree ("tenant_id","service_ticket_id");--> statement-breakpoint
CREATE UNIQUE INDEX "service_requests_tenant_number_uq" ON "service_requests" USING btree ("tenant_id","request_number");--> statement-breakpoint
CREATE INDEX "service_requests_tenant_status_idx" ON "service_requests" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "service_requests_tenant_type_idx" ON "service_requests" USING btree ("tenant_id","request_type");--> statement-breakpoint
CREATE INDEX "service_requests_tenant_branch_idx" ON "service_requests" USING btree ("tenant_id","branch_id");--> statement-breakpoint
CREATE INDEX "service_requests_created_at_idx" ON "service_requests" USING btree ("tenant_id","created_at");

-- ============================================================================
-- HOROS APP-007D.2B HARDENING
-- Canonical Service Intake
-- ============================================================================

-- ---------------------------------------------------------------------------
-- service_requests domain checks
-- ---------------------------------------------------------------------------

ALTER TABLE "service_requests"
ADD CONSTRAINT "service_requests_request_type_check"
CHECK (
  "request_type" IN (
    'service_attention',
    'meeting',
    'event_service',
    'infrastructure_assessment',
    'inventory_capture',
    'other'
  )
);

ALTER TABLE "service_requests"
ADD CONSTRAINT "service_requests_status_check"
CHECK (
  "status" IN (
    'draft',
    'submitted',
    'needs_information',
    'ready_for_review',
    'under_review',
    'completed',
    'cancelled',
    'rejected'
  )
);

ALTER TABLE "service_requests"
ADD CONSTRAINT "service_requests_clarity_status_check"
CHECK (
  "clarity_status" IN (
    'not_evaluated',
    'incomplete',
    'needs_clarification',
    'sufficient',
    'confirmed'
  )
);

ALTER TABLE "service_requests"
ADD CONSTRAINT "service_requests_commercial_status_check"
CHECK (
  "commercial_status" IN (
    'not_required',
    'pending_quote',
    'quoted',
    'pending_authorization',
    'authorized',
    'rejected'
  )
);

ALTER TABLE "service_requests"
ADD CONSTRAINT "service_requests_clarity_score_check"
CHECK (
  "clarity_score" IS NULL
  OR (
    "clarity_score" >= 0
    AND "clarity_score" <= 100
  )
);

ALTER TABLE "service_requests"
ADD CONSTRAINT "service_requests_estimated_amount_check"
CHECK (
  "estimated_amount" IS NULL
  OR "estimated_amount" >= 0
);

ALTER TABLE "service_requests"
ADD CONSTRAINT "service_requests_desired_time_order_check"
CHECK (
  "desired_start_time" IS NULL
  OR "desired_end_time" IS NULL
  OR "desired_end_time" > "desired_start_time"
);

ALTER TABLE "service_requests"
ADD CONSTRAINT "service_requests_requester_name_nonblank_check"
CHECK (
  length(trim("requester_name")) > 0
);

ALTER TABLE "service_requests"
ADD CONSTRAINT "service_requests_title_nonblank_check"
CHECK (
  length(trim("title")) > 0
);

ALTER TABLE "service_requests"
ADD CONSTRAINT "service_requests_request_number_nonblank_check"
CHECK (
  length(trim("request_number")) > 0
);

-- ---------------------------------------------------------------------------
-- Temporal state coherence
-- ---------------------------------------------------------------------------

ALTER TABLE "service_requests"
ADD CONSTRAINT "service_requests_submitted_state_check"
CHECK (
  "submitted_at" IS NULL
  OR "status" <> 'draft'
);

ALTER TABLE "service_requests"
ADD CONSTRAINT "service_requests_completed_state_check"
CHECK (
  "completed_at" IS NULL
  OR "status" = 'completed'
);

ALTER TABLE "service_requests"
ADD CONSTRAINT "service_requests_cancelled_state_check"
CHECK (
  "cancelled_at" IS NULL
  OR "status" = 'cancelled'
);

ALTER TABLE "service_requests"
ADD CONSTRAINT "service_requests_rejected_state_check"
CHECK (
  "rejected_at" IS NULL
  OR (
    "status" = 'rejected'
    OR "commercial_status" = 'rejected'
  )
);

ALTER TABLE "service_requests"
ADD CONSTRAINT "service_requests_quoted_state_check"
CHECK (
  "quoted_at" IS NULL
  OR "commercial_status" IN (
    'quoted',
    'pending_authorization',
    'authorized',
    'rejected'
  )
);

ALTER TABLE "service_requests"
ADD CONSTRAINT "service_requests_authorized_state_check"
CHECK (
  "authorized_at" IS NULL
  OR "commercial_status" = 'authorized'
);

-- ---------------------------------------------------------------------------
-- Attachments
-- ---------------------------------------------------------------------------

ALTER TABLE "service_request_attachments"
ADD CONSTRAINT "service_request_attachments_type_check"
CHECK (
  "attachment_type" IN (
    'document',
    'image',
    'inventory',
    'scope',
    'quote',
    'other'
  )
);

ALTER TABLE "service_request_attachments"
ADD CONSTRAINT "service_request_attachments_file_size_check"
CHECK (
  "file_size" IS NULL
  OR "file_size" >= 0
);

ALTER TABLE "service_request_attachments"
ADD CONSTRAINT "service_request_attachments_file_name_nonblank_check"
CHECK (
  length(trim("file_name")) > 0
);

ALTER TABLE "service_request_attachments"
ADD CONSTRAINT "service_request_attachments_storage_key_nonblank_check"
CHECK (
  length(trim("storage_key")) > 0
);

-- ---------------------------------------------------------------------------
-- Event ledger
-- ---------------------------------------------------------------------------

ALTER TABLE "service_request_events"
ADD CONSTRAINT "service_request_events_type_check"
CHECK (
  "event_type" IN (
    'created',
    'submitted',
    'information_requested',
    'information_added',
    'clarity_evaluated',
    'requester_confirmed',
    'email_sent',
    'quote_requested',
    'quoted',
    'authorized',
    'rejected',
    'meeting_requested',
    'meeting_scheduled',
    'converted_to_ticket',
    'completed',
    'cancelled'
  )
);

-- ---------------------------------------------------------------------------
-- Request-to-ticket relationship
-- ---------------------------------------------------------------------------

ALTER TABLE "service_request_ticket_links"
ADD CONSTRAINT "service_request_ticket_links_relation_type_check"
CHECK (
  "relation_type" IN (
    'converted',
    'generated',
    'related'
  )
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE "service_requests"
ENABLE ROW LEVEL SECURITY;

ALTER TABLE "service_requests"
FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS
  "service_requests_tenant_isolation"
ON "service_requests";

CREATE POLICY
  "service_requests_tenant_isolation"
ON "service_requests"
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

ALTER TABLE "service_request_attachments"
ENABLE ROW LEVEL SECURITY;

ALTER TABLE "service_request_attachments"
FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS
  "service_request_attachments_tenant_isolation"
ON "service_request_attachments";

CREATE POLICY
  "service_request_attachments_tenant_isolation"
ON "service_request_attachments"
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

ALTER TABLE "service_request_events"
ENABLE ROW LEVEL SECURITY;

ALTER TABLE "service_request_events"
FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS
  "service_request_events_tenant_isolation"
ON "service_request_events";

CREATE POLICY
  "service_request_events_tenant_isolation"
ON "service_request_events"
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

ALTER TABLE "service_request_ticket_links"
ENABLE ROW LEVEL SECURITY;

ALTER TABLE "service_request_ticket_links"
FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS
  "service_request_ticket_links_tenant_isolation"
ON "service_request_ticket_links";

CREATE POLICY
  "service_request_ticket_links_tenant_isolation"
ON "service_request_ticket_links"
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

-- ---------------------------------------------------------------------------
-- Runtime grants
-- ---------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE "service_requests"
TO horos_runtime;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE "service_request_attachments"
TO horos_runtime;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE "service_request_events"
TO horos_runtime;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE "service_request_ticket_links"
TO horos_runtime;

-- ============================================================================
-- END HOROS APP-007D.2B HARDENING
-- ============================================================================

