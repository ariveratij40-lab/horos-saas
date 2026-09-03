-- HOROS GOV-001E: canonical technical components and immutable inspections.
CREATE TABLE asset_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, branch_id uuid NOT NULL,
  asset_id uuid NOT NULL, parent_component_id uuid, replaces_component_id uuid,
  code varchar(64) NOT NULL, name varchar(255) NOT NULL, component_type varchar(64) NOT NULL,
  manufacturer varchar(255), model varchar(255), serial_number varchar(255), status varchar(24) NOT NULL DEFAULT 'INSTALLED',
  installed_at timestamptz, replaced_at timestamptz, replaceable boolean NOT NULL DEFAULT true,
  description text, active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(), created_by varchar(255), updated_by varchar(255),
  CONSTRAINT asset_components_tenant_branch_id_uq UNIQUE(tenant_id,branch_id,id),
  CONSTRAINT asset_components_asset_code_uq UNIQUE(tenant_id,branch_id,asset_id,code),
  CONSTRAINT asset_components_asset_fk FOREIGN KEY(tenant_id,branch_id,asset_id) REFERENCES assets(tenant_id,branch_id,id) ON DELETE RESTRICT,
  CONSTRAINT asset_components_parent_fk FOREIGN KEY(tenant_id,branch_id,parent_component_id) REFERENCES asset_components(tenant_id,branch_id,id) ON DELETE RESTRICT,
  CONSTRAINT asset_components_replaces_fk FOREIGN KEY(tenant_id,branch_id,replaces_component_id) REFERENCES asset_components(tenant_id,branch_id,id) ON DELETE RESTRICT,
  CONSTRAINT asset_components_status_ck CHECK(status IN ('INSTALLED','IN_SERVICE','FAILED','REMOVED','REPLACED','INACTIVE')),
  CONSTRAINT asset_components_code_ck CHECK(length(btrim(code)) BETWEEN 1 AND 64),
  CONSTRAINT asset_components_dates_ck CHECK(replaced_at IS NULL OR installed_at IS NULL OR replaced_at>=installed_at)
);
CREATE INDEX asset_components_asset_idx ON asset_components(tenant_id,branch_id,asset_id,active);
--> statement-breakpoint

CREATE TABLE inspection_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, branch_id uuid NOT NULL,
  code varchar(64) NOT NULL, name varchar(255) NOT NULL, description text, version integer NOT NULL DEFAULT 1,
  previous_version_id uuid, status varchar(16) NOT NULL DEFAULT 'DRAFT', branch_system_id uuid,
  system_solution_id uuid, asset_type_id uuid, asset_id uuid, published_at timestamptz, retired_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  created_by varchar(255), updated_by varchar(255),
  CONSTRAINT inspection_templates_tenant_branch_id_uq UNIQUE(tenant_id,branch_id,id),
  CONSTRAINT inspection_templates_code_version_uq UNIQUE(tenant_id,branch_id,code,version),
  CONSTRAINT inspection_templates_previous_fk FOREIGN KEY(tenant_id,branch_id,previous_version_id) REFERENCES inspection_templates(tenant_id,branch_id,id) ON DELETE RESTRICT,
  CONSTRAINT inspection_templates_branch_fk FOREIGN KEY(tenant_id,branch_id) REFERENCES branches(tenant_id,id) ON DELETE RESTRICT,
  CONSTRAINT inspection_templates_branch_system_fk FOREIGN KEY(tenant_id,branch_id,branch_system_id) REFERENCES branch_systems(tenant_id,branch_id,id) ON DELETE RESTRICT,
  CONSTRAINT inspection_templates_solution_fk FOREIGN KEY(tenant_id,branch_id,system_solution_id) REFERENCES system_solutions(tenant_id,branch_id,id) ON DELETE RESTRICT,
  CONSTRAINT inspection_templates_asset_fk FOREIGN KEY(tenant_id,branch_id,asset_id) REFERENCES assets(tenant_id,branch_id,id) ON DELETE RESTRICT,
  CONSTRAINT inspection_templates_asset_type_fk FOREIGN KEY(asset_type_id) REFERENCES asset_types(id) ON DELETE RESTRICT,
  CONSTRAINT inspection_templates_status_ck CHECK(status IN ('DRAFT','PUBLISHED','RETIRED')),
  CONSTRAINT inspection_templates_version_ck CHECK(version>0),
  CONSTRAINT inspection_templates_scope_ck CHECK(num_nonnulls(branch_system_id,system_solution_id,asset_type_id,asset_id)<=1)
);
--> statement-breakpoint

