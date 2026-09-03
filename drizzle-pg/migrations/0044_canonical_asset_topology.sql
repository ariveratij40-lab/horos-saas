-- HOROS GOV-001D: canonical ports, links and directed asset relationships.

CREATE TABLE asset_ports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  asset_id uuid NOT NULL,
  code varchar(64) NOT NULL,
  name varchar(255) NOT NULL,
  port_type varchar(32) NOT NULL,
  direction varchar(24) NOT NULL DEFAULT 'NOT_APPLICABLE',
  medium varchar(24) NOT NULL,
  connector_type varchar(64),
  status varchar(24) NOT NULL DEFAULT 'AVAILABLE',
  sequence integer,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by varchar(255),
  updated_by varchar(255),
  CONSTRAINT asset_ports_tenant_branch_id_uq UNIQUE (tenant_id, branch_id, id),
  CONSTRAINT asset_ports_asset_code_uq UNIQUE (tenant_id, branch_id, asset_id, code),
  CONSTRAINT asset_ports_asset_fk FOREIGN KEY (tenant_id, branch_id, asset_id) REFERENCES assets(tenant_id, branch_id, id) ON DELETE RESTRICT,
  CONSTRAINT asset_ports_type_ck CHECK (port_type IN ('ETHERNET','FIBER','POWER','RELAY_INPUT','RELAY_OUTPUT','ALARM_INPUT','AUDIO_INPUT','AUDIO_OUTPUT','SERIAL','WIRELESS','LOGICAL','OTHER')),
  CONSTRAINT asset_ports_direction_ck CHECK (direction IN ('INPUT','OUTPUT','BIDIRECTIONAL','NOT_APPLICABLE')),
  CONSTRAINT asset_ports_medium_ck CHECK (medium IN ('COPPER','FIBER','WIRELESS','ELECTRICAL','AUDIO','LOGICAL','OTHER')),
  CONSTRAINT asset_ports_status_ck CHECK (status IN ('AVAILABLE','CONNECTED','INACTIVE')),
  CONSTRAINT asset_ports_code_ck CHECK (length(btrim(code)) BETWEEN 1 AND 64),
  CONSTRAINT asset_ports_sequence_ck CHECK (sequence IS NULL OR sequence >= 0)
);
CREATE INDEX asset_ports_asset_idx ON asset_ports(tenant_id, branch_id, asset_id, active);
--> statement-breakpoint

CREATE TABLE asset_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  code varchar(64) NOT NULL,
  name varchar(255) NOT NULL,
  link_type varchar(24) NOT NULL,
  endpoint_a_port_id uuid NOT NULL,
  endpoint_b_port_id uuid NOT NULL,
  status varchar(24) NOT NULL DEFAULT 'PLANNED',
  medium varchar(24) NOT NULL,
  description text,
  installed_at timestamptz,
  decommissioned_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by varchar(255),
  updated_by varchar(255),
  CONSTRAINT asset_links_tenant_branch_id_uq UNIQUE (tenant_id, branch_id, id),
  CONSTRAINT asset_links_code_uq UNIQUE (tenant_id, branch_id, code),
  CONSTRAINT asset_links_endpoint_a_fk FOREIGN KEY (tenant_id, branch_id, endpoint_a_port_id) REFERENCES asset_ports(tenant_id, branch_id, id) ON DELETE RESTRICT,
  CONSTRAINT asset_links_endpoint_b_fk FOREIGN KEY (tenant_id, branch_id, endpoint_b_port_id) REFERENCES asset_ports(tenant_id, branch_id, id) ON DELETE RESTRICT,
  CONSTRAINT asset_links_distinct_endpoints_ck CHECK (endpoint_a_port_id <> endpoint_b_port_id),
  CONSTRAINT asset_links_type_ck CHECK (link_type IN ('PHYSICAL','WIRELESS','LOGICAL')),
  CONSTRAINT asset_links_status_ck CHECK (status IN ('PLANNED','INSTALLED','ACTIVE','DEGRADED','INACTIVE','DECOMMISSIONED')),
  CONSTRAINT asset_links_medium_ck CHECK (medium IN ('COPPER','FIBER','WIRELESS','ELECTRICAL','AUDIO','LOGICAL','OTHER')),
  CONSTRAINT asset_links_dates_ck CHECK (decommissioned_at IS NULL OR installed_at IS NULL OR decommissioned_at >= installed_at)
);
CREATE UNIQUE INDEX asset_links_endpoint_pair_active_uq ON asset_links(
  tenant_id, branch_id, LEAST(endpoint_a_port_id, endpoint_b_port_id), GREATEST(endpoint_a_port_id, endpoint_b_port_id)
) WHERE active;
CREATE UNIQUE INDEX asset_links_endpoint_a_active_uq ON asset_links(tenant_id, branch_id, endpoint_a_port_id) WHERE active;
CREATE UNIQUE INDEX asset_links_endpoint_b_active_uq ON asset_links(tenant_id, branch_id, endpoint_b_port_id) WHERE active;
CREATE INDEX asset_links_endpoints_idx ON asset_links(tenant_id, branch_id, endpoint_a_port_id, endpoint_b_port_id, active);
--> statement-breakpoint

