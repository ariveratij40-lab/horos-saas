-- ============================================================================
-- HOROS ONBOARD-002B
-- Provisioning run lifecycle, concurrency and integrity.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Domain constraints
-- ----------------------------------------------------------------------------

ALTER TABLE onboarding_provisioning_runs
ADD CONSTRAINT onboarding_provisioning_runs_status_ck
CHECK (
  status IN (
    'pending',
    'running',
    'committed',
    'failed'
  )
);


ALTER TABLE onboarding_provisioning_runs
ADD CONSTRAINT onboarding_provisioning_runs_attempt_positive_ck
CHECK (
  attempt_number > 0
);


ALTER TABLE onboarding_provisioning_runs
ADD CONSTRAINT onboarding_provisioning_runs_counts_nonnegative_ck
CHECK (
  total_items >= 0
  AND processed_items >= 0
  AND created_items >= 0
  AND updated_items >= 0
  AND skipped_items >= 0
  AND failed_items >= 0
);


ALTER TABLE onboarding_provisioning_runs
ADD CONSTRAINT onboarding_provisioning_runs_processed_limit_ck
CHECK (
  processed_items <= total_items
);


ALTER TABLE onboarding_provisioning_runs
ADD CONSTRAINT onboarding_provisioning_runs_outcome_limit_ck
CHECK (
  created_items
  + updated_items
  + skipped_items
  + failed_items
  <= total_items
);


-- ----------------------------------------------------------------------------
-- Only one active provisioning attempt for a session.
--
-- Failed/committed attempts remain as history and do not block retries.
-- ----------------------------------------------------------------------------

CREATE UNIQUE INDEX
onboarding_provisioning_runs_one_active_uq
ON onboarding_provisioning_runs (
  tenant_id,
  session_id
)
WHERE status IN (
  'pending',
  'running'
);


-- ----------------------------------------------------------------------------
-- New run validation.
--
-- A run can only be created against a VALIDATED session.
-- The attempt number must be sequential.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION horos_validate_new_provisioning_run()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_session_status varchar(32);
  v_expected_attempt integer;
BEGIN

  IF NEW.status <> 'pending' THEN
    RAISE EXCEPTION
      'New provisioning runs must start in pending status'
      USING ERRCODE = '23514';
  END IF;


  SELECT status
  INTO v_session_status
  FROM onboarding_sessions
  WHERE
    tenant_id = NEW.tenant_id
    AND id = NEW.session_id
  FOR UPDATE;


  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Onboarding session not found'
      USING ERRCODE = '23503';
  END IF;


  IF v_session_status <> 'validated' THEN
    RAISE EXCEPTION
      'Provisioning run requires validated session; current status is %',
      v_session_status
      USING ERRCODE = '23514';
  END IF;


  SELECT
    COALESCE(
      max(attempt_number),
      0
    ) + 1
  INTO v_expected_attempt
  FROM onboarding_provisioning_runs
  WHERE
    tenant_id = NEW.tenant_id
    AND session_id = NEW.session_id;


  IF NEW.attempt_number <> v_expected_attempt THEN
    RAISE EXCEPTION
      'Invalid provisioning attempt number: expected %, received %',
      v_expected_attempt,
      NEW.attempt_number
      USING ERRCODE = '23514';
  END IF;


  NEW.total_items := (
    SELECT count(*)::integer
    FROM onboarding_items
    WHERE
      tenant_id = NEW.tenant_id
      AND session_id = NEW.session_id
  );


  RETURN NEW;

END;
$$;


CREATE TRIGGER onboarding_provisioning_runs_insert_guard_trg
BEFORE INSERT
ON onboarding_provisioning_runs
FOR EACH ROW
EXECUTE FUNCTION horos_validate_new_provisioning_run();