CREATE TABLE inspection_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, branch_id uuid NOT NULL, template_id uuid NOT NULL,
  code varchar(64) NOT NULL, title varchar(500) NOT NULL, instructions text, response_type varchar(32) NOT NULL,
  required boolean NOT NULL DEFAULT true, allow_not_applicable boolean NOT NULL DEFAULT false, require_na_explanation boolean NOT NULL DEFAULT false,
  options jsonb, expected_value jsonb, severity_on_failure varchar(16), sequence integer NOT NULL, active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inspection_template_items_tenant_branch_id_uq UNIQUE(tenant_id,branch_id,id),
  CONSTRAINT inspection_template_items_code_uq UNIQUE(tenant_id,branch_id,template_id,code),
  CONSTRAINT inspection_template_items_sequence_uq UNIQUE(tenant_id,branch_id,template_id,sequence),
  CONSTRAINT inspection_template_items_template_fk FOREIGN KEY(tenant_id,branch_id,template_id) REFERENCES inspection_templates(tenant_id,branch_id,id) ON DELETE RESTRICT,
  CONSTRAINT inspection_template_items_type_ck CHECK(response_type IN ('PASS_FAIL','YES_NO','TEXT','NUMBER','DATE','SINGLE_CHOICE','MULTI_CHOICE','PHOTO_REQUIRED')),
  CONSTRAINT inspection_template_items_text_ck CHECK(length(btrim(code))>0 AND length(btrim(title))>0),
  CONSTRAINT inspection_template_items_sequence_ck CHECK(sequence>=0),
  CONSTRAINT inspection_template_items_options_ck CHECK((response_type IN ('SINGLE_CHOICE','MULTI_CHOICE') AND jsonb_typeof(options)='array' AND jsonb_array_length(options)>0) OR (response_type NOT IN ('SINGLE_CHOICE','MULTI_CHOICE') AND options IS NULL))
);
--> statement-breakpoint

CREATE TABLE inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, branch_id uuid NOT NULL,
  template_id uuid NOT NULL, template_version integer NOT NULL, branch_system_id uuid, system_solution_id uuid,
  asset_id uuid, component_id uuid, maintenance_work_order_id uuid, inspector_user_id uuid NOT NULL,
  status varchar(16) NOT NULL DEFAULT 'DRAFT', started_at timestamptz, completed_at timestamptz,
  cancelled_at timestamptz, cancellation_reason text, summary text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inspections_tenant_branch_id_uq UNIQUE(tenant_id,branch_id,id),
  CONSTRAINT inspections_template_fk FOREIGN KEY(tenant_id,branch_id,template_id) REFERENCES inspection_templates(tenant_id,branch_id,id) ON DELETE RESTRICT,
  CONSTRAINT inspections_branch_system_fk FOREIGN KEY(tenant_id,branch_id,branch_system_id) REFERENCES branch_systems(tenant_id,branch_id,id) ON DELETE RESTRICT,
  CONSTRAINT inspections_solution_fk FOREIGN KEY(tenant_id,branch_id,system_solution_id) REFERENCES system_solutions(tenant_id,branch_id,id) ON DELETE RESTRICT,
  CONSTRAINT inspections_asset_fk FOREIGN KEY(tenant_id,branch_id,asset_id) REFERENCES assets(tenant_id,branch_id,id) ON DELETE RESTRICT,
  CONSTRAINT inspections_component_fk FOREIGN KEY(tenant_id,branch_id,component_id) REFERENCES asset_components(tenant_id,branch_id,id) ON DELETE RESTRICT,
  CONSTRAINT inspections_work_order_fk FOREIGN KEY(tenant_id,maintenance_work_order_id) REFERENCES maintenance_work_orders(tenant_id,id) ON DELETE RESTRICT,
  CONSTRAINT inspections_inspector_fk FOREIGN KEY(inspector_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT inspections_status_ck CHECK(status IN ('DRAFT','IN_PROGRESS','COMPLETED','CANCELLED')),
  CONSTRAINT inspections_cancel_ck CHECK(status<>'CANCELLED' OR (cancelled_at IS NOT NULL AND length(btrim(cancellation_reason))>0))
);
--> statement-breakpoint

