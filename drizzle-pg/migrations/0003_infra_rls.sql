GRANT SELECT, INSERT, UPDATE, DELETE
ON branches, locations, telecom_spaces, racks
TO horos_runtime;

ALTER TABLE branches
ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches
FORCE ROW LEVEL SECURITY;

CREATE POLICY branches_tenant_isolation
ON branches
FOR ALL
TO horos_runtime
USING (
  tenant_id =
  NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
)
WITH CHECK (
  tenant_id =
  NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
);

ALTER TABLE locations
ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations
FORCE ROW LEVEL SECURITY;

CREATE POLICY locations_tenant_isolation
ON locations
FOR ALL
TO horos_runtime
USING (
  tenant_id =
  NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
)
WITH CHECK (
  tenant_id =
  NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
);

ALTER TABLE telecom_spaces
ENABLE ROW LEVEL SECURITY;
ALTER TABLE telecom_spaces
FORCE ROW LEVEL SECURITY;

CREATE POLICY telecom_spaces_tenant_isolation
ON telecom_spaces
FOR ALL
TO horos_runtime
USING (
  tenant_id =
  NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
)
WITH CHECK (
  tenant_id =
  NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
);

ALTER TABLE racks
ENABLE ROW LEVEL SECURITY;
ALTER TABLE racks
FORCE ROW LEVEL SECURITY;

CREATE POLICY racks_tenant_isolation
ON racks
FOR ALL
TO horos_runtime
USING (
  tenant_id =
  NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
)
WITH CHECK (
  tenant_id =
  NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
);