CREATE TABLE asset_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  source_asset_id uuid NOT NULL,
  target_asset_id uuid NOT NULL,
  relationship_type varchar(32) NOT NULL,
  status varchar(24) NOT NULL DEFAULT 'ACTIVE',
  description text,
  active boolean NOT NULL DEFAULT true,
  source_system_solution_id uuid,
  target_system_solution_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by varchar(255),
  updated_by varchar(255),
  CONSTRAINT asset_relationships_tenant_branch_id_uq UNIQUE (tenant_id, branch_id, id),
  CONSTRAINT asset_relationships_source_fk FOREIGN KEY (tenant_id, branch_id, source_asset_id) REFERENCES assets(tenant_id, branch_id, id) ON DELETE RESTRICT,
  CONSTRAINT asset_relationships_target_fk FOREIGN KEY (tenant_id, branch_id, target_asset_id) REFERENCES assets(tenant_id, branch_id, id) ON DELETE RESTRICT,
  CONSTRAINT asset_relationships_source_solution_fk FOREIGN KEY (tenant_id, branch_id, source_system_solution_id) REFERENCES system_solutions(tenant_id, branch_id, id) ON DELETE RESTRICT,
  CONSTRAINT asset_relationships_target_solution_fk FOREIGN KEY (tenant_id, branch_id, target_system_solution_id) REFERENCES system_solutions(tenant_id, branch_id, id) ON DELETE RESTRICT,
  CONSTRAINT asset_relationships_distinct_assets_ck CHECK (source_asset_id <> target_asset_id),
  CONSTRAINT asset_relationships_type_ck CHECK (relationship_type IN ('POWERED_BY','CONTROLLED_BY','RECORDED_BY','MONITORED_BY','HOSTED_ON','DEPENDS_ON','SERVES','BACKED_UP_BY','PARENT_OF','CONNECTED_TO','OTHER')),
  CONSTRAINT asset_relationships_status_ck CHECK (status IN ('PLANNED','ACTIVE','INACTIVE','DECOMMISSIONED'))
);
CREATE UNIQUE INDEX asset_relationships_directed_active_uq ON asset_relationships(tenant_id, branch_id, source_asset_id, target_asset_id, relationship_type) WHERE active AND relationship_type <> 'CONNECTED_TO';
CREATE UNIQUE INDEX asset_relationships_connected_active_uq ON asset_relationships(tenant_id, branch_id, LEAST(source_asset_id, target_asset_id), GREATEST(source_asset_id, target_asset_id)) WHERE active AND relationship_type = 'CONNECTED_TO';
CREATE INDEX asset_relationships_source_idx ON asset_relationships(tenant_id, branch_id, source_asset_id, active);
CREATE INDEX asset_relationships_target_idx ON asset_relationships(tenant_id, branch_id, target_asset_id, active);
--> statement-breakpoint

CREATE TABLE asset_topology_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  entity_type varchar(24) NOT NULL,
  entity_id uuid NOT NULL,
  event_type varchar(48) NOT NULL,
  actor_external_subject varchar(255),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT asset_topology_events_type_ck CHECK (entity_type IN ('PORT','LINK','RELATIONSHIP'))
);
CREATE INDEX asset_topology_events_entity_idx ON asset_topology_events(tenant_id, branch_id, entity_type, entity_id, created_at DESC);
--> statement-breakpoint

