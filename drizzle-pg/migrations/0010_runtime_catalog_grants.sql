-- HOROS CORE-001
-- Global platform catalogs are read-only for tenant runtime.

GRANT SELECT
ON systems_catalog,
   asset_types,
   subscription_plans
TO horos_runtime;
