-- HOROS GOV-001C: canonical nomenclature and entity aliases.

CREATE OR REPLACE FUNCTION horos_normalize_alias(value text)
RETURNS text LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS $$
  SELECT trim(BOTH '-' FROM regexp_replace(
    translate(lower(btrim(value)),
      'áàäâãåéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÅÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
      'aaaaaaeeeeiiiiooooouuuuncaaaaaaeeeeiiiiooooouuuunc'),
    '[^a-z0-9]+', '-', 'g'))
$$;
--> statement-breakpoint

ALTER TABLE assets ADD CONSTRAINT assets_tenant_branch_id_uq UNIQUE (tenant_id, branch_id, id);
--> statement-breakpoint

CREATE TABLE system_solution_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  system_solution_id uuid NOT NULL,
  alias_type varchar(32) NOT NULL,
  alias_value varchar(255) NOT NULL,
  normalized_value varchar(255) GENERATED ALWAYS AS (horos_normalize_alias(alias_value)) STORED,
  source varchar(128) NOT NULL,
  active boolean DEFAULT true NOT NULL,
  valid_from timestamptz DEFAULT now() NOT NULL,
  valid_until timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  created_by varchar(255),
  updated_by varchar(255),
  CONSTRAINT system_solution_aliases_type_ck CHECK (alias_type IN ('CUSTOMER_CODE','PHYSICAL_LABEL','LEGACY_CODE','IMPORT_IDENTIFIER','COMMON_NAME','PREVIOUS_NAME')),
  CONSTRAINT system_solution_aliases_value_ck CHECK (length(btrim(alias_value)) BETWEEN 1 AND 255 AND length(horos_normalize_alias(alias_value)) BETWEEN 1 AND 255),
  CONSTRAINT system_solution_aliases_dates_ck CHECK (valid_until IS NULL OR valid_until >= valid_from),
  CONSTRAINT system_solution_aliases_entity_fk FOREIGN KEY (tenant_id, branch_id, system_solution_id)
    REFERENCES system_solutions(tenant_id, branch_id, id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX system_solution_aliases_active_value_uq
  ON system_solution_aliases(tenant_id, branch_id, normalized_value) WHERE active;
CREATE INDEX system_solution_aliases_entity_idx
  ON system_solution_aliases(tenant_id, branch_id, system_solution_id, active);
--> statement-breakpoint

CREATE TABLE asset_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  asset_id uuid NOT NULL,
  alias_type varchar(32) NOT NULL,
  alias_value varchar(255) NOT NULL,
  normalized_value varchar(255) GENERATED ALWAYS AS (horos_normalize_alias(alias_value)) STORED,
  source varchar(128) NOT NULL,
  active boolean DEFAULT true NOT NULL,
  valid_from timestamptz DEFAULT now() NOT NULL,
  valid_until timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  created_by varchar(255),
  updated_by varchar(255),
  CONSTRAINT asset_aliases_tenant_id_id_uq UNIQUE (tenant_id, id),
  CONSTRAINT asset_aliases_type_ck CHECK (alias_type IN ('CUSTOMER_CODE','PHYSICAL_LABEL','LEGACY_CODE','IMPORT_IDENTIFIER','COMMON_NAME','PREVIOUS_NAME')),
  CONSTRAINT asset_aliases_value_ck CHECK (length(btrim(alias_value)) BETWEEN 1 AND 255 AND length(horos_normalize_alias(alias_value)) BETWEEN 1 AND 255),
  CONSTRAINT asset_aliases_dates_ck CHECK (valid_until IS NULL OR valid_until >= valid_from),
  CONSTRAINT asset_aliases_entity_fk FOREIGN KEY (tenant_id, branch_id, asset_id)
    REFERENCES assets(tenant_id, branch_id, id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX asset_aliases_active_value_uq
  ON asset_aliases(tenant_id, branch_id, normalized_value) WHERE active;
CREATE INDEX asset_aliases_entity_idx ON asset_aliases(tenant_id, branch_id, asset_id, active);
--> statement-breakpoint

CREATE TABLE asset_alias_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  asset_alias_id uuid NOT NULL,
  event_type varchar(32) NOT NULL,
  actor_external_subject varchar(255),
  details jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT asset_alias_events_type_ck CHECK (event_type IN ('alias_created','alias_updated','alias_deactivated','alias_reactivated')),
  CONSTRAINT asset_alias_events_alias_fk FOREIGN KEY (tenant_id, asset_alias_id) REFERENCES asset_aliases(tenant_id, id) ON DELETE RESTRICT
);
CREATE INDEX asset_alias_events_alias_idx ON asset_alias_events(tenant_id, asset_alias_id, created_at DESC);
--> statement-breakpoint

ALTER TABLE system_solution_events DROP CONSTRAINT system_solution_events_type_ck;
ALTER TABLE system_solution_events ADD CONSTRAINT system_solution_events_type_ck CHECK (event_type IN (
  'created','updated','status_changed','asset_assigned','asset_unassigned',
  'alias_created','alias_updated','alias_deactivated','alias_reactivated'
));
--> statement-breakpoint

CREATE OR REPLACE FUNCTION horos_guard_alias_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id OR NEW.branch_id IS DISTINCT FROM OLD.branch_id THEN
    RAISE EXCEPTION 'Alias tenant and branch are immutable' USING ERRCODE = '23514';
  END IF;
  NEW.updated_at := now();
  IF NEW.active AND NOT OLD.active THEN NEW.valid_until := NULL; END IF;
  IF NOT NEW.active AND OLD.active THEN NEW.valid_until := now(); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER system_solution_alias_update_guard BEFORE UPDATE ON system_solution_aliases
  FOR EACH ROW EXECUTE FUNCTION horos_guard_alias_update();
CREATE TRIGGER asset_alias_update_guard BEFORE UPDATE ON asset_aliases
  FOR EACH ROW EXECUTE FUNCTION horos_guard_alias_update();
--> statement-breakpoint

ALTER TABLE system_solution_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_solution_aliases FORCE ROW LEVEL SECURITY;
ALTER TABLE asset_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_aliases FORCE ROW LEVEL SECURITY;
ALTER TABLE asset_alias_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_alias_events FORCE ROW LEVEL SECURITY;

CREATE POLICY system_solution_aliases_tenant_all ON system_solution_aliases TO horos_runtime
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY asset_aliases_tenant_all ON asset_aliases TO horos_runtime
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY asset_alias_events_tenant_select ON asset_alias_events FOR SELECT TO horos_runtime
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY asset_alias_events_tenant_insert ON asset_alias_events FOR INSERT TO horos_runtime
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
--> statement-breakpoint

REVOKE ALL ON system_solution_aliases, asset_aliases, asset_alias_events FROM horos_runtime;
GRANT SELECT, INSERT ON system_solution_aliases, asset_aliases TO horos_runtime;
GRANT UPDATE(alias_type, alias_value, source, active, valid_until, updated_at, updated_by)
  ON system_solution_aliases, asset_aliases TO horos_runtime;
GRANT SELECT, INSERT ON asset_alias_events TO horos_runtime;
