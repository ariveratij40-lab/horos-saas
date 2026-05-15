import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getMaintenancePlansByTenant, getMaintenancePlanById, createMaintenancePlan, updateMaintenancePlan,
  getMaintenanceTasksByPlan, getMaintenanceTasksByTenant, createAuditLog,
} from "../db";
import { getDb } from "../db";
import { maintenanceTasks } from "../../drizzle/schema";
import { and, eq } from "drizzle-orm";

export const maintenanceRouter = router({
  listPlans: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId ?? 1;
    return getMaintenancePlansByTenant(tenantId);
  }),

  getPlanById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    const tenantId = ctx.user.tenantId ?? 1;
    const plan = await getMaintenancePlanById(input.id, tenantId);
    if (!plan) throw new TRPCError({ code: "NOT_FOUND" });
    const tasks = await getMaintenanceTasksByPlan(input.id, tenantId);
    return { ...plan, tasks };
  }),

  createPlan: protectedProcedure.input(z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    type: z.enum(["preventive", "corrective", "predictive"]).optional(),
    frequency: z.enum(["weekly", "monthly", "quarterly", "biannual", "annual", "on_demand"]).optional(),
    branchId: z.number().optional(),
    policyId: z.number().optional(),
    assignedUserId: z.number().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    nextExecutionDate: z.string().optional(),
    estimatedDurationHours: z.string().optional(),
    estimatedCost: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    if (!["admin", "supervisor"].includes(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN" });
    const tenantId = ctx.user.tenantId ?? 1;
    const { startDate, endDate, nextExecutionDate, ...rest } = input;
    const result = await createMaintenancePlan({
      ...rest,
      tenantId,
      ...(startDate ? { startDate: new Date(startDate) as any } : {}),
      ...(endDate ? { endDate: new Date(endDate) as any } : {}),
      ...(nextExecutionDate ? { nextExecutionDate: new Date(nextExecutionDate) as any } : {}),
    });
    await createAuditLog({ tenantId, userId: ctx.user.id, userName: ctx.user.name ?? undefined, action: "CREATE", module: "maintenance", entityType: "maintenance_plan", description: `Plan de mantenimiento creado: ${input.name}` });
    return result;
  }),

  updatePlan: protectedProcedure.input(z.object({
    id: z.number(),
    name: z.string().optional(),
    description: z.string().optional(),
    status: z.enum(["active", "paused", "completed", "cancelled"]).optional(),
    assignedUserId: z.number().optional(),
    nextExecutionDate: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    if (!["admin", "supervisor"].includes(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN" });
    const tenantId = ctx.user.tenantId ?? 1;
    const { id, nextExecutionDate, ...rest } = input;
    const data = {
      ...rest,
      ...(nextExecutionDate ? { nextExecutionDate: new Date(nextExecutionDate) as any } : {}),
    };
    await updateMaintenancePlan(id, tenantId, data);
    return { success: true };
  }),

  listTasks: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId ?? 1;
    return getMaintenanceTasksByTenant(tenantId);
  }),

  createTask: protectedProcedure.input(z.object({
    planId: z.number(),
    title: z.string().min(1),
    description: z.string().optional(),
    assetId: z.number().optional(),
    assignedUserId: z.number().optional(),
    scheduledDate: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    if (!["admin", "supervisor"].includes(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN" });
    const tenantId = ctx.user.tenantId ?? 1;
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const { scheduledDate, ...rest } = input;
    await db.insert(maintenanceTasks).values({
      ...rest,
      tenantId,
      ...(scheduledDate ? { scheduledDate: new Date(scheduledDate) as any } : {}),
    });
    return { success: true };
  }),

  updateTask: protectedProcedure.input(z.object({
    id: z.number(),
    status: z.enum(["pending", "in_progress", "completed", "cancelled", "rescheduled"]).optional(),
    assignedUserId: z.number().optional(),
    scheduledDate: z.string().optional(),
    completedDate: z.string().optional(),
    durationHours: z.string().optional(),
    actualCost: z.string().optional(),
    findings: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    const tenantId = ctx.user.tenantId ?? 1;
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const { id, scheduledDate, completedDate, ...rest } = input;
    const data: Record<string, any> = {
      ...rest,
      ...(scheduledDate ? { scheduledDate: new Date(scheduledDate) } : {}),
      ...(completedDate ? { completedDate: new Date(completedDate) } : {}),
    };
    await db.update(maintenanceTasks).set(data).where(and(eq(maintenanceTasks.id, id), eq(maintenanceTasks.tenantId, tenantId)));
    return { success: true };
  }),
});
