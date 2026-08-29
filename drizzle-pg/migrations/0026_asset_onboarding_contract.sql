-- ============================================================================
-- HOROS ONBOARD-003A
-- Canonical asset onboarding contract.
-- ============================================================================


CREATE OR REPLACE FUNCTION horos_validate_asset_onboarding_item()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_asset_type text;
  v_asset_code text;
  v_branch_code text;
  v_system_code text;
BEGIN

  -- Only validate normalized items relevant to asset provisioning.
  IF NEW.entity_type NOT IN (
    'asset',
    'asset_system_membership'
  ) THEN
    RETURN NEW;
  END IF;


  -- Validation applies when an item claims to be ready.
  IF NEW.status NOT IN (
    'valid',
    'warning'
  ) THEN
    RETURN NEW;
  END IF;


  IF NEW.normalized_payload IS NULL THEN
    RAISE EXCEPTION
      'Normalized payload is required for % item',
      NEW.entity_type
      USING ERRCODE = '23514';
  END IF;


  -- --------------------------------------------------------------------------
  -- ASSET
  -- --------------------------------------------------------------------------

  IF NEW.entity_type = 'asset' THEN

    v_asset_type :=
      NULLIF(
        trim(
          NEW.normalized_payload->>'assetType'
        ),
        ''
      );

    v_asset_code :=
      NULLIF(
        trim(
          NEW.normalized_payload->>'assetCode'
        ),
        ''
      );

    v_branch_code :=
      NULLIF(
        trim(
          NEW.normalized_payload->>'branchCode'
        ),
        ''
      );


    IF v_asset_type IS NULL THEN
      RAISE EXCEPTION
        'Asset item requires assetType'
        USING ERRCODE = '23514';
    END IF;


    IF v_asset_code IS NULL THEN
      RAISE EXCEPTION
        'Asset item requires assetCode'
        USING ERRCODE = '23514';
    END IF;


    IF v_branch_code IS NULL THEN
      RAISE EXCEPTION
        'Asset item requires branchCode'
        USING ERRCODE = '23514';
    END IF;


    IF NEW.operation NOT IN (
      'create',
      'update',
      'upsert',
      'skip'
    ) THEN
      RAISE EXCEPTION
        'Unsupported asset operation: %',
        NEW.operation
        USING ERRCODE = '23514';
    END IF;

  END IF;


  -- --------------------------------------------------------------------------
  -- ASSET SYSTEM MEMBERSHIP
  -- --------------------------------------------------------------------------

  IF NEW.entity_type = 'asset_system_membership' THEN

    v_asset_code :=
      NULLIF(
        trim(
          NEW.normalized_payload->>'assetCode'
        ),
        ''
      );

    v_branch_code :=
      NULLIF(
        trim(
          NEW.normalized_payload->>'branchCode'
        ),
        ''
      );

    v_system_code :=
      NULLIF(
        trim(
          NEW.normalized_payload->>'systemCode'
        ),
        ''
      );


    IF v_asset_code IS NULL THEN
      RAISE EXCEPTION
        'Asset-system membership requires assetCode'
        USING ERRCODE = '23514';
    END IF;


    IF v_branch_code IS NULL THEN
      RAISE EXCEPTION
        'Asset-system membership requires branchCode'
        USING ERRCODE = '23514';
    END IF;


    IF v_system_code IS NULL THEN
      RAISE EXCEPTION
        'Asset-system membership requires systemCode'
        USING ERRCODE = '23514';
    END IF;


    IF NEW.operation NOT IN (
      'create',
      'upsert',
      'skip'
    ) THEN
      RAISE EXCEPTION
        'Unsupported asset-system membership operation: %',
        NEW.operation
        USING ERRCODE = '23514';
    END IF;

  END IF;


  RETURN NEW;

END;
$$;


CREATE TRIGGER onboarding_items_asset_contract_trg
BEFORE INSERT OR UPDATE OF
  entity_type,
  operation,
  normalized_payload,
  status
ON onboarding_items
FOR EACH ROW
EXECUTE FUNCTION horos_validate_asset_onboarding_item();
