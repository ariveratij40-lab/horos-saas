ALTER TABLE maintenance_evidence
  ADD COLUMN branch_id uuid,
  ADD COLUMN inspection_id uuid,
  ADD COLUMN inspection_result_id uuid,
  ADD COLUMN asset_id uuid,
  ADD COLUMN component_id uuid,
  ADD COLUMN evidence_type varchar(24) NOT NULL DEFAULT 'OTHER',
  ADD COLUMN storage_provider varchar(32) NOT NULL DEFAULT 'legacy',
  ADD COLUMN content_type_declared varchar(128),
  ADD COLUMN content_type_detected varchar(128),
  ADD COLUMN byte_size bigint,
  ADD COLUMN sha256 varchar(64),
  ADD COLUMN status varchar(24) NOT NULL DEFAULT 'LEGACY_UNVERIFIED',
  ADD COLUMN source varchar(32) NOT NULL DEFAULT 'LEGACY',
  ADD COLUMN supersedes_evidence_id uuid,
  ADD COLUMN uploaded_at timestamptz,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN rejection_reason varchar(500),
  ADD COLUMN image_width integer,
  ADD COLUMN image_height integer;
ALTER TABLE maintenance_evidence ALTER COLUMN work_order_id DROP NOT NULL;
--> statement-breakpoint
UPDATE maintenance_evidence me SET branch_id=wo.branch_id, content_type_declared=me.mime_type, uploaded_at=me.created_at,
  evidence_type=CASE me.media_type WHEN 'photo' THEN 'PHOTO' WHEN 'document' THEN 'DOCUMENT' ELSE 'OTHER' END
