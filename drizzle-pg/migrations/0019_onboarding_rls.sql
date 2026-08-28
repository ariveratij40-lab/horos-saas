GRANT SELECT, INSERT, UPDATE, DELETE
ON
  onboarding_sessions,
  onboarding_items,
  onboarding_issues
TO horos_runtime;


ALTER TABLE onboarding_sessions
ENABLE ROW LEVEL SECURITY;

ALTER TABLE onboarding_sessions
FORCE ROW LEVEL SECURITY;

CREATE POLICY onboarding_sessions_tenant_isolation
ON onboarding_sessions
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


ALTER TABLE onboarding_items
ENABLE ROW LEVEL SECURITY;

ALTER TABLE onboarding_items
FORCE ROW LEVEL SECURITY;

CREATE POLICY onboarding_items_tenant_isolation
ON onboarding_items
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


ALTER TABLE onboarding_issues
ENABLE ROW LEVEL SECURITY;

ALTER TABLE onboarding_issues
FORCE ROW LEVEL SECURITY;

CREATE POLICY onboarding_issues_tenant_isolation
ON onboarding_issues
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
