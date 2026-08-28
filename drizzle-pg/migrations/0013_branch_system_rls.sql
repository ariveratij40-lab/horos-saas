GRANT SELECT, INSERT, UPDATE, DELETE
ON branch_systems
TO horos_runtime;

ALTER TABLE branch_systems
ENABLE ROW LEVEL SECURITY;

ALTER TABLE branch_systems
FORCE ROW LEVEL SECURITY;

CREATE POLICY branch_systems_tenant_isolation
ON branch_systems
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