-- ----------------------------------------------------------------------------
-- Identity is immutable.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION horos_guard_provisioning_run_identity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN

  IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
    RAISE EXCEPTION
      'Provisioning run tenant_id is immutable'
      USING ERRCODE = '23514';
  END IF;


  IF NEW.session_id IS DISTINCT FROM OLD.session_id THEN
    RAISE EXCEPTION
      'Provisioning run session_id is immutable'
      USING ERRCODE = '23514';
  END IF;


  IF NEW.attempt_number IS DISTINCT FROM OLD.attempt_number THEN
    RAISE EXCEPTION
      'Provisioning run attempt_number is immutable'
      USING ERRCODE = '23514';
  END IF;


  IF NEW.total_items IS DISTINCT FROM OLD.total_items THEN
    RAISE EXCEPTION
      'Provisioning run total_items is immutable'
      USING ERRCODE = '23514';
  END IF;


  RETURN NEW;

END;
$$;


CREATE TRIGGER onboarding_provisioning_runs_identity_guard_trg
BEFORE UPDATE OF
  tenant_id,
  session_id,
  attempt_number,
  total_items
ON onboarding_provisioning_runs
FOR EACH ROW
EXECUTE FUNCTION horos_guard_provisioning_run_identity();


-- ----------------------------------------------------------------------------
-- State machine.
--
-- pending -> running
-- running -> committed | failed
--
-- committed / failed are terminal.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION horos_validate_provisioning_run_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_session_status varchar(32);
BEGIN

  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;


  IF OLD.status = 'pending'
     AND NEW.status = 'running' THEN

    SELECT status
    INTO v_session_status
    FROM onboarding_sessions
    WHERE
      tenant_id = OLD.tenant_id
      AND id = OLD.session_id;


    IF v_session_status <> 'validated' THEN
      RAISE EXCEPTION
        'Provisioning run can start only while session is validated; current status is %',
        v_session_status
        USING ERRCODE = '23514';
    END IF;


    IF NEW.started_at IS NULL THEN
      NEW.started_at := now();
    END IF;

    RETURN NEW;

  END IF;


  IF OLD.status = 'running'
     AND NEW.status = 'committed' THEN

    SELECT status
    INTO v_session_status
    FROM onboarding_sessions
    WHERE
      tenant_id = OLD.tenant_id
      AND id = OLD.session_id;


    IF v_session_status <> 'committed' THEN
      RAISE EXCEPTION
        'Provisioning run cannot commit before onboarding session commits; session status is %',
        v_session_status
        USING ERRCODE = '23514';
    END IF;


    IF NEW.failed_items <> 0 THEN
      RAISE EXCEPTION
        'Committed provisioning run cannot contain failed items'
        USING ERRCODE = '23514';
    END IF;


    IF NEW.processed_items <> NEW.total_items THEN
      RAISE EXCEPTION
        'Committed provisioning run must process all items'
        USING ERRCODE = '23514';
    END IF;


    IF (
      NEW.created_items
      + NEW.updated_items
      + NEW.skipped_items
    ) <> NEW.total_items THEN
      RAISE EXCEPTION
        'Committed provisioning run outcome totals do not match total_items'
        USING ERRCODE = '23514';
    END IF;


    IF NEW.finished_at IS NULL THEN
      NEW.finished_at := now();
    END IF;

    RETURN NEW;

  END IF;


  IF OLD.status = 'running'
     AND NEW.status = 'failed' THEN

    IF NEW.finished_at IS NULL THEN
      NEW.finished_at := now();
    END IF;

    RETURN NEW;

  END IF;


  RAISE EXCEPTION
    'Invalid provisioning run transition: % -> %',
    OLD.status,
    NEW.status
    USING ERRCODE = '23514';

END;
$$;


CREATE TRIGGER onboarding_provisioning_runs_state_transition_trg
BEFORE UPDATE OF status
ON onboarding_provisioning_runs
FOR EACH ROW
EXECUTE FUNCTION horos_validate_provisioning_run_transition();


-- ----------------------------------------------------------------------------
-- Terminal runs cannot be modified or deleted.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION horos_guard_terminal_provisioning_run()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN

  IF OLD.status IN (
    'committed',
    'failed'
  ) THEN
    RAISE EXCEPTION
      'Terminal provisioning run is immutable'
      USING ERRCODE = '23514';
  END IF;


  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;

END;
$$;


CREATE TRIGGER onboarding_provisioning_runs_terminal_guard_trg
BEFORE UPDATE OR DELETE
ON onboarding_provisioning_runs
FOR EACH ROW
EXECUTE FUNCTION horos_guard_terminal_provisioning_run();
