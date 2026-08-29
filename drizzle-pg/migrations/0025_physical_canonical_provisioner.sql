-- ============================================================================
-- HOROS ONBOARD-002C
-- Transactional physical canonical provisioner.
--
-- Supported entity types:
--   branch
--   location
--   telecom_space
--   rack
--
-- Supported operations:
--   create
--   update
--   upsert
--   skip
--
-- The function itself does NOT commit.
-- The caller controls the PostgreSQL transaction boundary.
-- ============================================================================


CREATE OR REPLACE FUNCTION horos_provision_physical_onboarding(
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

  v_target_id uuid;
  v_branch_id uuid;
  v_location_id uuid;
  v_space_id uuid;

  v_existing boolean;

  v_processed integer := 0;
  v_created integer := 0;
  v_updated integer := 0;
  v_skipped integer := 0;

  v_code text;
  v_name text;
  v_branch_code text;
  v_location_code text;
  v_space_code text;

  v_timezone text;
  v_country_code text;
  v_state text;
  v_city text;
  v_address text;

  v_location_type text;
  v_space_type text;
  v_rack_type text;
  v_rack_units text;
BEGIN

  -- --------------------------------------------------------------------------
  -- Tenant context is mandatory even though this function is SECURITY DEFINER.
  -- --------------------------------------------------------------------------

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
      'Provisioning requires tenant context'
      USING ERRCODE = '42501';
  END IF;


  IF v_context_tenant <> p_tenant_id THEN
    RAISE EXCEPTION
      'Provisioning tenant context mismatch'
      USING ERRCODE = '42501';
  END IF;


  -- --------------------------------------------------------------------------
  -- Lock session.
  -- --------------------------------------------------------------------------

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
      'Physical provisioning requires validated session; current status is %',
      v_session_status
      USING ERRCODE = '23514';
  END IF;


  -- --------------------------------------------------------------------------
  -- Lock and validate provisioning run.
  -- --------------------------------------------------------------------------

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


  -- --------------------------------------------------------------------------
  -- Reject unsupported entity types before creating anything.
  -- --------------------------------------------------------------------------

  IF EXISTS (
    SELECT 1
    FROM onboarding_items oi
    WHERE
      oi.tenant_id = p_tenant_id
      AND oi.session_id = p_session_id
      AND oi.status <> 'skipped'
      AND oi.entity_type NOT IN (
        'branch',
        'location',
        'telecom_space',
        'rack'
      )
  ) THEN

    RAISE EXCEPTION
      'Physical provisioner received unsupported entity type'
      USING ERRCODE = '23514';

  END IF;


  -- Lock every staged item so the validated input set cannot change.
  PERFORM 1
  FROM onboarding_items
  WHERE
    tenant_id = p_tenant_id
    AND session_id = p_session_id
  ORDER BY sequence
  FOR UPDATE;


  -- Transition only after every prerequisite has passed.
  UPDATE onboarding_sessions
  SET status = 'committing'
  WHERE
    tenant_id = p_tenant_id
    AND id = p_session_id;


  -- ==========================================================================
  -- BRANCH
  -- ==========================================================================

  FOR v_item IN

    SELECT *
    FROM onboarding_items
    WHERE
      tenant_id = p_tenant_id
      AND session_id = p_session_id
      AND entity_type = 'branch'
    ORDER BY sequence

  LOOP

    IF v_item.operation = 'skip'
       OR v_item.status = 'skipped' THEN

      UPDATE onboarding_items
      SET
        status = 'committed',
        committed_at = now()
      WHERE id = v_item.id;

      v_processed := v_processed + 1;
      v_skipped := v_skipped + 1;

      CONTINUE;

    END IF;


    v_code :=
      NULLIF(
        trim(
          v_item.normalized_payload->>'code'
        ),
        ''
      );

    v_name :=
      NULLIF(
        trim(
          v_item.normalized_payload->>'name'
        ),
        ''
      );

    v_timezone :=
      NULLIF(
        trim(
          v_item.normalized_payload->>'timezone'
        ),
        ''
      );


    IF
      v_code IS NULL
      OR v_name IS NULL
      OR v_timezone IS NULL
    THEN

      RAISE EXCEPTION
        'Branch item % requires code, name and timezone',
        v_item.sequence
        USING ERRCODE = '23514';

    END IF;


    SELECT id
    INTO v_target_id
    FROM branches
    WHERE
      tenant_id = p_tenant_id
      AND code = v_code;


    v_existing := FOUND;


    IF v_item.operation = 'create'
       AND v_existing THEN

      RAISE EXCEPTION
        'Branch % already exists',
        v_code
        USING ERRCODE = '23505';

    END IF;


    IF v_item.operation = 'update'
       AND NOT v_existing THEN

      RAISE EXCEPTION
        'Branch % does not exist for update',
        v_code
        USING ERRCODE = '23503';

    END IF;


    v_country_code :=
      NULLIF(
        trim(
          v_item.normalized_payload->>'countryCode'
        ),
        ''
      );

    v_state :=
      NULLIF(
        trim(
          v_item.normalized_payload->>'state'
        ),
        ''
      );

    v_city :=
      NULLIF(
        trim(
          v_item.normalized_payload->>'city'
        ),
        ''
      );

    v_address :=
      NULLIF(
        trim(
          v_item.normalized_payload->>'address'
        ),
        ''
      );


    IF v_existing THEN

      UPDATE branches
      SET
        name = v_name,
        timezone = v_timezone,
        country_code = v_country_code,
        state = v_state,
        city = v_city,
        address = v_address,
        updated_at = now()
      WHERE id = v_target_id;

      v_updated := v_updated + 1;

    ELSE

      INSERT INTO branches (
        tenant_id,
        code,
        name,
        timezone,
        country_code,
        state,
        city,
        address
      )
      VALUES (
        p_tenant_id,
        v_code,
        v_name,
        v_timezone,
        v_country_code,
        v_state,
        v_city,
        v_address
      )
      RETURNING id
      INTO v_target_id;

      v_created := v_created + 1;

    END IF;


    UPDATE onboarding_items
    SET
      target_entity_id = v_target_id,
      status = 'committed',
      committed_at = now()
    WHERE id = v_item.id;


    v_processed := v_processed + 1;

  END LOOP;


  -- ==========================================================================
  -- LOCATION
  -- ==========================================================================

  FOR v_item IN

    SELECT *
    FROM onboarding_items
    WHERE
      tenant_id = p_tenant_id
      AND session_id = p_session_id
      AND entity_type = 'location'
    ORDER BY sequence

  LOOP

    IF v_item.operation = 'skip'
       OR v_item.status = 'skipped' THEN

      UPDATE onboarding_items
      SET
        status = 'committed',
        committed_at = now()
      WHERE id = v_item.id;

      v_processed := v_processed + 1;
      v_skipped := v_skipped + 1;

      CONTINUE;

    END IF;


    v_branch_code :=
      NULLIF(
        trim(
          v_item.normalized_payload->>'branchCode'
        ),
        ''
      );

    v_code :=
      NULLIF(
        trim(
          v_item.normalized_payload->>'code'
        ),
        ''
      );

    v_name :=
      NULLIF(
        trim(
          v_item.normalized_payload->>'name'
        ),
        ''
      );

    v_location_type :=
      NULLIF(
        trim(
          v_item.normalized_payload->>'locationType'
        ),
        ''
      );


    IF
      v_branch_code IS NULL
      OR v_code IS NULL
      OR v_name IS NULL
      OR v_location_type IS NULL
    THEN

      RAISE EXCEPTION
        'Location item % requires branchCode, code, name and locationType',
        v_item.sequence
        USING ERRCODE = '23514';

    END IF;


    SELECT id
    INTO v_branch_id
    FROM branches
    WHERE
      tenant_id = p_tenant_id
      AND code = v_branch_code;


    IF NOT FOUND THEN
      RAISE EXCEPTION
        'Branch % not found for location %',
        v_branch_code,
        v_code
        USING ERRCODE = '23503';
    END IF;


    SELECT id
    INTO v_target_id
    FROM locations
    WHERE
      tenant_id = p_tenant_id
      AND branch_id = v_branch_id
      AND code = v_code;


    v_existing := FOUND;


    IF v_item.operation = 'create'
       AND v_existing THEN

      RAISE EXCEPTION
        'Location % already exists in branch %',
        v_code,
        v_branch_code
        USING ERRCODE = '23505';

    END IF;


    IF v_item.operation = 'update'
       AND NOT v_existing THEN

      RAISE EXCEPTION
        'Location % does not exist for update',
        v_code
        USING ERRCODE = '23503';

    END IF;


    IF v_existing THEN

      UPDATE locations
      SET
        name = v_name,
        location_type = v_location_type,
        updated_at = now()
      WHERE id = v_target_id;

      v_updated := v_updated + 1;

    ELSE

      INSERT INTO locations (
        tenant_id,
        branch_id,
        location_type,
        code,
        name
      )
      VALUES (
        p_tenant_id,
        v_branch_id,
        v_location_type,
        v_code,
        v_name
      )
      RETURNING id
      INTO v_target_id;

      v_created := v_created + 1;

    END IF;


    UPDATE onboarding_items
    SET
      target_entity_id = v_target_id,
      status = 'committed',
      committed_at = now()
    WHERE id = v_item.id;


    v_processed := v_processed + 1;

  END LOOP;


  -- ==========================================================================
  -- TELECOM SPACE
  -- ==========================================================================

  FOR v_item IN

    SELECT *
    FROM onboarding_items
    WHERE
      tenant_id = p_tenant_id
      AND session_id = p_session_id
      AND entity_type = 'telecom_space'
    ORDER BY sequence

  LOOP

    IF v_item.operation = 'skip'
       OR v_item.status = 'skipped' THEN

      UPDATE onboarding_items
      SET
        status = 'committed',
        committed_at = now()
      WHERE id = v_item.id;

      v_processed := v_processed + 1;
      v_skipped := v_skipped + 1;

      CONTINUE;

    END IF;


    v_branch_code :=
      NULLIF(
        trim(
          v_item.normalized_payload->>'branchCode'
        ),
        ''
      );

    v_location_code :=
      NULLIF(
        trim(
          v_item.normalized_payload->>'locationCode'
        ),
        ''
      );

    v_code :=
      NULLIF(
        trim(
          v_item.normalized_payload->>'code'
        ),
        ''
      );

    v_name :=
      NULLIF(
        trim(
          v_item.normalized_payload->>'name'
        ),
        ''
      );

    v_space_type :=
      NULLIF(
        trim(
          v_item.normalized_payload->>'spaceType'
        ),
        ''
      );


    IF
      v_branch_code IS NULL
      OR v_location_code IS NULL
      OR v_code IS NULL
      OR v_name IS NULL
      OR v_space_type IS NULL
    THEN

      RAISE EXCEPTION
        'Telecom-space item % requires branchCode, locationCode, code, name and spaceType',
        v_item.sequence
        USING ERRCODE = '23514';

    END IF;


    SELECT id
    INTO v_branch_id
    FROM branches
    WHERE
      tenant_id = p_tenant_id
      AND code = v_branch_code;


    IF NOT FOUND THEN
      RAISE EXCEPTION
        'Branch % not found',
        v_branch_code
        USING ERRCODE = '23503';
    END IF;


    SELECT id
    INTO v_location_id
    FROM locations
    WHERE
      tenant_id = p_tenant_id
      AND branch_id = v_branch_id
      AND code = v_location_code;


    IF NOT FOUND THEN
      RAISE EXCEPTION
        'Location % not found in branch %',
        v_location_code,
        v_branch_code
        USING ERRCODE = '23503';
    END IF;


    SELECT id
    INTO v_target_id
    FROM telecom_spaces
    WHERE
      tenant_id = p_tenant_id
      AND branch_id = v_branch_id
      AND code = v_code;


    v_existing := FOUND;


    IF v_item.operation = 'create'
       AND v_existing THEN

      RAISE EXCEPTION
        'Telecom space % already exists',
        v_code
        USING ERRCODE = '23505';

    END IF;


    IF v_item.operation = 'update'
       AND NOT v_existing THEN

      RAISE EXCEPTION
        'Telecom space % does not exist for update',
        v_code
        USING ERRCODE = '23503';

    END IF;


    IF v_existing THEN

      UPDATE telecom_spaces
      SET
        location_id = v_location_id,
        name = v_name,
        space_type = v_space_type,
        updated_at = now()
      WHERE id = v_target_id;

      v_updated := v_updated + 1;

    ELSE

      INSERT INTO telecom_spaces (
        tenant_id,
        branch_id,
        location_id,
        code,
        name,
        space_type
      )
      VALUES (
        p_tenant_id,
        v_branch_id,
        v_location_id,
        v_code,
        v_name,
        v_space_type
      )
      RETURNING id
      INTO v_target_id;

      v_created := v_created + 1;

    END IF;


    UPDATE onboarding_items
    SET
      target_entity_id = v_target_id,
      status = 'committed',
      committed_at = now()
    WHERE id = v_item.id;


    v_processed := v_processed + 1;

  END LOOP;


  -- ==========================================================================
  -- RACK
  -- ==========================================================================

  FOR v_item IN

    SELECT *
    FROM onboarding_items
    WHERE
      tenant_id = p_tenant_id
      AND session_id = p_session_id
      AND entity_type = 'rack'
    ORDER BY sequence

  LOOP

    IF v_item.operation = 'skip'
       OR v_item.status = 'skipped' THEN

      UPDATE onboarding_items
      SET
        status = 'committed',
        committed_at = now()
      WHERE id = v_item.id;

      v_processed := v_processed + 1;
      v_skipped := v_skipped + 1;

      CONTINUE;

    END IF;


    v_branch_code :=
      NULLIF(
        trim(
          v_item.normalized_payload->>'branchCode'
        ),
        ''
      );

    v_space_code :=
      NULLIF(
        trim(
          v_item.normalized_payload->>'telecomSpaceCode'
        ),
        ''
      );

    v_code :=
      NULLIF(
        trim(
          v_item.normalized_payload->>'code'
        ),
        ''
      );

    v_name :=
      NULLIF(
        trim(
          v_item.normalized_payload->>'name'
        ),
        ''
      );

    v_rack_type :=
      COALESCE(
        NULLIF(
          trim(
            v_item.normalized_payload->>'rackType'
          ),
          ''
        ),
        'rack'
      );

    v_rack_units :=
      NULLIF(
        trim(
          v_item.normalized_payload->>'rackUnits'
        ),
        ''
      );


    IF
      v_branch_code IS NULL
      OR v_space_code IS NULL
      OR v_code IS NULL
      OR v_name IS NULL
    THEN

      RAISE EXCEPTION
        'Rack item % requires branchCode, telecomSpaceCode, code and name',
        v_item.sequence
        USING ERRCODE = '23514';

    END IF;


    SELECT id
    INTO v_branch_id
    FROM branches
    WHERE
      tenant_id = p_tenant_id
      AND code = v_branch_code;


    IF NOT FOUND THEN
      RAISE EXCEPTION
        'Branch % not found',
        v_branch_code
        USING ERRCODE = '23503';
    END IF;


    SELECT id
    INTO v_space_id
    FROM telecom_spaces
    WHERE
      tenant_id = p_tenant_id
      AND branch_id = v_branch_id
      AND code = v_space_code;


    IF NOT FOUND THEN
      RAISE EXCEPTION
        'Telecom space % not found in branch %',
        v_space_code,
        v_branch_code
        USING ERRCODE = '23503';
    END IF;


    SELECT id
    INTO v_target_id
    FROM racks
    WHERE
      tenant_id = p_tenant_id
      AND telecom_space_id = v_space_id
      AND code = v_code;


    v_existing := FOUND;


    IF v_item.operation = 'create'
       AND v_existing THEN

      RAISE EXCEPTION
        'Rack % already exists',
        v_code
        USING ERRCODE = '23505';

    END IF;


    IF v_item.operation = 'update'
       AND NOT v_existing THEN

      RAISE EXCEPTION
        'Rack % does not exist for update',
        v_code
        USING ERRCODE = '23503';

    END IF;


    IF v_existing THEN

      UPDATE racks
      SET
        name = v_name,
        rack_type = v_rack_type,
        rack_units = v_rack_units,
        updated_at = now()
      WHERE id = v_target_id;

      v_updated := v_updated + 1;

    ELSE

      INSERT INTO racks (
        tenant_id,
        branch_id,
        telecom_space_id,
        code,
        name,
        rack_type,
        rack_units
      )
      VALUES (
        p_tenant_id,
        v_branch_id,
        v_space_id,
        v_code,
        v_name,
        v_rack_type,
        v_rack_units
      )
      RETURNING id
      INTO v_target_id;

      v_created := v_created + 1;

    END IF;


    UPDATE onboarding_items
    SET
      target_entity_id = v_target_id,
      status = 'committed',
      committed_at = now()
    WHERE id = v_item.id;


    v_processed := v_processed + 1;

  END LOOP;


  -- --------------------------------------------------------------------------
  -- Every staged row must have been accounted for.
  -- --------------------------------------------------------------------------

  IF v_processed <> (
    SELECT count(*)::integer
    FROM onboarding_items
    WHERE
      tenant_id = p_tenant_id
      AND session_id = p_session_id
  ) THEN

    RAISE EXCEPTION
      'Physical provisioner did not account for every onboarding item'
      USING ERRCODE = '23514';

  END IF;


  -- Run counters participate in the same canonical transaction.
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


  -- Session becomes terminal in the same transaction as the canonical writes.
  UPDATE onboarding_sessions
  SET status = 'committed'
  WHERE
    tenant_id = p_tenant_id
    AND id = p_session_id;

END;
$$;


REVOKE ALL
ON FUNCTION horos_provision_physical_onboarding(
  uuid,
  uuid,
  uuid
)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION horos_provision_physical_onboarding(
  uuid,
  uuid,
  uuid
)
TO horos_runtime;
