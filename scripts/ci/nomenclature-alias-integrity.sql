\set ON_ERROR_STOP on
BEGIN;

INSERT INTO tenants (id, code, name) VALUES
('81000000-0000-4000-8000-000000000001','ALIAS-A','Alias tenant A'),
('82000000-0000-4000-8000-000000000002','ALIAS-B','Alias tenant B');
INSERT INTO branches (id, tenant_id, code, name, timezone) VALUES
('81100000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000001','A1','Alias A1','UTC'),
('81100000-0000-4000-8000-000000000002','81000000-0000-4000-8000-000000000001','A2','Alias A2','UTC'),
('82200000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000002','B1','Alias B1','UTC');
INSERT INTO systems_catalog (id, code, name) VALUES ('83000000-0000-4000-8000-000000000001','ALIAS-CCTV','Alias CCTV');
INSERT INTO asset_types (id, code, name, category) VALUES ('84000000-0000-4000-8000-000000000001','ALIAS-CAMERA','Alias camera','security');
ALTER TABLE branch_systems DISABLE TRIGGER USER;
INSERT INTO branch_systems (id,tenant_id,branch_id,system_id) VALUES
('85000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000001','81100000-0000-4000-8000-000000000001','83000000-0000-4000-8000-000000000001'),
('85000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000002','82200000-0000-4000-8000-000000000001','83000000-0000-4000-8000-000000000001');
ALTER TABLE branch_systems ENABLE TRIGGER USER;
INSERT INTO system_solutions (id,tenant_id,branch_id,branch_system_id,code,name) VALUES
('86000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000001','81100000-0000-4000-8000-000000000001','85000000-0000-4000-8000-000000000001','CCTV-A-001','Nombre inicial'),
('86000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000002','82200000-0000-4000-8000-000000000001','85000000-0000-4000-8000-000000000002','CCTV-B-001','Tenant B');
INSERT INTO assets (id,tenant_id,branch_id,asset_type_id,asset_code,asset_tag,serial_number,rfid_epc) VALUES
('87000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000001','81100000-0000-4000-8000-000000000001','84000000-0000-4000-8000-000000000001','CAM-A-001','TAG-A','SERIAL-A','EPC-A'),
('87000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000002','82200000-0000-4000-8000-000000000001','84000000-0000-4000-8000-000000000001','CAM-B-001','TAG-B','SERIAL-B','EPC-B');

INSERT INTO system_solution_aliases (id,tenant_id,branch_id,system_solution_id,alias_type,alias_value,source) VALUES
('88000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000001','81100000-0000-4000-8000-000000000001','86000000-0000-4000-8000-000000000001','CUSTOMER_CODE','CAM-01 Almacén','customer'),
('88000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000002','82200000-0000-4000-8000-000000000001','86000000-0000-4000-8000-000000000002','CUSTOMER_CODE','CAM-01 Almacén','customer');
INSERT INTO asset_aliases (id,tenant_id,branch_id,asset_id,alias_type,alias_value,source) VALUES
('89000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000001','81100000-0000-4000-8000-000000000001','87000000-0000-4000-8000-000000000001','PHYSICAL_LABEL','Cámara / 01','field');

