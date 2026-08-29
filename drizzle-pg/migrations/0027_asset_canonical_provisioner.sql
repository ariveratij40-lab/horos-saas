-- ============================================================================
-- HOROS ONBOARD-003B
-- Canonical asset + system membership provisioning.
--
-- Atomicity is controlled by the caller transaction.
-- This function does not COMMIT or ROLLBACK.
-- ============================================================================

CREATE OR REPLACE FUNCTION horos_provision_asset_onboarding(
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

  v_item record;

  v_asset_id uuid;
  v_asset_type_id uuid;

  v_branch_id uuid;
  v_location_id uuid;
  v_space_id uuid;
  v_rack_id uuid;

  v_system_id uuid;
  v_branch_system_id uuid;
  v_membership_id uuid;

  v_existing boolean;

  v_processed integer := 0;
  v_created integer := 0;
  v_updated integer := 0;
  v_skipped integer := 0;

  v_asset_type text;
  v_asset_code text;
  v_asset_tag text;

  v_branch_code text;
  v_location_code text;
  v_space_code text;
  v_rack_code text;

  v_manufacturer text;
  v_model text;
  v_serial text;
  v_rfid text;

  v_system_code text;
  v_role text;
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
      'Asset provisioning requires tenant context'
      USING ERRCODE = '42501';
  END IF;

  IF v_context_tenant <> p_tenant_id THEN
    RAISE EXCEPTION
      'Asset provisioning tenant context mismatch'
      USING ERRCODE = '42501';
  END IF;


  -- ========================================================================
  -- SESSION
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
      'Asset provisioning requires validated session; current status is %',
      v_session_status
      USING ERRCODE = '23514';
  END IF;


  -- ========================================================================
  -- PROVISIONING RUN
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
  -- SCOPE
  -- ========================================================================

  IF EXISTS (
    SELECT 1
    FROM onboarding_items oi
    WHERE
      oi.tenant_id = p_tenant_id
      AND oi.session_id = p_session_id
      AND oi.status <> 'skipped'
      AND oi.entity_type NOT IN (
        'asset',
        'asset_system_membership'
      )
  ) THEN
    RAISE EXCEPTION
      'Asset provisioner received unsupported entity type'
      USING ERRCODE = '23514';
  END IF;


  PERFORM 1
  FROM onboarding_items
  WHERE
    tenant_id = p_tenant_id
    AND session_id = p_session_id
  ORDER BY sequence
  FOR UPDATE;


  UPDATE onboarding_sessions
  SET status = 'committing'
  WHERE
    tenant_id = p_tenant_id
    AND id = p_session_id;


  -- ========================================================================
  -- ASSETS
  -- ========================================================================

  FOR v_item IN
    SELECT *
    FROM onboarding_items
    WHERE
      tenant_id = p_tenant_id
      AND session_id = p_session_id
      AND entity_type = 'asset'
    ORDER BY sequence
  LOOP

    IF v_item.operation = 'skip'
       OR v_item.status = 'skipped'
    THEN

      UPDATE onboarding_items
      SET
        status = 'committed',
        committed_at = now()
      WHERE id = v_item.id;

      v_processed := v_processed + 1;
      v_skipped := v_skipped + 1;

      CONTINUE;
    END IF;


    v_asset_type :=
      NULLIF(
        trim(v_item.normalized_payload->>'assetType'),
        ''
      );

    v_asset_code :=
      NULLIF(
        trim(v_item.normalized_payload->>'assetCode'),
        ''
      );

    v_asset_tag :=
      NULLIF(
        trim(v_item.normalized_payload->>'assetTag'),
        ''
      );

    v_branch_code :=
      NULLIF(
        trim(v_item.normalized_payload->>'branchCode'),
        ''
      );

    v_location_code :=
      NULLIF(
        trim(v_item.normalized_payload->>'locationCode'),
        ''
      );

    v_space_code :=
      NULLIF(
        trim(v_item.normalized_payload->>'telecomSpaceCode'),
        ''
      );

    v_rack_code :=
      NULLIF(
        trim(v_item.normalized_payload->>'rackCode'),
        ''
      );

    v_manufacturer :=
      NULLIF(
        trim(v_item.normalized_payload->>'manufacturer'),
        ''
      );

    v_model :=
      NULLIF(
        trim(v_item.normalized_payload->>'model'),
        ''
      );

    v_serial :=
      NULLIF(
        trim(v_item.normalized_payload->>'serialNumber'),
        ''
      );

    v_rfid :=
      NULLIF(
        trim(v_item.normalized_payload->>'rfidEpc'),
        ''
      );


    -- ------------------------------------------------------------------------
    -- Asset type
    -- ------------------------------------------------------------------------

    SELECT id
    INTO v_asset_type_id
    FROM asset_types
    WHERE
      code = v_asset_type
      AND status = 'active';

    IF NOT FOUND THEN
      RAISE EXCEPTION
        'Unknown or inactive asset type: %',
        v_asset_type
        USING ERRCODE = '23503';
    END IF;


    -- ------------------------------------------------------------------------
    -- Branch
    -- ------------------------------------------------------------------------

    SELECT id
    INTO v_branch_id
    FROM branches
    WHERE
      tenant_id = p_tenant_id
      AND code = v_branch_code;

    IF NOT FOUND THEN
      RAISE EXCEPTION
        'Branch % not found for asset %',
        v_branch_code,
        v_asset_code
        USING ERRCODE = '23503';
    END IF;


    -- ------------------------------------------------------------------------
    -- Optional placement
    -- ------------------------------------------------------------------------

    v_location_id := NULL;
    v_space_id := NULL;
    v_rack_id := NULL;


    IF v_location_code IS NOT NULL THEN

      SELECT id
      INTO v_location_id
      FROM locations
      WHERE
        tenant_id = p_tenant_id
        AND branch_id = v_branch_id
        AND code = v_location_code;

      IF NOT FOUND THEN
        RAISE EXCEPTION
          'Location % not found for asset %',
          v_location_code,
          v_asset_code
          USING ERRCODE = '23503';
      END IF;

    END IF;


    IF v_space_code IS NOT NULL THEN

      SELECT id
      INTO v_space_id
      FROM telecom_spaces
      WHERE
        tenant_id = p_tenant_id
        AND branch_id = v_branch_id
        AND code = v_space_code;

      IF NOT FOUND THEN
        RAISE EXCEPTION
          'Telecom space % not found for asset %',
          v_space_code,
          v_asset_code
          USING ERRCODE = '23503';
      END IF;

    END IF;


    IF v_rack_code IS NOT NULL THEN

      SELECT id
      INTO v_rack_id
      FROM racks
      WHERE
        tenant_id = p_tenant_id
        AND branch_id = v_branch_id
        AND code = v_rack_code;

      IF NOT FOUND THEN
        RAISE EXCEPTION
          'Rack % not found for asset %',
          v_rack_code,
          v_asset_code
          USING ERRCODE = '23503';
      END IF;

    END IF;


    -- ------------------------------------------------------------------------
    -- Existing canonical asset
    -- ------------------------------------------------------------------------

    SELECT id
    INTO v_asset_id
    FROM assets
    WHERE
      tenant_id = p_tenant_id
      AND asset_code = v_asset_code;

    v_existing := FOUND;


    IF v_item.operation = 'create'
       AND v_existing
    THEN
      RAISE EXCEPTION
        'Asset % already exists',
        v_asset_code
        USING ERRCODE = '23505';
    END IF;


    IF v_item.operation = 'update'
       AND NOT v_existing
    THEN
      RAISE EXCEPTION
        'Asset % does not exist for update',
        v_asset_code
        USING ERRCODE = '23503';
    END IF;


    -- ------------------------------------------------------------------------
    -- Update / insert
    -- ------------------------------------------------------------------------

    IF v_existing THEN

      UPDATE assets
      SET
        asset_type_id = v_asset_type_id,
        branch_id = v_branch_id,
        location_id = v_location_id,
        telecom_space_id = v_space_id,
        rack_id = v_rack_id,
        asset_tag = v_asset_tag,
        manufacturer = v_manufacturer,
        model = v_model,
        serial_number = v_serial,
        rfid_epc = v_rfid,
        updated_at = now()
      WHERE
        tenant_id = p_tenant_id
        AND id = v_asset_id;

      v_updated := v_updated + 1;

    ELSE

      INSERT INTO assets (
        tenant_id,
        asset_type_id,
        branch_id,
        location_id,
        telecom_space_id,
        rack_id,
        asset_code,
        asset_tag,
        manufacturer,
        model,
        serial_number,
        rfid_epc
      )
      VALUES (
        p_tenant_id,
        v_asset_type_id,
        v_branch_id,
        v_location_id,
        v_space_id,
        v_rack_id,
        v_asset_code,
        v_asset_tag,
        v_manufacturer,
        v_model,
        v_serial,
        v_rfid
      )
      RETURNING id
      INTO v_asset_id;

      v_created := v_created + 1;

    END IF;


    UPDATE onboarding_items
    SET
      target_entity_id = v_asset_id,
      status = 'committed',
      committed_at = now()
    WHERE
      tenant_id = p_tenant_id
      AND id = v_item.id;


    v_processed := v_processed + 1;

  END LOOP;


  -- ========================================================================
  -- SYSTEM MEMBERSHIPS
  -- ========================================================================

  FOR v_item IN
    SELECT *
    FROM onboarding_items
    WHERE
      tenant_id = p_tenant_id
      AND session_id = p_session_id
      AND entity_type = 'asset_system_membership'
    ORDER BY sequence
  LOOP

    IF v_item.operation = 'skip'
       OR v_item.status = 'skipped'
    THEN

      UPDATE onboarding_items
      SET
        status = 'committed',
        committed_at = now()
      WHERE id = v_item.id;

      v_processed := v_processed + 1;
      v_skipped := v_skipped + 1;

      CONTINUE;
    END IF;


    v_asset_code :=
      NULLIF(
        trim(v_item.normalized_payload->>'assetCode'),
        ''
      );

    v_branch_code :=
      NULLIF(
        trim(v_item.normalized_payload->>'branchCode'),
        ''
      );

    v_system_code :=
      NULLIF(
        trim(v_item.normalized_payload->>'systemCode'),
        ''
      );

    v_role :=
      COALESCE(
        NULLIF(
          trim(v_item.normalized_payload->>'role'),
          ''
        ),
        'member'
      );


    SELECT id
    INTO v_asset_id
    FROM assets
    WHERE
      tenant_id = p_tenant_id
      AND asset_code = v_asset_code;

    IF NOT FOUND THEN
      RAISE EXCEPTION
        'Asset % not found for system membership',
        v_asset_code
        USING ERRCODE = '23503';
    END IF;


    SELECT id
    INTO v_branch_id
    FROM branches
    WHERE
      tenant_id = p_tenant_id
      AND code = v_branch_code;

    IF NOT FOUND THEN
      RAISE EXCEPTION
        'Branch % not found for system membership',
        v_branch_code
        USING ERRCODE = '23503';
    END IF;


    SELECT id
    INTO v_system_id
    FROM systems_catalog
    WHERE
      code = v_system_code
      AND status = 'active';

    IF NOT FOUND THEN
      RAISE EXCEPTION
        'System % is unknown or inactive',
        v_system_code
        USING ERRCODE = '23503';
    END IF;


    SELECT id
    INTO v_branch_system_id
    FROM branch_systems
    WHERE
      tenant_id = p_tenant_id
      AND branch_id = v_branch_id
      AND system_id = v_system_id
      AND status = 'enabled';

    IF NOT FOUND THEN
      RAISE EXCEPTION
        'System % is not enabled for branch %',
        v_system_code,
        v_branch_code
        USING ERRCODE = '23514';
    END IF;


    SELECT id
    INTO v_membership_id
    FROM asset_system_memberships
    WHERE
      tenant_id = p_tenant_id
      AND asset_id = v_asset_id
      AND branch_system_id = v_branch_system_id;

    v_existing := FOUND;


    IF v_item.operation = 'create'
       AND v_existing
    THEN
      RAISE EXCEPTION
        'Asset % already belongs to system %',
        v_asset_code,
        v_system_code
        USING ERRCODE = '23505';
    END IF;


    IF v_existing THEN

      UPDATE asset_system_memberships
      SET
        role = v_role,
        updated_at = now()
      WHERE
        tenant_id = p_tenant_id
        AND id = v_membership_id;

      v_updated := v_updated + 1;

    ELSE

      INSERT INTO asset_system_memberships (
        tenant_id,
        asset_id,
        branch_system_id,
        role
      )
      VALUES (
        p_tenant_id,
        v_asset_id,
        v_branch_system_id,
        v_role
      )
      RETURNING id
      INTO v_membership_id;

      v_created := v_created + 1;

    END IF;


    UPDATE onboarding_items
    SET
      target_entity_id = v_membership_id,
      status = 'committed',
      committed_at = now()
    WHERE
      tenant_id = p_tenant_id
      AND id = v_item.id;


    v_processed := v_processed + 1;

  END LOOP;


  -- ========================================================================
  -- ACCOUNTING
  -- ========================================================================

  IF v_processed <> (
    SELECT count(*)::integer
    FROM onboarding_items
    WHERE
      tenant_id = p_tenant_id
      AND session_id = p_session_id
  )
  THEN
    RAISE EXCEPTION
      'Asset provisioner did not account for every onboarding item'
      USING ERRCODE = '23514';
  END IF;


  UPDATE onboarding_provisioning_runs
  SET
    processed_items = v_processed,
    created_items = v_created,
    updated_items = v_updated,
    skipped_items = v_skipped,
    failed_items = 0
  WHERE
    tenant_id = p_tenant_id
    AND session_id = p_session_id
    AND id = p_run_id;


  UPDATE onboarding_sessions
  SET status = 'committed'
  WHERE
    tenant_id = p_tenant_id
    AND id = p_session_id;

END;
$$;


REVOKE ALL
ON FUNCTION horos_provision_asset_onboarding(
  uuid,
  uuid,
  uuid
)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION horos_provision_asset_onboarding(
  uuid,
  uuid,
  uuid
)
TO horos_runtime;
