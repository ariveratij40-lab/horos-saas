GRANT SELECT, INSERT, UPDATE, DELETE
ON onboarding_provisioning_runs
TO horos_runtime;


ALTER TABLE onboarding_provisioning_runs
ENABLE ROW LEVEL SECURITY;

ALTER TABLE onboarding_provisioning_runs
FORCE ROW LEVEL SECURITY;


CREATE POLICY onboarding_provisioning_runs_tenant_isolation
ON onboarding_provisioning_runs
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
