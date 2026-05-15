import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getAssetsByTenant, getAssetById, createAsset, updateAsset, createAuditLog } from "../db";

export const assetsRouter = router({
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
