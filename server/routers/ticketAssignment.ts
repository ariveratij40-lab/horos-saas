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

async function resolveActorUserId(
  tx: TransactionSql,
  tenantId: string,
  externalSubject: string,
) {
  const rows = await tx<{ userId: string }[]>`
    SELECT u.id::text AS "userId"
    FROM tenant_users tu
    JOIN users u
      ON u.id = tu.user_id
    WHERE tu.tenant_id = ${tenantId}::uuid
      AND u.external_subject = ${externalSubject}
      AND tu.is_active = true
      AND u.is_active = true
    LIMIT 1
  `;

  return rows[0]?.userId ?? null;
}

const operationalStatusSchema = z.enum([
  "open",
  "assigned",
  "in_progress",
  "pending",
  "resolved",
  "closed",
  "cancelled",
]);

const prioritySchema = z.enum([
  "critical",
  "high",
  "medium",
  "low",
]);

export const ticketAssignmentRouter = router({
  canonicalCurrent:
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
            const rows = await tx<{
              id: string;
              ticketNumber: string;
              operationalStatus: string;
              assignedToUserId: string | null;
              assignedToName: string | null;
              assignedToEmail: string | null;
              assignedToTenantRole: string | null;
              assignedAt: Date | null;
            }[]>`
              SELECT
                st.id::text AS "id",
                st.ticket_number AS "ticketNumber",
                st.operational_status AS "operationalStatus",
                st.assigned_to_user_id::text AS "assignedToUserId",
                assigned_user.name AS "assignedToName",
                assigned_user.email AS "assignedToEmail",
                assigned_membership.role AS "assignedToTenantRole",
                st.assigned_at AS "assignedAt"
              FROM service_tickets st
              LEFT JOIN tenant_users assigned_membership
                ON assigned_membership.tenant_id = st.tenant_id
                AND assigned_membership.user_id = st.assigned_to_user_id
              LEFT JOIN users assigned_user
                ON assigned_user.id = st.assigned_to_user_id
              WHERE st.id = ${input.id}::uuid
              LIMIT 1
            `;

            const current = rows[0];

            if (!current) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Canonical ticket was not found",
              });
            }

            return current;
          },
        );
      }),

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

  canonicalQueue:
    pgProtectedProcedure
      .input(
        z.object({
          operationalStatus:
            operationalStatusSchema.optional(),
          priority:
            prioritySchema.optional(),
          assignment:
            z.enum([
              "all",
              "unassigned",
              "mine",
            ]).optional(),
          assigneeUserId:
            z.string().uuid().optional(),
        }).optional(),
      )
      .query(async ({ ctx, input }) => {
        return withTenantTransaction(
          ctx.pgTenant.tenantId,
          async tx => {
            const assignment =
              input?.assignment ?? "all";

            const actorUserId =
              assignment === "mine"
                ? await resolveActorUserId(
                    tx,
                    ctx.pgTenant.tenantId,
                    ctx.pgTenant.externalSubject,
                  )
                : null;

            if (
              assignment === "mine"
              && !actorUserId
            ) {
              return [];
            }

            const operationalStatus =
              input?.operationalStatus ?? null;
            const priority =
              input?.priority ?? null;
            const assigneeUserId =
              input?.assigneeUserId ?? null;

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
              responseDeadline: Date | null;
              resolutionDeadline: Date | null;
              assignedToUserId: string | null;
              assignedToName: string | null;
              assignedToEmail: string | null;
              assignedAt: Date | null;
              createdAt: Date;
              updatedAt: Date;
            }[]>`
              SELECT
                st.id::text AS "id",
                st.ticket_number AS "ticketNumber",
                st.title AS "title",
                st.description AS "description",
                st.operational_status AS "operationalStatus",
                st.contractual_status AS "contractualStatus",
                st.priority AS "priority",
                st.category AS "category",
                st.branch_id::text AS "branchId",
                b.code AS "branchCode",
                b.name AS "branchName",
                st.asset_id::text AS "assetId",
                a.asset_code AS "assetCode",
                st.response_deadline AS "responseDeadline",
                st.resolution_deadline AS "resolutionDeadline",
                st.assigned_to_user_id::text AS "assignedToUserId",
                assigned_user.name AS "assignedToName",
                assigned_user.email AS "assignedToEmail",
                st.assigned_at AS "assignedAt",
                st.created_at AS "createdAt",
                st.updated_at AS "updatedAt"
              FROM service_tickets st
              JOIN branches b
                ON b.id = st.branch_id
                AND b.tenant_id = st.tenant_id
              LEFT JOIN assets a
                ON a.id = st.asset_id
                AND a.tenant_id = st.tenant_id
              LEFT JOIN users assigned_user
                ON assigned_user.id = st.assigned_to_user_id
              WHERE (
                ${operationalStatus}::text IS NULL
                OR st.operational_status = ${operationalStatus}
              )
              AND (
                ${priority}::text IS NULL
                OR st.priority = ${priority}
              )
              AND (
                ${assigneeUserId}::uuid IS NULL
                OR st.assigned_to_user_id = ${assigneeUserId}::uuid
              )
              AND (
                ${assignment}::text = 'all'
                OR (
                  ${assignment}::text = 'unassigned'
                  AND st.assigned_to_user_id IS NULL
                )
                OR (
                  ${assignment}::text = 'mine'
                  AND st.assigned_to_user_id = ${actorUserId}::uuid
                )
              )
              ORDER BY
                CASE st.priority
                  WHEN 'critical' THEN 1
                  WHEN 'high' THEN 2
                  WHEN 'medium' THEN 3
                  ELSE 4
                END,
                st.created_at DESC,
                st.ticket_number
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