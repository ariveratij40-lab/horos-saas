import { TRPCError } from "@trpc/server";
import type { TransactionSql } from "postgres";
import { z } from "zod";

import {
  pgProtectedProcedure,
  router,
} from "../_core/trpc";
import {
  withTenantTransaction,
} from "../db.pg";

function requireTicketAdministrator(tenantRole: string) {
  if (tenantRole !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Canonical ticket workflow requires tenant administrator access",
    });
  }
}

function actorName(ctx: {
  user: {
    name?: string | null;
    email?: string | null;
  };
}) {
  return (
    ctx.user.name
    ?? ctx.user.email
    ?? "HOROS user"
  );
}

async function lockTicket(
  tx: TransactionSql,
  id: string,
) {
  const rows = await tx<{
    id: string;
    ticketNumber: string;
    operationalStatus: string;
    contractualStatus: string;
    assignedToUserId: string | null;
  }[]>`
    SELECT
      id::text AS "id",
      ticket_number AS "ticketNumber",
      operational_status AS "operationalStatus",
      contractual_status AS "contractualStatus",
      assigned_to_user_id::text AS "assignedToUserId"
    FROM service_tickets
    WHERE id = ${id}::uuid
    FOR UPDATE
  `;

  if (rows.length !== 1) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Canonical ticket was not found",
    });
  }

  return rows[0]!;
}

async function appendEvent(
  tx: TransactionSql,
  input: {
    tenantId: string;
    ticketId: string;
    eventType:
      | "status_changed"
      | "comment_added"
      | "resolution_added"
      | "closed";
    actor: string;
    message: string;
    metadata?: Record<string, unknown>;
  },
) {
  await tx`
    INSERT INTO service_ticket_events (
      tenant_id,
      service_ticket_id,
      event_type,
      actor_name,
      message,
      metadata
    )
    VALUES (
      ${input.tenantId}::uuid,
      ${input.ticketId}::uuid,
      ${input.eventType},
      ${input.actor},
      ${input.message},
      ${JSON.stringify(input.metadata ?? {})}::jsonb
    )
  `;
}

