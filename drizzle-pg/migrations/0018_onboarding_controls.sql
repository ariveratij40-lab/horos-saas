-- ============================================================================
-- HOROS ONBOARD-001B
-- State machine, audit integrity and immutability.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Domain checks
-- ----------------------------------------------------------------------------

ALTER TABLE onboarding_sessions
ADD CONSTRAINT onboarding_sessions_source_type_ck
CHECK (
  source_type IN (
    'wizard',
    'excel',
    'pdf'
  )
);

ALTER TABLE onboarding_sessions
ADD CONSTRAINT onboarding_sessions_status_ck
CHECK (
  status IN (
    'draft',
    'parsing',
    'normalized',
    'validating',
    'validated',
    'committing',
    'committed',
    'failed',
    'cancelled'
  )
);

ALTER TABLE onboarding_items
ADD CONSTRAINT onboarding_items_operation_ck
CHECK (
  operation IN (
    'create',
    'update',
    'upsert',
    'skip'
  )
);

ALTER TABLE onboarding_items
ADD CONSTRAINT onboarding_items_status_ck
CHECK (
  status IN (
    'pending',
    'normalized',
    'valid',
    'warning',
    'error',
    'skipped',
    'committed'
  )
);

ALTER TABLE onboarding_issues
ADD CONSTRAINT onboarding_issues_severity_ck
CHECK (
  severity IN (
    'warning',
    'error'
  )
);

ALTER TABLE onboarding_issues
ADD CONSTRAINT onboarding_issues_status_ck
CHECK (
  status IN (
    'open',
    'resolved',
    'ignored'
  )
);


-- ----------------------------------------------------------------------------
-- Session state machine
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION horos_validate_onboarding_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN

  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'draft'
     AND NEW.status IN (
       'parsing',
       'normalized',
       'failed',
       'cancelled'
     ) THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'parsing'
     AND NEW.status IN (
       'normalized',
       'failed'
     ) THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'normalized'
     AND NEW.status IN (
       'validating',
       'failed',
       'cancelled'
     ) THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'validating'
     AND NEW.status IN (
       'validated',
       'normalized',
       'failed'
     ) THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'validated'
     AND NEW.status IN (
       'committing',
       'normalized',
       'cancelled'
     ) THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'committing'
     AND NEW.status IN (
       'committed',
       'failed'
     ) THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'failed'
     AND NEW.status = 'draft' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION
    'Invalid onboarding state transition: % -> %',
    OLD.status,
    NEW.status
    USING ERRCODE = '23514';

END;
$$;


CREATE TRIGGER onboarding_sessions_state_transition_trg
BEFORE UPDATE OF status
ON onboarding_sessions
FOR EACH ROW
EXECUTE FUNCTION horos_validate_onboarding_transition();


-- ----------------------------------------------------------------------------
-- Lifecycle timestamp consistency
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION horos_apply_onboarding_lifecycle_timestamps()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN

  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'draft' THEN
      RAISE EXCEPTION
        'New onboarding sessions must start in draft status'
        USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
  END IF;


  IF NEW.status IS DISTINCT FROM OLD.status THEN

    IF NEW.status = 'parsing'
       AND NEW.started_at IS NULL THEN
      NEW.started_at := now();
    END IF;

    IF NEW.status = 'validated'
       AND NEW.validated_at IS NULL THEN
      NEW.validated_at := now();
    END IF;

    IF NEW.status = 'committed'
       AND NEW.committed_at IS NULL THEN
      NEW.committed_at := now();
    END IF;

    IF NEW.status = 'failed'
       AND NEW.failed_at IS NULL THEN
      NEW.failed_at := now();
    END IF;

    IF NEW.status = 'cancelled'
       AND NEW.cancelled_at IS NULL THEN
      NEW.cancelled_at := now();
    END IF;

  END IF;

  RETURN NEW;
END;
$$;


CREATE TRIGGER onboarding_sessions_lifecycle_timestamp_trg
BEFORE INSERT OR UPDATE OF status
ON onboarding_sessions
FOR EACH ROW
EXECUTE FUNCTION horos_apply_onboarding_lifecycle_timestamps();


-- ----------------------------------------------------------------------------
-- Audit user membership validation
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION horos_validate_onboarding_users()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN

  IF NEW.created_by_user_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM tenant_users tu
       WHERE
         tu.tenant_id = NEW.tenant_id
         AND tu.user_id = NEW.created_by_user_id
     ) THEN

    RAISE EXCEPTION
      'created_by_user_id does not belong to tenant'
      USING ERRCODE = '23514';

  END IF;


  IF NEW.committed_by_user_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM tenant_users tu
       WHERE
         tu.tenant_id = NEW.tenant_id
         AND tu.user_id = NEW.committed_by_user_id
     ) THEN

    RAISE EXCEPTION
      'committed_by_user_id does not belong to tenant'
      USING ERRCODE = '23514';

  END IF;

  RETURN NEW;

END;
$$;


CREATE TRIGGER onboarding_sessions_user_guard_trg
BEFORE INSERT OR UPDATE OF
  tenant_id,
  created_by_user_id,
  committed_by_user_id
ON onboarding_sessions
FOR EACH ROW
EXECUTE FUNCTION horos_validate_onboarding_users();


-- ----------------------------------------------------------------------------
-- Items cannot be changed once the session reaches committing/committed.
-- ----------------------------------------------------------------------------

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


CREATE TRIGGER onboarding_items_mutation_guard_trg
BEFORE INSERT OR UPDATE OR DELETE
ON onboarding_items
FOR EACH ROW
EXECUTE FUNCTION horos_guard_onboarding_item_mutation();


-- ----------------------------------------------------------------------------
-- Committed sessions themselves are immutable.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION horos_guard_committed_onboarding_session()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN

  IF OLD.status = 'committed' THEN
    RAISE EXCEPTION
      'Committed onboarding sessions are immutable'
      USING ERRCODE = '23514';
  END IF;

  IF OLD.status = 'cancelled' THEN
    RAISE EXCEPTION
      'Cancelled onboarding sessions are immutable'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;

END;
$$;


CREATE TRIGGER onboarding_sessions_terminal_immutability_trg
BEFORE UPDATE OR DELETE
ON onboarding_sessions
FOR EACH ROW
EXECUTE FUNCTION horos_guard_committed_onboarding_session();
