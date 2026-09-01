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

const policyStatusSchema = z.enum([
  "draft",
  "active",
  "suspended",
  "expired",
  "cancelled",
]);

const policyTypeSchema = z.enum([
  "maintenance",
  "warranty",
  "support",
  "comprehensive",
]);

const frequencySchema = z.enum([
  "on_demand",
  "monthly",
  "quarterly",
  "biannual",
  "annual",
]);

function requirePolicyAdministrator(tenantRole: string) {
  if (tenantRole !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Canonical service policy management requires tenant administrator access",
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

function assertUniquePriorities(
  rules: Array<{ priority: string }>,
) {
  const priorities = rules.map(rule => rule.priority);
  if (new Set(priorities).size !== priorities.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "SLA priorities must be unique inside a policy",
    });
  }
}

async function lockTicket(
  tx: TransactionSql,
  id: string,
) {
  const rows = await tx<{
    id: string;
    ticketNumber: string;
    branchId: string;
    priority: string;
    operationalStatus: string;
    createdAt: Date;
    respondedAt: Date | null;
    resolvedAt: Date | null;
  }[]>`
    SELECT
      id::text AS "id",
      ticket_number AS "ticketNumber",
      branch_id::text AS "branchId",
      priority AS "priority",
      operational_status AS "operationalStatus",
      created_at AS "createdAt",
      responded_at AS "respondedAt",
      resolved_at AS "resolvedAt"
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

function classifyDeadline(
  completedAt: Date | null,
  deadline: Date,
  now: Date,
) {
  if (completedAt) {
    return completedAt.getTime() <= deadline.getTime()
      ? "met" as const
      : "breached" as const;
  }

  return now.getTime() <= deadline.getTime()
    ? "active" as const
    : "breached" as const;
}

export const servicePolicySlaRouter = router({
  canonicalList:
    pgProtectedProcedure
      .input(
        z.object({
          status: policyStatusSchema.optional(),
          branchId: z.string().uuid().optional(),
        }).optional(),
      )
      .query(async ({ ctx, input }) => {
        const status = input?.status ?? null;
        const branchId = input?.branchId ?? null;

        return withTenantTransaction(
          ctx.pgTenant.tenantId,
          async tx => {
            return tx<{
              id: string;
              policyNumber: string;
              name: string;
              status: string;
              policyType: string;
              branchId: string | null;
              branchName: string | null;
              startDate: string;
              endDate: string;
              includedServiceCount: number;
              activeRuleCount: number;
              createdAt: Date;
            }[]>`
              SELECT
                p.id::text AS "id",
                p.policy_number AS "policyNumber",
                p.name AS "name",
                p.status AS "status",
                p.policy_type AS "policyType",
                p.branch_id::text AS "branchId",
                b.name AS "branchName",
                p.start_date::text AS "startDate",
                p.end_date::text AS "endDate",
                (
                  SELECT count(*)::int
                  FROM service_policy_services ps
                  WHERE ps.policy_id = p.id
                    AND ps.is_included = true
                ) AS "includedServiceCount",
                (
                  SELECT count(*)::int
                  FROM service_policy_sla_rules sr
                  WHERE sr.policy_id = p.id
                    AND sr.is_active = true
                ) AS "activeRuleCount",
                p.created_at AS "createdAt"
              FROM service_policies p
              LEFT JOIN branches b
                ON b.id = p.branch_id
                AND b.tenant_id = p.tenant_id
              WHERE (
                ${status}::text IS NULL
                OR p.status = ${status}
              )
              AND (
                ${branchId}::uuid IS NULL
                OR p.branch_id = ${branchId}::uuid
              )
              ORDER BY
                CASE p.status
                  WHEN 'active' THEN 1
                  WHEN 'draft' THEN 2
                  ELSE 3
                END,
                p.end_date DESC,
                p.policy_number
            `;
          },
        );
      }),

  canonicalGet:
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
            const policies = await tx<{
              id: string;
              policyNumber: string;
              name: string;
              description: string | null;
              status: string;
              policyType: string;
              branchId: string | null;
              branchName: string | null;
              startDate: string;
              endDate: string;
              renewalDate: string | null;
              monthlyValue: string | null;
              annualValue: string | null;
              currency: string;
              notes: string | null;
              createdAt: Date;
              updatedAt: Date;
            }[]>`
              SELECT
                p.id::text AS "id",
                p.policy_number AS "policyNumber",
                p.name AS "name",
                p.description AS "description",
                p.status AS "status",
                p.policy_type AS "policyType",
                p.branch_id::text AS "branchId",
                b.name AS "branchName",
                p.start_date::text AS "startDate",
                p.end_date::text AS "endDate",
                p.renewal_date::text AS "renewalDate",
                p.monthly_value::text AS "monthlyValue",
                p.annual_value::text AS "annualValue",
                p.currency AS "currency",
                p.notes AS "notes",
                p.created_at AS "createdAt",
                p.updated_at AS "updatedAt"
              FROM service_policies p
              LEFT JOIN branches b
                ON b.id = p.branch_id
                AND b.tenant_id = p.tenant_id
              WHERE p.id = ${input.id}::uuid
              LIMIT 1
            `;

            const policy = policies[0];
            if (!policy) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Canonical service policy was not found",
              });
            }

            const services = await tx<{
              id: string;
              serviceCode: string | null;
              serviceName: string;
              description: string | null;
              frequency: string;
              isIncluded: boolean;
            }[]>`
              SELECT
                id::text AS "id",
                service_code AS "serviceCode",
                service_name AS "serviceName",
                description AS "description",
                frequency AS "frequency",
                is_included AS "isIncluded"
              FROM service_policy_services
              WHERE policy_id = ${input.id}::uuid
              ORDER BY is_included DESC, service_name, id
            `;

            const slaRules = await tx<{
              id: string;
              name: string;
              priority: string;
              responseTargetMinutes: number;
              resolutionTargetMinutes: number;
              escalationTargetMinutes: number | null;
              penaltyPerHour: string | null;
              isActive: boolean;
            }[]>`
              SELECT
                id::text AS "id",
                name AS "name",
                priority AS "priority",
                response_target_minutes AS "responseTargetMinutes",
                resolution_target_minutes AS "resolutionTargetMinutes",
                escalation_target_minutes AS "escalationTargetMinutes",
                penalty_per_hour::text AS "penaltyPerHour",
                is_active AS "isActive"
              FROM service_policy_sla_rules
              WHERE policy_id = ${input.id}::uuid
              ORDER BY
                CASE priority
                  WHEN 'critical' THEN 1
                  WHEN 'high' THEN 2
                  WHEN 'medium' THEN 3
                  ELSE 4
                END,
                id
            `;

            return {
              ...policy,
              services,
              slaRules,
            };
          },
        );
      }),

  canonicalCreate:
    pgProtectedProcedure
      .input(
        z.object({
          policyNumber: z.string().trim().min(1).max(100),
          name: z.string().trim().min(1).max(255),
          description: z.string().trim().max(5000).optional(),
          branchId: z.string().uuid().optional(),
          policyType: policyTypeSchema.default("maintenance"),
          startDate: z.string().date(),
          endDate: z.string().date(),
          renewalDate: z.string().date().optional(),
          monthlyValue: z.number().finite().nonnegative().optional(),
          annualValue: z.number().finite().nonnegative().optional(),
          currency: z.string().trim().length(3).default("MXN"),
          notes: z.string().trim().max(5000).optional(),
          services: z.array(
            z.object({
              serviceCode: z.string().trim().min(1).max(64).optional(),
              serviceName: z.string().trim().min(1).max(255),
              description: z.string().trim().max(5000).optional(),
              frequency: frequencySchema.default("on_demand"),
              isIncluded: z.boolean().default(true),
            }),
          ).max(100).default([]),
          slaRules: z.array(
            z.object({
              name: z.string().trim().min(1).max(255),
              priority: prioritySchema,
              responseTargetMinutes: z.number().int().positive().max(525600),
              resolutionTargetMinutes: z.number().int().positive().max(525600),
              escalationTargetMinutes: z.number().int().positive().max(525600).optional(),
              penaltyPerHour: z.number().finite().nonnegative().optional(),
            }).refine(
              rule =>
                rule.resolutionTargetMinutes >= rule.responseTargetMinutes,
              {
                message: "Resolution target cannot be shorter than response target",
              },
            ),
          ).max(4).default([]),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        requirePolicyAdministrator(ctx.pgTenant.tenantRole);
        assertUniquePriorities(input.slaRules);

        if (input.endDate < input.startDate) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Policy end date cannot be before start date",
          });
        }

        if (input.renewalDate && input.renewalDate < input.startDate) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Policy renewal date cannot be before start date",
          });
        }

        return withTenantTransaction(
          ctx.pgTenant.tenantId,
          async tx => {
            if (input.branchId) {
              const branches = await tx<{ id: string }[]>`
                SELECT id::text AS "id"
                FROM branches
                WHERE id = ${input.branchId}::uuid
                  AND is_active = true
                LIMIT 1
              `;

              if (branches.length !== 1) {
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message: "Policy branch is not active in the canonical tenant",
                });
              }
            }

            const rows = await tx<{
              id: string;
              policyNumber: string;
              status: string;
            }[]>`
              INSERT INTO service_policies (
                tenant_id,
                branch_id,
                policy_number,
                name,
                description,
                status,
                policy_type,
                start_date,
                end_date,
                renewal_date,
                monthly_value,
                annual_value,
                currency,
                notes
              )
              VALUES (
                ${ctx.pgTenant.tenantId}::uuid,
                ${input.branchId ?? null}::uuid,
                ${input.policyNumber},
                ${input.name},
                ${input.description ?? null},
                'draft',
                ${input.policyType},
                ${input.startDate}::date,
                ${input.endDate}::date,
                ${input.renewalDate ?? null}::date,
                ${input.monthlyValue ?? null}::numeric,
                ${input.annualValue ?? null}::numeric,
                ${input.currency.toUpperCase()},
                ${input.notes ?? null}
              )
              RETURNING
                id::text AS "id",
                policy_number AS "policyNumber",
                status AS "status"
            `;

            const policy = rows[0]!;

            for (const service of input.services) {
              await tx`
                INSERT INTO service_policy_services (
                  tenant_id,
                  policy_id,
                  service_code,
                  service_name,
                  description,
                  frequency,
                  is_included
                )
                VALUES (
                  ${ctx.pgTenant.tenantId}::uuid,
                  ${policy.id}::uuid,
                  ${service.serviceCode ?? null},
                  ${service.serviceName},
                  ${service.description ?? null},
                  ${service.frequency},
                  ${service.isIncluded}
                )
              `;
            }

            for (const rule of input.slaRules) {
              await tx`
                INSERT INTO service_policy_sla_rules (
                  tenant_id,
                  policy_id,
                  name,
                  priority,
                  response_target_minutes,
                  resolution_target_minutes,
                  escalation_target_minutes,
                  penalty_per_hour
                )
                VALUES (
                  ${ctx.pgTenant.tenantId}::uuid,
                  ${policy.id}::uuid,
                  ${rule.name},
                  ${rule.priority},
                  ${rule.responseTargetMinutes},
                  ${rule.resolutionTargetMinutes},
                  ${rule.escalationTargetMinutes ?? null},
                  ${rule.penaltyPerHour ?? null}::numeric
                )
              `;
            }

            return policy;
          },
        );
      }),

  canonicalActivate:
    pgProtectedProcedure
      .input(
        z.object({
          id: z.string().uuid(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        requirePolicyAdministrator(ctx.pgTenant.tenantRole);

        return withTenantTransaction(
          ctx.pgTenant.tenantId,
          async tx => {
            const policies = await tx<{
              id: string;
              status: string;
            }[]>`
              SELECT
                id::text AS "id",
                status AS "status"
              FROM service_policies
              WHERE id = ${input.id}::uuid
              FOR UPDATE
            `;

            const policy = policies[0];
            if (!policy) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Canonical service policy was not found",
              });
            }

            if (policy.status === "cancelled") {
              throw new TRPCError({
                code: "CONFLICT",
                message: "Cancelled policy cannot be activated",
              });
            }

            const serviceRows = await tx<{ count: number }[]>`
              SELECT count(*)::int AS "count"
              FROM service_policy_services
              WHERE policy_id = ${policy.id}::uuid
                AND is_included = true
            `;

            if ((serviceRows[0]?.count ?? 0) < 1) {
              throw new TRPCError({
                code: "CONFLICT",
                message: "Policy requires at least one included service before activation",
              });
            }

            const priorityRows = await tx<{ priority: string }[]>`
              SELECT priority
              FROM service_policy_sla_rules
              WHERE policy_id = ${policy.id}::uuid
                AND is_active = true
            `;

            const priorities = new Set(
              priorityRows.map(row => row.priority),
            );

            for (const required of [
              "critical",
              "high",
              "medium",
              "low",
            ]) {
              if (!priorities.has(required)) {
                throw new TRPCError({
                  code: "CONFLICT",
                  message:
                    `Policy requires an active ${required} SLA rule before activation`,
                });
              }
            }

            const rows = await tx<{
              id: string;
              policyNumber: string;
              status: string;
            }[]>`
              UPDATE service_policies
              SET
                status = 'active',
                updated_at = now()
              WHERE id = ${policy.id}::uuid
              RETURNING
                id::text AS "id",
                policy_number AS "policyNumber",
                status AS "status"
            `;

            return rows[0]!;
          },
        );
      }),

  canonicalApplyToTicket:
    pgProtectedProcedure
      .input(
        z.object({
          ticketId: z.string().uuid(),
          policyId: z.string().uuid(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        requirePolicyAdministrator(ctx.pgTenant.tenantRole);

        return withTenantTransaction(
          ctx.pgTenant.tenantId,
          async tx => {
            const ticket = await lockTicket(tx, input.ticketId);

            if (["resolved", "closed", "cancelled"].includes(ticket.operationalStatus)) {
              throw new TRPCError({
                code: "CONFLICT",
                message: `SLA cannot be applied to ${ticket.operationalStatus} ticket`,
              });
            }

            const rules = await tx<{
              policyId: string;
              policyNumber: string;
              policyName: string;
              ruleId: string;
              ruleName: string;
              priority: string;
              responseTargetMinutes: number;
              resolutionTargetMinutes: number;
              escalationTargetMinutes: number | null;
            }[]>`
              SELECT
                p.id::text AS "policyId",
                p.policy_number AS "policyNumber",
                p.name AS "policyName",
                r.id::text AS "ruleId",
                r.name AS "ruleName",
                r.priority AS "priority",
                r.response_target_minutes AS "responseTargetMinutes",
                r.resolution_target_minutes AS "resolutionTargetMinutes",
                r.escalation_target_minutes AS "escalationTargetMinutes"
              FROM service_policies p
              JOIN service_policy_sla_rules r
                ON r.policy_id = p.id
                AND r.tenant_id = p.tenant_id
              WHERE p.id = ${input.policyId}::uuid
                AND p.status = 'active'
                AND ${ticket.createdAt}::date BETWEEN p.start_date AND p.end_date
                AND (p.branch_id IS NULL OR p.branch_id = ${ticket.branchId}::uuid)
                AND r.priority = ${ticket.priority}
                AND r.is_active = true
              LIMIT 1
            `;

            const rule = rules[0];
            if (!rule) {
              throw new TRPCError({
                code: "CONFLICT",
                message:
                  "Active policy does not provide an applicable SLA rule for this ticket",
              });
            }

            const responseDeadline = new Date(
              ticket.createdAt.getTime()
              + rule.responseTargetMinutes * 60_000,
            );
            const resolutionDeadline = new Date(
              ticket.createdAt.getTime()
              + rule.resolutionTargetMinutes * 60_000,
            );

            const currentRows = await tx<{
              id: string;
              policyId: string;
              slaRuleId: string;
              responseTargetMinutes: number;
              resolutionTargetMinutes: number;
              escalationTargetMinutes: number | null;
              responseDeadline: Date;
              resolutionDeadline: Date;
            }[]>`
              SELECT
                id::text AS "id",
                policy_id::text AS "policyId",
                sla_rule_id::text AS "slaRuleId",
                response_target_minutes AS "responseTargetMinutes",
                resolution_target_minutes AS "resolutionTargetMinutes",
                escalation_target_minutes AS "escalationTargetMinutes",
                response_deadline AS "responseDeadline",
                resolution_deadline AS "resolutionDeadline"
              FROM service_ticket_sla_snapshots
              WHERE service_ticket_id = ${ticket.id}::uuid
              ORDER BY created_at DESC, id DESC
              LIMIT 1
            `;

            const current = currentRows[0];
            const unchanged =
              current?.policyId === rule.policyId
              && current.slaRuleId === rule.ruleId
              && current.responseTargetMinutes === rule.responseTargetMinutes
              && current.resolutionTargetMinutes === rule.resolutionTargetMinutes
              && current.escalationTargetMinutes === rule.escalationTargetMinutes
              && current.responseDeadline.getTime() === responseDeadline.getTime()
              && current.resolutionDeadline.getTime() === resolutionDeadline.getTime();

            if (unchanged && current) {
              await tx`
                UPDATE service_tickets
                SET
                  response_deadline = ${responseDeadline},
                  resolution_deadline = ${resolutionDeadline},
                  updated_at = now()
                WHERE id = ${ticket.id}::uuid
              `;

              return {
                snapshotId: current.id,
                changed: false,
                responseDeadline,
                resolutionDeadline,
              } as const;
            }

            const snapshotRows = await tx<{
              id: string;
            }[]>`
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
                ${rule.policyId}::uuid,
                ${rule.ruleId}::uuid,
                ${rule.policyNumber},
                ${rule.policyName},
                ${rule.ruleName},
                ${rule.priority},
                ${rule.responseTargetMinutes},
                ${rule.resolutionTargetMinutes},
                ${rule.escalationTargetMinutes},
                ${ticket.createdAt},
                ${responseDeadline},
                ${resolutionDeadline},
                'policy',
                ${actorName(ctx)},
                ${JSON.stringify({
                  action: "sla_applied",
                  ticketNumber: ticket.ticketNumber,
                  policyId: rule.policyId,
                  policyNumber: rule.policyNumber,
                  ruleId: rule.ruleId,
                  priority: rule.priority,
                })}::jsonb
              )
              RETURNING id::text AS "id"
            `;

            await tx`
              UPDATE service_tickets
              SET
                response_deadline = ${responseDeadline},
                resolution_deadline = ${resolutionDeadline},
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
                ${`SLA aplicado desde póliza ${rule.policyNumber}`},
                ${JSON.stringify({
                  action: "sla_applied",
                  snapshotId: snapshotRows[0]!.id,
                  policyId: rule.policyId,
                  policyNumber: rule.policyNumber,
                  policyName: rule.policyName,
                  ruleId: rule.ruleId,
                  ruleName: rule.ruleName,
                  priority: rule.priority,
                  responseTargetMinutes: rule.responseTargetMinutes,
                  resolutionTargetMinutes: rule.resolutionTargetMinutes,
                  escalationTargetMinutes: rule.escalationTargetMinutes,
                  slaStartedAt: ticket.createdAt.toISOString(),
                  responseDeadline: responseDeadline.toISOString(),
                  resolutionDeadline: resolutionDeadline.toISOString(),
                })}::jsonb
              )
            `;

            return {
              snapshotId: snapshotRows[0]!.id,
              changed: true,
              responseDeadline,
              resolutionDeadline,
            } as const;
          },
        );
      }),

  canonicalCurrentForTicket:
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
              operationalStatus: string;
              respondedAt: Date | null;
              resolvedAt: Date | null;
            }[]>`
              SELECT
                id::text AS "id",
                ticket_number AS "ticketNumber",
                operational_status AS "operationalStatus",
                responded_at AS "respondedAt",
                resolved_at AS "resolvedAt"
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

            const snapshots = await tx<{
              id: string;
              policyId: string;
              policyNumber: string;
              policyName: string;
              ruleId: string;
              ruleName: string;
              priority: string;
              responseTargetMinutes: number;
              resolutionTargetMinutes: number;
              escalationTargetMinutes: number | null;
              slaStartedAt: Date;
              responseDeadline: Date;
              resolutionDeadline: Date;
              source: string;
              actorName: string | null;
              createdAt: Date;
            }[]>`
              SELECT
                id::text AS "id",
                policy_id::text AS "policyId",
                policy_number_snapshot AS "policyNumber",
                policy_name_snapshot AS "policyName",
                sla_rule_id::text AS "ruleId",
                rule_name_snapshot AS "ruleName",
                priority_snapshot AS "priority",
                response_target_minutes AS "responseTargetMinutes",
                resolution_target_minutes AS "resolutionTargetMinutes",
                escalation_target_minutes AS "escalationTargetMinutes",
                sla_started_at AS "slaStartedAt",
                response_deadline AS "responseDeadline",
                resolution_deadline AS "resolutionDeadline",
                source AS "source",
                actor_name AS "actorName",
                created_at AS "createdAt"
              FROM service_ticket_sla_snapshots
              WHERE service_ticket_id = ${ticket.id}::uuid
              ORDER BY created_at DESC, id DESC
              LIMIT 1
            `;

            const snapshot = snapshots[0];
            if (!snapshot) {
              return {
                configured: false,
                ticketNumber: ticket.ticketNumber,
                operationalStatus: ticket.operationalStatus,
              } as const;
            }

            const now = new Date();
            const responseStatus = classifyDeadline(
              ticket.respondedAt,
              snapshot.responseDeadline,
              now,
            );
            const resolutionStatus = classifyDeadline(
              ticket.resolvedAt,
              snapshot.resolutionDeadline,
              now,
            );

            return {
              configured: true,
              ticketNumber: ticket.ticketNumber,
              operationalStatus: ticket.operationalStatus,
              respondedAt: ticket.respondedAt,
              resolvedAt: ticket.resolvedAt,
              responseStatus,
              resolutionStatus,
              overallStatus:
                responseStatus === "breached"
                || resolutionStatus === "breached"
                  ? "breached" as const
                  : ticket.resolvedAt
                    ? "met" as const
                    : "active" as const,
              ...snapshot,
            } as const;
          },
        );
      }),
});
