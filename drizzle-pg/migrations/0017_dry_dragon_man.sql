CREATE TABLE "onboarding_issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"item_id" uuid,
	"severity" varchar(16) NOT NULL,
	"code" varchar(64) NOT NULL,
	"field" varchar(128),
	"message" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" varchar(32) DEFAULT 'open' NOT NULL,
	"resolution" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "onboarding_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"entity_type" varchar(64) NOT NULL,
	"operation" varchar(32) DEFAULT 'upsert' NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"source_sheet" varchar(255),
	"source_page" integer,
	"source_row" integer,
	"raw_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"normalized_payload" jsonb,
	"fingerprint" varchar(128),
	"target_entity_id" uuid,
	"committed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "onboarding_items_tenant_session_sequence_uq" UNIQUE("tenant_id","session_id","sequence"),
	CONSTRAINT "onboarding_items_tenant_id_id_uq" UNIQUE("tenant_id","id")
);
--> statement-breakpoint
CREATE TABLE "onboarding_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"branch_id" uuid,
	"source_type" varchar(32) NOT NULL,
	"status" varchar(32) DEFAULT 'draft' NOT NULL,
	"original_filename" varchar(512),
	"content_type" varchar(128),
	"source_checksum" varchar(128),
	"total_items" integer DEFAULT 0 NOT NULL,
	"valid_items" integer DEFAULT 0 NOT NULL,
	"warning_items" integer DEFAULT 0 NOT NULL,
	"error_items" integer DEFAULT 0 NOT NULL,
	"created_by_user_id" uuid,
	"committed_by_user_id" uuid,
	"started_at" timestamp with time zone,
	"validated_at" timestamp with time zone,
	"committed_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"failure_code" varchar(64),
	"failure_message" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "onboarding_sessions_tenant_id_id_uq" UNIQUE("tenant_id","id")
);
--> statement-breakpoint
ALTER TABLE "onboarding_issues" ADD CONSTRAINT "onboarding_issues_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_issues" ADD CONSTRAINT "onboarding_issues_tenant_session_fk" FOREIGN KEY ("tenant_id","session_id") REFERENCES "public"."onboarding_sessions"("tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_issues" ADD CONSTRAINT "onboarding_issues_tenant_item_fk" FOREIGN KEY ("tenant_id","item_id") REFERENCES "public"."onboarding_items"("tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_items" ADD CONSTRAINT "onboarding_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_items" ADD CONSTRAINT "onboarding_items_tenant_session_fk" FOREIGN KEY ("tenant_id","session_id") REFERENCES "public"."onboarding_sessions"("tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_sessions" ADD CONSTRAINT "onboarding_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_sessions" ADD CONSTRAINT "onboarding_sessions_tenant_branch_fk" FOREIGN KEY ("tenant_id","branch_id") REFERENCES "public"."branches"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "onboarding_issues_tenant_idx" ON "onboarding_issues" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "onboarding_issues_session_idx" ON "onboarding_issues" USING btree ("tenant_id","session_id");--> statement-breakpoint
CREATE INDEX "onboarding_issues_item_idx" ON "onboarding_issues" USING btree ("tenant_id","item_id");--> statement-breakpoint
CREATE INDEX "onboarding_issues_severity_idx" ON "onboarding_issues" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "onboarding_items_tenant_session_idx" ON "onboarding_items" USING btree ("tenant_id","session_id");--> statement-breakpoint
CREATE INDEX "onboarding_items_fingerprint_idx" ON "onboarding_items" USING btree ("fingerprint");--> statement-breakpoint
CREATE INDEX "onboarding_sessions_tenant_idx" ON "onboarding_sessions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "onboarding_sessions_tenant_status_idx" ON "onboarding_sessions" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "onboarding_sessions_source_checksum_idx" ON "onboarding_sessions" USING btree ("source_checksum");