CREATE OR REPLACE FUNCTION horos_guard_topology_write() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (NEW.tenant_id, NEW.branch_id) IS DISTINCT FROM (OLD.tenant_id, OLD.branch_id) THEN
    RAISE EXCEPTION 'Topology tenant and branch are immutable' USING ERRCODE='23514';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER asset_ports_write_guard BEFORE UPDATE ON asset_ports FOR EACH ROW EXECUTE FUNCTION horos_guard_topology_write();
CREATE TRIGGER asset_links_write_guard BEFORE UPDATE ON asset_links FOR EACH ROW EXECUTE FUNCTION horos_guard_topology_write();
CREATE TRIGGER asset_relationships_write_guard BEFORE UPDATE ON asset_relationships FOR EACH ROW EXECUTE FUNCTION horos_guard_topology_write();

CREATE OR REPLACE FUNCTION horos_validate_asset_link() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE a_asset uuid; b_asset uuid; a_medium varchar; b_medium varchar; a_active boolean; b_active boolean;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.tenant_id::text || NEW.branch_id::text || ':asset-links', 0));
  SELECT asset_id, medium, active INTO STRICT a_asset, a_medium, a_active FROM asset_ports WHERE tenant_id=NEW.tenant_id AND branch_id=NEW.branch_id AND id=NEW.endpoint_a_port_id;
  SELECT asset_id, medium, active INTO STRICT b_asset, b_medium, b_active FROM asset_ports WHERE tenant_id=NEW.tenant_id AND branch_id=NEW.branch_id AND id=NEW.endpoint_b_port_id;
  IF a_asset=b_asset THEN RAISE EXCEPTION 'Same-asset links are not permitted' USING ERRCODE='23514'; END IF;
  IF NOT a_active OR NOT b_active THEN RAISE EXCEPTION 'Inactive ports cannot be linked' USING ERRCODE='23514'; END IF;
  IF NEW.medium<>a_medium OR NEW.medium<>b_medium THEN RAISE EXCEPTION 'Link medium is incompatible with endpoint ports' USING ERRCODE='23514'; END IF;
  IF NEW.active AND EXISTS (SELECT 1 FROM asset_links l WHERE l.tenant_id=NEW.tenant_id AND l.branch_id=NEW.branch_id AND l.active AND l.id<>NEW.id AND (l.endpoint_a_port_id IN (NEW.endpoint_a_port_id,NEW.endpoint_b_port_id) OR l.endpoint_b_port_id IN (NEW.endpoint_a_port_id,NEW.endpoint_b_port_id))) THEN
    RAISE EXCEPTION 'An endpoint port already has an active link' USING ERRCODE='23505';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER asset_links_validate BEFORE INSERT OR UPDATE OF tenant_id,branch_id,endpoint_a_port_id,endpoint_b_port_id,medium,active ON asset_links FOR EACH ROW WHEN (NEW.active) EXECUTE FUNCTION horos_validate_asset_link();

CREATE OR REPLACE FUNCTION horos_validate_asset_relationship() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE source_solution uuid; target_solution uuid; cycle_found boolean;
BEGIN
  IF NEW.active AND NEW.relationship_type='PARENT_OF' THEN PERFORM pg_advisory_xact_lock(hashtextextended(NEW.tenant_id::text || NEW.branch_id::text || ':parent-of', 0)); END IF;
  SELECT system_solution_id INTO STRICT source_solution FROM assets WHERE tenant_id=NEW.tenant_id AND branch_id=NEW.branch_id AND id=NEW.source_asset_id;
  SELECT system_solution_id INTO STRICT target_solution FROM assets WHERE tenant_id=NEW.tenant_id AND branch_id=NEW.branch_id AND id=NEW.target_asset_id;
  NEW.source_system_solution_id:=source_solution; NEW.target_system_solution_id:=target_solution;
  IF NEW.active AND NEW.relationship_type='PARENT_OF' THEN
    WITH RECURSIVE descendants(id) AS (
      SELECT target_asset_id FROM asset_relationships WHERE tenant_id=NEW.tenant_id AND branch_id=NEW.branch_id AND source_asset_id=NEW.target_asset_id AND relationship_type='PARENT_OF' AND active
      UNION SELECT ar.target_asset_id FROM asset_relationships ar JOIN descendants d ON ar.source_asset_id=d.id WHERE ar.tenant_id=NEW.tenant_id AND ar.branch_id=NEW.branch_id AND ar.relationship_type='PARENT_OF' AND ar.active
    ) SELECT EXISTS(SELECT 1 FROM descendants WHERE id=NEW.source_asset_id) INTO cycle_found;
    IF cycle_found THEN RAISE EXCEPTION 'PARENT_OF cycle is not permitted' USING ERRCODE='23514'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER asset_relationships_validate BEFORE INSERT OR UPDATE ON asset_relationships FOR EACH ROW EXECUTE FUNCTION horos_validate_asset_relationship();
