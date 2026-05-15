import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getPoliciesByTenant, getPolicyById, createPolicy, updatePolicy,
  getPolicyCoverages, getPolicySlaRules, getPolicyServices, getPolicyExclusions, getPolicyOperationalRules,
  createAuditLog,
} from "../db";
import { getDb } from "../db";
import { policyCoverages, policyServices, policySlaRules, policyExclusions, policyOperationalRules } from "../../drizzle/schema";
import { and, eq } from "drizzle-orm";

export const policiesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId ?? 1;
    return getPoliciesByTenant(tenantId);
  }),

  getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    const tenantId = ctx.user.tenantId ?? 1;
    const policy = await getPolicyById(input.id, tenantId);
    if (!policy) throw new TRPCError({ code: "NOT_FOUND" });
    const [coverages, slaRules, services, exclusions, operationalRules] = await Promise.all([
      getPolicyCoverages(input.id, tenantId),
      getPolicySlaRules(input.id, tenantId),
      getPolicyServices(input.id, tenantId),
      getPolicyExclusions(input.id, tenantId),
      getPolicyOperationalRules(input.id, tenantId),
    ]);
    return { ...policy, coverages, slaRules, services, exclusions, operationalRules };
  }),

  create: protectedProcedure.input(z.object({
    policyNumber: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    status: z.enum(["draft", "active", "suspended", "expired", "cancelled"]).optional(),
    type: z.enum(["maintenance", "warranty", "support", "comprehensive"]).optional(),
    startDate: z.string(),
    endDate: z.string(),
    renewalDate: z.string().optional(),
    monthlyValue: z.string().optional(),
    annualValue: z.string().optional(),
    currency: z.string().optional(),
    clientName: z.string().optional(),
    clientContact: z.string().optional(),
    clientEmail: z.string().optional(),
    clientPhone: z.string().optional(),
    branchId: z.number().optional(),
    notes: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    if (!["admin", "supervisor"].includes(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN" });
    const tenantId = ctx.user.tenantId ?? 1;
    const result = await createPolicy({
      ...input,
      tenantId,
      startDate: new Date(input.startDate) as any,
      endDate: new Date(input.endDate) as any,
      renewalDate: input.renewalDate ? new Date(input.renewalDate) as any : undefined,
      assignedUserId: ctx.user.id,
    });
    await createAuditLog({ tenantId, userId: ctx.user.id, userName: ctx.user.name ?? undefined, action: "CREATE", module: "policies", entityType: "policy", description: `Póliza creada: ${input.name} (${input.policyNumber})` });
    return result;
  }),

  update: protectedProcedure.input(z.object({
    id: z.number(),
    name: z.string().optional(),
    description: z.string().optional(),
    status: z.enum(["draft", "active", "suspended", "expired", "cancelled"]).optional(),
    type: z.enum(["maintenance", "warranty", "support", "comprehensive"]).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    renewalDate: z.string().optional(),
    monthlyValue: z.string().optional(),
    annualValue: z.string().optional(),
    clientName: z.string().optional(),
    clientContact: z.string().optional(),
    clientEmail: z.string().optional(),
    clientPhone: z.string().optional(),
    notes: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    if (!["admin", "supervisor"].includes(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN" });
    const tenantId = ctx.user.tenantId ?? 1;
    const { id, startDate, endDate, renewalDate, ...rest } = input;
    const data = {
      ...rest,
      ...(startDate ? { startDate: new Date(startDate) as any } : {}),
      ...(endDate ? { endDate: new Date(endDate) as any } : {}),
      ...(renewalDate ? { renewalDate: new Date(renewalDate) as any } : {}),
    };
    await updatePolicy(id, tenantId, data);
    await createAuditLog({ tenantId, userId: ctx.user.id, userName: ctx.user.name ?? undefined, action: "UPDATE", module: "policies", entityType: "policy", entityId: id, description: `Póliza actualizada: ID ${id}` });
    return { success: true };
  }),

  addCoverage: protectedProcedure.input(z.object({
    policyId: z.number(),
    name: z.string().min(1),
    description: z.string().optional(),
    coverageType: z.enum(["preventive", "corrective", "emergency", "parts", "labor", "travel"]),
    maxIncidents: z.number().optional(),
    maxAmount: z.string().optional(),
    isUnlimited: z.boolean().optional(),
  })).mutation(async ({ ctx, input }) => {
    if (!["admin", "supervisor"].includes(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN" });
    const tenantId = ctx.user.tenantId ?? 1;
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await db.insert(policyCoverages).values({ ...input, tenantId });
    return { success: true };
  }),

  addSlaRule: protectedProcedure.input(z.object({
    policyId: z.number(),
    name: z.string().min(1),
    priority: z.enum(["critical", "high", "medium", "low"]),
    responseTimeHours: z.number(),
    resolutionTimeHours: z.number(),
    escalationTimeHours: z.number().optional(),
    penaltyPerHour: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    if (!["admin", "supervisor"].includes(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN" });
    const tenantId = ctx.user.tenantId ?? 1;
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await db.insert(policySlaRules).values({ ...input, tenantId });
    return { success: true };
  }),

  addService: protectedProcedure.input(z.object({
    policyId: z.number(),
    serviceName: z.string().min(1),
    serviceCode: z.string().optional(),
    description: z.string().optional(),
    frequency: z.enum(["on_demand", "monthly", "quarterly", "biannual", "annual"]).optional(),
    isIncluded: z.boolean().optional(),
  })).mutation(async ({ ctx, input }) => {
    if (!["admin", "supervisor"].includes(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN" });
    const tenantId = ctx.user.tenantId ?? 1;
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await db.insert(policyServices).values({ ...input, tenantId });
    return { success: true };
  }),

  addExclusion: protectedProcedure.input(z.object({
    policyId: z.number(),
    description: z.string().min(1),
    category: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    if (!["admin", "supervisor"].includes(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN" });
    const tenantId = ctx.user.tenantId ?? 1;
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await db.insert(policyExclusions).values({ ...input, tenantId });
    return { success: true };
  }),

  addOperationalRule: protectedProcedure.input(z.object({
    policyId: z.number(),
    ruleType: z.string().min(1),
    description: z.string().min(1),
    value: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    if (!["admin", "supervisor"].includes(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN" });
    const tenantId = ctx.user.tenantId ?? 1;
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await db.insert(policyOperationalRules).values({ ...input, tenantId });
    return { success: true };
  }),
});