CREATE TABLE inspection_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, branch_id uuid NOT NULL,
  inspection_id uuid NOT NULL, template_item_id uuid NOT NULL, item_code_snapshot varchar(64) NOT NULL,
  title_snapshot varchar(500) NOT NULL, instructions_snapshot text, response_type_snapshot varchar(32) NOT NULL,
  expected_value_snapshot jsonb, options_snapshot jsonb, required_snapshot boolean NOT NULL,
  allow_not_applicable_snapshot boolean NOT NULL, require_na_explanation_snapshot boolean NOT NULL,
  severity_on_failure_snapshot varchar(16), sequence_snapshot integer NOT NULL,
  response jsonb, outcome varchar(32) NOT NULL DEFAULT 'PENDING', observation text,
  inspected_at timestamptz, inspected_by uuid, maintenance_finding_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inspection_results_tenant_branch_id_uq UNIQUE(tenant_id,branch_id,id),
  CONSTRAINT inspection_results_item_uq UNIQUE(tenant_id,branch_id,inspection_id,template_item_id),
  CONSTRAINT inspection_results_inspection_fk FOREIGN KEY(tenant_id,branch_id,inspection_id) REFERENCES inspections(tenant_id,branch_id,id) ON DELETE RESTRICT,
  CONSTRAINT inspection_results_item_fk FOREIGN KEY(tenant_id,branch_id,template_item_id) REFERENCES inspection_template_items(tenant_id,branch_id,id) ON DELETE RESTRICT,
  CONSTRAINT inspection_results_inspector_fk FOREIGN KEY(inspected_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT inspection_results_finding_fk FOREIGN KEY(tenant_id,maintenance_finding_id) REFERENCES maintenance_findings(tenant_id,id) ON DELETE RESTRICT,
  CONSTRAINT inspection_results_outcome_ck CHECK(outcome IN ('PENDING','PASS','FAIL','NOT_APPLICABLE','NEEDS_FINDING_WORKFLOW'))
);
CREATE INDEX inspection_results_inspection_idx ON inspection_results(tenant_id,branch_id,inspection_id,sequence_snapshot);
--> statement-breakpoint

CREATE TABLE inspection_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, branch_id uuid NOT NULL,
  entity_type varchar(24) NOT NULL, entity_id uuid NOT NULL, event_type varchar(48) NOT NULL,
  actor_external_subject varchar(255), details jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inspection_events_type_ck CHECK(entity_type IN ('COMPONENT','TEMPLATE','ITEM','INSPECTION','RESULT'))
);
CREATE INDEX inspection_events_entity_idx ON inspection_events(tenant_id,branch_id,entity_type,entity_id,created_at DESC);
--> statement-breakpoint

CREATE FUNCTION horos_guard_component() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE owner_asset uuid; cycle_found boolean;
BEGIN
  IF TG_OP='UPDATE' AND (NEW.tenant_id,NEW.branch_id,NEW.asset_id,NEW.code) IS DISTINCT FROM (OLD.tenant_id,OLD.branch_id,OLD.asset_id,OLD.code) THEN RAISE EXCEPTION 'Component identity is immutable' USING ERRCODE='23514'; END IF;
  IF NEW.parent_component_id IS NOT NULL THEN SELECT asset_id INTO STRICT owner_asset FROM public.asset_components WHERE tenant_id=NEW.tenant_id AND branch_id=NEW.branch_id AND id=NEW.parent_component_id; IF owner_asset<>NEW.asset_id THEN RAISE EXCEPTION 'Parent must belong to same asset' USING ERRCODE='23514'; END IF; END IF;
  IF NEW.replaces_component_id IS NOT NULL THEN SELECT asset_id INTO STRICT owner_asset FROM public.asset_components WHERE tenant_id=NEW.tenant_id AND branch_id=NEW.branch_id AND id=NEW.replaces_component_id; IF owner_asset<>NEW.asset_id OR NEW.replaces_component_id=NEW.id THEN RAISE EXCEPTION 'Replacement must belong to same asset' USING ERRCODE='23514'; END IF; END IF;
  IF NEW.parent_component_id IS NOT NULL THEN WITH RECURSIVE ancestors(id) AS (SELECT NEW.parent_component_id UNION SELECT c.parent_component_id FROM public.asset_components c JOIN ancestors a ON c.id=a.id WHERE c.parent_component_id IS NOT NULL) SELECT EXISTS(SELECT 1 FROM ancestors WHERE id=NEW.id) INTO cycle_found; IF cycle_found THEN RAISE EXCEPTION 'Component hierarchy cycle' USING ERRCODE='23514'; END IF; END IF;
  NEW.updated_at=now(); RETURN NEW;
