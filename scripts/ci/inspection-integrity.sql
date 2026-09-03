\set ON_ERROR_STOP on
BEGIN;
DO $$ BEGIN
  IF (SELECT count(*) FROM pg_class WHERE relname IN ('asset_components','inspection_templates','inspection_template_items','inspections','inspection_results','inspection_events') AND relkind='r')<>6 THEN RAISE EXCEPTION 'inspection tables incomplete'; END IF;
  IF (SELECT count(*) FROM pg_class WHERE relname IN ('asset_components','inspection_templates','inspection_template_items','inspections','inspection_results','inspection_events') AND relrowsecurity AND relforcerowsecurity)<>6 THEN RAISE EXCEPTION 'inspection RLS incomplete'; END IF;
  IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_roles r ON r.oid=c.relowner WHERE (c.relname LIKE 'inspection%' OR c.relname='asset_components') AND r.rolname='horos_runtime') THEN RAISE EXCEPTION 'runtime owns tables'; END IF;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='horos_runtime' AND rolbypassrls) THEN RAISE EXCEPTION 'runtime bypasses RLS'; END IF;
  IF has_table_privilege('horos_runtime','asset_components','DELETE') OR has_table_privilege('horos_runtime','inspections','DELETE') OR has_table_privilege('horos_runtime','inspection_results','DELETE') THEN RAISE EXCEPTION 'runtime physical delete granted'; END IF;
  IF to_regclass('inspection_findings') IS NOT NULL OR to_regclass('checklist_findings') IS NOT NULL THEN RAISE EXCEPTION 'duplicate finding model exists'; END IF;
END $$;

INSERT INTO tenants(id,code,name) VALUES ('a1000000-0000-4000-8000-000000000001','INSP-A','Inspection A'),('a2000000-0000-4000-8000-000000000002','INSP-B','Inspection B');
INSERT INTO branches(id,tenant_id,code,name,timezone) VALUES
('a1100000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','A1','A1','UTC'),
('a1100000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000001','A2','A2','UTC'),
('a2200000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000002','B1','B1','UTC');
INSERT INTO users(id,external_subject,name) VALUES ('a3000000-0000-4000-8000-000000000001','inspection-test','Inspector');
INSERT INTO asset_types(id,code,name,category) VALUES ('a4000000-0000-4000-8000-000000000001','INSP-DEVICE','Inspection device','network');
INSERT INTO assets(id,tenant_id,branch_id,asset_type_id,asset_code) VALUES
('a5000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001','A-1'),
('a5000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000002','a4000000-0000-4000-8000-000000000001','A2-1'),
('a5000000-0000-4000-8000-000000000003','a2000000-0000-4000-8000-000000000002','a2200000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001','B-1');

INSERT INTO asset_components(id,tenant_id,branch_id,asset_id,code,name,component_type) VALUES ('a6000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000001','a5000000-0000-4000-8000-000000000001','PSU','Power supply','POWER_SUPPLY');
INSERT INTO asset_components(id,tenant_id,branch_id,asset_id,parent_component_id,code,name,component_type) VALUES ('a6000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000001','a5000000-0000-4000-8000-000000000001','a6000000-0000-4000-8000-000000000001','FAN','Fan','FAN');
DO $$ BEGIN
  BEGIN INSERT INTO asset_components(tenant_id,branch_id,asset_id,code,name,component_type) VALUES('a1000000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000001','a5000000-0000-4000-8000-000000000001','PSU','Duplicate','POWER'); RAISE EXCEPTION 'duplicate accepted'; EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN UPDATE asset_components SET parent_component_id='a6000000-0000-4000-8000-000000000002' WHERE id='a6000000-0000-4000-8000-000000000001'; RAISE EXCEPTION 'cycle accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN INSERT INTO asset_components(tenant_id,branch_id,asset_id,parent_component_id,code,name,component_type) VALUES('a1000000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000001','a5000000-0000-4000-8000-000000000002','a6000000-0000-4000-8000-000000000001','BAD','Bad parent','X'); RAISE EXCEPTION 'cross branch parent accepted'; EXCEPTION WHEN foreign_key_violation OR check_violation THEN NULL; END;
END $$;
UPDATE asset_components SET active=false,status='REPLACED',replaced_at=now() WHERE id='a6000000-0000-4000-8000-000000000001';
INSERT INTO asset_components(tenant_id,branch_id,asset_id,replaces_component_id,code,name,component_type) VALUES('a1000000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000001','a5000000-0000-4000-8000-000000000001','a6000000-0000-4000-8000-000000000001','PSU-2','Replacement PSU','POWER_SUPPLY');

