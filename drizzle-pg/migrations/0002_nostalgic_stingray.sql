CREATE TABLE "branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(255) NOT NULL,
	"country_code" varchar(2),
	"state" varchar(128),
	"city" varchar(128),
	"timezone" varchar(128) NOT NULL,
	"address" text,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branches_tenant_id_id_uq" UNIQUE("tenant_id","id")
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"parent_location_id" uuid,
	"location_type" varchar(32) NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(255) NOT NULL,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "locations_tenant_id_id_uq" UNIQUE("tenant_id","id"),
	CONSTRAINT "locations_tenant_branch_id_uq" UNIQUE("tenant_id","branch_id","id")
);
--> statement-breakpoint
CREATE TABLE "racks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"telecom_space_id" uuid NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(255) NOT NULL,
	"rack_type" varchar(32) DEFAULT 'rack' NOT NULL,
	"rack_units" varchar(8),
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "racks_tenant_id_id_uq" UNIQUE("tenant_id","id")
);
--> statement-breakpoint
CREATE TABLE "telecom_spaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(255) NOT NULL,
	"space_type" varchar(32) NOT NULL,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "telecom_spaces_tenant_id_id_uq" UNIQUE("tenant_id","id"),
	CONSTRAINT "telecom_spaces_tenant_branch_id_uq" UNIQUE("tenant_id","branch_id","id")
);
--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_tenant_branch_fk" FOREIGN KEY ("tenant_id","branch_id") REFERENCES "public"."branches"("tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_tenant_parent_fk" FOREIGN KEY ("tenant_id","parent_location_id") REFERENCES "public"."locations"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "racks" ADD CONSTRAINT "racks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "racks" ADD CONSTRAINT "racks_tenant_space_fk" FOREIGN KEY ("tenant_id","branch_id","telecom_space_id") REFERENCES "public"."telecom_spaces"("tenant_id","branch_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telecom_spaces" ADD CONSTRAINT "telecom_spaces_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telecom_spaces" ADD CONSTRAINT "telecom_spaces_tenant_branch_fk" FOREIGN KEY ("tenant_id","branch_id") REFERENCES "public"."branches"("tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telecom_spaces" ADD CONSTRAINT "telecom_spaces_tenant_location_fk" FOREIGN KEY ("tenant_id","branch_id","location_id") REFERENCES "public"."locations"("tenant_id","branch_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "branches_tenant_code_uq" ON "branches" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "branches_tenant_idx" ON "branches" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "locations_branch_code_uq" ON "locations" USING btree ("branch_id","code");--> statement-breakpoint
CREATE INDEX "locations_tenant_idx" ON "locations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "locations_branch_idx" ON "locations" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "locations_parent_idx" ON "locations" USING btree ("parent_location_id");--> statement-breakpoint
CREATE UNIQUE INDEX "racks_space_code_uq" ON "racks" USING btree ("telecom_space_id","code");--> statement-breakpoint
CREATE INDEX "racks_tenant_idx" ON "racks" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "racks_branch_idx" ON "racks" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "racks_telecom_space_idx" ON "racks" USING btree ("telecom_space_id");--> statement-breakpoint
CREATE UNIQUE INDEX "telecom_spaces_branch_code_uq" ON "telecom_spaces" USING btree ("branch_id","code");--> statement-breakpoint
CREATE INDEX "telecom_spaces_tenant_idx" ON "telecom_spaces" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "telecom_spaces_branch_idx" ON "telecom_spaces" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "telecom_spaces_location_idx" ON "telecom_spaces" USING btree ("location_id");