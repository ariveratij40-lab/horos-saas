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

const prioritySchema = z.enum([
  "critical",
  "high",
  "medium",
  "low",
]);

type CoverageRuleSnapshot = {
  slaRuleId: string;
  ruleName: string;
  responseTargetMinutes: number;
  resolutionTargetMinutes: number;
  escalationTargetMinutes: number | null;
};

type CoverageEvidence = {
  requestId: string;
  requestNumber: string;
  metadata: Record<string, unknown>;
};

function requireAdministrator(tenantRole: string) {
  if (tenantRole !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Inherited SLA recovery requires tenant administrator access",
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
    ?? "Tenant administrator"
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (
    typeof value !== "object"
    || value === null
    || Array.isArray(value)
  ) {
    return null;
  }

  return value as Record<string, unknown>;
}

function asNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

function asPositiveInteger(value: unknown) {
  return typeof value === "number"
    && Number.isInteger(value)
    && value > 0
      ? value
      : null;
}

function asNullablePositiveInteger(value: unknown) {
  if (value === null || value === undefined) return null;
  return asPositiveInteger(value);
}

function parseCoverageEvidence(
  evidence: CoverageEvidence,
  priority: z.infer<typeof prioritySchema>,
) {
  const metadata = evidence.metadata;
  const policyId = asNonEmptyString(metadata.policyId);
  const policyNumber = asNonEmptyString(metadata.policyNumber);
  const policyName = asNonEmptyString(metadata.policyName);
  const policyServiceId = asNonEmptyString(metadata.policyServiceId);
  const serviceName = asNonEmptyString(metadata.serviceName);
  const slaRules = asRecord(metadata.slaRules);
  const ruleRecord = slaRules
    ? asRecord(slaRules[priority])
    : null;

  const rule: CoverageRuleSnapshot | null = ruleRecord
    ? (() => {
        const slaRuleId = asNonEmptyString(ruleRecord.slaRuleId);
        const ruleName = asNonEmptyString(ruleRecord.ruleName);
        const responseTargetMinutes =
          asPositiveInteger(ruleRecord.responseTargetMinutes);
        const resolutionTargetMinutes =
          asPositiveInteger(ruleRecord.resolutionTargetMinutes);
        const escalationTargetMinutes =
          asNullablePositiveInteger(ruleRecord.escalationTargetMinutes);

        if (
          !slaRuleId
          || !ruleName
          || !responseTargetMinutes
          || !resolutionTargetMinutes
          || resolutionTargetMinutes < responseTargetMinutes
        ) {
          return null;
        }

        return {
          slaRuleId,
          ruleName,
          responseTargetMinutes,
          resolutionTargetMinutes,
          escalationTargetMinutes,
        };
      })()
    : null;

  if (
    !policyId
    || !policyNumber
    || !policyName
    || !policyServiceId
    || !serviceName
    || !rule
  ) {
    return null;
  }

  return {
    requestId: evidence.requestId,
    requestNumber: evidence.requestNumber,
    policyId,
    policyNumber,
    policyName,
    policyServiceId,
    serviceName,
    priority,
    rule,
  };
}

async function loadOriginCoverageEvidence(
  tx: TransactionSql,
  ticketId: string,
) {
  const rows = await tx<CoverageEvidence[]>`
    SELECT
      r.id::text AS "requestId",
      r.request_number AS "requestNumber",
      e.metadata AS "metadata"
    FROM service_request_ticket_links l
    JOIN service_requests r
      ON r.id = l.service_request_id
      AND r.tenant_id = l.tenant_id
    JOIN LATERAL (
      SELECT
        se.metadata
      FROM service_request_events se
      WHERE se.service_request_id = r.id
        AND se.tenant_id = r.tenant_id
        AND se.event_type = 'authorized'
        AND se.metadata ? 'policyId'
        AND se.metadata ? 'policyServiceId'
      ORDER BY se.created_at DESC, se.id DESC
      LIMIT 1
    ) e ON true
    WHERE l.service_ticket_id = ${ticketId}::uuid
      AND l.relation_type = 'converted'
    ORDER BY l.created_at DESC, l.id DESC
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export const serviceRequestSlaRecoveryRouter = router({
  canonicalOriginCoverage:
    pgProtectedProcedure
      .input(
        z.object({
          ticketId: z.string().uuid(),
        }),
      )
      .query(async ({ ctx, input }) => {
        return withTenantTransaction(
          ctx.pgTenant.tenantId,
          async tx => {
            const tickets = await tx<{
              id: string;
              ticketNumber: string;
              priority: z.infer<typeof prioritySchema>;
              operationalStatus: string;
            }[]>`
              SELECT
                id::text AS "id",
                ticket_number AS "ticketNumber",
                priority AS "priority",
                operational_status AS "operationalStatus"
              FROM service_tickets
              WHERE id = ${input.ticketId}::uuid
              LIMIT 1
            `;

            const ticket = tickets[0];
            if (!ticket) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Canonical ticket was not found",
              });
            }

            const current = await tx<{ id: string }[]>`
              SELECT id::text AS "id"
              FROM service_ticket_sla_snapshots
              WHERE service_ticket_id = ${ticket.id}::uuid
              ORDER BY created_at DESC, id DESC
              LIMIT 1
            `;

            if (current.length > 0) {
              return {
                recoverable: false,
                reason: "already_configured" as const,
                ticketNumber: ticket.ticketNumber,
              };
            }

            const rawEvidence = await loadOriginCoverageEvidence(
              tx,
              ticket.id,
            );

            if (!rawEvidence) {
              return {
                recoverable: false,
                reason: "no_policy_origin" as const,
                ticketNumber: ticket.ticketNumber,
              };
            }

            const evidence = parseCoverageEvidence(
              rawEvidence,
              ticket.priority,
            );

            if (!evidence) {
              return {
                recoverable: false,
                reason: "incomplete_policy_snapshot" as const,
                ticketNumber: ticket.ticketNumber,
              };
            }

            return {
              recoverable: true,
              ticketNumber: ticket.ticketNumber,
              operationalStatus: ticket.operationalStatus,
              requestId: evidence.requestId,
              requestNumber: evidence.requestNumber,
              policyId: evidence.policyId,
              policyNumber: evidence.policyNumber,
              policyName: evidence.policyName,
              policyServiceId: evidence.policyServiceId,
              serviceName: evidence.serviceName,
              priority: evidence.priority,
              ruleName: evidence.rule.ruleName,
              responseTargetMinutes:
                evidence.rule.responseTargetMinutes,
              resolutionTargetMinutes:
                evidence.rule.resolutionTargetMinutes,
            } as const;
          },
        );
      }),

  canonicalRecoverInherited:
    pgProtectedProcedure
      .input(
        z.object({
          ticketId: z.string().uuid(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        requireAdministrator(ctx.pgTenant.tenantRole);

        return withTenantTransaction(
          ctx.pgTenant.tenantId,
          async tx => {
            const tickets = await tx<{
              id: string;
              ticketNumber: string;
              priority: z.infer<typeof prioritySchema>;
              createdAt: Date;
            }[]>`
              SELECT
                id::text AS "id",
                ticket_number AS "ticketNumber",
                priority AS "priority",
                created_at AS "createdAt"
              FROM service_tickets
              WHERE id = ${input.ticketId}::uuid
              FOR UPDATE
            `;

            const ticket = tickets[0];
            if (!ticket) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Canonical ticket was not found",
              });
            }

            const current = await tx<{ id: string }[]>`
              SELECT id::text AS "id"
              FROM service_ticket_sla_snapshots
              WHERE service_ticket_id = ${ticket.id}::uuid
              ORDER BY created_at DESC, id DESC
              LIMIT 1
            `;

            if (current[0]) {
              return {
                changed: false,
                snapshotId: current[0].id,
              } as const;
            }

            const rawEvidence = await loadOriginCoverageEvidence(
              tx,
              ticket.id,
            );

            if (!rawEvidence) {
              throw new TRPCError({
                code: "CONFLICT",
                message:
                  "Ticket has no policy-covered Service Intake origin to inherit SLA from",
              });
            }

            const evidence = parseCoverageEvidence(
              rawEvidence,
              ticket.priority,
            );

            if (!evidence) {
              throw new TRPCError({
                code: "CONFLICT",
                message:
                  "Policy-covered Service Intake origin has an incomplete SLA snapshot",
              });
            }

            const references = await tx<{ ok: boolean }[]>`
              SELECT true AS "ok"
              FROM service_policy_services ps
              JOIN service_policy_sla_rules sr
                ON sr.policy_id = ps.policy_id
                AND sr.tenant_id = ps.tenant_id
              WHERE ps.id = ${evidence.policyServiceId}::uuid
                AND ps.policy_id = ${evidence.policyId}::uuid
                AND ps.is_included = true
                AND sr.id = ${evidence.rule.slaRuleId}::uuid
                AND sr.priority = ${ticket.priority}
              LIMIT 1
            `;

            if (references.length !== 1) {
              throw new TRPCError({
                code: "CONFLICT",
                message:
                  "Policy coverage references are no longer valid in the canonical tenant",
              });
            }

            const responseDeadline = new Date(
              ticket.createdAt.getTime()
              + evidence.rule.responseTargetMinutes * 60_000,
            );
            const resolutionDeadline = new Date(
              ticket.createdAt.getTime()
              + evidence.rule.resolutionTargetMinutes * 60_000,
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
                ${evidence.policyId}::uuid,
                ${evidence.rule.slaRuleId}::uuid,
                ${evidence.policyNumber},
                ${evidence.policyName},
                ${evidence.rule.ruleName},
                ${ticket.priority},
                ${evidence.rule.responseTargetMinutes},
                ${evidence.rule.resolutionTargetMinutes},
                ${evidence.rule.escalationTargetMinutes},
                ${ticket.createdAt},
                ${responseDeadline},
                ${resolutionDeadline},
                'policy',
                ${actorName(ctx)},
                ${JSON.stringify({
                  action: "sla_recovered_from_service_request",
                  source: "service_request_policy_coverage",
                  requestId: evidence.requestId,
                  requestNumber: evidence.requestNumber,
                  policyServiceId: evidence.policyServiceId,
                  serviceName: evidence.serviceName,
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
                ${`SLA heredado de ${evidence.policyNumber} · ${evidence.serviceName}`},
                ${JSON.stringify({
                  action: "sla_recovered_from_service_request",
                  snapshotId: snapshots[0]!.id,
                  requestId: evidence.requestId,
                  requestNumber: evidence.requestNumber,
                  policyId: evidence.policyId,
                  policyNumber: evidence.policyNumber,
                  policyName: evidence.policyName,
                  policyServiceId: evidence.policyServiceId,
                  serviceName: evidence.serviceName,
                  priority: ticket.priority,
                  responseTargetMinutes:
                    evidence.rule.responseTargetMinutes,
                  resolutionTargetMinutes:
                    evidence.rule.resolutionTargetMinutes,
                  responseDeadline: responseDeadline.toISOString(),
                  resolutionDeadline: resolutionDeadline.toISOString(),
                })}::jsonb
              )
            `;

            return {
              changed: true,
              snapshotId: snapshots[0]!.id,
              policyNumber: evidence.policyNumber,
              policyName: evidence.policyName,
              serviceName: evidence.serviceName,
              responseDeadline,
              resolutionDeadline,
            } as const;
          },
        );
      }),
});
