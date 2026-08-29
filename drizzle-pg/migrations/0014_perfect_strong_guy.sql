CREATE TABLE "asset_system_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"branch_system_id" uuid NOT NULL,
	"role" varchar(64) DEFAULT 'member' NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "asset_system_memberships_tenant_asset_system_uq" UNIQUE("tenant_id","asset_id","branch_system_id")
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"asset_type_id" uuid NOT NULL,
	"location_id" uuid,
	"telecom_space_id" uuid,
	"rack_id" uuid,
	"asset_code" varchar(128) NOT NULL,
	"asset_tag" varchar(128),
	"serial_number" varchar(255),
	"manufacturer" varchar(255),
	"model" varchar(255),
	"rfid_epc" varchar(255),
	"lifecycle_status" varchar(32) DEFAULT 'active' NOT NULL,
	"operational_status" varchar(32) DEFAULT 'unknown' NOT NULL,
	"source" varchar(32) DEFAULT 'manual' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assets_tenant_asset_code_uq" UNIQUE("tenant_id","asset_code"),
	CONSTRAINT "assets_tenant_id_id_uq" UNIQUE("tenant_id","id"),
	CONSTRAINT "assets_rfid_epc_uq" UNIQUE("rfid_epc"),
	CONSTRAINT "assets_tenant_asset_tag_uq" UNIQUE("tenant_id","asset_tag")
);
--> statement-breakpoint
ALTER TABLE "asset_system_memberships" ADD CONSTRAINT "asset_system_memberships_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "asset_system_memberships" ADD CONSTRAINT "asset_system_memberships_tenant_asset_fk" FOREIGN KEY ("tenant_id","asset_id") REFERENCES "public"."assets"("tenant_id","id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "asset_system_memberships" ADD CONSTRAINT "asset_system_memberships_tenant_branch_system_fk" FOREIGN KEY ("tenant_id","branch_system_id") REFERENCES "public"."branch_systems"("tenant_id","id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_asset_type_id_asset_types_id_fk" FOREIGN KEY ("asset_type_id") REFERENCES "public"."asset_types"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_tenant_branch_fk" FOREIGN KEY ("tenant_id","branch_id") REFERENCES "public"."branches"("tenant_id","id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_tenant_location_fk" FOREIGN KEY ("tenant_id","branch_id","location_id") REFERENCES "public"."locations"("tenant_id","branch_id","id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_tenant_telecom_space_fk" FOREIGN KEY ("tenant_id","branch_id","telecom_space_id") REFERENCES "public"."telecom_spaces"("tenant_id","branch_id","id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "racks" ADD CONSTRAINT "racks_tenant_branch_id_uq" UNIQUE("tenant_id","branch_id","id");
--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_tenant_rack_fk" FOREIGN KEY ("tenant_id","branch_id","rack_id") REFERENCES "public"."racks"("tenant_id","branch_id","id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "asset_system_memberships_tenant_idx" ON "asset_system_memberships" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "asset_system_memberships_asset_idx" ON "asset_system_memberships" USING btree ("asset_id");
--> statement-breakpoint
CREATE INDEX "asset_system_memberships_branch_system_idx" ON "asset_system_memberships" USING btree ("branch_system_id");
--> statement-breakpoint
CREATE INDEX "assets_tenant_idx" ON "assets" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "assets_branch_idx" ON "assets" USING btree ("branch_id");
--> statement-breakpoint
CREATE INDEX "assets_asset_type_idx" ON "assets" USING btree ("asset_type_id");
--> statement-breakpoint
CREATE INDEX "assets_serial_number_idx" ON "assets" USING btree ("serial_number");
