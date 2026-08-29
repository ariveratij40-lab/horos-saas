-- ============================================================================
-- HOROS SEC-002
-- Least-privilege SECURITY DEFINER ownership.
--
-- horos_provisioner:
--   NOLOGIN
--   NOSUPERUSER
--   NOBYPASSRLS
--   NOCREATEDB
--   NOCREATEROLE
--
-- Provisioning remains tenant-scoped through FORCE ROW LEVEL SECURITY.
-- ============================================================================


-- ============================================================================
-- 1. FAIL CLOSED IF THE EXTERNAL ROLE IS MISSING OR UNSAFE
-- ============================================================================

DO $$
DECLARE
  v_role record;
BEGIN

  SELECT
    rolname,
    rolsuper,
    rolbypassrls,
    rolcanlogin,
    rolcreaterole,
    rolcreatedb
  INTO v_role
  FROM pg_roles
  WHERE rolname = 'horos_provisioner';


  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Required role horos_provisioner does not exist'
      USING ERRCODE = '42501';
  END IF;


  IF
    v_role.rolsuper
    OR v_role.rolbypassrls
    OR v_role.rolcanlogin
    OR v_role.rolcreaterole
    OR v_role.rolcreatedb
  THEN
    RAISE EXCEPTION
      'horos_provisioner has unsafe role attributes'
      USING ERRCODE = '42501';
  END IF;

END
$$;


-- ============================================================================
-- 2. SCHEMA ACCESS
-- ============================================================================

GRANT USAGE
ON SCHEMA public
TO horos_provisioner;


-- ============================================================================
-- 3. GLOBAL READ-ONLY CATALOGS
-- ============================================================================

GRANT SELECT
ON
  asset_types,
  systems_catalog
TO horos_provisioner;


-- ============================================================================
-- 4. PHYSICAL CANONICAL PRIVILEGES
-- ============================================================================

GRANT SELECT, INSERT, UPDATE
ON
  branches,
  locations,
  telecom_spaces,
  racks
TO horos_provisioner;


-- ============================================================================
-- 5. SYSTEM / ASSET PRIVILEGES
-- ============================================================================

GRANT SELECT
ON branch_systems
TO horos_provisioner;

GRANT SELECT, INSERT, UPDATE
ON
  assets,
  asset_system_memberships
TO horos_provisioner;


-- ============================================================================
-- 6. ONBOARDING PRIVILEGES
-- ============================================================================

GRANT SELECT, UPDATE
ON
  onboarding_sessions,
  onboarding_items,
  onboarding_provisioning_runs
TO horos_provisioner;


-- Indirect dependency:
-- onboarding_sessions -> commit readiness trigger ->
-- horos_validate_onboarding_commit_readiness() ->
-- onboarding_issues.
GRANT SELECT
ON onboarding_issues
TO horos_provisioner;


-- ============================================================================
-- 7. PROVISIONER RLS — PHYSICAL
-- ============================================================================

CREATE POLICY branches_provisioner_tenant_isolation
ON branches
FOR ALL
TO horos_provisioner
USING (
  tenant_id =
  NULLIF(
    current_setting('app.current_tenant_id', true),
    ''
  )::uuid
)
WITH CHECK (
  tenant_id =
  NULLIF(
    current_setting('app.current_tenant_id', true),
    ''
  )::uuid
);


CREATE POLICY locations_provisioner_tenant_isolation
ON locations
FOR ALL
TO horos_provisioner
USING (
  tenant_id =
  NULLIF(
    current_setting('app.current_tenant_id', true),
    ''
  )::uuid
)
WITH CHECK (
  tenant_id =
  NULLIF(
    current_setting('app.current_tenant_id', true),
    ''
  )::uuid
);


CREATE POLICY telecom_spaces_provisioner_tenant_isolation
ON telecom_spaces
FOR ALL
TO horos_provisioner
USING (
  tenant_id =
  NULLIF(
    current_setting('app.current_tenant_id', true),
    ''
  )::uuid
)
WITH CHECK (
  tenant_id =
  NULLIF(
    current_setting('app.current_tenant_id', true),
    ''
  )::uuid
);


CREATE POLICY racks_provisioner_tenant_isolation
ON racks
FOR ALL
TO horos_provisioner
USING (
  tenant_id =
  NULLIF(
    current_setting('app.current_tenant_id', true),
    ''
  )::uuid
)
WITH CHECK (
  tenant_id =
  NULLIF(
    current_setting('app.current_tenant_id', true),
    ''
  )::uuid
);


-- ============================================================================
-- 8. PROVISIONER RLS — SYSTEM / ASSETS
-- ============================================================================

CREATE POLICY branch_systems_provisioner_tenant_isolation
ON branch_systems
FOR ALL
TO horos_provisioner
USING (
  tenant_id =
  NULLIF(
    current_setting('app.current_tenant_id', true),
    ''
  )::uuid
)
WITH CHECK (
  tenant_id =
  NULLIF(
    current_setting('app.current_tenant_id', true),
    ''
  )::uuid
);


