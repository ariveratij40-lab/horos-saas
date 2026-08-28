CREATE TABLE "asset_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(64) NOT NULL,
	"description" text,
	"is_infrastructure" boolean DEFAULT false NOT NULL,
	"is_physical" boolean DEFAULT true NOT NULL,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "asset_types_code_uq" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "systems_catalog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "systems_catalog_code_uq" UNIQUE("code")
);
--> statement-breakpoint
CREATE INDEX "asset_types_category_idx" ON "asset_types" USING btree ("category");--> statement-breakpoint
CREATE INDEX "asset_types_infrastructure_idx" ON "asset_types" USING btree ("is_infrastructure");