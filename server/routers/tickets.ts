import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getTicketsByTenant, getTicketById, createTicket, updateTicket,
  getTicketComments, addTicketComment, getTicketHistory, createAuditLog,
} from "../db";
import { getDb } from "../db";
import { ticketHistory } from "../../drizzle/schema";
import { nanoid } from "nanoid";

export const ticketsRouter = router({
  list: protectedProcedure.input(z.object({
    operationalStatus: z.string().optional(),
    contractualStatus: z.string().optional(),
    priority: z.string().optional(),
  }).optional()).query(async ({ ctx, input }) => {
    const tenantId = ctx.user.tenantId ?? 1;
    return getTicketsByTenant(tenantId, input ?? {});
  }),

  getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    const tenantId = ctx.user.tenantId ?? 1;
    const ticket = await getTicketById(input.id, tenantId);
    if (!ticket) throw new TRPCError({ code: "NOT_FOUND" });
    const [comments, history] = await Promise.all([
      getTicketComments(input.id, tenantId),
      getTicketHistory(input.id, tenantId),
    ]);
    return { ...ticket, comments, history };
  }),

  create: protectedProcedure.input(z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    priority: z.enum(["critical", "high", "medium", "low"]).optional(),
    category: z.enum(["corrective", "preventive", "emergency", "installation", "inspection"]).optional(),
    policyId: z.number().optional(),
    branchId: z.number().optional(),
    assetId: z.number().optional(),
    slaRuleId: z.number().optional(),
    contractualStatus: z.enum(["covered", "not_covered", "pending_approval", "outside_sla", "billable"]).optional(),
    estimatedCost: z.string().optional(),
    notes: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    const tenantId = ctx.user.tenantId ?? 1;
    const ticketNumber = `TKT-${Date.now().toString(36).toUpperCase()}`;
    const result = await createTicket({
      ...input,
      tenantId,
      ticketNumber,
      operationalStatus: "open",
      contractualStatus: input.contractualStatus ?? "pending_approval",
      reportedByUserId: ctx.user.id,
    });
    await createAuditLog({ tenantId, userId: ctx.user.id, userName: ctx.user.name ?? undefined, action: "CREATE", module: "tickets", entityType: "ticket", description: `Ticket creado: ${ticketNumber} - ${input.title}` });
    return result;
  }),

  updateOperationalStatus: protectedProcedure.input(z.object({
    id: z.number(),
    operationalStatus: z.enum(["open", "assigned", "technician_on_route", "waiting_parts", "resolved"]),
    assignedUserId: z.number().optional(),
    notes: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    const tenantId = ctx.user.tenantId ?? 1;
    const ticket = await getTicketById(input.id, tenantId);
    if (!ticket) throw new TRPCError({ code: "NOT_FOUND" });

    const updateData: any = { operationalStatus: input.operationalStatus };
    if (input.assignedUserId) updateData.assignedUserId = input.assignedUserId;
    if (input.operationalStatus === "resolved") updateData.resolvedAt = new Date();

    await updateTicket(input.id, tenantId, updateData);

    const db = await getDb();
    if (db) {
      await db.insert(ticketHistory).values({
        ticketId: input.id, tenantId, userId: ctx.user.id,
        action: "STATUS_CHANGE", fieldChanged: "operationalStatus",
        oldValue: ticket.operationalStatus, newValue: input.operationalStatus,
      });
    }
    await createAuditLog({ tenantId, userId: ctx.user.id, userName: ctx.user.name ?? undefined, action: "UPDATE", module: "tickets", entityType: "ticket", entityId: input.id, description: `Estado operativo cambiado: ${ticket.operationalStatus} → ${input.operationalStatus}` });
    return { success: true };
  }),

  updateContractualStatus: protectedProcedure.input(z.object({
    id: z.number(),
    contractualStatus: z.enum(["covered", "not_covered", "pending_approval", "outside_sla", "billable"]),
    isBillable: z.boolean().optional(),
    actualCost: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    if (!["admin", "supervisor"].includes(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN" });
    const tenantId = ctx.user.tenantId ?? 1;
    const ticket = await getTicketById(input.id, tenantId);
    if (!ticket) throw new TRPCError({ code: "NOT_FOUND" });

    await updateTicket(input.id, tenantId, {
      contractualStatus: input.contractualStatus,
      isBillable: input.isBillable,
      actualCost: input.actualCost,
    });

    const db = await getDb();
    if (db) {
      await db.insert(ticketHistory).values({
        ticketId: input.id, tenantId, userId: ctx.user.id,
        action: "STATUS_CHANGE", fieldChanged: "contractualStatus",
        oldValue: ticket.contractualStatus, newValue: input.contractualStatus,
      });
    }
    await createAuditLog({ tenantId, userId: ctx.user.id, userName: ctx.user.name ?? undefined, action: "UPDATE", module: "tickets", entityType: "ticket", entityId: input.id, description: `Estado contractual cambiado: ${ticket.contractualStatus} → ${input.contractualStatus}` });
    return { success: true };
  }),

  addComment: protectedProcedure.input(z.object({
    ticketId: z.number(),
    comment: z.string().min(1),
    isInternal: z.boolean().optional(),
  })).mutation(async ({ ctx, input }) => {
    const tenantId = ctx.user.tenantId ?? 1;
    await addTicketComment({ ...input, tenantId, userId: ctx.user.id });
    return { success: true };
  }),

  getComments: protectedProcedure.input(z.object({ ticketId: z.number() })).query(async ({ ctx, input }) => {
    const tenantId = ctx.user.tenantId ?? 1;
    return getTicketComments(input.ticketId, tenantId);
  }),
});
