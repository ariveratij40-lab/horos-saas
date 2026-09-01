import { TRPCError } from "@trpc/server";
import type { TransactionSql } from "postgres";
import { z } from "zod";

import { pgProtectedProcedure, router } from "../_core/trpc";
import { withTenantTransaction } from "../db.pg";

const prioritySchema = z.enum([
  "critical",
  "high",
  "medium",
  "low",
]);

type TicketRow = {
  id: string;
  ticketNumber: string;
  priority: z.infer<typeof prioritySchema>;
  operationalStatus: string;
  createdAt: Date;
};

type CoverageRow = {
  requestId: string;
  requestNumber: string;
  policyId: string;
  policyNumber: string;
  policyName: string;
  policyServiceId: string;
  serviceName: string;
  slaRuleId: string;
  ruleName: string;
  priority: z.infer<typeof prioritySchema>;
  responseTargetMinutes: number;
  resolutionTargetMinutes: number;
  escalationTargetMinutes: number | null;
};

function requireAdministrator(role: string) {
  if (role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Inherited SLA recovery requires tenant administrator access",
    });
  }
}

function actorName(ctx: {
  user: {
    name?: string | null;
    email?: string | null;
  };
}) {
  return ctx.user.name ?? ctx.user.email ?? "Tenant administrator";
}

async function loadTicket(
  tx: TransactionSql,
  ticketId: string,
  forUpdate = false,
) {
  const rows = forUpdate
    ? await tx<TicketRow[]>`
        SELECT
          id::text AS "id",
          ticket_number AS "ticketNumber",
          priority AS "priority",
          operational_status AS "operationalStatus",
          created_at AS "createdAt"
        FROM service_tickets
        WHERE id = ${ticketId}::uuid
        FOR UPDATE
      `
    : await tx<TicketRow[]>`
        SELECT
          id::text AS "id",
          ticket_number AS "ticketNumber",
          priority AS "priority",
          operational_status AS "operationalStatus",
          created_at AS "createdAt"
        FROM service_tickets
        WHERE id = ${ticketId}::uuid
        LIMIT 1
      `;

  return rows[0] ?? null;
}

async function hasCurrentSnapshot(
  tx: TransactionSql,
  ticketId: string,
) {
  const rows = await tx<{ id: string }[]>`
    SELECT id::text AS "id"
    FROM service_ticket_sla_snapshots
    WHERE service_ticket_id = ${ticketId}::uuid
    ORDER BY created_at DESC, id DESC
    LIMIT 1
  `;

  return rows[0] ?? null;
}

