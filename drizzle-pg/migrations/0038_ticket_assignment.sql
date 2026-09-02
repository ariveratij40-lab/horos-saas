-- ============================================================================
-- HOROS APP-008A
-- Canonical ticket assignment
-- ============================================================================

ALTER TABLE "service_tickets"
ADD COLUMN "assigned_to_user_id" uuid;
--> statement-breakpoint

ALTER TABLE "service_tickets"
ADD COLUMN "assigned_at" timestamp with time zone;
--> statement-breakpoint

ALTER TABLE "service_tickets"
ADD CONSTRAINT "service_tickets_tenant_assignee_fk"
FOREIGN KEY (
  "tenant_id",
  "assigned_to_user_id"
)
REFERENCES "public"."tenant_users"(
  "tenant_id",
  "user_id"
)
ON DELETE restrict
ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "service_tickets"
ADD CONSTRAINT "service_tickets_assignment_coherence_ck"
CHECK (
  (
    "assigned_to_user_id" IS NULL
    AND "assigned_at" IS NULL
  )
  OR (
    "assigned_to_user_id" IS NOT NULL
    AND "assigned_at" IS NOT NULL
  )
);
--> statement-breakpoint

CREATE INDEX "service_tickets_assignee_idx"
ON "service_tickets" (
  "tenant_id",
  "assigned_to_user_id"
)
WHERE "assigned_to_user_id" IS NOT NULL;
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
    'contractual_changed'
  )
);
