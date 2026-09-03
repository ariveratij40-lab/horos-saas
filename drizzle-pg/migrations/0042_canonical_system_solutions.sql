-- HOROS GOV-001B: canonical system solutions foundation.

CREATE TABLE "system_solutions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "branch_id" uuid NOT NULL,
  "branch_system_id" uuid NOT NULL,
  "code" varchar(64) NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" text,
  "status" varchar(24) DEFAULT 'active' NOT NULL,
  "commissioned_at" date,
  "decommissioned_at" date,
  "created_by" varchar(255),
  "updated_by" varchar(255),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "system_solutions_tenant_id_id_uq" UNIQUE ("tenant_id", "id"),
  CONSTRAINT "system_solutions_tenant_branch_id_uq" UNIQUE ("tenant_id", "branch_id", "id"),
  CONSTRAINT "system_solutions_tenant_branch_system_id_uq" UNIQUE ("tenant_id", "branch_id", "branch_system_id", "id"),
  CONSTRAINT "system_solutions_tenant_branch_code_uq" UNIQUE ("tenant_id", "branch_id", "code"),
  CONSTRAINT "system_solutions_status_ck" CHECK ("status" IN ('active', 'inactive')),
  CONSTRAINT "system_solutions_code_ck" CHECK ("code" ~ '^[A-Z0-9][A-Z0-9-]{1,63}$'),
  CONSTRAINT "system_solutions_name_ck" CHECK (length(btrim("name")) > 0),
  CONSTRAINT "system_solutions_dates_ck" CHECK (
    "decommissioned_at" IS NULL OR "commissioned_at" IS NULL OR "decommissioned_at" >= "commissioned_at"
  )
);
--> statement-breakpoint

ALTER TABLE "branch_systems" ADD CONSTRAINT "branch_systems_tenant_branch_id_uq"
UNIQUE ("tenant_id", "branch_id", "id");
--> statement-breakpoint

ALTER TABLE "system_solutions" ADD CONSTRAINT "system_solutions_tenant_fk"
FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade;
ALTER TABLE "system_solutions" ADD CONSTRAINT "system_solutions_tenant_branch_fk"
FOREIGN KEY ("tenant_id", "branch_id") REFERENCES "public"."branches"("tenant_id", "id") ON DELETE restrict;
ALTER TABLE "system_solutions" ADD CONSTRAINT "system_solutions_tenant_branch_system_fk"
FOREIGN KEY ("tenant_id", "branch_id", "branch_system_id")
REFERENCES "public"."branch_systems"("tenant_id", "branch_id", "id") ON DELETE restrict;
--> statement-breakpoint

CREATE INDEX "system_solutions_branch_system_idx"
ON "system_solutions" ("tenant_id", "branch_id", "branch_system_id", "status");
--> statement-breakpoint

ALTER TABLE "assets" ADD COLUMN "system_solution_id" uuid;
ALTER TABLE "assets" ADD CONSTRAINT "assets_tenant_branch_solution_fk"
FOREIGN KEY ("tenant_id", "branch_id", "system_solution_id")
REFERENCES "public"."system_solutions"("tenant_id", "branch_id", "id")
ON DELETE restrict ON UPDATE no action;
CREATE INDEX "assets_system_solution_idx"
ON "assets" ("tenant_id", "branch_id", "system_solution_id");
--> statement-breakpoint

CREATE TABLE "system_solution_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "system_solution_id" uuid NOT NULL,
  "event_type" varchar(32) NOT NULL,
  "actor_external_subject" varchar(255),
  "details" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "system_solution_events_type_ck" CHECK (
    "event_type" IN ('created', 'updated', 'status_changed', 'asset_assigned', 'asset_unassigned')
  )
);
ALTER TABLE "system_solution_events" ADD CONSTRAINT "system_solution_events_tenant_solution_fk"
FOREIGN KEY ("tenant_id", "system_solution_id")
REFERENCES "public"."system_solutions"("tenant_id", "id") ON DELETE restrict;
CREATE INDEX "system_solution_events_solution_idx"
ON "system_solution_events" ("tenant_id", "system_solution_id", "created_at" DESC);
--> statement-breakpoint