END $$;
CREATE TRIGGER asset_components_guard BEFORE INSERT OR UPDATE ON asset_components FOR EACH ROW EXECUTE FUNCTION horos_guard_component();
--> statement-breakpoint

CREATE FUNCTION horos_guard_template() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
  IF TG_OP='UPDATE' AND OLD.status='RETIRED' THEN RAISE EXCEPTION 'Retired template is immutable' USING ERRCODE='23514'; END IF;
  IF TG_OP='UPDATE' AND OLD.status='PUBLISHED' AND NOT (NEW.status='RETIRED' AND NEW.name=OLD.name AND NEW.description IS NOT DISTINCT FROM OLD.description AND NEW.published_at IS NOT DISTINCT FROM OLD.published_at) THEN
    RAISE EXCEPTION 'Published template is immutable except retirement' USING ERRCODE='23514';
  END IF;
  IF TG_OP='UPDATE' AND (NEW.tenant_id,NEW.branch_id,NEW.code,NEW.version) IS DISTINCT FROM (OLD.tenant_id,OLD.branch_id,OLD.code,OLD.version) THEN RAISE EXCEPTION 'Template identity is immutable' USING ERRCODE='23514'; END IF;
  IF TG_OP='UPDATE' AND NEW.status='PUBLISHED' AND OLD.status='DRAFT' AND NOT EXISTS(SELECT 1 FROM public.inspection_template_items WHERE tenant_id=NEW.tenant_id AND branch_id=NEW.branch_id AND template_id=NEW.id AND active) THEN RAISE EXCEPTION 'Published template requires an item' USING ERRCODE='23514'; END IF;
  NEW.updated_at=now(); RETURN NEW;
END $$;
CREATE TRIGGER inspection_templates_guard BEFORE UPDATE ON inspection_templates FOR EACH ROW EXECUTE FUNCTION horos_guard_template();

CREATE FUNCTION horos_guard_template_item() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE template_status varchar;
BEGIN SELECT status INTO STRICT template_status FROM public.inspection_templates WHERE tenant_id=COALESCE(NEW.tenant_id,OLD.tenant_id) AND branch_id=COALESCE(NEW.branch_id,OLD.branch_id) AND id=COALESCE(NEW.template_id,OLD.template_id);
  IF template_status<>'DRAFT' THEN RAISE EXCEPTION 'Published template items are immutable' USING ERRCODE='23514'; END IF;
  NEW.updated_at=now(); RETURN NEW;
END $$;
CREATE TRIGGER inspection_template_items_guard BEFORE INSERT OR UPDATE OR DELETE ON inspection_template_items FOR EACH ROW EXECUTE FUNCTION horos_guard_template_item();
--> statement-breakpoint

