import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getAllTenants, getTenantById, createTenant, updateTenant, getBranchesByTenant, getBranchById, createBranch, updateBranch } from "../db";
import { createAuditLog } from "../db";

export const tenantsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    return getAllTenants();
  }),

  getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin" && ctx.user.tenantId !== input.id) throw new TRPCError({ code: "FORBIDDEN" });
    const tenant = await getTenantById(input.id);
    if (!tenant) throw new TRPCError({ code: "NOT_FOUND" });
    return tenant;
  }),

  create: protectedProcedure.input(z.object({
    name: z.string().min(1),
    slug: z.string().min(1),
    rfc: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    plan: z.enum(["basic", "professional", "enterprise"]).optional(),
  })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    const result = await createTenant(input);
    await createAuditLog({ tenantId: ctx.user.tenantId ?? undefined, userId: ctx.user.id, userName: ctx.user.name ?? undefined, action: "CREATE", module: "tenants", entityType: "tenant", description: `Tenant creado: ${input.name}` });
    return result;
  }),

  update: protectedProcedure.input(z.object({
    id: z.number(),
    name: z.string().optional(),
    rfc: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    isActive: z.boolean().optional(),
    plan: z.enum(["basic", "professional", "enterprise"]).optional(),
  })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    const { id, ...data } = input;
    await updateTenant(id, data);
    return { success: true };
  }),
});

export const branchesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId ?? 1;
    return getBranchesByTenant(tenantId);
  }),

  getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    const tenantId = ctx.user.tenantId ?? 1;
    const branch = await getBranchById(input.id, tenantId);
    if (!branch) throw new TRPCError({ code: "NOT_FOUND" });
    return branch;
  }),

  create: protectedProcedure.input(z.object({
    name: z.string().min(1),
    code: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    phone: z.string().optional(),
    contactName: z.string().optional(),
    contactEmail: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    if (!["admin", "supervisor"].includes(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN" });
    const tenantId = ctx.user.tenantId ?? 1;
    const result = await createBranch({ ...input, tenantId });
    await createAuditLog({ tenantId, userId: ctx.user.id, userName: ctx.user.name ?? undefined, action: "CREATE", module: "branches", entityType: "branch", description: `Sucursal creada: ${input.name}` });
    return result;
  }),

  update: protectedProcedure.input(z.object({
    id: z.number(),
    name: z.string().optional(),
    code: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    phone: z.string().optional(),
    contactName: z.string().optional(),
    contactEmail: z.string().optional(),
    isActive: z.boolean().optional(),
  })).mutation(async ({ ctx, input }) => {
    if (!["admin", "supervisor"].includes(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN" });
    const tenantId = ctx.user.tenantId ?? 1;
    const { id, ...data } = input;
    await updateBranch(id, tenantId, data);
    return { success: true };
  }),
});