async function resolveCoverage(
  tx: TransactionSql,
  ticketId: string,
  priority: z.infer<typeof prioritySchema>,
) {
  const rows = await tx<CoverageRow[]>`
    SELECT
      r.id::text AS "requestId",
      r.request_number AS "requestNumber",
      p.id::text AS "policyId",
      p.policy_number AS "policyNumber",
      p.name AS "policyName",
      ps.id::text AS "policyServiceId",
      ps.service_name AS "serviceName",
      sr.id::text AS "slaRuleId",
      sr.name AS "ruleName",
      sr.priority AS "priority",
      sr.response_target_minutes AS "responseTargetMinutes",
      sr.resolution_target_minutes AS "resolutionTargetMinutes",
      sr.escalation_target_minutes AS "escalationTargetMinutes"
    FROM service_request_ticket_links l
    JOIN service_requests r
      ON r.id = l.service_request_id
      AND r.tenant_id = l.tenant_id
    JOIN LATERAL (
      SELECT
        e.metadata->>'policyId' AS "policyId",
        e.metadata->>'policyServiceId' AS "policyServiceId"
      FROM service_request_events e
      WHERE e.service_request_id = r.id
        AND e.tenant_id = r.tenant_id
        AND e.event_type = 'authorized'
        AND NULLIF(e.metadata->>'policyId', '') IS NOT NULL
        AND NULLIF(e.metadata->>'policyServiceId', '') IS NOT NULL
      ORDER BY e.created_at DESC, e.id DESC
      LIMIT 1
    ) ev ON true
    JOIN service_policy_services ps
      ON ps.id = ev."policyServiceId"::uuid
      AND ps.tenant_id = l.tenant_id
      AND ps.is_included = true
    JOIN service_policies p
      ON p.id = ev."policyId"::uuid
      AND p.id = ps.policy_id
      AND p.tenant_id = l.tenant_id
    JOIN service_policy_sla_rules sr
      ON sr.policy_id = p.id
      AND sr.tenant_id = p.tenant_id
      AND sr.priority = ${priority}
      AND sr.is_active = true
    WHERE l.service_ticket_id = ${ticketId}::uuid
      AND l.relation_type = 'converted'
    ORDER BY l.created_at DESC, l.id DESC
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export const serviceRequestSlaRecoveryJsonSafeRouter = router({
  canonicalOriginCoverage:
    pgProtectedProcedure
      .input(z.object({ ticketId: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        return withTenantTransaction(
          ctx.pgTenant.tenantId,
          async tx => {
            const ticket = await loadTicket(tx, input.ticketId);
            if (!ticket) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Canonical ticket was not found",
              });
            }

            const current = await hasCurrentSnapshot(tx, ticket.id);
            if (current) {
              return {
                recoverable: false,
                reason: "already_configured" as const,
                ticketNumber: ticket.ticketNumber,
              };
            }

            const coverage = await resolveCoverage(
              tx,
              ticket.id,
              ticket.priority,
            );

            if (!coverage) {
              return {
                recoverable: false,
                reason: "no_policy_origin" as const,
                ticketNumber: ticket.ticketNumber,
              };
            }

            return {
              recoverable: true,
              ticketNumber: ticket.ticketNumber,
              operationalStatus: ticket.operationalStatus,
              requestId: coverage.requestId,
              requestNumber: coverage.requestNumber,
              policyId: coverage.policyId,
              policyNumber: coverage.policyNumber,
              policyName: coverage.policyName,
              policyServiceId: coverage.policyServiceId,
              serviceName: coverage.serviceName,
              priority: coverage.priority,
              ruleName: coverage.ruleName,
              responseTargetMinutes: coverage.responseTargetMinutes,
              resolutionTargetMinutes: coverage.resolutionTargetMinutes,
            } as const;
          },
        );
      }),

  canonicalRecoverInherited:
    pgProtectedProcedure
      .input(z.object({ ticketId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        requireAdministrator(ctx.pgTenant.tenantRole);

        return withTenantTransaction(
          ctx.pgTenant.tenantId,
          async tx => {
            const ticket = await loadTicket(tx, input.ticketId, true);
            if (!ticket) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Canonical ticket was not found",
              });
            }

            if (["resolved", "closed", "cancelled"].includes(ticket.operationalStatus)) {
              throw new TRPCError({
                code: "CONFLICT",
                message: `Inherited SLA cannot be recovered for ${ticket.operationalStatus} ticket`,
              });
            }

            const current = await hasCurrentSnapshot(tx, ticket.id);
            if (current) {
              return {
                changed: false,
                snapshotId: current.id,
              } as const;
            }

            const coverage = await resolveCoverage(
              tx,
              ticket.id,
              ticket.priority,
            );

            if (!coverage) {
              throw new TRPCError({
                code: "CONFLICT",
                message: "Ticket has no valid policy-covered Service Intake origin",
              });
            }

            const responseDeadline = new Date(
              ticket.createdAt.getTime()
              + coverage.responseTargetMinutes * 60_000,
            );
            const resolutionDeadline = new Date(
              ticket.createdAt.getTime()
              + coverage.resolutionTargetMinutes * 60_000,
            );

            const snapshots = await tx<{ id: string }[]>`
              INSERT INTO service_ticket_sla_snapshots (
                tenant_id,
                service_ticket_id,
                policy_id,
                sla_rule_id,
                policy_number_snapshot,
                policy_name_snapshot,
                rule_name_snapshot,
                priority_snapshot,
                response_target_minutes,
                resolution_target_minutes,
                escalation_target_minutes,
                sla_started_at,
                response_deadline,
                resolution_deadline,
                source,
                actor_name,
                metadata
              )
              VALUES (
                ${ctx.pgTenant.tenantId}::uuid,
                ${ticket.id}::uuid,
                ${coverage.policyId}::uuid,
                ${coverage.slaRuleId}::uuid,
                ${coverage.policyNumber},
                ${coverage.policyName},
                ${coverage.ruleName},
                ${coverage.priority},
                ${coverage.responseTargetMinutes},
                ${coverage.resolutionTargetMinutes},
                ${coverage.escalationTargetMinutes},
                ${ticket.createdAt},
                ${responseDeadline},
                ${resolutionDeadline},
                'policy',
                ${actorName(ctx)},
                ${JSON.stringify({
                  action: "sla_recovered_from_service_request_sql_jsonb",
                  source: "service_request_policy_reference",
                  requestId: coverage.requestId,
                  requestNumber: coverage.requestNumber,
                  policyServiceId: coverage.policyServiceId,
                  serviceName: coverage.serviceName,
                })}::jsonb
              )
              RETURNING id::text AS "id"
            `;

            await tx`
              UPDATE service_tickets
              SET
                response_deadline = ${responseDeadline},
                resolution_deadline = ${resolutionDeadline},
                estimated_cost = NULL,
                is_billable = false,
                updated_at = now()
              WHERE id = ${ticket.id}::uuid
            `;

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
                ${ticket.id}::uuid,
                'sla_applied',
                ${actorName(ctx)},
                ${`SLA heredado de ${coverage.policyNumber} · ${coverage.serviceName}`},
                ${JSON.stringify({
                  action: "sla_recovered_from_service_request_sql_jsonb",
                  snapshotId: snapshots[0]!.id,
                  requestId: coverage.requestId,
                  requestNumber: coverage.requestNumber,
                  policyId: coverage.policyId,
                  policyNumber: coverage.policyNumber,
                  policyName: coverage.policyName,
                  policyServiceId: coverage.policyServiceId,
                  serviceName: coverage.serviceName,
                  ruleId: coverage.slaRuleId,
                  ruleName: coverage.ruleName,
                  priority: coverage.priority,
                  responseTargetMinutes: coverage.responseTargetMinutes,
                  resolutionTargetMinutes: coverage.resolutionTargetMinutes,
                  responseDeadline: responseDeadline.toISOString(),
                  resolutionDeadline: resolutionDeadline.toISOString(),
                })}::jsonb
              )
            `;

            return {
              changed: true,
              snapshotId: snapshots[0]!.id,
              policyNumber: coverage.policyNumber,
              policyName: coverage.policyName,
              serviceName: coverage.serviceName,
              responseDeadline,
              resolutionDeadline,
            } as const;
          },
        );
      }),
});