FROM maintenance_work_orders wo WHERE wo.tenant_id=me.tenant_id AND wo.id=me.work_order_id;
ALTER TABLE maintenance_evidence ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE maintenance_evidence ALTER COLUMN uploaded_at SET NOT NULL;
ALTER TABLE maintenance_evidence ALTER COLUMN storage_provider DROP DEFAULT;
ALTER TABLE maintenance_evidence ALTER COLUMN source DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE maintenance_work_orders ADD CONSTRAINT maintenance_work_orders_tenant_branch_id_uq UNIQUE(tenant_id,branch_id,id);
ALTER TABLE maintenance_evidence ADD CONSTRAINT maintenance_evidence_tenant_branch_id_uq UNIQUE(tenant_id,branch_id,id);
ALTER TABLE maintenance_evidence ADD CONSTRAINT maintenance_evidence_branch_order_fk FOREIGN KEY(tenant_id,branch_id,work_order_id) REFERENCES maintenance_work_orders(tenant_id,branch_id,id) ON DELETE RESTRICT;
ALTER TABLE maintenance_evidence ADD CONSTRAINT maintenance_evidence_inspection_fk FOREIGN KEY(tenant_id,branch_id,inspection_id) REFERENCES inspections(tenant_id,branch_id,id) ON DELETE RESTRICT;
ALTER TABLE maintenance_evidence ADD CONSTRAINT maintenance_evidence_result_fk FOREIGN KEY(tenant_id,branch_id,inspection_result_id) REFERENCES inspection_results(tenant_id,branch_id,id) ON DELETE RESTRICT;
ALTER TABLE maintenance_evidence ADD CONSTRAINT maintenance_evidence_asset_fk FOREIGN KEY(tenant_id,branch_id,asset_id) REFERENCES assets(tenant_id,branch_id,id) ON DELETE RESTRICT;
ALTER TABLE maintenance_evidence ADD CONSTRAINT maintenance_evidence_component_fk FOREIGN KEY(tenant_id,branch_id,component_id) REFERENCES asset_components(tenant_id,branch_id,id) ON DELETE RESTRICT;
ALTER TABLE maintenance_evidence ADD CONSTRAINT maintenance_evidence_supersedes_fk FOREIGN KEY(tenant_id,branch_id,supersedes_evidence_id) REFERENCES maintenance_evidence(tenant_id,branch_id,id) ON DELETE RESTRICT;
ALTER TABLE maintenance_evidence ADD CONSTRAINT maintenance_evidence_type_ck CHECK(evidence_type IN ('PHOTO','DOCUMENT','SCREENSHOT','LOG_EXPORT','TEST_RESULT','OTHER'));
ALTER TABLE maintenance_evidence ADD CONSTRAINT maintenance_evidence_status_ck CHECK(status IN ('PENDING_UPLOAD','PROCESSING','AVAILABLE','REJECTED','QUARANTINED','SUPERSEDED','LEGACY_UNVERIFIED'));
ALTER TABLE maintenance_evidence ADD CONSTRAINT maintenance_evidence_verified_ck CHECK(status NOT IN ('AVAILABLE','SUPERSEDED') OR (sha256 ~ '^[0-9a-f]{64}$' AND byte_size>0 AND content_type_detected IS NOT NULL AND uploaded_by_user_id IS NOT NULL));
ALTER TABLE maintenance_evidence ADD CONSTRAINT maintenance_evidence_result_inspection_ck CHECK(inspection_result_id IS NULL OR inspection_id IS NOT NULL);
CREATE UNIQUE INDEX maintenance_evidence_storage_key_uq ON maintenance_evidence(storage_provider,storage_key);
CREATE INDEX maintenance_evidence_context_idx ON maintenance_evidence(tenant_id,branch_id,work_order_id,status,uploaded_at DESC);
CREATE INDEX maintenance_evidence_inspection_idx ON maintenance_evidence(tenant_id,branch_id,inspection_id,inspection_result_id,status);
CREATE TABLE evidence_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, branch_id uuid NOT NULL, evidence_id uuid NOT NULL,
  event_type varchar(48) NOT NULL, actor_external_subject varchar(255), details jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT evidence_events_evidence_fk FOREIGN KEY(tenant_id,branch_id,evidence_id) REFERENCES maintenance_evidence(tenant_id,branch_id,id) ON DELETE RESTRICT
);
CREATE INDEX evidence_events_history_idx ON evidence_events(tenant_id,branch_id,evidence_id,created_at,id);
--> statement-breakpoint
CREATE FUNCTION horos_guard_evidence() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE result_inspection uuid; component_asset uuid; inspection_order uuid; inspection_asset uuid; inspection_component uuid;
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Evidence physical deletion is prohibited' USING ERRCODE='42501'; END IF;
  IF TG_OP='UPDATE' AND OLD.status IN ('AVAILABLE','SUPERSEDED') AND
    (NEW.storage_provider,NEW.storage_key,NEW.byte_size,NEW.sha256,NEW.content_type_detected,NEW.uploaded_by_user_id,NEW.uploaded_at,NEW.tenant_id,NEW.branch_id,NEW.work_order_id,NEW.finding_id,NEW.inspection_id,NEW.inspection_result_id,NEW.asset_id,NEW.component_id)
    IS DISTINCT FROM
    (OLD.storage_provider,OLD.storage_key,OLD.byte_size,OLD.sha256,OLD.content_type_detected,OLD.uploaded_by_user_id,OLD.uploaded_at,OLD.tenant_id,OLD.branch_id,OLD.work_order_id,OLD.finding_id,OLD.inspection_id,OLD.inspection_result_id,OLD.asset_id,OLD.component_id)
    THEN RAISE EXCEPTION 'Verified evidence is immutable' USING ERRCODE='23514';
  END IF;
  IF NEW.inspection_result_id IS NOT NULL THEN SELECT inspection_id INTO STRICT result_inspection FROM inspection_results WHERE tenant_id=NEW.tenant_id AND branch_id=NEW.branch_id AND id=NEW.inspection_result_id; IF result_inspection<>NEW.inspection_id THEN RAISE EXCEPTION 'Result does not belong to inspection' USING ERRCODE='23514'; END IF; END IF;
  IF NEW.component_id IS NOT NULL THEN SELECT asset_id INTO STRICT component_asset FROM asset_components WHERE tenant_id=NEW.tenant_id AND branch_id=NEW.branch_id AND id=NEW.component_id; IF NEW.asset_id IS NULL OR component_asset<>NEW.asset_id THEN RAISE EXCEPTION 'Component does not belong to asset' USING ERRCODE='23514'; END IF; END IF;
  IF NEW.inspection_id IS NOT NULL THEN SELECT maintenance_work_order_id,asset_id,component_id INTO STRICT inspection_order,inspection_asset,inspection_component FROM inspections WHERE tenant_id=NEW.tenant_id AND branch_id=NEW.branch_id AND id=NEW.inspection_id; IF inspection_order IS NOT NULL AND inspection_order<>NEW.work_order_id THEN RAISE EXCEPTION 'Inspection work order mismatch' USING ERRCODE='23514'; END IF; IF NEW.asset_id IS NOT NULL AND NEW.asset_id IS DISTINCT FROM inspection_asset THEN RAISE EXCEPTION 'Evidence asset does not match inspection' USING ERRCODE='23514'; END IF; IF NEW.component_id IS NOT NULL AND NEW.component_id IS DISTINCT FROM inspection_component THEN RAISE EXCEPTION 'Evidence component does not match inspection' USING ERRCODE='23514'; END IF; END IF;
  NEW.updated_at=now(); RETURN NEW;
