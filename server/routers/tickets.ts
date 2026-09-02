import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  pgProtectedProcedure,
  protectedProcedure,
  router,
} from "../_core/trpc";
import { withTenantTransaction } from "../db.pg";
import {
  getTicketsByTenant,
  getTicketById,
  createTicket,
  updateTicket,
  getTicketComments,
  addTicketComment,
  getTicketHistory,
  createAuditLog,
} from "../db";
import { getDb } from "../db";
import { ticketHistory } from "../../drizzle/schema";
import { nanoid } from "nanoid";
import { sendEmail } from "../_core/mailer";

export const ticketsRouter = router({

  canonicalList: pgProtectedProcedure
    .input(
      z.object({
        operationalStatus:
          z.string().optional(),
        contractualStatus:
          z.string().optional(),
        priority:
          z.string().optional(),
        category:
          z.string().optional(),
        branchId:
          z.string().uuid().optional(),
        assetId:
          z.string().uuid().optional(),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      return withTenantTransaction(
        ctx.pgTenant.tenantId,
        async tx => {
          const operationalStatus =
            input?.operationalStatus ?? null;

          const contractualStatus =
            input?.contractualStatus ?? null;

          const priority =
            input?.priority ?? null;

          const category =
            input?.category ?? null;

          const branchId =
            input?.branchId ?? null;

          const assetId =
            input?.assetId ?? null;

          return tx<{
            id: string;
            ticketNumber: string;
            title: string;
            description: string | null;
            operationalStatus: string;
            contractualStatus: string;
            priority: string;
            category: string;
            branchId: string;
            branchCode: string;
            branchName: string;
            assetId: string | null;
            assetCode: string | null;
            assetManufacturer: string | null;
            assetModel: string | null;
            responseDeadline: Date | null;
            resolutionDeadline: Date | null;
            respondedAt: Date | null;
            resolvedAt: Date | null;
            closedAt: Date | null;
            estimatedCost: string | null;
            actualCost: string | null;
            isBillable: boolean;
            slaTier: string | null;
            slaDeadlineHours: number | null;
            notes: string | null;
            createdAt: Date;
            updatedAt: Date;
          }[]>`
            SELECT
              st.id::text
                AS "id",

              st.ticket_number
                AS "ticketNumber",

              st.title
                AS "title",

              st.description
                AS "description",

              st.operational_status
                AS "operationalStatus",

              st.contractual_status
                AS "contractualStatus",

              st.priority
                AS "priority",

              st.category
                AS "category",

              st.branch_id::text
                AS "branchId",

              b.code
                AS "branchCode",

              b.name
                AS "branchName",

              st.asset_id::text
                AS "assetId",

              a.asset_code
                AS "assetCode",

              a.manufacturer
                AS "assetManufacturer",

              a.model
                AS "assetModel",

              st.response_deadline
                AS "responseDeadline",

              st.resolution_deadline
                AS "resolutionDeadline",

              st.responded_at
                AS "respondedAt",

              st.resolved_at
                AS "resolvedAt",

              st.closed_at
                AS "closedAt",

              st.estimated_cost::text
                AS "estimatedCost",

              st.actual_cost::text
                AS "actualCost",

              st.is_billable
                AS "isBillable",

              st.sla_tier
                AS "slaTier",

              st.sla_deadline_hours
                AS "slaDeadlineHours",

              st.notes
                AS "notes",

              st.created_at
                AS "createdAt",

              st.updated_at
                AS "updatedAt"

            FROM service_tickets st

            JOIN branches b
              ON b.id =
                st.branch_id
              AND b.tenant_id =
                st.tenant_id

            LEFT JOIN assets a
              ON a.id =
                st.asset_id
              AND a.tenant_id =
                st.tenant_id

            WHERE
              (
                ${operationalStatus}::text
                  IS NULL
                OR st.operational_status =
                  ${operationalStatus}
              )

              AND (
                ${contractualStatus}::text
                  IS NULL
                OR st.contractual_status =
                  ${contractualStatus}
              )

              AND (
                ${priority}::text
                  IS NULL
                OR st.priority =
                  ${priority}
              )

              AND (
                ${category}::text
                  IS NULL
                OR st.category =
                  ${category}
              )

              AND (
                ${branchId}::uuid
                  IS NULL
                OR st.branch_id =
                  ${branchId}::uuid
              )

              AND (
                ${assetId}::uuid
                  IS NULL
                OR st.asset_id =
                  ${assetId}::uuid
              )

            ORDER BY
              st.created_at DESC,
              st.ticket_number
          `;
        },
      );
    }),



  canonicalGetById: pgProtectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return withTenantTransaction(
        ctx.pgTenant.tenantId,
        async tx => {
          const rows = await tx<{
            id: string;
            ticketNumber: string;
            title: string;
            description: string | null;
            operationalStatus: string;
            contractualStatus: string;
            priority: string;
            category: string;
            branchId: string;
            branchCode: string;
            branchName: string;
            assetId: string | null;
            assetCode: string | null;
            assetManufacturer: string | null;
            assetModel: string | null;
            responseDeadline: Date | null;
            resolutionDeadline: Date | null;
            respondedAt: Date | null;
            resolvedAt: Date | null;
            closedAt: Date | null;
            estimatedCost: string | null;
            actualCost: string | null;
            isBillable: boolean;
            slaTier: string | null;
            slaDeadlineHours: number | null;
            evidenceImageUrl: string | null;
            evidenceImageKey: string | null;
            resolutionNotes: string | null;
            resolutionEvidenceUrls: unknown;
            resolutionSignatureUrl: string | null;
            resolutionReportUrl: string | null;
            resolutionReportKey: string | null;
            resolvedByName: string | null;
            notificationSentAt: Date | null;
            notes: string | null;
            createdAt: Date;
            updatedAt: Date;
          }[]>`
            SELECT
              st.id::text
                AS "id",

              st.ticket_number
                AS "ticketNumber",

              st.title
                AS "title",

              st.description
                AS "description",

              st.operational_status
                AS "operationalStatus",

              st.contractual_status
                AS "contractualStatus",

              st.priority
                AS "priority",

              st.category
                AS "category",

              st.branch_id::text
                AS "branchId",

              b.code
                AS "branchCode",

              b.name
                AS "branchName",

              st.asset_id::text
                AS "assetId",

              a.asset_code
                AS "assetCode",

              a.manufacturer
                AS "assetManufacturer",

              a.model
                AS "assetModel",

              st.response_deadline
                AS "responseDeadline",

              st.resolution_deadline
                AS "resolutionDeadline",

              st.responded_at
                AS "respondedAt",

              st.resolved_at
                AS "resolvedAt",

              st.closed_at
                AS "closedAt",

              st.estimated_cost::text
                AS "estimatedCost",

              st.actual_cost::text
                AS "actualCost",

              st.is_billable
                AS "isBillable",

              st.sla_tier
                AS "slaTier",

              st.sla_deadline_hours
                AS "slaDeadlineHours",

              st.evidence_image_url
                AS "evidenceImageUrl",

              st.evidence_image_key
                AS "evidenceImageKey",

              st.resolution_notes
                AS "resolutionNotes",

              st.resolution_evidence_urls
                AS "resolutionEvidenceUrls",

              st.resolution_signature_url
                AS "resolutionSignatureUrl",

              st.resolution_report_url
                AS "resolutionReportUrl",

              st.resolution_report_key
                AS "resolutionReportKey",

              st.resolved_by_name
                AS "resolvedByName",

              st.notification_sent_at
                AS "notificationSentAt",

              st.notes
                AS "notes",

              st.created_at
                AS "createdAt",

              st.updated_at
                AS "updatedAt"

            FROM service_tickets st

            JOIN branches b
              ON b.id =
                st.branch_id
              AND b.tenant_id =
                st.tenant_id

            LEFT JOIN assets a
              ON a.id =
                st.asset_id
              AND a.tenant_id =
                st.tenant_id

            WHERE st.id =
              ${input.id}::uuid

            LIMIT 1
          `;

          const ticket =
            rows[0];

          if (!ticket) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message:
                "Canonical ticket was not found",
            });
          }

          return ticket;
        },
      );
    }),

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
    slaTier: z.enum(["tier1","tier2","tier3"]).optional(),
    assetCategory: z.string().optional(),
    assetName: z.string().optional(),
    slaDeadlineHours: z.number().optional(),
  })).mutation(async ({ ctx, input }) => {
    const tenantId = ctx.user.tenantId ?? 1;
    const ticketNumber = `TKT-${Date.now().toString(36).toUpperCase()}`;
    // Calculate SLA deadline based on tier
    const SLA_HOURS: Record<string, number> = { tier1: 48, tier2: 24, tier3: 4 };
    const deadlineHours = input.slaDeadlineHours ?? (input.slaTier ? SLA_HOURS[input.slaTier] : undefined);
    const responseDeadline = deadlineHours ? new Date(Date.now() + deadlineHours * 3600 * 1000) : undefined;
    const result = await createTicket({
      ...input,
      tenantId,
      ticketNumber,
      operationalStatus: "open",
      contractualStatus: input.contractualStatus ?? "pending_approval",
      reportedByUserId: ctx.user.id,
      responseDeadline,
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

  uploadEvidence: protectedProcedure.input(z.object({
    ticketId: z.number(),
    imageBase64: z.string(),
    mimeType: z.string().default("image/jpeg"),
    fileName: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
    const tenantId = ctx.user.tenantId ?? 1;
    // Verify ticket ownership
    const ticket = await getTicketById(input.ticketId, tenantId);
    if (!ticket) throw new TRPCError({ code: "NOT_FOUND", message: "Ticket no encontrado" });
    // Upload to S3
    const { storagePut } = await import("../storage");
    const ext = input.mimeType.split("/")[1] ?? "jpg";
    const key = `tickets/evidence/${tenantId}/${input.ticketId}-${Date.now()}.${ext}`;
    const buffer = Buffer.from(input.imageBase64.replace(/^data:[^;]+;base64,/, ""), "base64");
    const { url } = await storagePut(key, buffer, input.mimeType);
    // Update ticket record
    const { tickets } = await import("../../drizzle/schema");
    const { eq, and } = await import("drizzle-orm");
    await db.update(tickets).set({ evidenceImageUrl: url, evidenceImageKey: key } as any)
      .where(and(eq(tickets.id, input.ticketId), eq(tickets.tenantId, tenantId)));
    await createAuditLog({ tenantId, userId: ctx.user.id, userName: ctx.user.name ?? undefined, action: "UPDATE", module: "tickets", entityType: "ticket", entityId: input.ticketId, description: `Imagen de evidencia subida al ticket #${input.ticketId}` });
    return { url, key };
  }),

  resolveWithReport: protectedProcedure.input(z.object({
    ticketId: z.number(),
    resolutionNotes: z.string().min(1),
    evidenceImages: z.array(z.object({
      base64: z.string(),
      mimeType: z.string().default("image/jpeg"),
      label: z.string().optional(), // "before" | "after" | "other"
    })).optional().default([]),
    signatureBase64: z.string().optional(), // canvas PNG base64
    resolvedByName: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
    const tenantId = ctx.user.tenantId ?? 1;
    const ticket = await getTicketById(input.ticketId, tenantId);
    if (!ticket) throw new TRPCError({ code: "NOT_FOUND", message: "Ticket no encontrado" });

    const { storagePut } = await import("../storage");
    const { tickets, ticketHistory: ticketHistoryTable, users } = await import("../../drizzle/schema");
    const { eq, and } = await import("drizzle-orm");

    // 1. Upload evidence images to S3
    const evidenceUrls: string[] = [];
    for (const img of input.evidenceImages) {
      const ext = img.mimeType.split("/")[1] ?? "jpg";
      const key = `tickets/resolution/${tenantId}/${input.ticketId}-evidence-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const buffer = Buffer.from(img.base64.replace(/^data:[^;]+;base64,/, ""), "base64");
      const { url } = await storagePut(key, buffer, img.mimeType);
      evidenceUrls.push(url);
    }

    // 2. Upload signature to S3
    let signatureUrl: string | undefined;
    if (input.signatureBase64) {
      const sigKey = `tickets/signatures/${tenantId}/${input.ticketId}-sig-${Date.now()}.png`;
      const sigBuffer = Buffer.from(input.signatureBase64.replace(/^data:[^;]+;base64,/, ""), "base64");
      const { url } = await storagePut(sigKey, sigBuffer, "image/png");
      signatureUrl = url;
    }

    // 3. Update ticket to resolved
    const resolvedByName = input.resolvedByName ?? ctx.user.name ?? "Técnico";
    await db.update(tickets).set({
      operationalStatus: "resolved",
      resolvedAt: new Date(),
      resolutionNotes: input.resolutionNotes,
      resolutionEvidenceUrls: evidenceUrls,
      resolutionSignatureUrl: signatureUrl ?? null,
      resolvedByName,
    } as any).where(and(eq(tickets.id, input.ticketId), eq(tickets.tenantId, tenantId)));

    // 4. Add to ticket history (bitácora)
    await db.insert(ticketHistoryTable).values({
      ticketId: input.ticketId,
      tenantId,
      userId: ctx.user.id,
      action: "RESOLVED_WITH_REPORT",
      fieldChanged: "operationalStatus",
      oldValue: ticket.operationalStatus,
      newValue: "resolved",
      // Store resolution summary as newValue JSON
    });

    // 5. Send notification email to the user who reported the ticket
    let notificationSent = false;
    if (ticket.reportedByUserId) {
      try {
        const [reporter] = await db.select().from(users).where(eq(users.id, ticket.reportedByUserId)).limit(1);
        if (reporter?.email) {
          const appUrl = process.env.APP_URL ?? "https://staging.horos.mx";
          const ticketUrl = `${appUrl}/tickets/${input.ticketId}`;
          await sendEmail({
            to: reporter.email,
            subject: `✅ Ticket #${ticket.ticketNumber} resuelto — ${ticket.title}`,
            html: `
              <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px">
                <div style="background:#1e3a5f;padding:20px;border-radius:8px 8px 0 0;text-align:center">
                  <h1 style="color:#fff;margin:0;font-size:22px">HOROS SaaS</h1>
                  <p style="color:#93c5fd;margin:4px 0 0">Gestión de Pólizas y SLA</p>
                </div>
                <div style="background:#fff;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0">
                  <h2 style="color:#16a34a;margin:0 0 16px">✅ Tu ticket ha sido resuelto</h2>
                  <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
                    <tr><td style="padding:8px;background:#f1f5f9;font-weight:bold;width:40%">Número de ticket</td><td style="padding:8px">${ticket.ticketNumber}</td></tr>
                    <tr><td style="padding:8px;font-weight:bold">Título</td><td style="padding:8px">${ticket.title}</td></tr>
                    <tr><td style="padding:8px;background:#f1f5f9;font-weight:bold">Resuelto por</td><td style="padding:8px;background:#f1f5f9">${resolvedByName}</td></tr>
                    <tr><td style="padding:8px;font-weight:bold">Fecha de resolución</td><td style="padding:8px">${new Date().toLocaleString("es-MX")}</td></tr>
                    <tr><td style="padding:8px;background:#f1f5f9;font-weight:bold">Notas de resolución</td><td style="padding:8px;background:#f1f5f9">${input.resolutionNotes}</td></tr>
                  </table>
                  <div style="text-align:center;margin:24px 0">
                    <a href="${ticketUrl}" style="background:#1e3a5f;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold">Ver ticket completo</a>
                  </div>
                  <p style="color:#64748b;font-size:12px;text-align:center;margin:0">Este es un mensaje automático de HOROS SaaS. Por favor no respondas a este correo.</p>
                </div>
              </div>
            `,
          });
          // Mark notification as sent
          await db.update(tickets).set({ notificationSentAt: new Date() } as any)
            .where(eq(tickets.id, input.ticketId));
          notificationSent = true;
        }
      } catch (emailErr) {
        console.error("[resolveWithReport] Error sending notification email:", emailErr);
      }
    }

    await createAuditLog({
      tenantId, userId: ctx.user.id, userName: ctx.user.name ?? undefined,
      action: "RESOLVE", module: "tickets", entityType: "ticket", entityId: input.ticketId,
      description: `Ticket resuelto con reporte por ${resolvedByName}. Evidencias: ${evidenceUrls.length}. Firma: ${signatureUrl ? "Sí" : "No"}. Notificación: ${notificationSent ? "enviada" : "no enviada"}`
    });

    return {
      success: true,
      evidenceUrls,
      signatureUrl,
      notificationSent,
    };
  }),
});
