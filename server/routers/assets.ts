import { z } from "zod";
import {
  pgProtectedProcedure,
  protectedProcedure,
  router,
} from "../_core/trpc";
import { withTenantTransaction } from "../db.pg";
import { TRPCError } from "@trpc/server";
import { getAssetsByTenant, getAssetById, createAsset, updateAsset, createAuditLog } from "../db";


export const assetsRouter = router({

  /**
   * PostgreSQL canonical read pilot.
   *
   * Deliberately additive: legacy list/get/create/update
   * remain unchanged while the canonical data plane is
   * validated independently.
   */
  canonicalList: pgProtectedProcedure
    .input(
      z.object({
        lifecycleStatus: z.string().optional(),
        operationalStatus: z.string().optional(),
        branchId: z.string().uuid().optional(),
        assetTypeId: z.string().uuid().optional(),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      return withTenantTransaction(
        ctx.pgTenant.tenantId,
        async tx => {
          const lifecycleStatus =
            input?.lifecycleStatus ?? null;

          const operationalStatus =
            input?.operationalStatus ?? null;

          const branchId =
            input?.branchId ?? null;

          const assetTypeId =
            input?.assetTypeId ?? null;

          return tx<{
            id: string;
            tenantId: string;
            branchId: string;
            assetTypeId: string;
            assetCode: string;
            assetTag: string | null;
            serialNumber: string | null;
            manufacturer: string | null;
            model: string | null;
            lifecycleStatus: string;
            operationalStatus: string;
            source: string;
            notes: string | null;
            createdAt: Date;
            updatedAt: Date;
          }[]>`
            SELECT
              id::text AS "id",
              tenant_id::text AS "tenantId",
              branch_id::text AS "branchId",
              asset_type_id::text AS "assetTypeId",
              asset_code AS "assetCode",
              asset_tag AS "assetTag",
              serial_number AS "serialNumber",
              manufacturer,
              model,
              lifecycle_status AS "lifecycleStatus",
              operational_status AS "operationalStatus",
              source,
              notes,
              created_at AS "createdAt",
              updated_at AS "updatedAt"
            FROM assets
            WHERE
              (
                ${lifecycleStatus}::text IS NULL
                OR lifecycle_status =
                  ${lifecycleStatus}
              )
              AND (
                ${operationalStatus}::text IS NULL
                OR operational_status =
                  ${operationalStatus}
              )
              AND (
                ${branchId}::uuid IS NULL
                OR branch_id =
                  ${branchId}::uuid
              )
              AND (
                ${assetTypeId}::uuid IS NULL
                OR asset_type_id =
                  ${assetTypeId}::uuid
              )
            ORDER BY
              asset_code,
              id
          `;
        },
      );
    }),

  /**
   * Transitional PostgreSQL read DTO.
   *
   * This endpoint exposes canonical assets in a shape that
   * can be compared with the legacy Assets UI contract.
   *
   * IMPORTANT:
   * Fields not represented in the canonical model remain
   * null. No financial, lifecycle or criticality values are
   * fabricated.
   */
  canonicalCompatList: pgProtectedProcedure
    .input(
      z.object({
        status: z.string().optional(),
        category: z.string().optional(),
        branchId: z.string().uuid().optional(),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      return withTenantTransaction(
        ctx.pgTenant.tenantId,
        async tx => {
          const status =
            input?.status ?? null;

          const category =
            input?.category ?? null;

          const branchId =
            input?.branchId ?? null;

          return tx<{
            id: string;
            assetCode: string;
            name: string;
            description: string | null;
            category: string;
            canonicalCategory: string;
            assetTypeCode: string;
            brand: string | null;
            model: string | null;
            serialNumber: string | null;
            status: string;
            criticality: string | null;
            location: string;
            branchId: string;
            installDate: string | null;
            warrantyExpiry: string | null;
            usefulLifeYears: number | null;
            purchaseDate: string | null;
            purchaseCost: string | null;
            currentValue: string | null;
            depreciationRate: string | null;
            depreciationMethod: string | null;
            replacementCost: string | null;
            maintenanceCostYearly: string | null;
            riskScore: null;
            notes: string | null;
            imageUrl: null;
            createdAt: Date;
            updatedAt: Date;
          }[]>`
            SELECT
              a.id::text AS "id",
              a.asset_code AS "assetCode",

              COALESCE(
                NULLIF(at.name, ''),
                a.asset_code
              ) AS "name",

              at.description AS "description",

              CASE
                WHEN at.code = 'CAMERA'
                  THEN 'camera'

                WHEN at.code = 'NVR'
                  THEN 'nvr_dvr'

                WHEN at.code IN (
                  'ACCESS_CONTROLLER',
                  'DOOR',
                  'READER'
                )
                  THEN 'access_control'

                WHEN at.code IN (
                  'SWITCH'
                )
                  THEN 'network'

                WHEN at.code IN (
                  'SERVER',
                  'VMS_SERVER'
                )
                  THEN 'server'

                WHEN at.code = 'UPS'
                  THEN 'ups'

                ELSE 'other'
              END AS "category",

              at.category
                AS "canonicalCategory",

              at.code
                AS "assetTypeCode",

              a.manufacturer AS "brand",
              a.model AS "model",

              a.serial_number
                AS "serialNumber",

              a.lifecycle_status
                AS "status",

              alp.criticality
                AS "criticality",

              CONCAT_WS(
                ' / ',
                NULLIF(b.name, ''),
                NULLIF(l.name, ''),
                NULLIF(ts.name, ''),
                NULLIF(r.name, '')
              ) AS "location",

              a.branch_id::text
                AS "branchId",

              alp.install_date::text
                AS "installDate",

              alp.warranty_expiry::text
                AS "warrantyExpiry",

              alp.useful_life_years
                AS "usefulLifeYears",

              afp.purchase_date::text
                AS "purchaseDate",

              afp.purchase_cost::text
                AS "purchaseCost",

              afp.current_value::text
                AS "currentValue",

              afp.depreciation_rate::text
                AS "depreciationRate",

              afp.depreciation_method
                AS "depreciationMethod",

              afp.replacement_cost::text
                AS "replacementCost",

              afp.maintenance_cost_yearly::text
                AS "maintenanceCostYearly",

              NULL::integer
                AS "riskScore",

              a.notes AS "notes",

              NULL::text
                AS "imageUrl",

              a.created_at
                AS "createdAt",

              a.updated_at
                AS "updatedAt"

            FROM assets a

            JOIN asset_types at
              ON at.id =
                a.asset_type_id

            JOIN branches b
              ON b.id =
                a.branch_id
              AND b.tenant_id =
                a.tenant_id

            LEFT JOIN locations l
              ON l.id =
                a.location_id
              AND l.tenant_id =
                a.tenant_id

            LEFT JOIN telecom_spaces ts
              ON ts.id =
                a.telecom_space_id
              AND ts.tenant_id =
                a.tenant_id

            LEFT JOIN racks r
              ON r.id =
                a.rack_id
              AND r.tenant_id =
                a.tenant_id

            LEFT JOIN asset_lifecycle_profiles alp
              ON alp.asset_id =
                a.id
              AND alp.tenant_id =
                a.tenant_id

            LEFT JOIN asset_financial_profiles afp
              ON afp.asset_id =
                a.id
              AND afp.tenant_id =
                a.tenant_id

            WHERE
              (
                ${status}::text IS NULL
                OR a.lifecycle_status =
                  ${status}
              )

              AND (
                ${category}::text IS NULL

                OR CASE
                  WHEN at.code = 'CAMERA'
                    THEN 'camera'

                  WHEN at.code = 'NVR'
                    THEN 'nvr_dvr'

                  WHEN at.code IN (
                    'ACCESS_CONTROLLER',
                    'DOOR',
                    'READER'
                  )
                    THEN 'access_control'

                  WHEN at.code = 'SWITCH'
                    THEN 'network'

                  WHEN at.code IN (
                    'SERVER',
                    'VMS_SERVER'
                  )
                    THEN 'server'

                  WHEN at.code = 'UPS'
                    THEN 'ups'

                  ELSE 'other'
                END = ${category}
              )

              AND (
                ${branchId}::uuid IS NULL
                OR a.branch_id =
                  ${branchId}::uuid
              )

            ORDER BY
              a.created_at DESC,
              a.asset_code
          `;
        },
      );
    }),

  /**
   * Canonical PostgreSQL asset detail.
   *
   * Additive during migration:
   * legacy numeric getById remains unchanged.
   */
  canonicalGetById: pgProtectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const rows =
        await withTenantTransaction(
          ctx.pgTenant.tenantId,
          async tx => {
            return tx<{
              id: string;
              assetCode: string;
              name: string;
              description: string | null;
              category: string;
              canonicalCategory: string;
              assetTypeCode: string;
              brand: string | null;
              model: string | null;
              serialNumber: string | null;
              status: string;
              criticality: string | null;
              location: string;
              branchId: string;
              installDate: string | null;
              warrantyExpiry: string | null;
              usefulLifeYears: number | null;
              purchaseDate: string | null;
              purchaseCost: string | null;
              currentValue: string | null;
              depreciationRate: string | null;
              depreciationMethod: string | null;
              replacementCost: string | null;
              maintenanceCostYearly: string | null;
              riskScore: null;
              notes: string | null;
              imageUrl: null;
              createdAt: Date;
              updatedAt: Date;
            }[]>`
              SELECT
                a.id::text AS "id",
                a.asset_code AS "assetCode",

                COALESCE(
                  NULLIF(at.name, ''),
                  a.asset_code
                ) AS "name",

                at.description
                  AS "description",

                CASE
                  WHEN at.code = 'CAMERA'
                    THEN 'camera'
                  WHEN at.code = 'NVR'
                    THEN 'nvr_dvr'
                  WHEN at.code IN (
                    'ACCESS_CONTROLLER',
                    'DOOR',
                    'READER'
                  )
                    THEN 'access_control'
                  WHEN at.code = 'SWITCH'
                    THEN 'network'
                  WHEN at.code IN (
                    'SERVER',
                    'VMS_SERVER'
                  )
                    THEN 'server'
                  WHEN at.code = 'UPS'
                    THEN 'ups'
                  ELSE 'other'
                END AS "category",

                at.category
                  AS "canonicalCategory",

                at.code
                  AS "assetTypeCode",

                a.manufacturer
                  AS "brand",

                a.model
                  AS "model",

                a.serial_number
                  AS "serialNumber",

                a.lifecycle_status
                  AS "status",

                alp.criticality
                  AS "criticality",

                CONCAT_WS(
                  ' / ',
                  NULLIF(b.name, ''),
                  NULLIF(l.name, ''),
                  NULLIF(ts.name, ''),
                  NULLIF(r.name, '')
                ) AS "location",

                a.branch_id::text
                  AS "branchId",

                alp.install_date::text
                  AS "installDate",

                alp.warranty_expiry::text
                  AS "warrantyExpiry",

                alp.useful_life_years
                  AS "usefulLifeYears",

                afp.purchase_date::text
                  AS "purchaseDate",

                afp.purchase_cost::text
                  AS "purchaseCost",

                afp.current_value::text
                  AS "currentValue",

                afp.depreciation_rate::text
                  AS "depreciationRate",

                afp.depreciation_method
                  AS "depreciationMethod",

                afp.replacement_cost::text
                  AS "replacementCost",

                afp.maintenance_cost_yearly::text
                  AS "maintenanceCostYearly",

                NULL::integer
                  AS "riskScore",

                a.notes
                  AS "notes",

                NULL::text
                  AS "imageUrl",

                a.created_at
                  AS "createdAt",

                a.updated_at
                  AS "updatedAt"

              FROM assets a

              JOIN asset_types at
                ON at.id =
                  a.asset_type_id

              JOIN branches b
                ON b.id =
                  a.branch_id
                AND b.tenant_id =
                  a.tenant_id

              LEFT JOIN locations l
                ON l.id =
                  a.location_id
                AND l.tenant_id =
                  a.tenant_id

              LEFT JOIN telecom_spaces ts
                ON ts.id =
                  a.telecom_space_id
                AND ts.tenant_id =
                  a.tenant_id

              LEFT JOIN racks r
                ON r.id =
                  a.rack_id
                AND r.tenant_id =
                  a.tenant_id

              LEFT JOIN asset_lifecycle_profiles alp
                ON alp.asset_id =
                  a.id
                AND alp.tenant_id =
                  a.tenant_id

              LEFT JOIN asset_financial_profiles afp
                ON afp.asset_id =
                  a.id
                AND afp.tenant_id =
                  a.tenant_id

              WHERE
                a.id = ${input.id}::uuid

              LIMIT 1
            `;
          },
        );

      const asset = rows[0];

      if (!asset) {
        throw new TRPCError({
          code: "NOT_FOUND",
        });
      }

      const now = new Date();

      let ageYears: number | null = null;

      if (asset.installDate) {
        const installedAt =
          new Date(
            `${asset.installDate}T00:00:00Z`,
          );

        ageYears =
          (
            now.getTime() -
            installedAt.getTime()
          ) /
          (
            1000 *
            60 *
            60 *
            24 *
            365.2425
          );

        ageYears =
          Math.max(
            0,
            ageYears,
          );
      }

      const remainingLifeYears =
        ageYears !== null &&
        asset.usefulLifeYears !== null
          ? Math.max(
              0,
              asset.usefulLifeYears -
                ageYears,
            )
          : null;

      const obsolescenceRisk =
        remainingLifeYears === null
          ? null
          : remainingLifeYears <= 1
            ? "critical"
            : remainingLifeYears <= 2
              ? "high"
              : remainingLifeYears <= 3
                ? "medium"
                : "low";

      const maintenanceCost =
        asset.maintenanceCostYearly !== null
          ? Number(
              asset.maintenanceCostYearly,
            )
          : null;

      const totalMaintenanceCost =
        maintenanceCost !== null &&
        ageYears !== null
          ? maintenanceCost *
            ageYears
          : null;

      /*
       * Canonical depreciation:
       * straight-line is derivable when purchase cost,
       * depreciation rate and age are known.
       *
       * Other methods require an explicit canonical
       * calculation policy before they are derived.
       */
      let depreciatedValue:
        number | null = null;

      const purchaseCost =
        asset.purchaseCost !== null
          ? Number(asset.purchaseCost)
          : null;

      const depreciationRate =
        asset.depreciationRate !== null
          ? Number(
              asset.depreciationRate,
            )
          : null;

      if (
        purchaseCost !== null &&
        depreciationRate !== null &&
        ageYears !== null &&
        asset.depreciationMethod ===
          "straight_line"
      ) {
        depreciatedValue =
          Math.max(
            0,
            purchaseCost *
              (
                1 -
                depreciationRate *
                  ageYears
              ),
          );
      }

      const replacementRecommended =
        remainingLifeYears !== null
          ? remainingLifeYears <= 1
          : null;

      const round1 = (
        value: number | null,
      ) =>
        value === null
          ? null
          : Math.round(
              value * 10,
            ) / 10;

      const round2 = (
        value: number | null,
      ) =>
        value === null
          ? null
          : Math.round(
              value * 100,
            ) / 100;

      return {
        ...asset,

        analysis: {
          ageYears:
            round1(ageYears),

          remainingLifeYears:
            round1(
              remainingLifeYears,
            ),

          obsolescenceRisk,

          depreciatedValue:
            round2(
              depreciatedValue,
            ),

          totalMaintenanceCost:
            round2(
              totalMaintenanceCost,
            ),

          replacementRecommended,

          capexEstimate:
            asset.replacementCost !== null
              ? Number(
                  asset.replacementCost,
                )
              : null,

          opexYearly:
            maintenanceCost,
        },
      };
    }),

  list: protectedProcedure.input(z.object({
    status: z.string().optional(),
    criticality: z.string().optional(),
    category: z.string().optional(),
  }).optional()).query(async ({ ctx, input }) => {
    const tenantId = ctx.user.tenantId ?? 1;
    return getAssetsByTenant(tenantId, input ?? {});
  }),

  getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    const tenantId = ctx.user.tenantId ?? 1;
    const asset = await getAssetById(input.id, tenantId);
    if (!asset) throw new TRPCError({ code: "NOT_FOUND" });

    // Calcular análisis CAPEX/OPEX
    const now = new Date();
    let depreciatedValue = Number(asset.currentValue ?? asset.purchaseCost ?? 0);
    let ageYears = 0;
    if (asset.installDate) {
      ageYears = (now.getTime() - new Date(asset.installDate).getTime()) / (1000 * 60 * 60 * 24 * 365);
    }
    const remainingLifeYears = Math.max(0, (asset.usefulLifeYears ?? 5) - ageYears);
    const obsolescenceRisk = remainingLifeYears <= 1 ? "critical" : remainingLifeYears <= 2 ? "high" : remainingLifeYears <= 3 ? "medium" : "low";
    const totalMaintenanceCost = Number(asset.maintenanceCostYearly ?? 0) * ageYears;
    const replacementRecommended = remainingLifeYears <= 1 || (asset.riskScore ?? 0) >= 80;

    return {
      ...asset,
      analysis: {
        ageYears: Math.round(ageYears * 10) / 10,
        remainingLifeYears: Math.round(remainingLifeYears * 10) / 10,
        obsolescenceRisk,
        depreciatedValue,
        totalMaintenanceCost,
        replacementRecommended,
        capexEstimate: Number(asset.replacementCost ?? 0),
        opexYearly: Number(asset.maintenanceCostYearly ?? 0),
      },
    };
  }),

  /**
   * Canonical PostgreSQL asset creation.
   *
   * Contract:
   * - authenticated canonical tenant context
   * - UUID branch and asset type identifiers
   * - one PostgreSQL transaction
   * - optional lifecycle and financial profiles
   * - no legacy MySQL write
   * - no free-text location fabrication
   */
  /**
   * Canonical catalog data required by the
   * PostgreSQL asset creation form.
   *
   * Branch and physical hierarchy records are
   * tenant-scoped. Asset types are global catalog
   * records.
   *
   * A branch must be selected before placement
   * hierarchy records are returned.
   */
  canonicalCreateCatalogs: pgProtectedProcedure
    .input(
      z.object({
        branchId:
          z.string().uuid().optional(),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const tenantId =
        ctx.pgTenant.tenantId;

      return withTenantTransaction(
        tenantId,
        async tx => {
          const branches =
            await tx<{
              id: string;
              code: string;
              name: string;
            }[]>`
              SELECT
                id::text AS id,
                code,
                name
              FROM branches
              WHERE
                tenant_id =
                  ${tenantId}::uuid
                AND status = 'active'
                AND is_active = true
              ORDER BY
                name,
                code
            `;

          const assetTypes =
            await tx<{
              id: string;
              code: string;
              name: string;
              category: string;
            }[]>`
              SELECT
                id::text AS id,
                code,
                name,
                category
              FROM asset_types
              WHERE
                status = 'active'
              ORDER BY
                category,
                name,
                code
            `;

          const branchId =
            input?.branchId ?? null;

          if (!branchId) {
            return {
              branches,
              assetTypes,
              locations: [],
              telecomSpaces: [],
              racks: [],
            };
          }

          const selectedBranch =
            branches.find(
              branch =>
                branch.id === branchId,
            );

          if (!selectedBranch) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Canonical branch is not available for this tenant",
            });
          }

          const locations =
            await tx<{
              id: string;
              branchId: string;
              code: string;
              name: string;
              type: string | null;
            }[]>`
              SELECT
                id::text AS id,
                branch_id::text
                  AS "branchId",
                code,
                name,
                location_type
                  AS "type"
              FROM locations
              WHERE
                tenant_id =
                  ${tenantId}::uuid
                AND branch_id =
                  ${branchId}::uuid
                AND status = 'active'
              ORDER BY
                name,
                code
            `;

          const telecomSpaces =
            await tx<{
              id: string;
              branchId: string;
              locationId: string;
              code: string;
              name: string;
              type: string;
            }[]>`
              SELECT
                id::text AS id,
                branch_id::text
                  AS "branchId",
                location_id::text
                  AS "locationId",
                code,
                name,
                space_type
                  AS "type"
              FROM telecom_spaces
              WHERE
                tenant_id =
                  ${tenantId}::uuid
                AND branch_id =
                  ${branchId}::uuid
                AND status = 'active'
              ORDER BY
                name,
                code
            `;

          const racks =
            await tx<{
              id: string;
              branchId: string;
              telecomSpaceId: string;
              code: string;
              name: string;
            }[]>`
              SELECT
                id::text AS id,
                branch_id::text
                  AS "branchId",
                telecom_space_id::text
                  AS "telecomSpaceId",
                code,
                name
              FROM racks
              WHERE
                tenant_id =
                  ${tenantId}::uuid
                AND branch_id =
                  ${branchId}::uuid
                AND status = 'active'
              ORDER BY
                name,
                code
            `;

          return {
            branches,
            assetTypes,
            locations,
            telecomSpaces,
            racks,
          };
        },
      );
    }),

  canonicalCreate: pgProtectedProcedure
    .input(
      z.object({
        assetCode:
          z.string().trim().min(1).max(128),

        branchId:
          z.string().uuid(),

        assetTypeId:
          z.string().uuid(),

        locationId:
          z.string().uuid().optional(),

        telecomSpaceId:
          z.string().uuid().optional(),

        rackId:
          z.string().uuid().optional(),

        brand:
          z.string().trim().max(255).optional(),

        model:
          z.string().trim().max(255).optional(),

        serialNumber:
          z.string().trim().max(255).optional(),

        status:
          z.enum([
            "active",
            "inactive",
            "maintenance",
            "obsolete",
            "disposed",
          ]).optional(),

        operationalStatus:
          z.string().trim().min(1).max(32).optional(),

        notes:
          z.string().optional(),

        criticality:
          z.enum([
            "critical",
            "high",
            "medium",
            "low",
          ]).optional(),

        installDate:
          z.string().date().optional(),

        warrantyExpiry:
          z.string().date().optional(),

        usefulLifeYears:
          z.number().int().positive().optional(),

        purchaseDate:
          z.string().date().optional(),

        purchaseCost:
          z.string().optional(),

        currentValue:
          z.string().optional(),

        depreciationRate:
          z.string().optional(),

        depreciationMethod:
          z.enum([
            "straight_line",
            "declining_balance",
            "sum_of_years",
          ]).optional(),

        replacementCost:
          z.string().optional(),

        maintenanceCostYearly:
          z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId =
        ctx.pgTenant.tenantId;

      return withTenantTransaction(
        tenantId,
        async tx => {
          /*
           * Validate the required branch inside the
           * established tenant/RLS context.
           */
          const branchRows = await tx<{
            id: string;
          }[]>`
            SELECT
              id::text AS id
            FROM branches
            WHERE
              id = ${input.branchId}::uuid
              AND tenant_id =
                ${tenantId}::uuid
              AND is_active = true
              AND status = 'active'
            LIMIT 1
          `;

          if (branchRows.length !== 1) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Canonical branch is not available for this tenant",
            });
          }

          /*
           * Asset types are global catalog records.
           * Only active catalog entries may be used.
           */
          const typeRows = await tx<{
            id: string;
          }[]>`
            SELECT
              id::text AS id
            FROM asset_types
            WHERE
              id = ${input.assetTypeId}::uuid
              AND status = 'active'
            LIMIT 1
          `;

          if (typeRows.length !== 1) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Canonical asset type is not available",
            });
          }

          /*
           * Optional hierarchy IDs are validated before
           * the asset insert. Composite database FKs are
           * still the final integrity boundary.
           */
          if (input.locationId) {
            const rows = await tx<{
              id: string;
            }[]>`
              SELECT
                id::text AS id
              FROM locations
              WHERE
                id =
                  ${input.locationId}::uuid
                AND tenant_id =
                  ${tenantId}::uuid
                AND branch_id =
                  ${input.branchId}::uuid
                AND status = 'active'
              LIMIT 1
            `;

            if (rows.length !== 1) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message:
                  "Canonical location is not available for this branch",
              });
            }
          }

          if (input.telecomSpaceId) {
            const rows = await tx<{
              id: string;
              location_id: string;
            }[]>`
              SELECT
                id::text AS id,
                location_id::text
                  AS location_id
              FROM telecom_spaces
              WHERE
                id =
                  ${input.telecomSpaceId}::uuid
                AND tenant_id =
                  ${tenantId}::uuid
                AND branch_id =
                  ${input.branchId}::uuid
                AND status = 'active'
              LIMIT 1
            `;

            if (rows.length !== 1) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message:
                  "Canonical telecom space is not available for this branch",
              });
            }

            if (
              input.locationId &&
              rows[0]?.location_id !==
                input.locationId
            ) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message:
                  "Canonical telecom space does not belong to the selected location",
              });
            }
          }

          if (input.rackId) {
            const rows = await tx<{
              id: string;
              telecom_space_id: string;
            }[]>`
              SELECT
                id::text AS id,
                telecom_space_id::text
                  AS telecom_space_id
              FROM racks
              WHERE
                id =
                  ${input.rackId}::uuid
                AND tenant_id =
                  ${tenantId}::uuid
                AND branch_id =
                  ${input.branchId}::uuid
                AND status = 'active'
              LIMIT 1
            `;

            if (rows.length !== 1) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message:
                  "Canonical rack is not available for this branch",
              });
            }

            if (
              input.telecomSpaceId &&
              rows[0]?.telecom_space_id !==
                input.telecomSpaceId
            ) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message:
                  "Canonical rack does not belong to the selected telecom space",
              });
            }
          }

          const assetRows = await tx<{
            id: string;
            assetCode: string;
          }[]>`
            INSERT INTO assets (
              tenant_id,
              branch_id,
              asset_type_id,
              location_id,
              telecom_space_id,
              rack_id,
              asset_code,
              serial_number,
              manufacturer,
              model,
              lifecycle_status,
              operational_status,
              source,
              notes
            )
            VALUES (
              ${tenantId}::uuid,
              ${input.branchId}::uuid,
              ${input.assetTypeId}::uuid,
              ${input.locationId ?? null}::uuid,
              ${input.telecomSpaceId ?? null}::uuid,
              ${input.rackId ?? null}::uuid,
              ${input.assetCode},
              ${input.serialNumber ?? null},
              ${input.brand ?? null},
              ${input.model ?? null},
              ${input.status ?? "active"},
              ${input.operationalStatus ?? "unknown"},
              'manual',
              ${input.notes ?? null}
            )
            RETURNING
              id::text AS id,
              asset_code AS "assetCode"
          `;

          if (assetRows.length !== 1) {
            throw new Error(
              "Canonical asset insert returned unexpected cardinality",
            );
          }

          const asset =
            assetRows[0];

          const hasLifecycleProfile =
            input.criticality !== undefined ||
            input.installDate !== undefined ||
            input.warrantyExpiry !== undefined ||
            input.usefulLifeYears !== undefined;

          if (hasLifecycleProfile) {
            await tx`
              INSERT INTO asset_lifecycle_profiles (
                tenant_id,
                asset_id,
                criticality,
                install_date,
                warranty_expiry,
                useful_life_years
              )
              VALUES (
                ${tenantId}::uuid,
                ${asset.id}::uuid,
                ${input.criticality ?? null},
                ${input.installDate ?? null}::date,
                ${input.warrantyExpiry ?? null}::date,
                ${input.usefulLifeYears ?? null}
              )
            `;
          }

          const hasFinancialProfile =
            input.purchaseDate !== undefined ||
            input.purchaseCost !== undefined ||
            input.currentValue !== undefined ||
            input.depreciationRate !== undefined ||
            input.depreciationMethod !== undefined ||
            input.replacementCost !== undefined ||
            input.maintenanceCostYearly !== undefined;

          if (hasFinancialProfile) {
            await tx`
              INSERT INTO asset_financial_profiles (
                tenant_id,
                asset_id,
                purchase_date,
                purchase_cost,
                current_value,
                depreciation_rate,
                depreciation_method,
                replacement_cost,
                maintenance_cost_yearly
              )
              VALUES (
                ${tenantId}::uuid,
                ${asset.id}::uuid,
                ${input.purchaseDate ?? null}::date,
                ${input.purchaseCost ?? null}::numeric,
                ${input.currentValue ?? null}::numeric,
                ${input.depreciationRate ?? null}::numeric,
                ${input.depreciationMethod ?? null},
                ${input.replacementCost ?? null}::numeric,
                ${input.maintenanceCostYearly ?? null}::numeric
              )
            `;
          }

          return {
            id: asset.id,
            assetCode:
              asset.assetCode,
          };
        },
      );
    }),

  create: protectedProcedure.input(z.object({
    assetCode: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    category: z.enum(["camera", "nvr_dvr", "access_control", "alarm", "sensor", "network", "server", "ups", "other"]).optional(),
    brand: z.string().optional(),
    model: z.string().optional(),
    serialNumber: z.string().optional(),
    status: z.enum(["active", "inactive", "maintenance", "obsolete", "disposed"]).optional(),
    criticality: z.enum(["critical", "high", "medium", "low"]).optional(),
    location: z.string().optional(),
    installDate: z.string().optional(),
    warrantyExpiry: z.string().optional(),
    usefulLifeYears: z.number().optional(),
    purchaseCost: z.string().optional(),
    currentValue: z.string().optional(),
    depreciationRate: z.string().optional(),
    depreciationMethod: z.enum(["straight_line", "declining_balance", "sum_of_years"]).optional(),
    replacementCost: z.string().optional(),
    maintenanceCostYearly: z.string().optional(),
    branchId: z.number().optional(),
    policyId: z.number().optional(),
    notes: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    if (!["admin", "supervisor", "technician"].includes(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN" });
    const tenantId = ctx.user.tenantId ?? 1;
    const { installDate, warrantyExpiry, ...rest } = input;
    const result = await createAsset({
      ...rest,
      tenantId,
      ...(installDate ? { installDate: new Date(installDate) as any } : {}),
      ...(warrantyExpiry ? { warrantyExpiry: new Date(warrantyExpiry) as any } : {}),
    });
    await createAuditLog({ tenantId, userId: ctx.user.id, userName: ctx.user.name ?? undefined, action: "CREATE", module: "assets", entityType: "asset", description: `Activo creado: ${input.name} (${input.assetCode})` });
    return result;
  }),

  update: protectedProcedure.input(z.object({
    id: z.number(),
    name: z.string().optional(),
    description: z.string().optional(),
    status: z.enum(["active", "inactive", "maintenance", "obsolete", "disposed"]).optional(),
    criticality: z.enum(["critical", "high", "medium", "low"]).optional(),
    location: z.string().optional(),
    currentValue: z.string().optional(),
    riskScore: z.number().optional(),
    notes: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    if (!["admin", "supervisor", "technician"].includes(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN" });
    const tenantId = ctx.user.tenantId ?? 1;
    const { id, ...data } = input;
    await updateAsset(id, tenantId, data);
    await createAuditLog({ tenantId, userId: ctx.user.id, userName: ctx.user.name ?? undefined, action: "UPDATE", module: "assets", entityType: "asset", entityId: id, description: `Activo actualizado: ID ${id}` });
    return { success: true };
  }),
});
