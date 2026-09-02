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

const viewSchema = z.enum([
  "all",
  "active",
  "breached",
  "met",
  "unconfigured",
]);

export const serviceSlaDashboardRouter = router({
  canonicalOverview:
    pgProtectedProcedure.query(async ({ ctx }) => {
      return withTenantTransaction(
        ctx.pgTenant.tenantId,
        async tx => {
          const rows = await tx<{
            totalTickets: number;
            configured: number;
            active: number;
            breached: number;
            met: number;
            unconfiguredActive: number;
          }[]>`
            WITH ticket_sla AS (
              SELECT
                st.id,
                st.operational_status,
                st.responded_at,
                st.resolved_at,
                snap.id AS snapshot_id,
                snap.response_deadline,
                snap.resolution_deadline
              FROM service_tickets st
              LEFT JOIN LATERAL (
                SELECT
                  s.id,
                  s.response_deadline,
                  s.resolution_deadline
                FROM service_ticket_sla_snapshots s
                WHERE s.service_ticket_id = st.id
                ORDER BY s.created_at DESC, s.id DESC
                LIMIT 1
              ) snap ON true
            ), evaluated AS (
              SELECT
                *,
                CASE
                  WHEN snapshot_id IS NULL THEN 'unconfigured'
                  WHEN (
                    responded_at IS NOT NULL
                    AND responded_at > response_deadline
                  ) OR (
                    responded_at IS NULL
                    AND now() > response_deadline
                  ) OR (
                    resolved_at IS NOT NULL
                    AND resolved_at > resolution_deadline
                  ) OR (
                    resolved_at IS NULL
                    AND now() > resolution_deadline
                  ) THEN 'breached'
                  WHEN resolved_at IS NOT NULL THEN 'met'
                  ELSE 'active'
                END AS sla_status
              FROM ticket_sla
            )
            SELECT
              count(*)::int AS "totalTickets",
              count(*) FILTER (
                WHERE snapshot_id IS NOT NULL
              )::int AS "configured",
              count(*) FILTER (
                WHERE sla_status = 'active'
              )::int AS "active",
              count(*) FILTER (
                WHERE sla_status = 'breached'
              )::int AS "breached",
              count(*) FILTER (
                WHERE sla_status = 'met'
              )::int AS "met",
              count(*) FILTER (
                WHERE sla_status = 'unconfigured'
                  AND operational_status NOT IN (
                    'resolved',
                    'closed',
                    'cancelled'
                  )
              )::int AS "unconfiguredActive"
            FROM evaluated
          `;

          return rows[0] ?? {
            totalTickets: 0,
            configured: 0,
            active: 0,
            breached: 0,
            met: 0,
            unconfiguredActive: 0,
          };
        },
      );
    }),

  canonicalQueue:
    pgProtectedProcedure
      .input(
        z.object({
          view: viewSchema.default("all"),
          priority: prioritySchema.optional(),
        }).optional(),
      )
      .query(async ({ ctx, input }) => {
        const view = input?.view ?? "all";
        const priority = input?.priority ?? null;

        return withTenantTransaction(
          ctx.pgTenant.tenantId,
          async tx => {
            return tx<{
              id: string;
              ticketNumber: string;
              title: string;
              operationalStatus: string;
              contractualStatus: string;
              priority: string;
              branchName: string;
              assignedToName: string | null;
              assignedToEmail: string | null;
              policyNumber: string | null;
              policyName: string | null;
              ruleName: string | null;
              responseTargetMinutes: number | null;
              resolutionTargetMinutes: number | null;
              responseDeadline: Date | null;
              resolutionDeadline: Date | null;
              respondedAt: Date | null;
              resolvedAt: Date | null;
              responseStatus: string;
              resolutionStatus: string;
              overallStatus: string;
              createdAt: Date;
            }[]>`
              WITH ticket_sla AS (
                SELECT
                  st.id,
                  st.ticket_number,
                  st.title,
                  st.operational_status,
                  st.contractual_status,
                  st.priority,
                  st.created_at,
                  st.responded_at,
                  st.resolved_at,
                  b.name AS branch_name,
                  u.name AS assigned_name,
                  u.email AS assigned_email,
                  snap.policy_number_snapshot,
                  snap.policy_name_snapshot,
                  snap.rule_name_snapshot,
                  snap.response_target_minutes,
                  snap.resolution_target_minutes,
                  snap.response_deadline,
                  snap.resolution_deadline,
                  snap.id AS snapshot_id
                FROM service_tickets st
                JOIN branches b
                  ON b.id = st.branch_id
                  AND b.tenant_id = st.tenant_id
                LEFT JOIN users u
                  ON u.id = st.assigned_to_user_id
                LEFT JOIN LATERAL (
                  SELECT s.*
                  FROM service_ticket_sla_snapshots s
                  WHERE s.service_ticket_id = st.id
                  ORDER BY s.created_at DESC, s.id DESC
                  LIMIT 1
                ) snap ON true
                WHERE (
                  ${priority}::text IS NULL
                  OR st.priority = ${priority}
                )
              ), evaluated AS (
                SELECT
                  *,
                  CASE
                    WHEN snapshot_id IS NULL THEN 'unconfigured'
                    WHEN responded_at IS NOT NULL
                      THEN CASE
                        WHEN responded_at <= response_deadline
                          THEN 'met'
                        ELSE 'breached'
                      END
                    WHEN now() <= response_deadline
                      THEN 'active'
                    ELSE 'breached'
                  END AS response_status,
                  CASE
                    WHEN snapshot_id IS NULL THEN 'unconfigured'
                    WHEN resolved_at IS NOT NULL
                      THEN CASE
                        WHEN resolved_at <= resolution_deadline
                          THEN 'met'
                        ELSE 'breached'
                      END
                    WHEN now() <= resolution_deadline
                      THEN 'active'
                    ELSE 'breached'
                  END AS resolution_status
                FROM ticket_sla
              ), final AS (
                SELECT
                  *,
                  CASE
                    WHEN snapshot_id IS NULL THEN 'unconfigured'
                    WHEN response_status = 'breached'
                      OR resolution_status = 'breached'
                      THEN 'breached'
                    WHEN resolved_at IS NOT NULL
                      THEN 'met'
                    ELSE 'active'
                  END AS overall_status
                FROM evaluated
              )
              SELECT
                id::text AS "id",
                ticket_number AS "ticketNumber",
                title AS "title",
                operational_status AS "operationalStatus",
                contractual_status AS "contractualStatus",
                priority AS "priority",
                branch_name AS "branchName",
                assigned_name AS "assignedToName",
                assigned_email AS "assignedToEmail",
                policy_number_snapshot AS "policyNumber",
                policy_name_snapshot AS "policyName",
                rule_name_snapshot AS "ruleName",
                response_target_minutes AS "responseTargetMinutes",
                resolution_target_minutes AS "resolutionTargetMinutes",
                response_deadline AS "responseDeadline",
                resolution_deadline AS "resolutionDeadline",
                responded_at AS "respondedAt",
                resolved_at AS "resolvedAt",
                response_status AS "responseStatus",
                resolution_status AS "resolutionStatus",
                overall_status AS "overallStatus",
                created_at AS "createdAt"
              FROM final
              WHERE (
                ${view} = 'all'
                OR overall_status = ${view}
                OR (
                  ${view} = 'unconfigured'
                  AND overall_status = 'unconfigured'
                  AND operational_status NOT IN (
                    'resolved',
                    'closed',
                    'cancelled'
                  )
                )
              )
              ORDER BY
                CASE overall_status
                  WHEN 'breached' THEN 1
                  WHEN 'active' THEN 2
                  WHEN 'unconfigured' THEN 3
                  ELSE 4
                END,
                CASE priority
                  WHEN 'critical' THEN 1
                  WHEN 'high' THEN 2
                  WHEN 'medium' THEN 3
                  ELSE 4
                END,
                created_at DESC,
                ticket_number
            `;
          },
        );
      }),
});