CREATE POLICY assets_provisioner_tenant_isolation
ON assets
FOR ALL
TO horos_provisioner
USING (
  tenant_id =
  NULLIF(
    current_setting('app.current_tenant_id', true),
    ''
  )::uuid
)
WITH CHECK (
  tenant_id =
  NULLIF(
    current_setting('app.current_tenant_id', true),
    ''
  )::uuid
);


CREATE POLICY asset_system_memberships_provisioner_tenant_isolation
ON asset_system_memberships
FOR ALL
TO horos_provisioner
USING (
  tenant_id =
  NULLIF(
    current_setting('app.current_tenant_id', true),
    ''
  )::uuid
)
WITH CHECK (
  tenant_id =
  NULLIF(
    current_setting('app.current_tenant_id', true),
    ''
  )::uuid
);


-- ============================================================================
-- 9. PROVISIONER RLS — ONBOARDING
-- ============================================================================

CREATE POLICY onboarding_sessions_provisioner_tenant_isolation
ON onboarding_sessions
FOR ALL
TO horos_provisioner
USING (
  tenant_id =
  NULLIF(
    current_setting('app.current_tenant_id', true),
    ''
  )::uuid
)
WITH CHECK (
  tenant_id =
  NULLIF(
    current_setting('app.current_tenant_id', true),
    ''
  )::uuid
);


CREATE POLICY onboarding_items_provisioner_tenant_isolation
ON onboarding_items
FOR ALL
TO horos_provisioner
USING (
  tenant_id =
  NULLIF(
    current_setting('app.current_tenant_id', true),
    ''
  )::uuid
)
WITH CHECK (
  tenant_id =
  NULLIF(
    current_setting('app.current_tenant_id', true),
    ''
  )::uuid
);


CREATE POLICY onboarding_provisioning_runs_provisioner_tenant_isolation
ON onboarding_provisioning_runs
FOR ALL
TO horos_provisioner
USING (
  tenant_id =
  NULLIF(
    current_setting('app.current_tenant_id', true),
    ''
  )::uuid
)
WITH CHECK (
  tenant_id =
  NULLIF(
    current_setting('app.current_tenant_id', true),
    ''
  )::uuid
);


-- ============================================================================
-- 10. REPLACE INTERNAL ONBOARDING ITEM CHANNEL
--
-- Old implementation trusted "current_user = table owner".
-- New implementation trusts only the dedicated NOLOGIN provisioner role.
-- ============================================================================

CREATE OR REPLACE FUNCTION horos_guard_onboarding_item_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_session_status varchar(32);
  v_tenant_id uuid;
  v_session_id uuid;
BEGIN

  IF TG_OP = 'DELETE' THEN
    v_tenant_id := OLD.tenant_id;
    v_session_id := OLD.session_id;
  ELSE
    v_tenant_id := NEW.tenant_id;
    v_session_id := NEW.session_id;
  END IF;


  SELECT status
  INTO v_session_status
  FROM onboarding_sessions
  WHERE
    tenant_id = v_tenant_id
    AND id = v_session_id;


  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Onboarding session not found'
      USING ERRCODE = '23503';
  END IF;


  IF v_session_status IN (
    'committing',
    'committed',
    'cancelled'
  ) THEN

    IF
      v_session_status = 'committing'
      AND TG_OP = 'UPDATE'
      AND current_user = 'horos_provisioner'
    THEN
      RETURN NEW;
    END IF;


    RAISE EXCEPTION
      'Onboarding items are immutable while session status is %',
      v_session_status
      USING ERRCODE = '23514';

  END IF;


  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;

END;
$$;


-- ============================================================================
-- 11. TRANSFER SECURITY DEFINER OWNERSHIP
--
-- PostgreSQL requires the future function owner to have CREATE on the schema
-- during ownership transfer. Grant it only for the transfer window and revoke
-- immediately afterward.
-- ============================================================================

GRANT CREATE
ON SCHEMA public
TO horos_provisioner;


ALTER FUNCTION horos_provision_onboarding(
  uuid,
  uuid,
  uuid
)
OWNER TO horos_provisioner;


ALTER FUNCTION horos_provision_physical_worker(
  uuid,
  uuid,
  uuid
)
OWNER TO horos_provisioner;


ALTER FUNCTION horos_provision_asset_worker(
  uuid,
  uuid,
  uuid
)
OWNER TO horos_provisioner;


REVOKE CREATE
ON SCHEMA public
FROM horos_provisioner;


-- ============================================================================
-- 12. FINAL EXECUTION SURFACE
-- ============================================================================

REVOKE ALL
ON FUNCTION horos_provision_onboarding(
  uuid,
  uuid,
  uuid
)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION horos_provision_onboarding(
  uuid,
  uuid,
  uuid
)
TO horos_runtime;


REVOKE ALL
ON FUNCTION horos_provision_physical_worker(
  uuid,
  uuid,
  uuid
)
FROM PUBLIC;


REVOKE ALL
ON FUNCTION horos_provision_asset_worker(
  uuid,
  uuid,
  uuid
)
FROM PUBLIC;


REVOKE EXECUTE
ON FUNCTION horos_provision_physical_worker(
  uuid,
  uuid,
  uuid
)
FROM horos_runtime;


REVOKE EXECUTE
ON FUNCTION horos_provision_asset_worker(
  uuid,
  uuid,
  uuid
)
FROM horos_runtime;
