CREATE TABLE "service_ticket_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "service_ticket_id" uuid NOT NULL,
  "event_type" varchar(48) NOT NULL,
  "actor_user_id" uuid,
  "actor_name" varchar(255),
  "message" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "service_ticket_events_tenant_id_id_uq"
    UNIQUE("tenant_id", "id")
);
--> statement-breakpoint

ALTER TABLE "service_ticket_events"
ADD CONSTRAINT "service_ticket_events_tenant_id_tenants_id_fk"
FOREIGN KEY ("tenant_id")
REFERENCES "public"."tenants"("id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "service_ticket_events"
ADD CONSTRAINT "service_ticket_events_actor_user_id_users_id_fk"
FOREIGN KEY ("actor_user_id")
REFERENCES "public"."users"("id")
ON DELETE set null
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "service_ticket_events"
ADD CONSTRAINT "service_ticket_events_tenant_ticket_fk"
FOREIGN KEY ("tenant_id", "service_ticket_id")
REFERENCES "public"."service_tickets"("tenant_id", "id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "service_ticket_events"
ADD CONSTRAINT "service_ticket_events_type_ck"
CHECK (
  "event_type" IN (
    'created',
    'status_changed',
    'comment_added',
    'resolution_added',
    'closed',
    'cancelled',
    'contractual_changed'
  )
);
--> statement-breakpoint

CREATE INDEX "service_ticket_events_ticket_created_idx"
ON "service_ticket_events" (
  "tenant_id",
  "service_ticket_id",
  "created_at"
);
--> statement-breakpoint

CREATE INDEX "service_ticket_events_type_idx"
ON "service_ticket_events" (
  "tenant_id",
  "event_type"
);
--> statement-breakpoint

INSERT INTO "service_ticket_events" (
  "tenant_id",
  "service_ticket_id",
  "event_type",
  "actor_name",
  "message",
  "metadata",
  "created_at"
)
SELECT
  st."tenant_id",
  st."id",
  'created',
  'HOROS migration',
  'Canonical ticket ledger baseline',
  jsonb_build_object(
    'action', 'baseline_created',
    'ticketNumber', st."ticket_number",
    'operationalStatus', st."operational_status",
    'contractualStatus', st."contractual_status"
  ),
  st."created_at"
FROM "service_tickets" st;
--> statement-breakpoint

ALTER TABLE "service_ticket_events"
ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE "service_ticket_events"
FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "service_ticket_events_tenant_isolation"
ON "service_ticket_events"
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

REVOKE ALL
ON TABLE "service_ticket_events"
FROM horos_runtime;
--> statement-breakpoint

GRANT SELECT, INSERT
ON TABLE "service_ticket_events"
TO horos_runtime;
