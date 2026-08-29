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
