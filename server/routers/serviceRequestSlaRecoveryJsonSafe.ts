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
  branchId: string;
  priority: z.infer<typeof prioritySchema>;
  operationalStatus: string;
  createdAt: Date;
};

type OriginRow = {
  requestId: string;
  requestNumber: string;
};

type PolicyReferenceRow = {
  policyId: string;
  policyNumber: string;
  policyName: string;
  policyServiceId: string;
  serviceName: string;
  evidenceSource: "metadata" | "canonical_message";
};

type CoverageRow = PolicyReferenceRow & {
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
          branch_id::text AS "branchId",
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
          branch_id::text AS "branchId",
          priority AS "priority",
          operational_status AS "operationalStatus",
          created_at AS "createdAt"
        FROM service_tickets
        WHERE id = ${ticketId}::uuid
        LIMIT 1
      `;

  return rows[0] ?? null;
}

async function loadOrigin(
  tx: TransactionSql,
  ticketId: string,
) {
  const rows = await tx<OriginRow[]>`
    SELECT
      r.id::text AS "requestId",
      r.request_number AS "requestNumber"
    FROM service_request_ticket_links l
    JOIN service_requests r
      ON r.id = l.service_request_id
      AND r.tenant_id = l.tenant_id
    WHERE l.service_ticket_id = ${ticketId}::uuid
      AND l.relation_type = 'converted'
    ORDER BY l.created_at DESC, l.id DESC
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

async function authorizedEventCount(
  tx: TransactionSql,
  requestId: string,
) {
  const rows = await tx<{ count: number }[]>`
    SELECT count(*)::int AS "count"
    FROM service_request_events
    WHERE service_request_id = ${requestId}::uuid
      AND event_type = 'authorized'
  `;

  return rows[0]?.count ?? 0;
}

async function resolvePolicyReference(
  tx: TransactionSql,
  origin: OriginRow,
  ticket: TicketRow,
) {
  const rows = await tx<PolicyReferenceRow[]>`
    SELECT
      p.id::text AS "policyId",
      p.policy_number AS "policyNumber",
      p.name AS "policyName",
      ps.id::text AS "policyServiceId",
      ps.service_name AS "serviceName",
      CASE
        WHEN
          NULLIF(e.metadata->>'policyId', '') = p.id::text
          AND NULLIF(e.metadata->>'policyServiceId', '') = ps.id::text
        THEN 'metadata'
        ELSE 'canonical_message'
      END AS "evidenceSource"
    FROM service_request_events e
    JOIN service_policies p
      ON p.tenant_id = e.tenant_id
    JOIN service_policy_services ps
      ON ps.policy_id = p.id
      AND ps.tenant_id = p.tenant_id
      AND ps.is_included = true
    WHERE e.service_request_id = ${origin.requestId}::uuid
      AND e.event_type = 'authorized'
      AND (
        (
          NULLIF(e.metadata->>'policyId', '') = p.id::text
          AND NULLIF(e.metadata->>'policyServiceId', '') = ps.id::text
        )
        OR e.message = (
          'Cobertura aprobada por póliza '
          || p.policy_number
          || ' · '
          || ps.service_name
        )
      )
      AND (
        p.branch_id IS NULL
        OR p.branch_id = ${ticket.branchId}::uuid
      )
    ORDER BY e.created_at DESC, e.id DESC
    LIMIT 1
  `;

  return rows[0] ?? null;
}

async function resolveCoverage(
  tx: TransactionSql,
  reference: PolicyReferenceRow,
  priority: z.infer<typeof prioritySchema>,
): Promise<CoverageRow | null> {
  const rows = await tx<{
    slaRuleId: string;
    ruleName: string;
    priority: z.infer<typeof prioritySchema>;
    responseTargetMinutes: number;
    resolutionTargetMinutes: number;
    escalationTargetMinutes: number | null;
  }[]>`
    SELECT
      id::text AS "slaRuleId",
      name AS "ruleName",
      priority AS "priority",
      response_target_minutes AS "responseTargetMinutes",
      resolution_target_minutes AS "resolutionTargetMinutes",
      escalation_target_minutes AS "escalationTargetMinutes"
    FROM service_policy_sla_rules
    WHERE policy_id = ${reference.policyId}::uuid
      AND priority = ${priority}
      AND is_active = true
    LIMIT 1
  `;

  const rule = rows[0];
  if (!rule) return null;

  return {
    ...reference,
    ...rule,
  };
}

async function inspectRecovery(
  tx: TransactionSql,
  ticket: TicketRow,
) {
  const current = await hasCurrentSnapshot(tx, ticket.id);
  if (current) {
    return {
      recoverable: false as const,
      reason: "already_configured" as const,
      ticketNumber: ticket.ticketNumber,
    };
  }

  const origin = await loadOrigin(tx, ticket.id);
  if (!origin) {
    return {
      recoverable: false as const,
      reason: "no_converted_origin" as const,
      ticketNumber: ticket.ticketNumber,
    };
  }

  const eventCount = await authorizedEventCount(tx, origin.requestId);
  if (eventCount === 0) {
    return {
      recoverable: false as const,
      reason: "no_authorized_event" as const,
      ticketNumber: ticket.ticketNumber,
      requestId: origin.requestId,
      requestNumber: origin.requestNumber,
    };
  }

  const reference = await resolvePolicyReference(tx, origin, ticket);
  if (!reference) {
    return {
      recoverable: false as const,
      reason: "no_policy_reference" as const,
      ticketNumber: ticket.ticketNumber,
      requestId: origin.requestId,
      requestNumber: origin.requestNumber,
      authorizedEventCount: eventCount,
    };
  }

  const coverage = await resolveCoverage(
    tx,
    reference,
    ticket.priority,
  );

  if (!coverage) {
    return {
      recoverable: false as const,
      reason: "no_priority_sla_rule" as const,
      ticketNumber: ticket.ticketNumber,
      requestId: origin.requestId,
      requestNumber: origin.requestNumber,
      policyId: reference.policyId,
      policyNumber: reference.policyNumber,
      policyServiceId: reference.policyServiceId,
      serviceName: reference.serviceName,
      evidenceSource: reference.evidenceSource,
      priority: ticket.priority,
    };
  }

  return {
    recoverable: true as const,
    ticketNumber: ticket.ticketNumber,
    operationalStatus: ticket.operationalStatus,
    requestId: origin.requestId,
    requestNumber: origin.requestNumber,
    ...coverage,
  };
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

            return inspectRecovery(tx, ticket);
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

            const inspection = await inspectRecovery(tx, ticket);

            if (!inspection.recoverable) {
              if (inspection.reason === "already_configured") {
                const current = await hasCurrentSnapshot(tx, ticket.id);
                return {
                  changed: false,
                  snapshotId: current!.id,
                } as const;
              }

              throw new TRPCError({
                code: "CONFLICT",
                message: `Inherited SLA recovery is not available: ${inspection.reason}`,
              });
            }

            const responseDeadline = new Date(
              ticket.createdAt.getTime()
              + inspection.responseTargetMinutes * 60_000,
            );
            const resolutionDeadline = new Date(
              ticket.createdAt.getTime()
              + inspection.resolutionTargetMinutes * 60_000,
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
                ${inspection.policyId}::uuid,
                ${inspection.slaRuleId}::uuid,
                ${inspection.policyNumber},
                ${inspection.policyName},
                ${inspection.ruleName},
                ${inspection.priority},
                ${inspection.responseTargetMinutes},
                ${inspection.resolutionTargetMinutes},
                ${inspection.escalationTargetMinutes},
                ${ticket.createdAt},
                ${responseDeadline},
                ${resolutionDeadline},
                'policy',
                ${actorName(ctx)},
                ${JSON.stringify({
                  action: "sla_recovered_from_service_request_evidence",
                  source: "service_request_policy_coverage",
                  evidenceSource: inspection.evidenceSource,
                  requestId: inspection.requestId,
                  requestNumber: inspection.requestNumber,
                  policyServiceId: inspection.policyServiceId,
                  serviceName: inspection.serviceName,
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
                ${`SLA heredado de ${inspection.policyNumber} · ${inspection.serviceName}`},
                ${JSON.stringify({
                  action: "sla_recovered_from_service_request_evidence",
                  snapshotId: snapshots[0]!.id,
                  evidenceSource: inspection.evidenceSource,
                  requestId: inspection.requestId,
                  requestNumber: inspection.requestNumber,
                  policyId: inspection.policyId,
                  policyNumber: inspection.policyNumber,
                  policyName: inspection.policyName,
                  policyServiceId: inspection.policyServiceId,
                  serviceName: inspection.serviceName,
                  ruleId: inspection.slaRuleId,
                  ruleName: inspection.ruleName,
                  priority: inspection.priority,
                  responseTargetMinutes: inspection.responseTargetMinutes,
                  resolutionTargetMinutes: inspection.resolutionTargetMinutes,
                  responseDeadline: responseDeadline.toISOString(),
                  resolutionDeadline: resolutionDeadline.toISOString(),
                })}::jsonb
              )
            `;

            return {
              changed: true,
              snapshotId: snapshots[0]!.id,
              policyNumber: inspection.policyNumber,
              policyName: inspection.policyName,
              serviceName: inspection.serviceName,
              responseDeadline,
              resolutionDeadline,
            } as const;
          },
        );
      }),
});
