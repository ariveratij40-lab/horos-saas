CREATE TABLE "onboarding_provisioning_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"attempt_number" integer NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"total_items" integer DEFAULT 0 NOT NULL,
	"processed_items" integer DEFAULT 0 NOT NULL,
	"created_items" integer DEFAULT 0 NOT NULL,
	"updated_items" integer DEFAULT 0 NOT NULL,
	"skipped_items" integer DEFAULT 0 NOT NULL,
	"failed_items" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"failure_code" varchar(64),
	"failure_message" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "onboarding_provisioning_runs_tenant_id_id_uq" UNIQUE("tenant_id","id"),
	CONSTRAINT "onboarding_provisioning_runs_tenant_session_attempt_uq" UNIQUE("tenant_id","session_id","attempt_number")
);
--> statement-breakpoint
ALTER TABLE "onboarding_provisioning_runs" ADD CONSTRAINT "onboarding_provisioning_runs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_provisioning_runs" ADD CONSTRAINT "onboarding_provisioning_runs_tenant_session_fk" FOREIGN KEY ("tenant_id","session_id") REFERENCES "public"."onboarding_sessions"("tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "onboarding_provisioning_runs_tenant_session_idx" ON "onboarding_provisioning_runs" USING btree ("tenant_id","session_id");--> statement-breakpoint
CREATE INDEX "onboarding_provisioning_runs_tenant_status_idx" ON "onboarding_provisioning_runs" USING btree ("tenant_id","status");