--> statement-breakpoint

ALTER TABLE asset_ports ENABLE ROW LEVEL SECURITY; ALTER TABLE asset_ports FORCE ROW LEVEL SECURITY;
ALTER TABLE asset_links ENABLE ROW LEVEL SECURITY; ALTER TABLE asset_links FORCE ROW LEVEL SECURITY;
ALTER TABLE asset_relationships ENABLE ROW LEVEL SECURITY; ALTER TABLE asset_relationships FORCE ROW LEVEL SECURITY;
ALTER TABLE asset_topology_events ENABLE ROW LEVEL SECURITY; ALTER TABLE asset_topology_events FORCE ROW LEVEL SECURITY;

CREATE POLICY asset_ports_context_all ON asset_ports TO horos_runtime USING (tenant_id=NULLIF(current_setting('app.current_tenant_id',true),'')::uuid AND branch_id=NULLIF(current_setting('app.current_branch_id',true),'')::uuid) WITH CHECK (tenant_id=NULLIF(current_setting('app.current_tenant_id',true),'')::uuid AND branch_id=NULLIF(current_setting('app.current_branch_id',true),'')::uuid);
CREATE POLICY asset_links_context_all ON asset_links TO horos_runtime USING (tenant_id=NULLIF(current_setting('app.current_tenant_id',true),'')::uuid AND branch_id=NULLIF(current_setting('app.current_branch_id',true),'')::uuid) WITH CHECK (tenant_id=NULLIF(current_setting('app.current_tenant_id',true),'')::uuid AND branch_id=NULLIF(current_setting('app.current_branch_id',true),'')::uuid);
CREATE POLICY asset_relationships_context_all ON asset_relationships TO horos_runtime USING (tenant_id=NULLIF(current_setting('app.current_tenant_id',true),'')::uuid AND branch_id=NULLIF(current_setting('app.current_branch_id',true),'')::uuid) WITH CHECK (tenant_id=NULLIF(current_setting('app.current_tenant_id',true),'')::uuid AND branch_id=NULLIF(current_setting('app.current_branch_id',true),'')::uuid);
CREATE POLICY asset_topology_events_context_select ON asset_topology_events FOR SELECT TO horos_runtime USING (tenant_id=NULLIF(current_setting('app.current_tenant_id',true),'')::uuid AND branch_id=NULLIF(current_setting('app.current_branch_id',true),'')::uuid);
CREATE POLICY asset_topology_events_context_insert ON asset_topology_events FOR INSERT TO horos_runtime WITH CHECK (tenant_id=NULLIF(current_setting('app.current_tenant_id',true),'')::uuid AND branch_id=NULLIF(current_setting('app.current_branch_id',true),'')::uuid);

REVOKE ALL ON asset_ports,asset_links,asset_relationships,asset_topology_events FROM horos_runtime;
GRANT SELECT,INSERT ON asset_ports,asset_links,asset_relationships,asset_topology_events TO horos_runtime;
GRANT UPDATE(name,port_type,direction,medium,connector_type,status,sequence,description,active,updated_by) ON asset_ports TO horos_runtime;
GRANT UPDATE(name,status,description,installed_at,decommissioned_at,active,updated_by) ON asset_links TO horos_runtime;
GRANT UPDATE(status,description,active,updated_by) ON asset_relationships TO horos_runtime;
