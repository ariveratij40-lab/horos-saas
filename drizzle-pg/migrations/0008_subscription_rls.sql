-- HOROS CORE-001B
-- Tenant runtime may see commercial state but may not alter it.

GRANT SELECT
ON subscription_plans
TO horos_runtime;

GRANT SELECT
ON subscriptions, tenant_system_entitlements
TO horos_runtime;


ALTER TABLE subscriptions
ENABLE ROW LEVEL SECURITY;

ALTER TABLE subscriptions
FORCE ROW LEVEL SECURITY;

CREATE POLICY subscriptions_tenant_select
ON subscriptions
FOR SELECT
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
);


ALTER TABLE tenant_system_entitlements
ENABLE ROW LEVEL SECURITY;

ALTER TABLE tenant_system_entitlements
FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_system_entitlements_tenant_select
ON tenant_system_entitlements
FOR SELECT
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
);
