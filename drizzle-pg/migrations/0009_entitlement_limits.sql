-- ============================================================================
-- HOROS CORE-001B
-- Commercial entitlement enforcement.
--
-- A subscription may never have more ENABLED systems than its plan allows.
-- ============================================================================

CREATE OR REPLACE FUNCTION horos_enforce_entitlement_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_limit integer;
  v_enabled integer;
  v_subscription_status varchar(32);
BEGIN

  -- Disabled/historical entitlements do not consume capacity.
  IF NEW.status <> 'enabled' THEN
    RETURN NEW;
  END IF;

  SELECT
    sp.included_system_count,
    s.status
  INTO
    v_limit,
    v_subscription_status
  FROM subscriptions s
  JOIN subscription_plans sp
    ON sp.id = s.plan_id
  WHERE
    s.id = NEW.subscription_id
    AND s.tenant_id = NEW.tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Subscription does not belong to tenant'
      USING ERRCODE = '23503';
  END IF;

  IF v_subscription_status NOT IN ('active', 'trial') THEN
    RAISE EXCEPTION
      'Cannot enable systems on subscription status %',
      v_subscription_status
      USING ERRCODE = '23514';
  END IF;

  SELECT count(*)
  INTO v_enabled
  FROM tenant_system_entitlements tse
  WHERE
    tse.tenant_id = NEW.tenant_id
    AND tse.subscription_id = NEW.subscription_id
    AND tse.status = 'enabled'
    AND tse.id IS DISTINCT FROM NEW.id;

  IF v_enabled >= v_limit THEN
    RAISE EXCEPTION
      'Subscription system limit exceeded: limit %, enabled %',
      v_limit,
      v_enabled
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;


CREATE TRIGGER tenant_system_entitlements_limit_trg
BEFORE INSERT OR UPDATE OF
  status,
  tenant_id,
  subscription_id
ON tenant_system_entitlements
FOR EACH ROW
EXECUTE FUNCTION horos_enforce_entitlement_limit();


-- Prevent a subscription downgrade from leaving more enabled systems
-- than the newly selected plan supports.

CREATE OR REPLACE FUNCTION horos_validate_subscription_plan_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_limit integer;
  v_enabled integer;
BEGIN

  IF NEW.plan_id = OLD.plan_id THEN
    RETURN NEW;
  END IF;

  SELECT included_system_count
  INTO v_limit
  FROM subscription_plans
  WHERE id = NEW.plan_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Subscription plan not found'
      USING ERRCODE = '23503';
  END IF;

  SELECT count(*)
  INTO v_enabled
  FROM tenant_system_entitlements
  WHERE
    tenant_id = NEW.tenant_id
    AND subscription_id = NEW.id
    AND status = 'enabled';

  IF v_enabled > v_limit THEN
    RAISE EXCEPTION
      'Plan downgrade blocked: new limit %, enabled systems %',
      v_limit,
      v_enabled
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;


CREATE TRIGGER subscriptions_plan_limit_trg
BEFORE UPDATE OF plan_id
ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION horos_validate_subscription_plan_change();