INSERT INTO inspection_templates(id,tenant_id,branch_id,code,name) VALUES ('a7000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000001','PM-CAM','Camera PM');
DO $$ BEGIN BEGIN UPDATE inspection_templates SET status='PUBLISHED' WHERE id='a7000000-0000-4000-8000-000000000001'; RAISE EXCEPTION 'empty publish accepted'; EXCEPTION WHEN OTHERS THEN IF SQLERRM='empty publish accepted' THEN RAISE; END IF; END; END $$;
INSERT INTO inspection_template_items(id,tenant_id,branch_id,template_id,code,title,response_type,required,allow_not_applicable,options,sequence) VALUES
('a7100000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000001','a7000000-0000-4000-8000-000000000001','VISUAL','Visual condition','PASS_FAIL',true,false,NULL,0),
('a7100000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000001','a7000000-0000-4000-8000-000000000001','POWER','Power present','YES_NO',true,true,NULL,1),
('a7100000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000001','a7000000-0000-4000-8000-000000000001','MODE','Operating mode','SINGLE_CHOICE',true,false,'["day","night"]',2),
('a7100000-0000-4000-8000-000000000004','a1000000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000001','a7000000-0000-4000-8000-000000000001','NOTES','Notes','TEXT',false,false,NULL,3);
UPDATE inspection_templates SET status='PUBLISHED',published_at=now() WHERE id='a7000000-0000-4000-8000-000000000001';
DO $$ BEGIN
  BEGIN UPDATE inspection_templates SET name='Changed' WHERE id='a7000000-0000-4000-8000-000000000001'; RAISE EXCEPTION 'published edit accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN UPDATE inspection_template_items SET sequence=9 WHERE id='a7100000-0000-4000-8000-000000000001'; RAISE EXCEPTION 'published reorder accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
INSERT INTO inspection_templates(id,tenant_id,branch_id,code,name,version,previous_version_id) VALUES('a7000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000001','PM-CAM','Camera PM',2,'a7000000-0000-4000-8000-000000000001');

INSERT INTO inspections(id,tenant_id,branch_id,template_id,template_version,asset_id,inspector_user_id) VALUES('a8000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000001','a7000000-0000-4000-8000-000000000001',1,'a5000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001');
DO $$ BEGIN
  IF (SELECT count(*) FROM inspection_results WHERE inspection_id='a8000000-0000-4000-8000-000000000001')<>4 THEN RAISE EXCEPTION 'snapshot incomplete'; END IF;
  BEGIN INSERT INTO inspections(tenant_id,branch_id,template_id,template_version,inspector_user_id) VALUES('a1000000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000001','a7000000-0000-4000-8000-000000000002',2,'a3000000-0000-4000-8000-000000000001'); RAISE EXCEPTION 'draft template accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN UPDATE inspection_results SET response='"UNKNOWN"',outcome='PASS' WHERE inspection_id='a8000000-0000-4000-8000-000000000001' AND response_type_snapshot='SINGLE_CHOICE'; RAISE EXCEPTION 'unknown option accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN UPDATE inspection_results SET response='"yes"',outcome='PASS' WHERE inspection_id='a8000000-0000-4000-8000-000000000001' AND response_type_snapshot='YES_NO'; RAISE EXCEPTION 'wrong boolean accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN UPDATE inspection_results SET outcome='NOT_APPLICABLE',observation='n/a' WHERE inspection_id='a8000000-0000-4000-8000-000000000001' AND response_type_snapshot='PASS_FAIL'; RAISE EXCEPTION 'unauthorized N/A accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
UPDATE inspection_results SET response='"PASS"',outcome='PASS',inspected_by='a3000000-0000-4000-8000-000000000001' WHERE inspection_id='a8000000-0000-4000-8000-000000000001' AND response_type_snapshot='PASS_FAIL';
UPDATE inspection_results SET response='true',outcome='PASS',inspected_by='a3000000-0000-4000-8000-000000000001' WHERE inspection_id='a8000000-0000-4000-8000-000000000001' AND response_type_snapshot='YES_NO';
UPDATE inspection_results SET response='"day"',outcome='PASS',inspected_by='a3000000-0000-4000-8000-000000000001' WHERE inspection_id='a8000000-0000-4000-8000-000000000001' AND response_type_snapshot='SINGLE_CHOICE';
UPDATE inspections SET status='COMPLETED',completed_at=now() WHERE id='a8000000-0000-4000-8000-000000000001';
DO $$ BEGIN
  BEGIN UPDATE inspection_results SET observation='tampered' WHERE inspection_id='a8000000-0000-4000-8000-000000000001'; RAISE EXCEPTION 'completed result edit accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN UPDATE inspections SET status='IN_PROGRESS' WHERE id='a8000000-0000-4000-8000-000000000001'; RAISE EXCEPTION 'completed inspection reopened'; EXCEPTION WHEN check_violation THEN NULL; END;
END $$;

SET LOCAL ROLE horos_runtime;
SELECT set_config('app.current_tenant_id','a1000000-0000-4000-8000-000000000001',true),set_config('app.current_branch_id','a1100000-0000-4000-8000-000000000001',true);
DO $$ BEGIN
  IF (SELECT count(*) FROM asset_components)<>3 THEN RAISE EXCEPTION 'RLS branch read failed'; END IF;
  BEGIN DELETE FROM asset_components WHERE true; RAISE EXCEPTION 'runtime delete accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN INSERT INTO asset_components(tenant_id,branch_id,asset_id,code,name,component_type) VALUES('a2000000-0000-4000-8000-000000000002','a2200000-0000-4000-8000-000000000001','a5000000-0000-4000-8000-000000000003','BAD','Bad','X'); RAISE EXCEPTION 'cross tenant write accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
ROLLBACK;
