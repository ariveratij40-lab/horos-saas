-- HOROS MT-001
-- PostgreSQL fail-closed tenant isolation.

-- Runtime may read only the current tenant.
-- Runtime is not allowed to create/update/delete tenants.

GRANT SELECT
ON tenants
TO horos_runtime;

ALTER TABLE tenants
ENABLE ROW LEVEL SECURITY;

ALTER TABLE tenants
FORCE ROW LEVEL SECURITY;

CREATE POLICY tenants_current_tenant_select
ON tenants
FOR SELECT
TO horos_runtime
USING (
  id =
  NULLIF(
    current_setting(
      'app.current_tenant_id',
      true
    ),
    ''
  )::uuid
);


-- Runtime may read only users that belong to the current tenant.
-- User lifecycle remains a platform responsibility.

GRANT SELECT
ON users
TO horos_runtime;

ALTER TABLE users
ENABLE ROW LEVEL SECURITY;

ALTER TABLE users
FORCE ROW LEVEL SECURITY;


-- Membership is tenant-owned and may be managed inside the tenant.

GRANT SELECT, INSERT, UPDATE, DELETE
ON tenant_users
TO horos_runtime;

ALTER TABLE tenant_users
ENABLE ROW LEVEL SECURITY;

ALTER TABLE tenant_users
FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_users_tenant_isolation
ON tenant_users
FOR ALL
TO horos_runtime
USING (
  tenant_id =
  NULLIF(
    current_setting(
      'app.current_tenant_id',
      true
    ),
    ''
  )::uuid
)
WITH CHECK (
  tenant_id =
  NULLIF(
    current_setting(
      'app.current_tenant_id',
      true
    ),
    ''
  )::uuid
);


-- users RLS depends on valid membership in tenant_users.

CREATE POLICY users_current_tenant_members
ON users
FOR SELECT
TO horos_runtime
USING (
  EXISTS (
    SELECT 1
    FROM tenant_users tu
    WHERE tu.user_id = users.id
      AND tu.tenant_id =
        NULLIF(
          current_setting(
            'app.current_tenant_id',
            true
          ),
          ''
        )::uuid
      AND tu.is_active = true
  )
);