DO $$ BEGIN
  IF (SELECT count(*) FROM pg_class WHERE relkind = 'r' AND relname IN ('system_solution_aliases','asset_aliases','asset_alias_events')) <> 3 THEN RAISE EXCEPTION 'alias tables incomplete'; END IF;
  IF (SELECT count(*) FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid WHERE c.relname IN ('system_solution_aliases','asset_aliases') AND a.attname='normalized_value' AND a.attgenerated='s' AND NOT a.attisdropped) <> 2 THEN RAISE EXCEPTION 'generated alias columns incomplete'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='assets_tenant_branch_id_uq' AND contype='u') THEN RAISE EXCEPTION 'assets tenant branch unique missing'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='asset_aliases_tenant_id_id_uq' AND contype='u') THEN RAISE EXCEPTION 'asset alias tenant unique missing'; END IF;
  IF (SELECT count(*) FROM pg_constraint WHERE conname IN ('system_solution_aliases_entity_fk','asset_aliases_entity_fk','asset_alias_events_alias_fk') AND contype='f') <> 3 THEN RAISE EXCEPTION 'alias foreign keys incomplete'; END IF;
  IF (SELECT count(*) FROM pg_constraint WHERE conname IN ('system_solution_aliases_type_ck','system_solution_aliases_value_ck','system_solution_aliases_dates_ck','asset_aliases_type_ck','asset_aliases_value_ck','asset_aliases_dates_ck','asset_alias_events_type_ck') AND contype='c') <> 7 THEN RAISE EXCEPTION 'alias checks incomplete'; END IF;
  IF (SELECT count(*) FROM pg_indexes WHERE indexname IN ('system_solution_aliases_active_value_uq','asset_aliases_active_value_uq') AND indexdef ILIKE '%UNIQUE%' AND indexdef ILIKE '%WHERE active%') <> 2 THEN RAISE EXCEPTION 'active alias partial unique indexes incomplete'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='asset_alias_events_alias_idx' AND indexdef ILIKE '%tenant_id, asset_alias_id, created_at DESC%') THEN RAISE EXCEPTION 'asset alias event index mismatch'; END IF;
  IF horos_normalize_alias('  CAM-01  Almacén ') <> 'cam-01-almacen' THEN RAISE EXCEPTION 'normalization mismatch'; END IF;
  IF (SELECT count(*) FROM system_solutions WHERE branch_id='81100000-0000-4000-8000-000000000001' AND lower(code)=lower('CCTV-A-001')) <> 1 THEN RAISE EXCEPTION 'solution code resolution failed'; END IF;
  IF (SELECT count(*) FROM system_solution_aliases WHERE branch_id='81100000-0000-4000-8000-000000000001' AND active AND normalized_value=horos_normalize_alias('CAM/01 ALMACEN')) <> 1 THEN RAISE EXCEPTION 'solution alias resolution failed'; END IF;
  IF (SELECT count(*) FROM assets WHERE branch_id='81100000-0000-4000-8000-000000000001' AND lower(asset_code)=lower('CAM-A-001')) <> 1 THEN RAISE EXCEPTION 'asset code resolution failed'; END IF;
  IF (SELECT count(*) FROM asset_aliases WHERE branch_id='81100000-0000-4000-8000-000000000001' AND active AND normalized_value=horos_normalize_alias('camara-01')) <> 1 THEN RAISE EXCEPTION 'asset alias resolution failed'; END IF;
  BEGIN
    INSERT INTO system_solution_aliases (tenant_id,branch_id,system_solution_id,alias_type,alias_value,source)
    VALUES ('81000000-0000-4000-8000-000000000001','81100000-0000-4000-8000-000000000001','86000000-0000-4000-8000-000000000001','COMMON_NAME','cam/01 almacén','test');
    RAISE EXCEPTION 'normalized duplicate accepted'; EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN
    INSERT INTO asset_aliases (tenant_id,branch_id,asset_id,alias_type,alias_value,source)
    VALUES ('81000000-0000-4000-8000-000000000001','81100000-0000-4000-8000-000000000002','87000000-0000-4000-8000-000000000001','COMMON_NAME','wrong branch','test');
    RAISE EXCEPTION 'cross branch accepted'; EXCEPTION WHEN foreign_key_violation THEN NULL; END;
  BEGIN
    INSERT INTO asset_aliases (tenant_id,branch_id,asset_id,alias_type,alias_value,source)
    VALUES ('82000000-0000-4000-8000-000000000002','82200000-0000-4000-8000-000000000001','87000000-0000-4000-8000-000000000001','COMMON_NAME','cross tenant','test');
    RAISE EXCEPTION 'cross tenant accepted'; EXCEPTION WHEN foreign_key_violation THEN NULL; END;
  UPDATE system_solutions SET name='Nombre cambiado' WHERE id='86000000-0000-4000-8000-000000000001';
  IF (SELECT code FROM system_solutions WHERE id='86000000-0000-4000-8000-000000000001') <> 'CCTV-A-001' THEN RAISE EXCEPTION 'name changed canonical code'; END IF;
END $$;

UPDATE system_solution_aliases SET active=false WHERE id='88000000-0000-4000-8000-000000000001';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM system_solution_aliases WHERE id='88000000-0000-4000-8000-000000000001' AND NOT active AND valid_until IS NOT NULL) THEN RAISE EXCEPTION 'historical alias lost'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname IN ('system_solution_aliases','asset_aliases','asset_alias_events') AND relrowsecurity AND relforcerowsecurity GROUP BY relrowsecurity,relforcerowsecurity HAVING count(*)=3) THEN RAISE EXCEPTION 'alias RLS incomplete'; END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_roles r ON r.oid=c.relowner WHERE c.relname IN ('system_solution_aliases','asset_aliases','asset_alias_events') AND r.rolname='horos_runtime') THEN RAISE EXCEPTION 'runtime owns alias tables'; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='horos_runtime' AND rolbypassrls) THEN RAISE EXCEPTION 'runtime bypasses RLS'; END IF;
  IF has_table_privilege('horos_runtime','system_solution_aliases','DELETE') OR has_table_privilege('horos_runtime','asset_aliases','DELETE') THEN RAISE EXCEPTION 'runtime can delete aliases'; END IF;
  IF NOT has_table_privilege('horos_runtime','system_solution_aliases','SELECT,INSERT') OR NOT has_table_privilege('horos_runtime','asset_aliases','SELECT,INSERT') OR NOT has_table_privilege('horos_runtime','asset_alias_events','SELECT,INSERT') THEN RAISE EXCEPTION 'runtime alias grants incomplete'; END IF;
END $$;

SET LOCAL ROLE horos_runtime;
SELECT set_config('app.current_tenant_id','81000000-0000-4000-8000-000000000001',true);
DO $$ BEGIN
  IF (SELECT count(*) FROM asset_aliases) <> 1 THEN RAISE EXCEPTION 'tenant read isolation failed'; END IF;
  BEGIN DELETE FROM asset_aliases WHERE id='89000000-0000-4000-8000-000000000001'; RAISE EXCEPTION 'physical delete accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
ROLLBACK;
