-- ============================================================================
-- HOROS ONBOARD-004
-- Unified canonical onboarding orchestrator.
--
-- Single lifecycle owner.
-- Single caller transaction.
-- Physical and asset workers remain internal.
-- ============================================================================

CREATE OR REPLACE FUNCTION horos_provision_onboarding(
  p_tenant_id uuid,
  p_session_id uuid,
  p_run_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE

  v_context_tenant uuid;

  v_session_status varchar(32);
  v_run_status varchar(32);

  v_total_items integer := 0;
  v_committed_items integer := 0;

  v_created integer := 0;
  v_updated integer := 0;
  v_skipped integer := 0;

BEGIN

  -- ========================================================================
  -- TENANT CONTEXT
  -- ========================================================================

  v_context_tenant :=
    NULLIF(
      current_setting(
        'app.current_tenant_id',
        true
      ),
      ''
    )::uuid;

  IF v_context_tenant IS NULL THEN

    RAISE EXCEPTION
      'Unified provisioning requires tenant context'
      USING ERRCODE = '42501';

  END IF;

  IF v_context_tenant <> p_tenant_id THEN

    RAISE EXCEPTION
      'Unified provisioning tenant context mismatch'
      USING ERRCODE = '42501';

  END IF;


  -- ========================================================================
  -- LOCK SESSION
  -- ========================================================================

  SELECT status
  INTO v_session_status
  FROM onboarding_sessions
  WHERE
    tenant_id = p_tenant_id
    AND id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN

    RAISE EXCEPTION
      'Onboarding session not found'
      USING ERRCODE = '23503';

  END IF;

  IF v_session_status <> 'validated' THEN

    RAISE EXCEPTION
      'Unified provisioning requires validated session; current status is %',
      v_session_status
      USING ERRCODE = '23514';

  END IF;


  -- ========================================================================
  -- LOCK RUN
  -- ========================================================================

  SELECT status
  INTO v_run_status
  FROM onboarding_provisioning_runs
  WHERE
    tenant_id = p_tenant_id
    AND session_id = p_session_id
    AND id = p_run_id
  FOR UPDATE;

  IF NOT FOUND THEN

    RAISE EXCEPTION
      'Provisioning run not found'
      USING ERRCODE = '23503';

  END IF;

  IF v_run_status <> 'running' THEN

    RAISE EXCEPTION
      'Provisioning run must be running; current status is %',
      v_run_status
      USING ERRCODE = '23514';

  END IF;


  -- ========================================================================
  -- LOCK INPUT SET
  -- ========================================================================

  PERFORM 1
  FROM onboarding_items
  WHERE
    tenant_id = p_tenant_id
    AND session_id = p_session_id
  ORDER BY sequence
  FOR UPDATE;


  SELECT count(*)::integer
  INTO v_total_items
  FROM onboarding_items
  WHERE
    tenant_id = p_tenant_id
    AND session_id = p_session_id;

  IF v_total_items = 0 THEN

    RAISE EXCEPTION
      'Cannot provision empty onboarding session'
      USING ERRCODE = '23514';

  END IF;


  -- ========================================================================
  -- UNIFIED CONTRACT
  -- ========================================================================

  IF EXISTS (

    SELECT 1
    FROM onboarding_items
    WHERE
      tenant_id = p_tenant_id
      AND session_id = p_session_id
      AND entity_type NOT IN (
        'branch',
        'location',
        'telecom_space',
        'rack',
        'asset',
        'asset_system_membership'
      )

  ) THEN

    RAISE EXCEPTION
      'Unified provisioner received unsupported entity type'
      USING ERRCODE = '23514';

  END IF;


  -- ========================================================================
  -- SINGLE LIFECYCLE OWNER
  -- ========================================================================

  UPDATE onboarding_sessions
  SET status = 'committing'
  WHERE
    tenant_id = p_tenant_id
    AND id = p_session_id;


  -- ========================================================================
  -- INTERNAL WORKERS
  --
  -- No worker owns terminal lifecycle or aggregate run counters.
  -- Any failure aborts this complete caller transaction.
  -- ========================================================================

  PERFORM horos_provision_physical_worker(
    p_tenant_id,
    p_session_id,
    p_run_id
  );

  PERFORM horos_provision_asset_worker(
    p_tenant_id,
    p_session_id,
    p_run_id
  );


  -- ========================================================================
  -- FINAL ITEM INVARIANT
  -- ========================================================================

  SELECT count(*)::integer
  INTO v_committed_items
  FROM onboarding_items
  WHERE
    tenant_id = p_tenant_id
    AND session_id = p_session_id
    AND status = 'committed';

  IF v_committed_items <> v_total_items THEN

    RAISE EXCEPTION
      'Unified provisioning finished with uncommitted items: expected %, committed %',
      v_total_items,
      v_committed_items
      USING ERRCODE = '23514';

  END IF;


  -- ========================================================================
  -- AGGREGATE RUN ACCOUNTING
  -- ========================================================================

  SELECT

    count(*) FILTER (
      WHERE
        operation = 'create'
        AND status = 'committed'
        AND target_entity_id IS NOT NULL
    )::integer,

    count(*) FILTER (
      WHERE
        operation = 'update'
        AND status = 'committed'
    )::integer,

    count(*) FILTER (
      WHERE
        operation = 'skip'
        OR (
          status = 'committed'
          AND target_entity_id IS NULL
        )
    )::integer

  INTO
    v_created,
    v_updated,
    v_skipped

  FROM onboarding_items
  WHERE
    tenant_id = p_tenant_id
    AND session_id = p_session_id;


  UPDATE onboarding_provisioning_runs
  SET
    processed_items = v_total_items,
    created_items = v_created,
    updated_items = v_updated,
    skipped_items = v_skipped,
    failed_items = 0
  WHERE
    tenant_id = p_tenant_id
    AND session_id = p_session_id
    AND id = p_run_id;


  -- ========================================================================
  -- TERMINAL SESSION STATE
  -- ========================================================================

  UPDATE onboarding_sessions
  SET status = 'committed'
  WHERE
    tenant_id = p_tenant_id
    AND id = p_session_id;


  UPDATE onboarding_provisioning_runs
  SET status = 'committed'
  WHERE
    tenant_id = p_tenant_id
    AND session_id = p_session_id
    AND id = p_run_id;

END;
$$;


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