END $$;
CREATE TRIGGER maintenance_evidence_guard BEFORE INSERT OR UPDATE OR DELETE ON maintenance_evidence FOR EACH ROW EXECUTE FUNCTION horos_guard_evidence();
--> statement-breakpoint
CREATE FUNCTION horos_photo_required_satisfied(result_uuid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
  SELECT EXISTS(SELECT 1 FROM maintenance_evidence me JOIN inspection_results ir ON ir.id=me.inspection_result_id AND ir.tenant_id=me.tenant_id AND ir.branch_id=me.branch_id WHERE ir.id=result_uuid AND me.status='AVAILABLE' AND me.evidence_type IN ('PHOTO','SCREENSHOT'))
$$;
REVOKE ALL ON FUNCTION horos_guard_evidence(),horos_photo_required_satisfied(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION horos_photo_required_satisfied(uuid) TO horos_runtime;
--> statement-breakpoint
DROP POLICY maintenance_evidence_tenant_isolation ON maintenance_evidence;
CREATE POLICY maintenance_evidence_context ON maintenance_evidence TO horos_runtime USING(tenant_id=NULLIF(current_setting('app.current_tenant_id',true),'')::uuid AND branch_id=NULLIF(current_setting('app.current_branch_id',true),'')::uuid) WITH CHECK(tenant_id=NULLIF(current_setting('app.current_tenant_id',true),'')::uuid AND branch_id=NULLIF(current_setting('app.current_branch_id',true),'')::uuid);
ALTER TABLE maintenance_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_evidence FORCE ROW LEVEL SECURITY;
ALTER TABLE evidence_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_events FORCE ROW LEVEL SECURITY;
CREATE POLICY evidence_events_context ON evidence_events TO horos_runtime USING(tenant_id=NULLIF(current_setting('app.current_tenant_id',true),'')::uuid AND branch_id=NULLIF(current_setting('app.current_branch_id',true),'')::uuid) WITH CHECK(tenant_id=NULLIF(current_setting('app.current_tenant_id',true),'')::uuid AND branch_id=NULLIF(current_setting('app.current_branch_id',true),'')::uuid);
REVOKE ALL ON maintenance_evidence FROM PUBLIC,horos_runtime;
REVOKE ALL ON evidence_events FROM PUBLIC,horos_runtime;
GRANT SELECT,INSERT ON maintenance_evidence TO horos_runtime;
GRANT SELECT,INSERT ON evidence_events TO horos_runtime;
GRANT UPDATE(status,content_type_detected,byte_size,sha256,rejection_reason,image_width,image_height,caption,updated_at) ON maintenance_evidence TO horos_runtime;
REVOKE DELETE ON maintenance_evidence FROM horos_runtime;
REVOKE UPDATE,DELETE ON evidence_events FROM horos_runtime;
