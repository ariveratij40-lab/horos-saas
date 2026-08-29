-- ============================================================================
-- HOROS ONBOARD-002C
-- Controlled internal mutation channel.
--
-- Runtime users remain unable to mutate items during COMMITTING.
-- SECURITY DEFINER provisioning functions execute as the table owner and
-- may update existing items only.
-- ============================================================================

CREATE OR REPLACE FUNCTION horos_guard_onboarding_item_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_session_status varchar(32);
  v_tenant_id uuid;
  v_session_id uuid;
  v_table_owner name;
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

    SELECT pg_get_userbyid(c.relowner)
    INTO v_table_owner
    FROM pg_class c
    WHERE c.oid = 'onboarding_items'::regclass;


    -- Only an internal SECURITY DEFINER execution may UPDATE
    -- items while the session is COMMITTING.
    IF
      v_session_status = 'committing'
      AND TG_OP = 'UPDATE'
      AND current_user = v_table_owner
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
