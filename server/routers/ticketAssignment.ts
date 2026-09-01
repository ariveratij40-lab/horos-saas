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

function requireAssignmentAdministrator(tenantRole: string) {
  if (tenantRole !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Canonical ticket assignment requires tenant administrator access",
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

type LockedTicket = {
  id: string;
  ticketNumber: string;
  operationalStatus: string;
  assignedToUserId: string | null;
  assignedToName: string | null;
};

async function lockTicket(
  tx: TransactionSql,
  id: string,
): Promise<LockedTicket> {
  const rows = await tx<LockedTicket[]>`
    SELECT
      st.id::text AS "id",
      st.ticket_number AS "ticketNumber",
      st.operational_status AS "operationalStatus",
      st.assigned_to_user_id::text AS "assignedToUserId",
      assigned_user.name AS "assignedToName"
    FROM service_tickets st
    LEFT JOIN users assigned_user
      ON assigned_user.id = st.assigned_to_user_id
    WHERE st.id = ${id}::uuid
    FOR UPDATE OF st
  `;

  if (rows.length !== 1) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Canonical ticket was not found",
    });
  }

  return rows[0]!;
}

export const ticketAssignmentRouter = router({
  canonicalCandidates:
    pgProtectedProcedure
      .query(async ({ ctx }) => {
        return withTenantTransaction(
          ctx.pgTenant.tenantId,
          async tx => {
            return tx<{
              userId: string;
              name: string | null;
              email: string | null;
              tenantRole: string;
            }[]>`
              SELECT
                u.id::text AS "userId",
                u.name AS "name",
                u.email AS "email",
                tu.role AS "tenantRole"
              FROM tenant_users tu
              JOIN users u
                ON u.id = tu.user_id
              WHERE tu.tenant_id = ${ctx.pgTenant.tenantId}::uuid
                AND tu.is_active = true
                AND u.is_active = true
              ORDER BY
                COALESCE(u.name, u.email, u.id::text),
                u.id
            `;
          },
        );
      }),

  canonicalAssign:
    pgProtectedProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          assigneeUserId: z.string().uuid(),
          note: z.string().trim().min(1).max(2000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        requireAssignmentAdministrator(
          ctx.pgTenant.tenantRole,
        );

        return withTenantTransaction(
          ctx.pgTenant.tenantId,
          async tx => {
            const current = await lockTicket(
              tx,
              input.id,
            );

            if (
              ["resolved", "closed", "cancelled"].includes(
                current.operationalStatus,
              )
            ) {
              throw new TRPCError({
                code: "CONFLICT",
                message:
                  `Ticket cannot be assigned from ${current.operationalStatus}`,
              });
            }

            const candidates = await tx<{
              userId: string;
              name: string | null;
              email: string | null;
              tenantRole: string;
            }[]>`
              SELECT
                u.id::text AS "userId",
                u.name AS "name",
                u.email AS "email",
                tu.role AS "tenantRole"
              FROM tenant_users tu
              JOIN users u
                ON u.id = tu.user_id
              WHERE tu.tenant_id = ${ctx.pgTenant.tenantId}::uuid
                AND tu.user_id = ${input.assigneeUserId}::uuid
                AND tu.is_active = true
                AND u.is_active = true
              LIMIT 1
            `;

            if (candidates.length !== 1) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message:
                  "Assignee is not an active member of the canonical tenant",
              });
            }

            const assignee = candidates[0]!;
            const assigneeLabel =
              assignee.name
              ?? assignee.email
              ?? assignee.userId;

            if (
              current.assignedToUserId
              === assignee.userId
            ) {
              return {
                id: current.id,
                ticketNumber: current.ticketNumber,
                operationalStatus:
                  current.operationalStatus,
                assignedToUserId:
                  current.assignedToUserId,
                assignedToName:
                  current.assignedToName,
                assignedAt: null,
                changed: false,
              } as const;
            }

            const action =
              current.assignedToUserId
                ? "reassigned"
                : "assigned";

            const nextOperationalStatus =
              current.operationalStatus === "open"
                ? "assigned"
                : current.operationalStatus;

            const rows = await tx<{
              id: string;
              ticketNumber: string;
              operationalStatus: string;
              assignedToUserId: string;
              assignedAt: Date;
              updatedAt: Date;
            }[]>`
              UPDATE service_tickets
              SET
                assigned_to_user_id = ${assignee.userId}::uuid,
                assigned_at = now(),
                operational_status = ${nextOperationalStatus},
                updated_at = now()
              WHERE id = ${current.id}::uuid
              RETURNING
                id::text AS "id",
                ticket_number AS "ticketNumber",
                operational_status AS "operationalStatus",
                assigned_to_user_id::text AS "assignedToUserId",
                assigned_at AS "assignedAt",
                updated_at AS "updatedAt"
            `;

            const previousLabel =
              current.assignedToName
              ?? current.assignedToUserId;

            const defaultMessage =
              action === "assigned"
                ? `Responsable asignado: ${assigneeLabel}`
                : `Responsable reasignado: ${previousLabel ?? "Sin responsable"} → ${assigneeLabel}`;

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
                ${ctx.pgTenant.tenantId}::uuid,
                ${current.id}::uuid,
                'assignment_changed',
                ${actorName(ctx)},
                ${input.note ?? defaultMessage},
                ${JSON.stringify({
                  action,
                  fromUserId:
                    current.assignedToUserId,
                  fromName:
                    current.assignedToName,
                  toUserId:
                    assignee.userId,
                  toName:
                    assignee.name,
                  toEmail:
                    assignee.email,
                  toTenantRole:
                    assignee.tenantRole,
                  operationalStatus:
                    nextOperationalStatus,
                })}::jsonb
              )
            `;

            return {
              ...rows[0]!,
              assignedToName: assignee.name,
              assignedToEmail: assignee.email,
              changed: true,
            } as const;
          },
        );
      }),
});
