GRANT SELECT, INSERT, UPDATE, DELETE
ON assets, asset_system_memberships
TO horos_runtime;

ALTER TABLE assets
ENABLE ROW LEVEL SECURITY;

ALTER TABLE assets
FORCE ROW LEVEL SECURITY;

CREATE POLICY assets_tenant_isolation
ON assets
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


ALTER TABLE asset_system_memberships
ENABLE ROW LEVEL SECURITY;

ALTER TABLE asset_system_memberships
FORCE ROW LEVEL SECURITY;

CREATE POLICY asset_system_memberships_tenant_isolation
ON asset_system_memberships
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
