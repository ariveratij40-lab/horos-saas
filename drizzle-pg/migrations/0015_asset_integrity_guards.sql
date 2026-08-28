-- HOROS CORE-001D
-- Canonical asset placement and system-membership integrity.

CREATE OR REPLACE FUNCTION horos_validate_asset_placement()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_location_id uuid;
  v_space_id uuid;
BEGIN

  IF NEW.rack_id IS NOT NULL
     AND NEW.telecom_space_id IS NULL THEN
    RAISE EXCEPTION
      'rack_id requires telecom_space_id'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.telecom_space_id IS NOT NULL
     AND NEW.location_id IS NULL THEN
    RAISE EXCEPTION
      'telecom_space_id requires location_id'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.telecom_space_id IS NOT NULL THEN

    SELECT ts.location_id
    INTO v_location_id
    FROM telecom_spaces ts
    WHERE
      ts.tenant_id = NEW.tenant_id
      AND ts.branch_id = NEW.branch_id
      AND ts.id = NEW.telecom_space_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION
        'Telecom space does not belong to asset tenant/branch'
        USING ERRCODE = '23503';
    END IF;

    IF v_location_id IS DISTINCT FROM NEW.location_id THEN
      RAISE EXCEPTION
        'Asset telecom space does not belong to selected location'
        USING ERRCODE = '23514';
    END IF;

  END IF;

  IF NEW.rack_id IS NOT NULL THEN

    SELECT r.telecom_space_id
    INTO v_space_id
    FROM racks r
    WHERE
      r.tenant_id = NEW.tenant_id
      AND r.branch_id = NEW.branch_id
      AND r.id = NEW.rack_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION
        'Rack does not belong to asset tenant/branch'
        USING ERRCODE = '23503';
    END IF;

    IF v_space_id IS DISTINCT FROM NEW.telecom_space_id THEN
      RAISE EXCEPTION
        'Asset rack does not belong to selected telecom space'
        USING ERRCODE = '23514';
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER assets_placement_guard_trg
BEFORE INSERT OR UPDATE OF
  tenant_id,
  branch_id,
  location_id,
  telecom_space_id,
  rack_id
ON assets
FOR EACH ROW
EXECUTE FUNCTION horos_validate_asset_placement();


CREATE OR REPLACE FUNCTION horos_validate_asset_system_membership()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_asset_branch uuid;
  v_system_branch uuid;
BEGIN

  SELECT branch_id
  INTO v_asset_branch
  FROM assets
  WHERE
    tenant_id = NEW.tenant_id
    AND id = NEW.asset_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Asset does not belong to tenant'
      USING ERRCODE = '23503';
  END IF;

  SELECT branch_id
  INTO v_system_branch
  FROM branch_systems
  WHERE
    tenant_id = NEW.tenant_id
    AND id = NEW.branch_system_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Branch system does not belong to tenant'
      USING ERRCODE = '23503';
  END IF;

  IF v_asset_branch IS DISTINCT FROM v_system_branch THEN
    RAISE EXCEPTION
      'Asset and branch system must belong to the same branch'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER asset_system_memberships_branch_guard_trg
BEFORE INSERT OR UPDATE OF
  tenant_id,
  asset_id,
  branch_system_id
ON asset_system_memberships
FOR EACH ROW
EXECUTE FUNCTION horos_validate_asset_system_membership();
