CREATE OR REPLACE FUNCTION horos_validate_branch_system_entitlement()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN

  IF NOT EXISTS (
    SELECT 1
    FROM tenant_system_entitlements tse
    JOIN subscriptions s
      ON s.id = tse.subscription_id
     AND s.tenant_id = tse.tenant_id
    WHERE
      tse.tenant_id = NEW.tenant_id
      AND tse.system_id = NEW.system_id
      AND tse.status = 'enabled'
      AND s.status IN ('active', 'trial')
  ) THEN
    RAISE EXCEPTION
      'Tenant does not have an active entitlement for this system'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER branch_systems_entitlement_guard_trg
BEFORE INSERT OR UPDATE OF
  tenant_id,
  branch_id,
  system_id,
  status
ON branch_systems
FOR EACH ROW
EXECUTE FUNCTION horos_validate_branch_system_entitlement();