CREATE FUNCTION horos_guard_inspection() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE t public.inspection_templates%ROWTYPE; component_asset uuid; order_branch uuid; target_asset_type uuid; target_solution uuid; solution_system uuid;
BEGIN
  SELECT * INTO STRICT t FROM public.inspection_templates WHERE tenant_id=NEW.tenant_id AND branch_id=NEW.branch_id AND id=NEW.template_id;
  IF TG_OP='INSERT' AND t.status<>'PUBLISHED' THEN RAISE EXCEPTION 'Only published templates may be inspected' USING ERRCODE='23514'; END IF;
  IF TG_OP='UPDATE' AND OLD.status IN ('COMPLETED','CANCELLED') AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'Terminal inspection is immutable' USING ERRCODE='23514'; END IF;
  IF TG_OP='UPDATE' AND OLD.status='IN_PROGRESS' AND (NEW.template_id,NEW.branch_system_id,NEW.system_solution_id,NEW.asset_id,NEW.component_id,NEW.maintenance_work_order_id) IS DISTINCT FROM (OLD.template_id,OLD.branch_system_id,OLD.system_solution_id,OLD.asset_id,OLD.component_id,OLD.maintenance_work_order_id) THEN RAISE EXCEPTION 'Inspection target is immutable after start' USING ERRCODE='23514'; END IF;
  IF NEW.component_id IS NOT NULL THEN SELECT asset_id INTO STRICT component_asset FROM public.asset_components WHERE tenant_id=NEW.tenant_id AND branch_id=NEW.branch_id AND id=NEW.component_id; IF NEW.asset_id IS NULL OR component_asset<>NEW.asset_id THEN RAISE EXCEPTION 'Component does not belong to inspection asset' USING ERRCODE='23514'; END IF; END IF;
  IF NEW.asset_id IS NOT NULL THEN SELECT asset_type_id,system_solution_id INTO STRICT target_asset_type,target_solution FROM public.assets WHERE tenant_id=NEW.tenant_id AND branch_id=NEW.branch_id AND id=NEW.asset_id; END IF;
  IF NEW.system_solution_id IS NOT NULL THEN SELECT branch_system_id INTO STRICT solution_system FROM public.system_solutions WHERE tenant_id=NEW.tenant_id AND branch_id=NEW.branch_id AND id=NEW.system_solution_id; IF NEW.branch_system_id IS NOT NULL AND solution_system<>NEW.branch_system_id THEN RAISE EXCEPTION 'Solution and branch system mismatch' USING ERRCODE='23514'; END IF; END IF;
  IF NEW.asset_id IS NOT NULL AND NEW.system_solution_id IS NOT NULL AND target_solution IS DISTINCT FROM NEW.system_solution_id THEN RAISE EXCEPTION 'Asset and solution mismatch' USING ERRCODE='23514'; END IF;
  IF NEW.maintenance_work_order_id IS NOT NULL THEN SELECT branch_id INTO STRICT order_branch FROM public.maintenance_work_orders WHERE tenant_id=NEW.tenant_id AND id=NEW.maintenance_work_order_id; IF order_branch<>NEW.branch_id THEN RAISE EXCEPTION 'Work order branch mismatch' USING ERRCODE='23514'; END IF; END IF;
  IF (t.branch_system_id IS DISTINCT FROM NEW.branch_system_id AND t.branch_system_id IS NOT NULL) OR (t.system_solution_id IS DISTINCT FROM NEW.system_solution_id AND t.system_solution_id IS NOT NULL) OR (t.asset_id IS DISTINCT FROM NEW.asset_id AND t.asset_id IS NOT NULL) OR (t.asset_type_id IS NOT NULL AND (NEW.asset_id IS NULL OR t.asset_type_id<>target_asset_type)) THEN RAISE EXCEPTION 'Inspection target does not match template scope' USING ERRCODE='23514'; END IF;
  NEW.updated_at=now(); RETURN NEW;
END $$;
CREATE TRIGGER inspections_guard BEFORE INSERT OR UPDATE ON inspections FOR EACH ROW EXECUTE FUNCTION horos_guard_inspection();
--> statement-breakpoint

