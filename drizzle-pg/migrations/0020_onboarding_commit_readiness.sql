-- ============================================================================
-- HOROS ONBOARD-001B.2
-- Source-aware state machine, counters and commit readiness.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Session identity cannot be rewritten after creation.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION horos_guard_onboarding_session_identity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN

  IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
    RAISE EXCEPTION
      'onboarding session tenant_id is immutable'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.source_type IS DISTINCT FROM OLD.source_type THEN
    RAISE EXCEPTION
      'onboarding session source_type is immutable'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;

END;
$$;


CREATE TRIGGER onboarding_sessions_identity_guard_trg
BEFORE UPDATE OF
  tenant_id,
  source_type
ON onboarding_sessions
FOR EACH ROW
EXECUTE FUNCTION horos_guard_onboarding_session_identity();


-- ----------------------------------------------------------------------------
-- Source-aware state machine.
--
-- Wizard:
--   draft -> normalized
--
-- Excel / PDF:
--   draft -> parsing -> normalized
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION horos_validate_onboarding_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN

  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;


  -- Terminal states.
  IF OLD.status IN (
    'committed',
    'cancelled'
  ) THEN
    RAISE EXCEPTION
      'Terminal onboarding session cannot transition: % -> %',
      OLD.status,
      NEW.status
      USING ERRCODE = '23514';
  END IF;


  -- Draft behavior depends on source.
  IF OLD.status = 'draft' THEN

    IF NEW.status IN (
      'failed',
      'cancelled'
    ) THEN
      RETURN NEW;
    END IF;

    IF OLD.source_type = 'wizard'
       AND NEW.status = 'normalized' THEN
      RETURN NEW;
    END IF;

    IF OLD.source_type IN (
      'excel',
      'pdf'
    )
       AND NEW.status = 'parsing' THEN
      RETURN NEW;
    END IF;

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
    'Invalid onboarding state transition for source %: % -> %',
    OLD.source_type,
    OLD.status,
    NEW.status
    USING ERRCODE = '23514';

END;
$$;


-- ----------------------------------------------------------------------------
-- Lifecycle timestamps.
-- started_at means actual processing has started.
--
-- Wizard starts processing when normalized.
-- Excel/PDF start processing when parsing.
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

    IF (
      NEW.status = 'parsing'
      OR (
        NEW.status = 'normalized'
        AND NEW.source_type = 'wizard'
      )
    )
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


-- ----------------------------------------------------------------------------
-- Refresh derived session counters.
--
-- These counters are operational summaries only.
-- Commit authorization never trusts the cached values.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION horos_refresh_onboarding_counts(
  p_tenant_id uuid,
  p_session_id uuid
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_total integer;
  v_valid integer;
  v_warning integer;
  v_error integer;
BEGIN

  SELECT
    count(*)::integer,

    count(*) FILTER (
      WHERE oi.status IN (
        'valid',
        'warning',
        'skipped',
        'committed'
      )
    )::integer

  INTO
    v_total,
    v_valid

  FROM onboarding_items oi
  WHERE
    oi.tenant_id = p_tenant_id
    AND oi.session_id = p_session_id;


  SELECT
    count(
      DISTINCT COALESCE(
        issue.item_id,
        issue.id
      )
    ) FILTER (
      WHERE
        issue.severity = 'warning'
        AND issue.status = 'open'
    )::integer,

    count(
      DISTINCT COALESCE(
        issue.item_id,
        issue.id
      )
    ) FILTER (
      WHERE
        issue.severity = 'error'
        AND issue.status = 'open'
    )::integer

  INTO
    v_warning,
    v_error

  FROM onboarding_issues issue
  WHERE
    issue.tenant_id = p_tenant_id
    AND issue.session_id = p_session_id;


  UPDATE onboarding_sessions
  SET
    total_items = COALESCE(v_total, 0),
    valid_items = COALESCE(v_valid, 0),
    warning_items = COALESCE(v_warning, 0),
    error_items = COALESCE(v_error, 0),
    updated_at = now()
  WHERE
    tenant_id = p_tenant_id
    AND id = p_session_id;

END;
$$;


CREATE OR REPLACE FUNCTION horos_refresh_counts_from_item()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
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

  PERFORM horos_refresh_onboarding_counts(
    v_tenant_id,
    v_session_id
  );

  RETURN COALESCE(NEW, OLD);

END;
$$;


CREATE TRIGGER onboarding_items_refresh_counts_trg
AFTER INSERT OR UPDATE OR DELETE
ON onboarding_items
FOR EACH ROW
EXECUTE FUNCTION horos_refresh_counts_from_item();


CREATE OR REPLACE FUNCTION horos_refresh_counts_from_issue()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
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

  PERFORM horos_refresh_onboarding_counts(
    v_tenant_id,
    v_session_id
  );

  RETURN COALESCE(NEW, OLD);

END;
$$;


CREATE TRIGGER onboarding_issues_refresh_counts_trg
AFTER INSERT OR UPDATE OR DELETE
ON onboarding_issues
FOR EACH ROW
EXECUTE FUNCTION horos_refresh_counts_from_issue();


-- ----------------------------------------------------------------------------
-- Issues freeze during commit just like items.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION horos_guard_onboarding_issue_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_tenant_id uuid;
  v_session_id uuid;
  v_session_status varchar(32);
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
      'Onboarding issues are immutable while session status is %',
      v_session_status
      USING ERRCODE = '23514';
  END IF;


  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;

END;
$$;


CREATE TRIGGER onboarding_issues_mutation_guard_trg
BEFORE INSERT OR UPDATE OR DELETE
ON onboarding_issues
FOR EACH ROW
EXECUTE FUNCTION horos_guard_onboarding_issue_mutation();


-- ----------------------------------------------------------------------------
-- Commit readiness.
--
-- PostgreSQL re-queries source data directly.
-- Cached session counters are NOT trusted here.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION horos_validate_onboarding_commit_readiness()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_total integer;
  v_not_ready integer;
  v_open_errors integer;
BEGIN

  IF NEW.status <> 'committing'
     OR OLD.status = 'committing' THEN
    RETURN NEW;
  END IF;


  SELECT
    count(*)::integer,

    count(*) FILTER (
      WHERE oi.status NOT IN (
        'valid',
        'warning',
        'skipped'
      )
    )::integer

  INTO
    v_total,
    v_not_ready

  FROM onboarding_items oi
  WHERE
    oi.tenant_id = NEW.tenant_id
    AND oi.session_id = NEW.id;


  IF v_total = 0 THEN
    RAISE EXCEPTION
      'Cannot commit an empty onboarding session'
      USING ERRCODE = '23514';
  END IF;


  IF v_not_ready > 0 THEN
    RAISE EXCEPTION
      'Cannot commit onboarding session: % item(s) are not validation-ready',
      v_not_ready
      USING ERRCODE = '23514';
  END IF;


  SELECT count(*)::integer
  INTO v_open_errors
  FROM onboarding_issues issue
  WHERE
    issue.tenant_id = NEW.tenant_id
    AND issue.session_id = NEW.id
    AND issue.severity = 'error'
    AND issue.status = 'open';


  IF v_open_errors > 0 THEN
    RAISE EXCEPTION
      'Cannot commit onboarding session: % open error(s)',
      v_open_errors
      USING ERRCODE = '23514';
  END IF;


  RETURN NEW;

END;
$$;


CREATE TRIGGER onboarding_sessions_commit_readiness_trg
BEFORE UPDATE OF status
ON onboarding_sessions
FOR EACH ROW
EXECUTE FUNCTION horos_validate_onboarding_commit_readiness();