CREATE OR REPLACE FUNCTION horos_guard_system_solution_identity()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (
    NEW.tenant_id IS DISTINCT FROM OLD.tenant_id OR
    NEW.branch_id IS DISTINCT FROM OLD.branch_id OR
    NEW.branch_system_id IS DISTINCT FROM OLD.branch_system_id OR
    NEW.code IS DISTINCT FROM OLD.code
  ) THEN
    RAISE EXCEPTION 'System solution identity fields are immutable' USING ERRCODE = '23514';
  END IF;
  NEW.code := upper(btrim(NEW.code));
  NEW.name := btrim(NEW.name);
  NEW.updated_at := now();
  IF NEW.status = 'active' THEN
    NEW.decommissioned_at := NULL;
  ELSIF NEW.decommissioned_at IS NULL THEN
    NEW.decommissioned_at := CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER system_solutions_identity_guard_trg
BEFORE INSERT OR UPDATE ON system_solutions
FOR EACH ROW EXECUTE FUNCTION horos_guard_system_solution_identity();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION horos_validate_asset_system_solution()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_branch_system_id uuid;
BEGIN
  IF NEW.system_solution_id IS NULL THEN RETURN NEW; END IF;
  SELECT branch_system_id INTO v_branch_system_id
  FROM system_solutions
  WHERE tenant_id = NEW.tenant_id AND branch_id = NEW.branch_id AND id = NEW.system_solution_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'System solution does not belong to asset tenant/branch' USING ERRCODE = '23503';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM asset_system_memberships
    WHERE tenant_id = NEW.tenant_id AND asset_id = NEW.id AND branch_system_id = v_branch_system_id
  ) THEN
    RAISE EXCEPTION 'Asset is not a member of the solution system' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER assets_system_solution_guard_trg
BEFORE INSERT OR UPDATE OF tenant_id, branch_id, system_solution_id ON assets
FOR EACH ROW EXECUTE FUNCTION horos_validate_asset_system_solution();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION horos_guard_solution_membership_removal()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM assets a
    JOIN system_solutions ss ON ss.tenant_id = a.tenant_id AND ss.id = a.system_solution_id
    WHERE a.tenant_id = OLD.tenant_id AND a.id = OLD.asset_id
      AND ss.branch_system_id = OLD.branch_system_id
  ) THEN
    RAISE EXCEPTION 'Cannot remove the system membership used by the assigned solution' USING ERRCODE = '23514';
  END IF;
  RETURN OLD;
END;
$$;
CREATE TRIGGER asset_membership_solution_guard_trg
BEFORE DELETE OR UPDATE OF tenant_id, asset_id, branch_system_id ON asset_system_memberships
FOR EACH ROW EXECUTE FUNCTION horos_guard_solution_membership_removal();
--> statement-breakpoint

ALTER TABLE system_solutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_solutions FORCE ROW LEVEL SECURITY;
CREATE POLICY system_solutions_tenant_select ON system_solutions FOR SELECT TO horos_runtime
USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY system_solutions_tenant_insert ON system_solutions FOR INSERT TO horos_runtime
WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY system_solutions_tenant_update ON system_solutions FOR UPDATE TO horos_runtime
USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE system_solution_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_solution_events FORCE ROW LEVEL SECURITY;
CREATE POLICY system_solution_events_tenant_select ON system_solution_events FOR SELECT TO horos_runtime
USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY system_solution_events_tenant_insert ON system_solution_events FOR INSERT TO horos_runtime
WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
--> statement-breakpoint

REVOKE ALL ON TABLE system_solutions, system_solution_events FROM horos_runtime;
GRANT SELECT, INSERT, UPDATE ON TABLE system_solutions TO horos_runtime;
GRANT SELECT, INSERT ON TABLE system_solution_events TO horos_runtime;
