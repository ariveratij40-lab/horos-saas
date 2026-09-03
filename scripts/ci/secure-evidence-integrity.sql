\set ON_ERROR_STOP on
DO $$
DECLARE e uuid; t uuid := '10000000-0000-4000-8000-000000000001'; b uuid := '10000000-0000-4000-8000-000000000011'; o uuid := '10000000-0000-4000-8000-000000000101';
BEGIN
  INSERT INTO maintenance_evidence(tenant_id,branch_id,work_order_id,evidence_type,media_type,file_name,mime_type,storage_provider,storage_key,content_type_declared,content_type_detected,byte_size,sha256,status,uploaded_at,uploaded_by_user_id,source)
  SELECT t,b,o,'PHOTO','photo','verified.jpg','image/jpeg','LOCAL_PRIVATE','00000000-0000-4000-8000-000000000046.bin','image/jpeg','image/jpeg',3,repeat('a',64),'AVAILABLE',now(),u.id,'DIRECT_UPLOAD' FROM users u JOIN tenant_users tu ON tu.user_id=u.id AND tu.tenant_id=t LIMIT 1 RETURNING id INTO e;
  IF e IS NULL THEN RAISE EXCEPTION 'verified evidence fixture not inserted'; END IF;
  BEGIN UPDATE maintenance_evidence SET sha256=repeat('b',64) WHERE id=e; RAISE EXCEPTION 'available hash changed'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN UPDATE maintenance_evidence SET byte_size=4 WHERE id=e; RAISE EXCEPTION 'available size changed'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN UPDATE maintenance_evidence SET storage_key='overwrite.bin' WHERE id=e; RAISE EXCEPTION 'available key changed'; EXCEPTION WHEN check_violation THEN NULL; END;
END $$;

DO $$ DECLARE enabled boolean; forced boolean; owner_name name; bypass boolean;
BEGIN SELECT relrowsecurity,relforcerowsecurity,r.rolname INTO enabled,forced,owner_name FROM pg_class c JOIN pg_roles r ON r.oid=c.relowner WHERE c.oid='maintenance_evidence'::regclass;SELECT rolbypassrls INTO bypass FROM pg_roles WHERE rolname='horos_runtime';IF NOT enabled OR NOT forced OR bypass OR owner_name='horos_runtime' THEN RAISE EXCEPTION 'evidence RLS/ownership invariant failed';END IF;IF has_table_privilege('horos_runtime','maintenance_evidence','DELETE') OR has_column_privilege('horos_runtime','maintenance_evidence','sha256','INSERT') IS FALSE THEN RAISE EXCEPTION 'evidence grants invariant failed';END IF;END $$;

SET ROLE horos_runtime;
SELECT set_config('app.current_tenant_id','10000000-0000-4000-8000-000000000001',false);
SELECT set_config('app.current_branch_id','10000000-0000-4000-8000-000000000011',false);
DO $$ BEGIN BEGIN DELETE FROM maintenance_evidence; RAISE EXCEPTION 'runtime delete accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END; IF EXISTS(SELECT 1 FROM maintenance_evidence WHERE tenant_id<>'10000000-0000-4000-8000-000000000001'::uuid OR branch_id<>'10000000-0000-4000-8000-000000000011'::uuid) THEN RAISE EXCEPTION 'cross context evidence visible'; END IF; END $$;
RESET ROLE;
