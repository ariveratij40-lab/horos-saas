import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  pgProtectedProcedure,
  router,
} from "../_core/trpc";
import {
  withTenantTransaction,
} from "../db.pg";

function requireCoverageAdministrator(tenantRole: string) {
  if (tenantRole !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Service request policy coverage requires tenant administrator access",
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

export const serviceRequestCoverageRouter = router({
  canonicalOptions:
    pgProtectedProcedure
      .input(
        z.object({
          id: z.string().uuid(),
        }),
      )
      .query(async ({ ctx, input }) => {
        requireCoverageAdministrator(
          ctx.pgTenant.tenantRole,
        );

        return withTenantTransaction(
          ctx.pgTenant.tenantId,
          async tx => {
            const requests = await tx<{
              id: string;
              requestNumber: string;
              status: string;
              commercialStatus: string;
              branchId: string | null;
              branchName: string | null;
            }[]>`
              SELECT
                r.id::text AS "id",
                r.request_number AS "requestNumber",
                r.status AS "status",
                r.commercial_status AS "commercialStatus",
                r.branch_id::text AS "branchId",
                b.name AS "branchName"
              FROM service_requests r
              LEFT JOIN branches b
                ON b.id = r.branch_id
                AND b.tenant_id = r.tenant_id
              WHERE r.id = ${input.id}::uuid
              LIMIT 1
            `;

            const request = requests[0];
            if (!request) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message:
                  "Service request was not found",
              });
            }

            if (
              request.status !== "under_review"
              || request.commercialStatus !== "not_required"
            ) {
              return {
                request,
                options: [],
              };
            }

            const options = await tx<{
              policyId: string;
              policyNumber: string;
              policyName: string;
              policyBranchId: string | null;
              policyBranchName: string | null;
              startDate: string;
              endDate: string;
              policyServiceId: string;
              serviceCode: string | null;
              serviceName: string;
              frequency: string;
            }[]>`
              SELECT
                p.id::text AS "policyId",
                p.policy_number AS "policyNumber",
                p.name AS "policyName",
                p.branch_id::text AS "policyBranchId",
                pb.name AS "policyBranchName",
                p.start_date::text AS "startDate",
                p.end_date::text AS "endDate",
                ps.id::text AS "policyServiceId",
                ps.service_code AS "serviceCode",
                ps.service_name AS "serviceName",
                ps.frequency AS "frequency"
              FROM service_policies p
              JOIN service_policy_services ps
                ON ps.policy_id = p.id
                AND ps.tenant_id = p.tenant_id
                AND ps.is_included = true
              LEFT JOIN branches pb
                ON pb.id = p.branch_id
                AND pb.tenant_id = p.tenant_id
              WHERE p.status = 'active'
                AND CURRENT_DATE BETWEEN p.start_date AND p.end_date
                AND (
                  p.branch_id IS NULL
                  OR p.branch_id = ${request.branchId}::uuid
                )
              ORDER BY
                CASE WHEN p.branch_id IS NOT NULL THEN 0 ELSE 1 END,
                p.policy_number,
                ps.service_name,
                ps.id
            `;

            return {
              request,
              options,
            };
          },
        );
      }),

  canonicalAuthorize:
    pgProtectedProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          policyServiceId: z.string().uuid(),
          note:
            z.string()
              .trim()
              .min(1)
              .max(2000)
              .optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        requireCoverageAdministrator(
          ctx.pgTenant.tenantRole,
        );

        return withTenantTransaction(
          ctx.pgTenant.tenantId,
          async tx => {
            const requests = await tx<{
              id: string;
              requestNumber: string;
              status: string;
              commercialStatus: string;
              branchId: string | null;
            }[]>`
              SELECT
                id::text AS "id",
                request_number AS "requestNumber",
                status AS "status",
                commercial_status AS "commercialStatus",
                branch_id::text AS "branchId"
              FROM service_requests
              WHERE id = ${input.id}::uuid
              FOR UPDATE
            `;

            const request = requests[0];
            if (!request) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message:
                  "Service request was not found",
              });
            }

            if (
              request.status !== "under_review"
              || request.commercialStatus !== "not_required"
            ) {
              throw new TRPCError({
                code: "CONFLICT",
                message:
                  `Policy coverage cannot be authorized from status ${request.status} with commercial status ${request.commercialStatus}`,
              });
            }

            const coverageRows = await tx<{
              policyId: string;
              policyNumber: string;
              policyName: string;
              policyBranchId: string | null;
              policyServiceId: string;
              serviceCode: string | null;
              serviceName: string;
            }[]>`
              SELECT
                p.id::text AS "policyId",
                p.policy_number AS "policyNumber",
                p.name AS "policyName",
                p.branch_id::text AS "policyBranchId",
                ps.id::text AS "policyServiceId",
                ps.service_code AS "serviceCode",
                ps.service_name AS "serviceName"
              FROM service_policy_services ps
              JOIN service_policies p
                ON p.id = ps.policy_id
                AND p.tenant_id = ps.tenant_id
              WHERE ps.id = ${input.policyServiceId}::uuid
                AND ps.is_included = true
                AND p.status = 'active'
                AND CURRENT_DATE BETWEEN p.start_date AND p.end_date
                AND (
                  p.branch_id IS NULL
                  OR p.branch_id = ${request.branchId}::uuid
                )
              LIMIT 1
            `;

            const coverage = coverageRows[0];
            if (!coverage) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message:
                  "Selected service is not covered by an active policy compatible with this request",
              });
            }

            const ruleRows = await tx<{
              slaRuleId: string;
              ruleName: string;
              priority: string;
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
              WHERE policy_id = ${coverage.policyId}::uuid
                AND is_active = true
              ORDER BY
                CASE priority
                  WHEN 'critical' THEN 1
                  WHEN 'high' THEN 2
                  WHEN 'medium' THEN 3
                  ELSE 4
                END,
                id
            `;

            const requiredPriorities = new Set([
              "critical",
              "high",
              "medium",
              "low",
            ]);

            if (
              ruleRows.length !== 4
              || ruleRows.some(rule =>
                !requiredPriorities.has(rule.priority),
              )
            ) {
              throw new TRPCError({
                code: "CONFLICT",
                message:
                  "Active policy does not have a complete four-priority SLA matrix",
              });
            }

            const slaRules = Object.fromEntries(
              ruleRows.map(rule => [
                rule.priority,
                {
                  slaRuleId: rule.slaRuleId,
                  ruleName: rule.ruleName,
                  responseTargetMinutes:
                    rule.responseTargetMinutes,
                  resolutionTargetMinutes:
                    rule.resolutionTargetMinutes,
                  escalationTargetMinutes:
                    rule.escalationTargetMinutes,
                },
              ]),
            );

            const rows = await tx<{
              id: string;
              requestNumber: string;
              status: string;
              commercialStatus: string;
              authorizedAt: Date;
              updatedAt: Date;
            }[]>`
              UPDATE service_requests
              SET
                commercial_status = 'authorized',
                authorized_at = now(),
                rejected_at = NULL,
                rejection_reason = NULL,
                updated_at = now()
              WHERE id = ${request.id}::uuid
                AND status = 'under_review'
                AND commercial_status = 'not_required'
              RETURNING
                id::text AS "id",
                request_number AS "requestNumber",
                status AS "status",
                commercial_status AS "commercialStatus",
                authorized_at AS "authorizedAt",
                updated_at AS "updatedAt"
            `;

            if (rows.length !== 1) {
              throw new TRPCError({
                code: "CONFLICT",
                message:
                  "Service request changed while policy coverage was being authorized",
              });
            }

            const defaultMessage =
              `Cobertura aprobada por póliza ${coverage.policyNumber} · ${coverage.serviceName}`;

            await tx`
              INSERT INTO service_request_events (
                tenant_id,
                service_request_id,
                event_type,
                actor_name,
                message,
                metadata
              )
              VALUES (
                ${ctx.pgTenant.tenantId}::uuid,
                ${request.id}::uuid,
                'authorized',
                ${actorName(ctx)},
                ${input.note ?? defaultMessage},
                ${JSON.stringify({
                  action: "policy_coverage_authorized",
                  policyId: coverage.policyId,
                  policyNumber: coverage.policyNumber,
                  policyName: coverage.policyName,
                  policyBranchId: coverage.policyBranchId,
                  policyServiceId: coverage.policyServiceId,
                  serviceCode: coverage.serviceCode,
                  serviceName: coverage.serviceName,
                  slaRules,
                  status: "under_review",
                  commercialStatus: "authorized",
                })}::jsonb
              )
            `;

            return {
              ...rows[0]!,
              coverage,
              slaRules,
            } as const;
          },
        );
      }),
});
