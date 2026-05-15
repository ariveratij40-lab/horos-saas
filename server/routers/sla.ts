import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { slaMonitoring, tickets, policies, policySlaRules } from "../../drizzle/schema";
import { and, eq, gte, lte, desc, sql } from "drizzle-orm";

export const slaRouter = router({
  // Obtener resumen de cumplimiento SLA por tenant
  compliance: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId ?? 1;
    const db = await getDb();
    if (!db) return { total: 0, compliant: 0, breached: 0, atRisk: 0, complianceRate: 0 };

    const records = await db.select().from(slaMonitoring).where(eq(slaMonitoring.tenantId, tenantId));
    const total = records.length;
    const breached = records.filter(r => r.responseBreached || r.resolutionBreached).length;
    const compliant = records.filter(r => !r.responseBreached && !r.resolutionBreached && r.resolvedAt).length;
    const atRisk = records.filter(r => {
      if (r.resolvedAt || r.resolutionBreached) return false;
      if (!r.resolutionDeadline) return false;
      const now = Date.now();
      const deadline = new Date(r.resolutionDeadline).getTime();
      const remaining = deadline - now;
      return remaining > 0 && remaining < 2 * 60 * 60 * 1000; // menos de 2 horas
    }).length;

    return {
      total,
      compliant,
      breached,
      atRisk,
      complianceRate: total > 0 ? Math.round((compliant / total) * 100) : 100,
    };
  }),

  // Listar registros de monitoreo SLA
  list: protectedProcedure.input(z.object({
    policyId: z.number().optional(),
    breachedOnly: z.boolean().optional(),
    limit: z.number().optional(),
  }).optional()).query(async ({ ctx, input }) => {
    const tenantId = ctx.user.tenantId ?? 1;
    const db = await getDb();
    if (!db) return [];

    const records = await db.select().from(slaMonitoring)
      .where(eq(slaMonitoring.tenantId, tenantId))
      .orderBy(desc(slaMonitoring.createdAt))
      .limit(input?.limit ?? 100);

    if (input?.breachedOnly) {
      return records.filter(r => r.responseBreached || r.resolutionBreached);
    }
    if (input?.policyId) {
      return records.filter(r => r.policyId === input.policyId);
    }
    return records;
  }),

  // Obtener alertas activas (tickets en riesgo de incumplir SLA)
  alerts: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId ?? 1;
    const db = await getDb();
    if (!db) return [];

    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    // Tickets abiertos con deadline próximo
    const openTickets = await db.select().from(tickets).where(
      and(
        eq(tickets.tenantId, tenantId),
        sql`${tickets.operationalStatus} != 'resolved'`,
        sql`${tickets.resolutionDeadline} IS NOT NULL`,
        lte(tickets.resolutionDeadline, twoHoursFromNow),
        gte(tickets.resolutionDeadline, now),
      )
    ).orderBy(tickets.resolutionDeadline).limit(20);

    return openTickets.map(t => ({
      ticketId: t.id,
      ticketNumber: t.ticketNumber,
      title: t.title,
      priority: t.priority,
      resolutionDeadline: t.resolutionDeadline,
      minutesRemaining: t.resolutionDeadline
        ? Math.round((new Date(t.resolutionDeadline).getTime() - now.getTime()) / 60000)
        : null,
    }));
  }),

  // Reporte de desempeño SLA por política
  reportByPolicy: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId ?? 1;
    const db = await getDb();
    if (!db) return [];

    const activePolicies = await db.select().from(policies)
      .where(and(eq(policies.tenantId, tenantId), eq(policies.status, "active")));

    const results = await Promise.all(activePolicies.map(async (policy) => {
      const slaRecords = await db.select().from(slaMonitoring)
        .where(and(eq(slaMonitoring.tenantId, tenantId), eq(slaMonitoring.policyId, policy.id)));

      const total = slaRecords.length;
      const breached = slaRecords.filter(r => r.responseBreached || r.resolutionBreached).length;
      const compliant = total - breached;

      return {
        policyId: policy.id,
        policyName: policy.name,
        policyNumber: policy.policyNumber,
        total,
        compliant,
        breached,
        complianceRate: total > 0 ? Math.round((compliant / total) * 100) : 100,
      };
    }));

    return results;
  }),

  // Obtener reglas SLA de una política
  getRulesByPolicy: protectedProcedure.input(z.object({ policyId: z.number() })).query(async ({ ctx, input }) => {
    const tenantId = ctx.user.tenantId ?? 1;
    const db = await getDb();
    if (!db) return [];
    return db.select().from(policySlaRules)
      .where(and(eq(policySlaRules.policyId, input.policyId), eq(policySlaRules.tenantId, tenantId)));
  }),

  // Registrar monitoreo SLA para un ticket
  registerMonitoring: protectedProcedure.input(z.object({
    ticketId: z.number(),
    slaRuleId: z.number().optional(),
    policyId: z.number().optional(),
    responseDeadline: z.string().optional(),
    resolutionDeadline: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    if (!["admin", "supervisor"].includes(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN" });
    const tenantId = ctx.user.tenantId ?? 1;
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    await db.insert(slaMonitoring).values({
      tenantId,
      ticketId: input.ticketId,
      slaRuleId: input.slaRuleId,
      policyId: input.policyId,
      responseDeadline: input.responseDeadline ? new Date(input.responseDeadline) : undefined,
      resolutionDeadline: input.resolutionDeadline ? new Date(input.resolutionDeadline) : undefined,
    });

    return { success: true };
  }),
});