CREATE FUNCTION horos_guard_result() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE inspection_status varchar; inspection_order uuid; finding_order uuid; valid boolean:=false;
BEGIN
  SELECT status,maintenance_work_order_id INTO STRICT inspection_status,inspection_order FROM public.inspections WHERE tenant_id=NEW.tenant_id AND branch_id=NEW.branch_id AND id=NEW.inspection_id;
  IF inspection_status='CANCELLED' THEN RAISE EXCEPTION 'Cancelled inspection results are immutable' USING ERRCODE='23514'; END IF;
  IF inspection_status='COMPLETED' AND NOT (
    NEW.response IS NOT DISTINCT FROM OLD.response AND NEW.observation IS NOT DISTINCT FROM OLD.observation
    AND NEW.inspected_at IS NOT DISTINCT FROM OLD.inspected_at AND NEW.inspected_by IS NOT DISTINCT FROM OLD.inspected_by
    AND NEW.maintenance_finding_id IS DISTINCT FROM OLD.maintenance_finding_id
  ) THEN RAISE EXCEPTION 'Completed inspection results are immutable except finding association' USING ERRCODE='23514'; END IF;
  IF NEW.outcome='NOT_APPLICABLE' AND NOT NEW.allow_not_applicable_snapshot THEN RAISE EXCEPTION 'N/A is not allowed' USING ERRCODE='23514'; END IF;
  IF NEW.outcome='NOT_APPLICABLE' AND NEW.require_na_explanation_snapshot AND length(btrim(coalesce(NEW.observation,'')))=0 THEN RAISE EXCEPTION 'N/A explanation required' USING ERRCODE='23514'; END IF;
  IF NEW.response IS NOT NULL THEN
    valid:=CASE NEW.response_type_snapshot WHEN 'YES_NO' THEN jsonb_typeof(NEW.response)='boolean' WHEN 'NUMBER' THEN jsonb_typeof(NEW.response)='number' WHEN 'TEXT' THEN jsonb_typeof(NEW.response)='string' AND length(NEW.response#>>'{}')<=10000 WHEN 'DATE' THEN jsonb_typeof(NEW.response)='string' AND (NEW.response#>>'{}')~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$' WHEN 'PASS_FAIL' THEN NEW.response#>>'{}' IN ('PASS','FAIL') WHEN 'SINGLE_CHOICE' THEN jsonb_typeof(NEW.response)='string' AND NEW.options_snapshot ? (NEW.response#>>'{}') WHEN 'MULTI_CHOICE' THEN jsonb_typeof(NEW.response)='array' AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements_text(NEW.response) x WHERE NOT NEW.options_snapshot ? x) AND jsonb_array_length(NEW.response)=(SELECT count(DISTINCT x) FROM jsonb_array_elements_text(NEW.response) x) WHEN 'PHOTO_REQUIRED' THEN false ELSE false END;
    IF NOT valid THEN RAISE EXCEPTION 'Typed inspection response is invalid' USING ERRCODE='23514'; END IF;
  END IF;
  IF NEW.maintenance_finding_id IS NOT NULL THEN SELECT work_order_id INTO STRICT finding_order FROM public.maintenance_findings WHERE tenant_id=NEW.tenant_id AND id=NEW.maintenance_finding_id; IF inspection_order IS NULL OR finding_order<>inspection_order THEN RAISE EXCEPTION 'Finding must belong to inspection work order' USING ERRCODE='23514'; END IF; END IF;
  NEW.updated_at=now(); RETURN NEW;
END $$;
CREATE TRIGGER inspection_results_guard BEFORE UPDATE ON inspection_results FOR EACH ROW EXECUTE FUNCTION horos_guard_result();
--> statement-breakpoint

CREATE FUNCTION horos_snapshot_inspection_items() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
  INSERT INTO public.inspection_results(tenant_id,branch_id,inspection_id,template_item_id,item_code_snapshot,title_snapshot,instructions_snapshot,response_type_snapshot,expected_value_snapshot,options_snapshot,required_snapshot,allow_not_applicable_snapshot,require_na_explanation_snapshot,severity_on_failure_snapshot,sequence_snapshot)
  SELECT NEW.tenant_id,NEW.branch_id,NEW.id,i.id,i.code,i.title,i.instructions,i.response_type,i.expected_value,i.options,i.required,i.allow_not_applicable,i.require_na_explanation,i.severity_on_failure,i.sequence FROM public.inspection_template_items i WHERE i.tenant_id=NEW.tenant_id AND i.branch_id=NEW.branch_id AND i.template_id=NEW.template_id AND i.active ORDER BY i.sequence;
  RETURN NEW;
END $$;
CREATE TRIGGER inspections_snapshot AFTER INSERT ON inspections FOR EACH ROW EXECUTE FUNCTION horos_snapshot_inspection_items();
--> statement-breakpoint

ALTER TABLE asset_components ENABLE ROW LEVEL SECURITY; ALTER TABLE asset_components FORCE ROW LEVEL SECURITY;
ALTER TABLE inspection_templates ENABLE ROW LEVEL SECURITY; ALTER TABLE inspection_templates FORCE ROW LEVEL SECURITY;
ALTER TABLE inspection_template_items ENABLE ROW LEVEL SECURITY; ALTER TABLE inspection_template_items FORCE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY; ALTER TABLE inspections FORCE ROW LEVEL SECURITY;
ALTER TABLE inspection_results ENABLE ROW LEVEL SECURITY; ALTER TABLE inspection_results FORCE ROW LEVEL SECURITY;
ALTER TABLE inspection_events ENABLE ROW LEVEL SECURITY; ALTER TABLE inspection_events FORCE ROW LEVEL SECURITY;

CREATE POLICY asset_components_context ON asset_components TO horos_runtime USING(tenant_id=NULLIF(current_setting('app.current_tenant_id',true),'')::uuid AND branch_id=NULLIF(current_setting('app.current_branch_id',true),'')::uuid) WITH CHECK(tenant_id=NULLIF(current_setting('app.current_tenant_id',true),'')::uuid AND branch_id=NULLIF(current_setting('app.current_branch_id',true),'')::uuid);
CREATE POLICY inspection_templates_context ON inspection_templates TO horos_runtime USING(tenant_id=NULLIF(current_setting('app.current_tenant_id',true),'')::uuid AND branch_id=NULLIF(current_setting('app.current_branch_id',true),'')::uuid) WITH CHECK(tenant_id=NULLIF(current_setting('app.current_tenant_id',true),'')::uuid AND branch_id=NULLIF(current_setting('app.current_branch_id',true),'')::uuid);
CREATE POLICY inspection_template_items_context ON inspection_template_items TO horos_runtime USING(tenant_id=NULLIF(current_setting('app.current_tenant_id',true),'')::uuid AND branch_id=NULLIF(current_setting('app.current_branch_id',true),'')::uuid) WITH CHECK(tenant_id=NULLIF(current_setting('app.current_tenant_id',true),'')::uuid AND branch_id=NULLIF(current_setting('app.current_branch_id',true),'')::uuid);
CREATE POLICY inspections_context ON inspections TO horos_runtime USING(tenant_id=NULLIF(current_setting('app.current_tenant_id',true),'')::uuid AND branch_id=NULLIF(current_setting('app.current_branch_id',true),'')::uuid) WITH CHECK(tenant_id=NULLIF(current_setting('app.current_tenant_id',true),'')::uuid AND branch_id=NULLIF(current_setting('app.current_branch_id',true),'')::uuid);
CREATE POLICY inspection_results_context ON inspection_results TO horos_runtime USING(tenant_id=NULLIF(current_setting('app.current_tenant_id',true),'')::uuid AND branch_id=NULLIF(current_setting('app.current_branch_id',true),'')::uuid) WITH CHECK(tenant_id=NULLIF(current_setting('app.current_tenant_id',true),'')::uuid AND branch_id=NULLIF(current_setting('app.current_branch_id',true),'')::uuid);
CREATE POLICY inspection_events_context ON inspection_events TO horos_runtime USING(tenant_id=NULLIF(current_setting('app.current_tenant_id',true),'')::uuid AND branch_id=NULLIF(current_setting('app.current_branch_id',true),'')::uuid) WITH CHECK(tenant_id=NULLIF(current_setting('app.current_tenant_id',true),'')::uuid AND branch_id=NULLIF(current_setting('app.current_branch_id',true),'')::uuid);

REVOKE ALL ON asset_components,inspection_templates,inspection_template_items,inspections,inspection_results,inspection_events FROM PUBLIC,horos_runtime;
GRANT SELECT,INSERT ON asset_components,inspection_templates,inspection_template_items,inspections,inspection_results,inspection_events TO horos_runtime;
GRANT UPDATE(name,component_type,manufacturer,model,serial_number,status,installed_at,replaced_at,replaceable,description,active,parent_component_id,replaces_component_id,updated_by) ON asset_components TO horos_runtime;
GRANT UPDATE(name,description,status,published_at,retired_at,updated_by) ON inspection_templates TO horos_runtime;
GRANT UPDATE(code,title,instructions,response_type,required,allow_not_applicable,require_na_explanation,options,expected_value,severity_on_failure,sequence,active) ON inspection_template_items TO horos_runtime;
GRANT UPDATE(status,started_at,completed_at,cancelled_at,cancellation_reason,summary) ON inspections TO horos_runtime;
GRANT UPDATE(response,outcome,observation,inspected_at,inspected_by,maintenance_finding_id) ON inspection_results TO horos_runtime;
REVOKE ALL ON FUNCTION horos_guard_component(),horos_guard_template(),horos_guard_template_item(),horos_guard_inspection(),horos_guard_result(),horos_snapshot_inspection_items() FROM PUBLIC;
