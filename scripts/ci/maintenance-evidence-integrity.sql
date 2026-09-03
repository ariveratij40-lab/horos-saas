\set ON_ERROR_STOP on

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'horos_runtime') THEN
    CREATE ROLE horos_runtime NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
END
$$;

ALTER ROLE horos_runtime NOBYPASSRLS;

DO $$
DECLARE
  tenant_a uuid := '10000000-0000-4000-8000-000000000001';
  tenant_b uuid := '20000000-0000-4000-8000-000000000002';
  branch_a uuid := '10000000-0000-4000-8000-000000000011';
  branch_b uuid := '20000000-0000-4000-8000-000000000022';
  order_a uuid := '10000000-0000-4000-8000-000000000101';
  order_b uuid := '10000000-0000-4000-8000-000000000102';
  order_tenant_b uuid := '20000000-0000-4000-8000-000000000201';
  finding_a uuid := '10000000-0000-4000-8000-000000000111';
  finding_b uuid := '10000000-0000-4000-8000-000000000112';
BEGIN
  INSERT INTO tenants (id, code, name)
  VALUES (tenant_a, 'stab-a', 'STAB tenant A'), (tenant_b, 'stab-b', 'STAB tenant B');

  INSERT INTO users(id, external_subject, name)
  VALUES ('10000000-0000-4000-8000-000000000099', 'stab-evidence-user', 'STAB evidence user');
  INSERT INTO tenant_users(tenant_id,user_id,role)
  VALUES (tenant_a,'10000000-0000-4000-8000-000000000099','admin');

  INSERT INTO branches (id, tenant_id, code, name, timezone)
  VALUES
    (branch_a, tenant_a, 'stab-a', 'STAB branch A', 'UTC'),
    (branch_b, tenant_b, 'stab-b', 'STAB branch B', 'UTC');

  INSERT INTO maintenance_work_orders
    (id, tenant_id, branch_id, work_order_number, title)
  VALUES
    (order_a, tenant_a, branch_a, 'STAB-A-1', 'STAB order A1'),
    (order_b, tenant_a, branch_a, 'STAB-A-2', 'STAB order A2'),
    (order_tenant_b, tenant_b, branch_b, 'STAB-B-1', 'STAB order B1');

  INSERT INTO maintenance_findings (id, tenant_id, work_order_id, title)
  VALUES
    (finding_a, tenant_a, order_a, 'Finding A1'),
    (finding_b, tenant_a, order_b, 'Finding A2');

  INSERT INTO maintenance_evidence
    (tenant_id, branch_id, work_order_id, finding_id, file_name, storage_provider, storage_key, source, uploaded_at)
  VALUES
    (tenant_a, branch_a, order_a, finding_a, 'valid.jpg', 'legacy', 'stab/valid.jpg', 'LEGACY', now());

  BEGIN
    INSERT INTO maintenance_evidence
      (tenant_id, branch_id, work_order_id, finding_id, file_name, storage_provider, storage_key, source, uploaded_at)
    VALUES
      (tenant_a, branch_a, order_a, finding_b, 'cross-order.jpg', 'legacy', 'stab/cross-order.jpg', 'LEGACY', now());
    RAISE EXCEPTION 'cross-order finding was accepted';
  EXCEPTION
    WHEN foreign_key_violation THEN NULL;
  END;
END
$$;

DO $$
DECLARE
  enabled boolean;
  forced boolean;
  table_owner name;
  runtime_bypass boolean;
BEGIN
  SELECT c.relrowsecurity, c.relforcerowsecurity, r.rolname
  INTO enabled, forced, table_owner
  FROM pg_class c
  JOIN pg_roles r ON r.oid = c.relowner
  WHERE c.oid = 'maintenance_evidence'::regclass;

  SELECT rolbypassrls INTO runtime_bypass
  FROM pg_roles WHERE rolname = 'horos_runtime';

  IF NOT enabled OR NOT forced THEN
    RAISE EXCEPTION 'maintenance_evidence RLS is not enabled and forced';
  END IF;
  IF runtime_bypass THEN
    RAISE EXCEPTION 'horos_runtime has BYPASSRLS';
  END IF;
  IF table_owner = 'horos_runtime' THEN
    RAISE EXCEPTION 'horos_runtime owns maintenance_evidence';
  END IF;
  IF has_column_privilege('horos_runtime', 'maintenance_evidence', 'storage_key', 'UPDATE') THEN
    RAISE EXCEPTION 'horos_runtime can update immutable storage key';
  END IF;
END
$$;

SET ROLE horos_runtime;
SELECT set_config('app.current_tenant_id', '10000000-0000-4000-8000-000000000001', false);
SELECT set_config('app.current_branch_id', '10000000-0000-4000-8000-000000000011', false);

DO $$
BEGIN
  BEGIN
    INSERT INTO maintenance_evidence
      (tenant_id, branch_id, work_order_id, file_name, storage_provider, storage_key, source, uploaded_at)
    VALUES
      (
        '20000000-0000-4000-8000-000000000002',
        '20000000-0000-4000-8000-000000000022',
        '20000000-0000-4000-8000-000000000201',
        'cross-tenant.jpg',
        'legacy', 'stab/cross-tenant.jpg', 'LEGACY', now()
      );
    RAISE EXCEPTION 'cross-tenant evidence was accepted';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
END
$$;

RESET ROLE;