export const ticketWorkflowRouter = router({
  canonicalEvents:
    pgProtectedProcedure
      .input(
        z.object({
          id: z.string().uuid(),
        }),
      )
      .query(async ({ ctx, input }) => {
        return withTenantTransaction(
          ctx.pgTenant.tenantId,
          async tx => {
            const ticket = await tx<{ id: string }[]>`
              SELECT id::text AS "id"
              FROM service_tickets
              WHERE id = ${input.id}::uuid
              LIMIT 1
            `;

            if (ticket.length !== 1) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Canonical ticket was not found",
              });
            }

            return tx<{
              id: string;
              eventType: string;
              actorName: string | null;
              message: string | null;
              metadata: unknown;
              createdAt: Date;
            }[]>`
              SELECT
                id::text AS "id",
                event_type AS "eventType",
                actor_name AS "actorName",
                message AS "message",
                metadata AS "metadata",
                created_at AS "createdAt"
              FROM service_ticket_events
              WHERE service_ticket_id = ${input.id}::uuid
              ORDER BY created_at ASC, id ASC
            `;
          },
        );
      }),

  canonicalStartWork:
    pgProtectedProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          note: z.string().trim().min(1).max(2000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        requireTicketAdministrator(ctx.pgTenant.tenantRole);

        return withTenantTransaction(
          ctx.pgTenant.tenantId,
          async tx => {
            const current = await lockTicket(tx, input.id);

            if (!current.assignedToUserId) {
              throw new TRPCError({
                code: "CONFLICT",
                message:
                  "Ticket must have a canonical assignee before work can start",
              });
            }

            if (
              !["assigned", "pending"].includes(
                current.operationalStatus,
              )
            ) {
              throw new TRPCError({
                code: "CONFLICT",
                message:
                  `Ticket cannot start work from ${current.operationalStatus}`,
              });
            }

            if (
              !["approved", "not_required"].includes(
                current.contractualStatus,
              )
            ) {
              throw new TRPCError({
                code: "CONFLICT",
                message:
                  `Ticket cannot start work with contractual status ${current.contractualStatus}`,
              });
            }

            const rows = await tx<{
              id: string;
              ticketNumber: string;
              operationalStatus: string;
              respondedAt: Date;
              updatedAt: Date;
            }[]>`
              UPDATE service_tickets
              SET
                operational_status = 'in_progress',
                responded_at = COALESCE(responded_at, now()),
                updated_at = now()
              WHERE id = ${input.id}::uuid
              RETURNING
                id::text AS "id",
                ticket_number AS "ticketNumber",
                operational_status AS "operationalStatus",
                responded_at AS "respondedAt",
                updated_at AS "updatedAt"
            `;

            await appendEvent(tx, {
              tenantId: ctx.pgTenant.tenantId,
              ticketId: current.id,
              eventType: "status_changed",
              actor: actorName(ctx),
              message: input.note ?? "Ticket work started",
              metadata: {
                action: "work_started",
                fromStatus: current.operationalStatus,
                toStatus: "in_progress",
                assignedToUserId:
                  current.assignedToUserId,
              },
            });

            return rows[0]!;
          },
        );
      }),

  canonicalAddComment:
    pgProtectedProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          comment: z.string().trim().min(1).max(5000),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        return withTenantTransaction(
          ctx.pgTenant.tenantId,
          async tx => {
            const current = await lockTicket(tx, input.id);

            if (
              ["closed", "cancelled"].includes(
                current.operationalStatus,
              )
            ) {
              throw new TRPCError({
                code: "CONFLICT",
                message:
                  `Comments are closed for ticket status ${current.operationalStatus}`,
              });
            }

            await appendEvent(tx, {
              tenantId: ctx.pgTenant.tenantId,
              ticketId: current.id,
              eventType: "comment_added",
              actor: actorName(ctx),
              message: input.comment,
              metadata: {
                action: "comment_added",
                operationalStatus: current.operationalStatus,
              },
            });

            return { success: true };
          },
        );
      }),

  canonicalResolve:
    pgProtectedProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          resolutionNotes:
            z.string().trim().min(1).max(10000),
          actualCost:
            z.number()
              .finite()
              .nonnegative()
              .max(999999999999.99)
              .optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        requireTicketAdministrator(ctx.pgTenant.tenantRole);

        return withTenantTransaction(
          ctx.pgTenant.tenantId,
          async tx => {
            const current = await lockTicket(tx, input.id);

            if (
              !["in_progress", "pending"].includes(
                current.operationalStatus,
              )
            ) {
              throw new TRPCError({
                code: "CONFLICT",
                message:
                  `Ticket cannot be resolved from ${current.operationalStatus}`,
              });
            }

            const rows = await tx<{
              id: string;
              ticketNumber: string;
              operationalStatus: string;
              resolvedAt: Date;
              actualCost: string | null;
              updatedAt: Date;
            }[]>`
              UPDATE service_tickets
              SET
                operational_status = 'resolved',
                responded_at = COALESCE(responded_at, now()),
                resolved_at = now(),
                resolution_notes = ${input.resolutionNotes},
                resolved_by_name = ${actorName(ctx)},
                actual_cost = COALESCE(
                  ${input.actualCost ?? null}::numeric,
                  actual_cost
                ),
                updated_at = now()
              WHERE id = ${input.id}::uuid
              RETURNING
                id::text AS "id",
                ticket_number AS "ticketNumber",
                operational_status AS "operationalStatus",
                resolved_at AS "resolvedAt",
                actual_cost::text AS "actualCost",
                updated_at AS "updatedAt"
            `;

            await appendEvent(tx, {
              tenantId: ctx.pgTenant.tenantId,
              ticketId: current.id,
              eventType: "resolution_added",
              actor: actorName(ctx),
              message: input.resolutionNotes,
              metadata: {
                action: "resolved",
                fromStatus: current.operationalStatus,
                toStatus: "resolved",
                actualCost: input.actualCost ?? null,
              },
            });

            return rows[0]!;
          },
        );
      }),

  canonicalClose:
    pgProtectedProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          note: z.string().trim().min(1).max(2000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        requireTicketAdministrator(ctx.pgTenant.tenantRole);

        return withTenantTransaction(
          ctx.pgTenant.tenantId,
          async tx => {
            const current = await lockTicket(tx, input.id);

            if (current.operationalStatus !== "resolved") {
              throw new TRPCError({
                code: "CONFLICT",
                message:
                  `Ticket cannot be closed from ${current.operationalStatus}`,
              });
            }

            const rows = await tx<{
              id: string;
              ticketNumber: string;
              operationalStatus: string;
              closedAt: Date;
              updatedAt: Date;
            }[]>`
              UPDATE service_tickets
              SET
                operational_status = 'closed',
                closed_at = now(),
                updated_at = now()
              WHERE id = ${input.id}::uuid
              RETURNING
                id::text AS "id",
                ticket_number AS "ticketNumber",
                operational_status AS "operationalStatus",
                closed_at AS "closedAt",
                updated_at AS "updatedAt"
            `;

            await appendEvent(tx, {
              tenantId: ctx.pgTenant.tenantId,
              ticketId: current.id,
              eventType: "closed",
              actor: actorName(ctx),
              message: input.note ?? "Ticket closed after resolution",
              metadata: {
                action: "closed",
                fromStatus: "resolved",
                toStatus: "closed",
              },
            });

            return rows[0]!;
          },
        );
      }),
});