-- ============================================================================
-- HOROS IDENTITY BOOTSTRAP RESOLVER
--
-- Purpose:
-- Resolve an authenticated external subject to exactly one active canonical
-- tenant before app.current_tenant_id exists.
--
-- Security model:
-- - horos_runtime receives EXECUTE only.
-- - horos_identity_resolver is NOLOGIN / NOSUPERUSER / NOBYPASSRLS.
-- - resolver role receives SELECT only on identity-bootstrap tables.
-- - RLS remains FORCE'd.
-- - dedicated policies expose only active identity rows to the resolver role.
-- - no mutation privileges are granted.
-- ============================================================================


-- ============================================================================
-- 1. REQUIRED ROLE ASSERTION
-- ============================================================================

DO $$
DECLARE
  v_bad integer;
BEGIN

  IF NOT EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname='horos_identity_resolver'
  ) THEN
    RAISE EXCEPTION
      'Required role horos_identity_resolver does not exist';
  END IF;

  SELECT count(*)
  INTO v_bad
  FROM pg_roles
  WHERE
    rolname='horos_identity_resolver'
    AND (
      rolsuper
      OR rolcanlogin
      OR rolcreatedb
      OR rolcreaterole
      OR rolbypassrls
    );

  IF v_bad <> 0 THEN
    RAISE EXCEPTION
      'horos_identity_resolver has unsafe role attributes';
  END IF;

END
$$;


-- ============================================================================
-- 2. SCHEMA ACCESS — NO CREATE
-- ============================================================================

GRANT USAGE
ON SCHEMA public
TO horos_identity_resolver;

REVOKE CREATE
ON SCHEMA public
FROM horos_identity_resolver;


-- ============================================================================
-- 3. MINIMUM TABLE PRIVILEGES
-- ============================================================================

GRANT SELECT
ON
  users,
  tenant_users,
  tenants
TO horos_identity_resolver;


-- ============================================================================
-- 4. RLS POLICIES FOR IDENTITY RESOLUTION
--
-- These policies are intentionally available only to the NOLOGIN resolver
-- role. Runtime itself receives no such policy.
-- ============================================================================

CREATE POLICY users_identity_resolver_select
ON users
FOR SELECT
TO horos_identity_resolver
USING (
  is_active = true
);


CREATE POLICY tenant_users_identity_resolver_select
ON tenant_users
FOR SELECT
TO horos_identity_resolver
USING (
  is_active = true
);


CREATE POLICY tenants_identity_resolver_select
ON tenants
FOR SELECT
TO horos_identity_resolver
USING (
  is_active = true
  AND status = 'active'
);


-- ============================================================================
-- 5. RESOLVER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION horos_resolve_tenant_identity(
  p_external_subject text
)
RETURNS TABLE (
  tenant_id uuid,
  tenant_code varchar,
  tenant_role varchar,
  external_subject varchar
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_subject text;
  v_count integer;
BEGIN

  v_subject :=
    NULLIF(
      btrim(p_external_subject),
      ''
    );

  IF v_subject IS NULL THEN
    RAISE EXCEPTION
      'Authenticated external subject is required'
      USING ERRCODE = '22023';
  END IF;


  SELECT count(*)::integer
  INTO v_count
  FROM users u
  JOIN tenant_users tu
    ON tu.user_id=u.id
  JOIN tenants t
    ON t.id=tu.tenant_id
  WHERE
    u.external_subject=v_subject
    AND u.is_active=true
    AND tu.is_active=true
    AND t.is_active=true
    AND t.status='active';


  IF v_count = 0 THEN
    RAISE EXCEPTION
      'No active canonical tenant membership found'
      USING ERRCODE = 'P0002';
  END IF;


  IF v_count <> 1 THEN
    RAISE EXCEPTION
      'Authenticated subject has ambiguous tenant membership'
      USING ERRCODE = '21000';
  END IF;


  RETURN QUERY

  SELECT
    t.id,
    t.code,
    tu.role,
    u.external_subject
  FROM users u
  JOIN tenant_users tu
    ON tu.user_id=u.id
  JOIN tenants t
    ON t.id=tu.tenant_id
  WHERE
    u.external_subject=v_subject
    AND u.is_active=true
    AND tu.is_active=true
    AND t.is_active=true
    AND t.status='active';

END;
$$;


-- ============================================================================
-- 6. LEAST-PRIVILEGE OWNER
-- ============================================================================

ALTER FUNCTION horos_resolve_tenant_identity(text)
OWNER TO horos_identity_resolver;


-- ============================================================================
-- 7. EXECUTION SURFACE
-- ============================================================================

REVOKE ALL
ON FUNCTION horos_resolve_tenant_identity(text)
FROM PUBLIC;

REVOKE ALL
ON FUNCTION horos_resolve_tenant_identity(text)
FROM horos_runtime;

GRANT EXECUTE
ON FUNCTION horos_resolve_tenant_identity(text)
TO horos_runtime;
