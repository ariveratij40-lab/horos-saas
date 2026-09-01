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

const maintenanceTypeSchema = z.enum([
  "preventive",
  "corrective",
  "predictive",
  "inspection",
]);

const workOrderStatusSchema = z.enum([
  "draft",
  "planned",
  "in_progress",
  "completed",
  "cancelled",
]);

const workOrderAssetStatusSchema = z.enum([
  "pending",
  "inspected",
  "serviced",
  "skipped",
  "follow_up_required",
]);

const findingTypeSchema = z.enum([
  "anomaly",
  "damage",
  "degradation",
  "configuration",
  "recommendation",
  "other",
]);

const findingSeveritySchema = z.enum([
  "info",
  "low",
  "medium",
  "high",
  "critical",
]);

const findingStatusSchema = z.enum([
  "open",
  "resolved",
  "monitor",
  "recommended",
]);

const evidencePhaseSchema = z.enum([
  "before",
  "during",
  "after",
  "general",
]);

const mediaTypeSchema = z.enum([
  "photo",
  "document",
  "signature",
]);

function requireMaintenanceAdministrator(tenantRole: string) {
  if (tenantRole !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Canonical maintenance administration requires tenant administrator access",
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

async function requireActiveTenantMember(
  tx: TransactionSql,
  tenantId: string,
  userId: string,
) {
  const rows = await tx<{ userId: string }[]>`
    SELECT u.id::text AS "userId"
    FROM tenant_users tu
    JOIN users u
      ON u.id = tu.user_id
    WHERE tu.tenant_id = ${tenantId}::uuid
      AND tu.user_id = ${userId}::uuid
      AND tu.is_active = true
      AND u.is_active = true
    LIMIT 1
  `;

  if (rows.length !== 1) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Assigned technician is not an active canonical tenant member",
    });
  }
}

async function addWorkOrderEvent(
  tx: TransactionSql,
  input: {
    tenantId: string;
    workOrderId: string;
    eventType:
      | "created"
      | "planned"
      | "started"
      | "asset_added"
      | "asset_updated"
      | "finding_added"
      | "evidence_added"
      | "completed"
      | "cancelled"
      | "customer_accepted";
    actorUserId: string | null;
    actorName: string;
    message?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  await tx`
    INSERT INTO maintenance_work_order_events (
      tenant_id,
      work_order_id,
      event_type,
      actor_user_id,
      actor_name,
      message,
      metadata
    )
    VALUES (
      ${input.tenantId}::uuid,
      ${input.workOrderId}::uuid,
      ${input.eventType},
      ${input.actorUserId}::uuid,
      ${input.actorName},
      ${input.message ?? null},
      ${JSON.stringify(input.metadata ?? {})}::jsonb
    )
  `;
}

type LockedWorkOrder = {
  id: string;
  workOrderNumber: string;
  branchId: string;
  policyId: string | null;
  serviceTicketId: string | null;
  branchSystemId: string | null;
  status: string;
  maintenanceType: string;
  assignedToUserId: string | null;
};

async function lockWorkOrder(
  tx: TransactionSql,
  id: string,
): Promise<LockedWorkOrder> {
  const rows = await tx<LockedWorkOrder[]>`
    SELECT
      id::text AS "id",
      work_order_number AS "workOrderNumber",
      branch_id::text AS "branchId",
      policy_id::text AS "policyId",
      service_ticket_id::text AS "serviceTicketId",
      branch_system_id::text AS "branchSystemId",
      status,
      maintenance_type AS "maintenanceType",
      assigned_to_user_id::text AS "assignedToUserId"
    FROM maintenance_work_orders
    WHERE id = ${id}::uuid
    FOR UPDATE
  `;

  if (rows.length !== 1) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Canonical maintenance work order was not found",
    });
  }

  return rows[0]!;
}

async function validateBranch(
  tx: TransactionSql,
  branchId: string,
) {
  const rows = await tx<{ id: string }[]>`
    SELECT id::text AS "id"
    FROM branches
    WHERE id = ${branchId}::uuid
      AND is_active = true
    LIMIT 1
  `;

  if (rows.length !== 1) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Maintenance branch is not active in the canonical tenant",
    });
  }
}

async function validatePolicyForBranch(
  tx: TransactionSql,
  policyId: string,
  branchId: string,
  requireExecutable: boolean,
) {
  const rows = await tx<{
    id: string;
    policyNumber: string;
    name: string;
    status: string;
    branchId: string | null;
    startDate: string;
    endDate: string;
  }[]>`
    SELECT
      id::text AS "id",
      policy_number AS "policyNumber",
      name,
      status,
      branch_id::text AS "branchId",
      start_date::text AS "startDate",
      end_date::text AS "endDate"
    FROM service_policies
    WHERE id = ${policyId}::uuid
    LIMIT 1
  `;

  const policy = rows[0];
  if (!policy) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Maintenance policy was not found in the canonical tenant",
    });
  }

  if (policy.branchId && policy.branchId !== branchId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Maintenance policy does not cover the selected branch",
    });
  }

  if (requireExecutable) {
    const today = new Date().toISOString().slice(0, 10);
    if (
      policy.status !== "active"
      || today < policy.startDate
      || today > policy.endDate
    ) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Maintenance policy is not active and effective today",
      });
    }
  }

  return policy;
}

async function validateAssetIds(
  tx: TransactionSql,
  branchId: string,
  assetIds: string[],
) {
  if (assetIds.length === 0) return [];

  const uniqueIds = [...new Set(assetIds)];
  const rows = await tx<{
    id: string;
    assetCode: string;
  }[]>`
    SELECT
      id::text AS "id",
      asset_code AS "assetCode"
    FROM assets
    WHERE branch_id = ${branchId}::uuid
      AND id = ANY(${uniqueIds}::uuid[])
      AND lifecycle_status <> 'retired'
  `;

  if (rows.length !== uniqueIds.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "One or more maintenance assets are missing, retired, or belong to another branch",
    });
  }

  return rows;
}

async function validatePolicyCoverageIfMapped(
  tx: TransactionSql,
  policyId: string,
  assetIds: string[],
) {
  if (assetIds.length === 0) return "unmapped" as const;

  const countRows = await tx<{ count: number }[]>`
    SELECT count(*)::int AS "count"
    FROM service_policy_assets
    WHERE policy_id = ${policyId}::uuid
      AND coverage_status = 'included'
      AND (
        effective_from IS NULL
        OR effective_from <= current_date
      )
      AND (
        effective_to IS NULL
        OR effective_to >= current_date
      )
  `;

  const mappedCount = countRows[0]?.count ?? 0;
  if (mappedCount === 0) {
    return "unmapped" as const;
  }

  const uniqueIds = [...new Set(assetIds)];
  const coveredRows = await tx<{ id: string }[]>`
    SELECT asset_id::text AS "id"
    FROM service_policy_assets
    WHERE policy_id = ${policyId}::uuid
      AND asset_id = ANY(${uniqueIds}::uuid[])
      AND coverage_status = 'included'
      AND (
        effective_from IS NULL
        OR effective_from <= current_date
      )
      AND (
        effective_to IS NULL
        OR effective_to >= current_date
      )
  `;

  if (coveredRows.length !== uniqueIds.length) {
    throw new TRPCError({
      code: "CONFLICT",
      message:
        "One or more selected assets are outside the explicit policy coverage",
    });
  }

  return "explicit" as const;
}

export const canonicalMaintenanceRouter = router({
  canonicalList:
    pgProtectedProcedure
      .input(
        z.object({
          status: workOrderStatusSchema.optional(),
          type: maintenanceTypeSchema.optional(),
          branchId: z.string().uuid().optional(),
          policyId: z.string().uuid().optional(),
        }).optional(),
      )
      .query(async ({ ctx, input }) => {
        return withTenantTransaction(
          ctx.pgTenant.tenantId,
          async tx => {
            const status = input?.status ?? null;
            const type = input?.type ?? null;
            const branchId = input?.branchId ?? null;
            const policyId = input?.policyId ?? null;

            return tx<{
              id: string;
              workOrderNumber: string;
              title: string;
              maintenanceType: string;
              status: string;
              branchId: string;
              branchName: string;
              policyId: string | null;
              policyNumber: string | null;
              policyName: string | null;
              systemName: string | null;
              assignedToName: string | null;
              scheduledStart: Date | null;
              scheduledEnd: Date | null;
              startedAt: Date | null;
              completedAt: Date | null;
              assetCount: number;
              findingCount: number;
              evidenceCount: number;
              createdAt: Date;
            }[]>`
              SELECT
                wo.id::text AS "id",
                wo.work_order_number AS "workOrderNumber",
                wo.title,
                wo.maintenance_type AS "maintenanceType",
                wo.status,
                wo.branch_id::text AS "branchId",
                b.name AS "branchName",
                wo.policy_id::text AS "policyId",
                p.policy_number AS "policyNumber",
                p.name AS "policyName",
                s.name AS "systemName",
                assigned_user.name AS "assignedToName",
                wo.scheduled_start AS "scheduledStart",
                wo.scheduled_end AS "scheduledEnd",
                wo.started_at AS "startedAt",
                wo.completed_at AS "completedAt",
                (
                  SELECT count(*)::int
                  FROM maintenance_work_order_assets woa
                  WHERE woa.work_order_id = wo.id
                ) AS "assetCount",
                (
                  SELECT count(*)::int
                  FROM maintenance_findings mf
                  WHERE mf.work_order_id = wo.id
                ) AS "findingCount",
                (
                  SELECT count(*)::int
                  FROM maintenance_evidence me
                  WHERE me.work_order_id = wo.id
                ) AS "evidenceCount",
                wo.created_at AS "createdAt"
              FROM maintenance_work_orders wo
              JOIN branches b
                ON b.id = wo.branch_id
                AND b.tenant_id = wo.tenant_id
              LEFT JOIN service_policies p
                ON p.id = wo.policy_id
                AND p.tenant_id = wo.tenant_id
              LEFT JOIN branch_systems bs
                ON bs.id = wo.branch_system_id
                AND bs.tenant_id = wo.tenant_id
              LEFT JOIN systems s
                ON s.id = bs.system_id
              LEFT JOIN users assigned_user
                ON assigned_user.id = wo.assigned_to_user_id
              WHERE (
                ${status}::text IS NULL
                OR wo.status = ${status}
              )
              AND (
                ${type}::text IS NULL
                OR wo.maintenance_type = ${type}
              )
              AND (
                ${branchId}::uuid IS NULL
                OR wo.branch_id = ${branchId}::uuid
              )
              AND (
                ${policyId}::uuid IS NULL
                OR wo.policy_id = ${policyId}::uuid
              )
              ORDER BY
                CASE wo.status
                  WHEN 'in_progress' THEN 1
                  WHEN 'planned' THEN 2
                  WHEN 'draft' THEN 3
                  WHEN 'completed' THEN 4
                  ELSE 5
                END,
                wo.scheduled_start NULLS LAST,
                wo.created_at DESC
            `;
          },
        );
      }),

  canonicalGet:
    pgProtectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        return withTenantTransaction(
          ctx.pgTenant.tenantId,
          async tx => {
            const headers = await tx<{
              id: string;
              workOrderNumber: string;
              title: string;
              maintenanceType: string;
              status: string;
              objective: string | null;
              branchId: string;
              branchCode: string;
              branchName: string;
              policyId: string | null;
              policyNumber: string | null;
              policyName: string | null;
              serviceTicketId: string | null;
              ticketNumber: string | null;
              branchSystemId: string | null;
              systemName: string | null;
              assignedToUserId: string | null;
              assignedToName: string | null;
              customerContactName: string | null;
              scheduledStart: Date | null;
              scheduledEnd: Date | null;
              startedAt: Date | null;
              completedAt: Date | null;
              summary: string | null;
              generalFindings: string | null;
              correctiveActions: string | null;
              recommendations: string | null;
              customerAcceptedAt: Date | null;
              customerAcceptanceNotes: string | null;
              createdAt: Date;
              updatedAt: Date;
            }[]>`
              SELECT
                wo.id::text AS "id",
                wo.work_order_number AS "workOrderNumber",
                wo.title,
                wo.maintenance_type AS "maintenanceType",
                wo.status,
                wo.objective,
                wo.branch_id::text AS "branchId",
                b.code AS "branchCode",
                b.name AS "branchName",
                wo.policy_id::text AS "policyId",
                p.policy_number AS "policyNumber",
                p.name AS "policyName",
                wo.service_ticket_id::text AS "serviceTicketId",
                st.ticket_number AS "ticketNumber",
                wo.branch_system_id::text AS "branchSystemId",
                s.name AS "systemName",
                wo.assigned_to_user_id::text AS "assignedToUserId",
                assigned_user.name AS "assignedToName",
                wo.customer_contact_name AS "customerContactName",
                wo.scheduled_start AS "scheduledStart",
                wo.scheduled_end AS "scheduledEnd",
                wo.started_at AS "startedAt",
                wo.completed_at AS "completedAt",
                wo.summary,
                wo.general_findings AS "generalFindings",
                wo.corrective_actions AS "correctiveActions",
                wo.recommendations,
                wo.customer_accepted_at AS "customerAcceptedAt",
                wo.customer_acceptance_notes AS "customerAcceptanceNotes",
                wo.created_at AS "createdAt",
                wo.updated_at AS "updatedAt"
              FROM maintenance_work_orders wo
              JOIN branches b
                ON b.id = wo.branch_id
                AND b.tenant_id = wo.tenant_id
              LEFT JOIN service_policies p
                ON p.id = wo.policy_id
                AND p.tenant_id = wo.tenant_id
              LEFT JOIN service_tickets st
                ON st.id = wo.service_ticket_id
                AND st.tenant_id = wo.tenant_id
              LEFT JOIN branch_systems bs
                ON bs.id = wo.branch_system_id
                AND bs.tenant_id = wo.tenant_id
              LEFT JOIN systems s
                ON s.id = bs.system_id
              LEFT JOIN users assigned_user
                ON assigned_user.id = wo.assigned_to_user_id
              WHERE wo.id = ${input.id}::uuid
              LIMIT 1
            `;

            const workOrder = headers[0];
            if (!workOrder) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Canonical maintenance work order was not found",
              });
            }

            const assets = await tx<{
              id: string;
              assetId: string;
              assetCode: string;
              assetTypeCode: string;
              assetTypeName: string;
              manufacturer: string | null;
              model: string | null;
              locationName: string | null;
              sequence: number;
              status: string;
              conditionBefore: string | null;
              conditionAfter: string | null;
              workPerformed: string | null;
              technicianNotes: string | null;
              findingCount: number;
              evidenceCount: number;
              startedAt: Date | null;
              completedAt: Date | null;
            }[]>`
              SELECT
                woa.id::text AS "id",
                a.id::text AS "assetId",
                a.asset_code AS "assetCode",
                at.code AS "assetTypeCode",
                at.name AS "assetTypeName",
                a.manufacturer,
                a.model,
                l.name AS "locationName",
                woa.sequence,
                woa.status,
                woa.condition_before AS "conditionBefore",
                woa.condition_after AS "conditionAfter",
                woa.work_performed AS "workPerformed",
                woa.technician_notes AS "technicianNotes",
                (
                  SELECT count(*)::int
                  FROM maintenance_findings mf
                  WHERE mf.work_order_asset_id = woa.id
                ) AS "findingCount",
                (
                  SELECT count(*)::int
                  FROM maintenance_evidence me
                  WHERE me.work_order_asset_id = woa.id
                ) AS "evidenceCount",
                woa.started_at AS "startedAt",
                woa.completed_at AS "completedAt"
              FROM maintenance_work_order_assets woa
              JOIN assets a
                ON a.id = woa.asset_id
                AND a.tenant_id = woa.tenant_id
              JOIN asset_types at
                ON at.id = a.asset_type_id
              LEFT JOIN locations l
                ON l.id = a.location_id
                AND l.tenant_id = a.tenant_id
              WHERE woa.work_order_id = ${input.id}::uuid
              ORDER BY woa.sequence, a.asset_code, woa.id
            `;

            const findings = await tx<{
              id: string;
              workOrderAssetId: string | null;
              assetCode: string | null;
              findingType: string;
              severity: string;
              status: string;
              title: string;
              description: string | null;
              diagnosis: string | null;
              actionTaken: string | null;
              recommendation: string | null;
              requiresFollowUp: boolean;
              capexRecommended: boolean;
              createdAt: Date;
              updatedAt: Date;
            }[]>`
              SELECT
                mf.id::text AS "id",
                mf.work_order_asset_id::text AS "workOrderAssetId",
                a.asset_code AS "assetCode",
                mf.finding_type AS "findingType",
                mf.severity,
                mf.status,
                mf.title,
                mf.description,
                mf.diagnosis,
                mf.action_taken AS "actionTaken",
                mf.recommendation,
                mf.requires_follow_up AS "requiresFollowUp",
                mf.capex_recommended AS "capexRecommended",
                mf.created_at AS "createdAt",
                mf.updated_at AS "updatedAt"
              FROM maintenance_findings mf
              LEFT JOIN maintenance_work_order_assets woa
                ON woa.id = mf.work_order_asset_id
                AND woa.tenant_id = mf.tenant_id
              LEFT JOIN assets a
                ON a.id = woa.asset_id
                AND a.tenant_id = woa.tenant_id
              WHERE mf.work_order_id = ${input.id}::uuid
              ORDER BY
                CASE mf.severity
                  WHEN 'critical' THEN 1
                  WHEN 'high' THEN 2
                  WHEN 'medium' THEN 3
                  WHEN 'low' THEN 4
                  ELSE 5
                END,
                mf.created_at,
                mf.id
            `;

            const evidence = await tx<{
              id: string;
              workOrderAssetId: string | null;
              findingId: string | null;
              evidencePhase: string;
              mediaType: string;
              fileName: string;
              mimeType: string | null;
              storageKey: string;
              fileUrl: string | null;
              caption: string | null;
              takenAt: Date | null;
              sortOrder: number;
              createdAt: Date;
            }[]>`
              SELECT
                me.id::text AS "id",
                me.work_order_asset_id::text AS "workOrderAssetId",
                me.finding_id::text AS "findingId",
                me.evidence_phase AS "evidencePhase",
                me.media_type AS "mediaType",
                me.file_name AS "fileName",
                me.mime_type AS "mimeType",
                me.storage_key AS "storageKey",
                me.file_url AS "fileUrl",
                me.caption,
                me.taken_at AS "takenAt",
                me.sort_order AS "sortOrder",
                me.created_at AS "createdAt"
              FROM maintenance_evidence me
              WHERE me.work_order_id = ${input.id}::uuid
              ORDER BY
                me.work_order_asset_id NULLS FIRST,
                CASE me.evidence_phase
                  WHEN 'before' THEN 1
                  WHEN 'during' THEN 2
                  WHEN 'after' THEN 3
                  ELSE 4
                END,
                me.sort_order,
                me.created_at,
                me.id
            `;

            const events = await tx<{
              id: string;
              eventType: string;
              actorName: string | null;
              message: string | null;
              metadata: Record<string, unknown>;
              createdAt: Date;
            }[]>`
              SELECT
                id::text AS "id",
                event_type AS "eventType",
                actor_name AS "actorName",
                message,
                metadata,
                created_at AS "createdAt"
              FROM maintenance_work_order_events
              WHERE work_order_id = ${input.id}::uuid
              ORDER BY created_at, id
            `;

            return {
              ...workOrder,
              assets,
              findings,
              evidence,
              events,
            };
          },
        );
      }),

  canonicalPolicyCoverage:
    pgProtectedProcedure
      .input(z.object({ policyId: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        return withTenantTransaction(
          ctx.pgTenant.tenantId,
          async tx => {
            return tx<{
              coverageId: string;
              assetId: string;
              assetCode: string;
              assetTypeCode: string;
              assetTypeName: string;
              branchName: string;
              locationName: string | null;
              manufacturer: string | null;
              model: string | null;
              coverageStatus: string;
              coverageNotes: string | null;
              effectiveFrom: string | null;
              effectiveTo: string | null;
            }[]>`
              SELECT
                spa.id::text AS "coverageId",
                a.id::text AS "assetId",
                a.asset_code AS "assetCode",
                at.code AS "assetTypeCode",
                at.name AS "assetTypeName",
                b.name AS "branchName",
                l.name AS "locationName",
                a.manufacturer,
                a.model,
                spa.coverage_status AS "coverageStatus",
                spa.coverage_notes AS "coverageNotes",
                spa.effective_from::text AS "effectiveFrom",
                spa.effective_to::text AS "effectiveTo"
              FROM service_policy_assets spa
              JOIN assets a
                ON a.id = spa.asset_id
                AND a.tenant_id = spa.tenant_id
              JOIN asset_types at
                ON at.id = a.asset_type_id
              JOIN branches b
                ON b.id = a.branch_id
                AND b.tenant_id = a.tenant_id
              LEFT JOIN locations l
                ON l.id = a.location_id
                AND l.tenant_id = a.tenant_id
              WHERE spa.policy_id = ${input.policyId}::uuid
              ORDER BY
                at.name,
                a.asset_code,
                a.id
            `;
          },
        );
      }),

  canonicalSetPolicyCoverage:
    pgProtectedProcedure
      .input(
        z.object({
          policyId: z.string().uuid(),
          assetIds: z.array(z.string().uuid()).max(5000),
          coverageNotes: z.string().trim().max(5000).optional(),
          effectiveFrom: z.string().date().optional(),
          effectiveTo: z.string().date().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        requireMaintenanceAdministrator(ctx.pgTenant.tenantRole);

        if (
          input.effectiveFrom
          && input.effectiveTo
          && input.effectiveTo < input.effectiveFrom
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Coverage end date cannot be before start date",
          });
        }

        return withTenantTransaction(
          ctx.pgTenant.tenantId,
          async tx => {
            const policyRows = await tx<{
              id: string;
              branchId: string | null;
            }[]>`
              SELECT
                id::text AS "id",
                branch_id::text AS "branchId"
              FROM service_policies
              WHERE id = ${input.policyId}::uuid
              FOR UPDATE
            `;

            const policy = policyRows[0];
            if (!policy) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Canonical service policy was not found",
              });
            }

            const uniqueIds = [...new Set(input.assetIds)];
            if (uniqueIds.length > 0) {
              const assetRows = await tx<{
                id: string;
                branchId: string;
              }[]>`
                SELECT
                  id::text AS "id",
                  branch_id::text AS "branchId"
                FROM assets
                WHERE id = ANY(${uniqueIds}::uuid[])
                  AND lifecycle_status <> 'retired'
              `;

              if (assetRows.length !== uniqueIds.length) {
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message:
                    "One or more policy assets are missing or retired",
                });
              }

              if (
                policy.branchId
                && assetRows.some(row => row.branchId !== policy.branchId)
              ) {
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message:
                    "Policy coverage cannot include assets from another branch",
                });
              }
            }

            await tx`
              DELETE FROM service_policy_assets
              WHERE policy_id = ${input.policyId}::uuid
            `;

            for (const assetId of uniqueIds) {
              await tx`
                INSERT INTO service_policy_assets (
                  tenant_id,
                  policy_id,
                  asset_id,
                  coverage_status,
                  coverage_notes,
                  effective_from,
                  effective_to
                )
                VALUES (
                  ${ctx.pgTenant.tenantId}::uuid,
                  ${input.policyId}::uuid,
                  ${assetId}::uuid,
                  'included',
                  ${input.coverageNotes ?? null},
                  ${input.effectiveFrom ?? null}::date,
                  ${input.effectiveTo ?? null}::date
                )
              `;
            }

            return {
              policyId: input.policyId,
              assetCount: uniqueIds.length,
            };
          },
        );
      }),

  canonicalCreate:
    pgProtectedProcedure
      .input(
        z.object({
          workOrderNumber: z.string().trim().min(1).max(64).optional(),
          title: z.string().trim().min(1).max(255),
          maintenanceType: maintenanceTypeSchema.default("preventive"),
          branchId: z.string().uuid(),
          policyId: z.string().uuid().optional(),
          serviceTicketId: z.string().uuid().optional(),
          branchSystemId: z.string().uuid().optional(),
          objective: z.string().trim().max(10000).optional(),
          scheduledStart: z.coerce.date().optional(),
          scheduledEnd: z.coerce.date().optional(),
          assignedToUserId: z.string().uuid().optional(),
          customerContactName: z.string().trim().max(255).optional(),
          assetIds: z.array(z.string().uuid()).max(5000).default([]),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        requireMaintenanceAdministrator(ctx.pgTenant.tenantRole);

        if (
          input.scheduledStart
          && input.scheduledEnd
          && input.scheduledEnd < input.scheduledStart
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Scheduled end cannot be before scheduled start",
          });
        }

        return withTenantTransaction(
          ctx.pgTenant.tenantId,
          async tx => {
            await validateBranch(tx, input.branchId);

            if (input.policyId) {
              await validatePolicyForBranch(
                tx,
                input.policyId,
                input.branchId,
                false,
              );
            }

            if (input.assignedToUserId) {
              await requireActiveTenantMember(
                tx,
                ctx.pgTenant.tenantId,
                input.assignedToUserId,
              );
            }

            if (input.branchSystemId) {
              const systems = await tx<{ id: string }[]>`
                SELECT id::text AS "id"
                FROM branch_systems
                WHERE id = ${input.branchSystemId}::uuid
                  AND branch_id = ${input.branchId}::uuid
                LIMIT 1
              `;
              if (systems.length !== 1) {
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message:
                    "Selected system is not enabled for the maintenance branch",
                });
              }
            }

            if (input.serviceTicketId) {
              const tickets = await tx<{ id: string }[]>`
                SELECT id::text AS "id"
                FROM service_tickets
                WHERE id = ${input.serviceTicketId}::uuid
                  AND branch_id = ${input.branchId}::uuid
                LIMIT 1
              `;
              if (tickets.length !== 1) {
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message:
                    "Selected ticket does not belong to the maintenance branch",
                });
              }
            }

            const validatedAssets = await validateAssetIds(
              tx,
              input.branchId,
              input.assetIds,
            );

            const coverageMode = input.policyId
              ? await validatePolicyCoverageIfMapped(
                  tx,
                  input.policyId,
                  input.assetIds,
                )
              : "not_applicable" as const;

            const actorUserId = await resolveActorUserId(
              tx,
              ctx.pgTenant.tenantId,
              ctx.pgTenant.externalSubject,
            );

            const rows = await tx<{
              id: string;
              workOrderNumber: string;
              status: string;
            }[]>`
              INSERT INTO maintenance_work_orders (
                tenant_id,
                branch_id,
                policy_id,
                service_ticket_id,
                branch_system_id,
                work_order_number,
                title,
                maintenance_type,
                status,
                objective,
                scheduled_start,
                scheduled_end,
                assigned_to_user_id,
                created_by_user_id,
                customer_contact_name
              )
              VALUES (
                ${ctx.pgTenant.tenantId}::uuid,
                ${input.branchId}::uuid,
                ${input.policyId ?? null}::uuid,
                ${input.serviceTicketId ?? null}::uuid,
                ${input.branchSystemId ?? null}::uuid,
                ${input.workOrderNumber ?? `WO-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`},
                ${input.title},
                ${input.maintenanceType},
                'draft',
                ${input.objective ?? null},
                ${input.scheduledStart ?? null},
                ${input.scheduledEnd ?? null},
                ${input.assignedToUserId ?? null}::uuid,
                ${actorUserId}::uuid,
                ${input.customerContactName ?? null}
              )
              RETURNING
                id::text AS "id",
                work_order_number AS "workOrderNumber",
                status
            `;

            const workOrder = rows[0]!;

            let sequence = 1;
            for (const asset of validatedAssets.sort((a, b) =>
              a.assetCode.localeCompare(b.assetCode)
            )) {
              await tx`
                INSERT INTO maintenance_work_order_assets (
                  tenant_id,
                  work_order_id,
                  asset_id,
                  sequence
                )
                VALUES (
                  ${ctx.pgTenant.tenantId}::uuid,
                  ${workOrder.id}::uuid,
                  ${asset.id}::uuid,
                  ${sequence++}
                )
              `;
            }

            await addWorkOrderEvent(tx, {
              tenantId: ctx.pgTenant.tenantId,
              workOrderId: workOrder.id,
              eventType: "created",
              actorUserId,
              actorName: actorName(ctx),
              message: `Maintenance work order ${workOrder.workOrderNumber} created`,
              metadata: {
                maintenanceType: input.maintenanceType,
                policyId: input.policyId ?? null,
                assetCount: validatedAssets.length,
                coverageMode,
              },
            });

            return {
              ...workOrder,
              assetCount: validatedAssets.length,
              coverageMode,
            };
          },
        );
      }),

  canonicalAddAssets:
    pgProtectedProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          assetIds: z.array(z.string().uuid()).min(1).max(5000),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        requireMaintenanceAdministrator(ctx.pgTenant.tenantRole);

        return withTenantTransaction(
          ctx.pgTenant.tenantId,
          async tx => {
            const workOrder = await lockWorkOrder(tx, input.id);
            if (!["draft", "planned"].includes(workOrder.status)) {
              throw new TRPCError({
                code: "CONFLICT",
                message: "Assets can only be added before maintenance execution starts",
              });
            }

            const assets = await validateAssetIds(
              tx,
              workOrder.branchId,
              input.assetIds,
            );

            if (workOrder.policyId) {
              await validatePolicyCoverageIfMapped(
                tx,
                workOrder.policyId,
                input.assetIds,
              );
            }

            const sequenceRows = await tx<{ nextSequence: number }[]>`
              SELECT COALESCE(max(sequence), 0)::int + 1 AS "nextSequence"
              FROM maintenance_work_order_assets
              WHERE work_order_id = ${input.id}::uuid
            `;
            let sequence = sequenceRows[0]?.nextSequence ?? 1;

            let inserted = 0;
            for (const asset of assets.sort((a, b) =>
              a.assetCode.localeCompare(b.assetCode)
            )) {
              const result = await tx`
                INSERT INTO maintenance_work_order_assets (
                  tenant_id,
                  work_order_id,
                  asset_id,
                  sequence
                )
                VALUES (
                  ${ctx.pgTenant.tenantId}::uuid,
                  ${input.id}::uuid,
                  ${asset.id}::uuid,
                  ${sequence++}
                )
                ON CONFLICT (
                  tenant_id,
                  work_order_id,
                  asset_id
                ) DO NOTHING
                RETURNING id
              `;
              inserted += result.length;
            }

            const actorUserId = await resolveActorUserId(
              tx,
              ctx.pgTenant.tenantId,
              ctx.pgTenant.externalSubject,
            );

            await addWorkOrderEvent(tx, {
              tenantId: ctx.pgTenant.tenantId,
              workOrderId: input.id,
              eventType: "asset_added",
              actorUserId,
              actorName: actorName(ctx),
              message: `${inserted} maintenance asset(s) added`,
              metadata: { requested: input.assetIds.length, inserted },
            });

            return { inserted };
          },
        );
      }),

  canonicalPlan:
    pgProtectedProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          scheduledStart: z.coerce.date(),
          scheduledEnd: z.coerce.date().optional(),
          assignedToUserId: z.string().uuid().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        requireMaintenanceAdministrator(ctx.pgTenant.tenantRole);

        if (
          input.scheduledEnd
          && input.scheduledEnd < input.scheduledStart
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Scheduled end cannot be before scheduled start",
          });
        }

        return withTenantTransaction(
          ctx.pgTenant.tenantId,
          async tx => {
            const workOrder = await lockWorkOrder(tx, input.id);
            if (workOrder.status !== "draft") {
              throw new TRPCError({
                code: "CONFLICT",
                message: `Work order cannot be planned from ${workOrder.status}`,
              });
            }

            if (input.assignedToUserId) {
              await requireActiveTenantMember(
                tx,
                ctx.pgTenant.tenantId,
                input.assignedToUserId,
              );
            }

            const assetCountRows = await tx<{ count: number }[]>`
              SELECT count(*)::int AS "count"
              FROM maintenance_work_order_assets
              WHERE work_order_id = ${input.id}::uuid
            `;
            if ((assetCountRows[0]?.count ?? 0) === 0) {
              throw new TRPCError({
                code: "CONFLICT",
                message: "Work order requires at least one asset before planning",
              });
            }

            await tx`
              UPDATE maintenance_work_orders
              SET
                status = 'planned',
                scheduled_start = ${input.scheduledStart},
                scheduled_end = ${input.scheduledEnd ?? null},
                assigned_to_user_id = COALESCE(
                  ${input.assignedToUserId ?? null}::uuid,
                  assigned_to_user_id
                ),
                updated_at = now()
              WHERE id = ${input.id}::uuid
            `;

            const actorUserId = await resolveActorUserId(
              tx,
              ctx.pgTenant.tenantId,
              ctx.pgTenant.externalSubject,
            );
            await addWorkOrderEvent(tx, {
              tenantId: ctx.pgTenant.tenantId,
              workOrderId: input.id,
              eventType: "planned",
              actorUserId,
              actorName: actorName(ctx),
              message: "Maintenance work order planned",
              metadata: {
                scheduledStart: input.scheduledStart.toISOString(),
                scheduledEnd: input.scheduledEnd?.toISOString() ?? null,
              },
            });

            return { success: true };
          },
        );
      }),

  canonicalStart:
    pgProtectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        return withTenantTransaction(
          ctx.pgTenant.tenantId,
          async tx => {
            const workOrder = await lockWorkOrder(tx, input.id);
            if (workOrder.status !== "planned") {
              throw new TRPCError({
                code: "CONFLICT",
                message: `Work order cannot start from ${workOrder.status}`,
              });
            }

            if (!workOrder.assignedToUserId) {
              throw new TRPCError({
                code: "CONFLICT",
                message: "Work order requires an assigned technician before starting",
              });
            }

            await requireActiveTenantMember(
              tx,
              ctx.pgTenant.tenantId,
              workOrder.assignedToUserId,
            );

            if (workOrder.policyId) {
              await validatePolicyForBranch(
                tx,
                workOrder.policyId,
                workOrder.branchId,
                true,
              );
            }

            await tx`
              UPDATE maintenance_work_orders
              SET
                status = 'in_progress',
                started_at = COALESCE(started_at, now()),
                updated_at = now()
              WHERE id = ${input.id}::uuid
            `;

            const actorUserId = await resolveActorUserId(
              tx,
              ctx.pgTenant.tenantId,
              ctx.pgTenant.externalSubject,
            );
            await addWorkOrderEvent(tx, {
              tenantId: ctx.pgTenant.tenantId,
              workOrderId: input.id,
              eventType: "started",
              actorUserId,
              actorName: actorName(ctx),
              message: "Maintenance execution started",
            });

            return { success: true };
          },
        );
      }),

  canonicalUpdateAsset:
    pgProtectedProcedure
      .input(
        z.object({
          workOrderId: z.string().uuid(),
          workOrderAssetId: z.string().uuid(),
          status: workOrderAssetStatusSchema,
          conditionBefore: z.string().trim().max(10000).optional(),
          conditionAfter: z.string().trim().max(10000).optional(),
          workPerformed: z.string().trim().max(20000).optional(),
          technicianNotes: z.string().trim().max(10000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        return withTenantTransaction(
          ctx.pgTenant.tenantId,
          async tx => {
            const workOrder = await lockWorkOrder(tx, input.workOrderId);
            if (workOrder.status !== "in_progress") {
              throw new TRPCError({
                code: "CONFLICT",
                message: "Asset execution can only be updated while work is in progress",
              });
            }

            const rows = await tx<{ id: string; assetCode: string }[]>`
              SELECT
                woa.id::text AS "id",
                a.asset_code AS "assetCode"
              FROM maintenance_work_order_assets woa
              JOIN assets a
                ON a.id = woa.asset_id
                AND a.tenant_id = woa.tenant_id
              WHERE woa.id = ${input.workOrderAssetId}::uuid
                AND woa.work_order_id = ${input.workOrderId}::uuid
              FOR UPDATE OF woa
            `;

            const item = rows[0];
            if (!item) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Maintenance work order asset was not found",
              });
            }

            const isTerminal = [
              "inspected",
              "serviced",
              "skipped",
              "follow_up_required",
            ].includes(input.status);

            await tx`
              UPDATE maintenance_work_order_assets
              SET
                status = ${input.status},
                condition_before = COALESCE(
                  ${input.conditionBefore ?? null},
                  condition_before
                ),
                condition_after = COALESCE(
                  ${input.conditionAfter ?? null},
                  condition_after
                ),
                work_performed = COALESCE(
                  ${input.workPerformed ?? null},
                  work_performed
                ),
                technician_notes = COALESCE(
                  ${input.technicianNotes ?? null},
                  technician_notes
                ),
                started_at = COALESCE(started_at, now()),
                completed_at = CASE
                  WHEN ${isTerminal} THEN COALESCE(completed_at, now())
                  ELSE completed_at
                END,
                updated_at = now()
              WHERE id = ${input.workOrderAssetId}::uuid
            `;

            const actorUserId = await resolveActorUserId(
              tx,
              ctx.pgTenant.tenantId,
              ctx.pgTenant.externalSubject,
            );
            await addWorkOrderEvent(tx, {
              tenantId: ctx.pgTenant.tenantId,
              workOrderId: input.workOrderId,
              eventType: "asset_updated",
              actorUserId,
              actorName: actorName(ctx),
              message: `${item.assetCode} updated to ${input.status}`,
              metadata: {
                workOrderAssetId: input.workOrderAssetId,
                assetCode: item.assetCode,
                status: input.status,
              },
            });

            return { success: true };
          },
        );
      }),

  canonicalAddFinding:
    pgProtectedProcedure
      .input(
        z.object({
          workOrderId: z.string().uuid(),
          workOrderAssetId: z.string().uuid().optional(),
          findingType: findingTypeSchema.default("anomaly"),
          severity: findingSeveritySchema.default("medium"),
          status: findingStatusSchema.default("open"),
          title: z.string().trim().min(1).max(255),
          description: z.string().trim().max(20000).optional(),
          diagnosis: z.string().trim().max(20000).optional(),
          actionTaken: z.string().trim().max(20000).optional(),
          recommendation: z.string().trim().max(20000).optional(),
          requiresFollowUp: z.boolean().default(false),
          capexRecommended: z.boolean().default(false),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        return withTenantTransaction(
          ctx.pgTenant.tenantId,
          async tx => {
            const workOrder = await lockWorkOrder(tx, input.workOrderId);
            if (workOrder.status !== "in_progress") {
              throw new TRPCError({
                code: "CONFLICT",
                message: "Findings can only be added while maintenance is in progress",
              });
            }

            if (input.workOrderAssetId) {
              const assetRows = await tx<{ id: string }[]>`
                SELECT id::text AS "id"
                FROM maintenance_work_order_assets
                WHERE id = ${input.workOrderAssetId}::uuid
                  AND work_order_id = ${input.workOrderId}::uuid
                LIMIT 1
              `;
              if (assetRows.length !== 1) {
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message: "Finding asset is not part of this maintenance work order",
                });
              }
            }

            const rows = await tx<{ id: string }[]>`
              INSERT INTO maintenance_findings (
                tenant_id,
                work_order_id,
                work_order_asset_id,
                finding_type,
                severity,
                status,
                title,
                description,
                diagnosis,
                action_taken,
                recommendation,
                requires_follow_up,
                capex_recommended
              )
              VALUES (
                ${ctx.pgTenant.tenantId}::uuid,
                ${input.workOrderId}::uuid,
                ${input.workOrderAssetId ?? null}::uuid,
                ${input.findingType},
                ${input.severity},
                ${input.status},
                ${input.title},
                ${input.description ?? null},
                ${input.diagnosis ?? null},
                ${input.actionTaken ?? null},
                ${input.recommendation ?? null},
                ${input.requiresFollowUp},
                ${input.capexRecommended}
              )
              RETURNING id::text AS "id"
            `;

            const finding = rows[0]!;
            const actorUserId = await resolveActorUserId(
              tx,
              ctx.pgTenant.tenantId,
              ctx.pgTenant.externalSubject,
            );
            await addWorkOrderEvent(tx, {
              tenantId: ctx.pgTenant.tenantId,
              workOrderId: input.workOrderId,
              eventType: "finding_added",
              actorUserId,
              actorName: actorName(ctx),
              message: input.title,
              metadata: {
                findingId: finding.id,
                severity: input.severity,
                findingType: input.findingType,
                requiresFollowUp: input.requiresFollowUp,
                capexRecommended: input.capexRecommended,
              },
            });

            return finding;
          },
        );
      }),

  canonicalAddEvidenceReference:
    pgProtectedProcedure
      .input(
        z.object({
          workOrderId: z.string().uuid(),
          workOrderAssetId: z.string().uuid().optional(),
          findingId: z.string().uuid().optional(),
          evidencePhase: evidencePhaseSchema.default("general"),
          mediaType: mediaTypeSchema.default("photo"),
          fileName: z.string().trim().min(1).max(255),
          mimeType: z.string().trim().max(128).optional(),
          storageKey: z.string().trim().min(1).max(1024),
          fileUrl: z.string().trim().max(5000).optional(),
          caption: z.string().trim().max(5000).optional(),
          takenAt: z.coerce.date().optional(),
          sortOrder: z.number().int().min(0).max(100000).default(0),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        return withTenantTransaction(
          ctx.pgTenant.tenantId,
          async tx => {
            const workOrder = await lockWorkOrder(tx, input.workOrderId);
            if (!["in_progress", "completed"].includes(workOrder.status)) {
              throw new TRPCError({
                code: "CONFLICT",
                message:
                  "Maintenance evidence can only be attached during or after execution",
              });
            }

            if (input.workOrderAssetId) {
              const assetRows = await tx<{ id: string }[]>`
                SELECT id::text AS "id"
                FROM maintenance_work_order_assets
                WHERE id = ${input.workOrderAssetId}::uuid
                  AND work_order_id = ${input.workOrderId}::uuid
                LIMIT 1
              `;
              if (assetRows.length !== 1) {
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message: "Evidence asset is not part of this maintenance work order",
                });
              }
            }

            if (input.findingId) {
              const findingRows = await tx<{ id: string }[]>`
                SELECT id::text AS "id"
                FROM maintenance_findings
                WHERE id = ${input.findingId}::uuid
                  AND work_order_id = ${input.workOrderId}::uuid
                LIMIT 1
              `;
              if (findingRows.length !== 1) {
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message: "Evidence finding is not part of this maintenance work order",
                });
              }
            }

            const uploaderUserId = await resolveActorUserId(
              tx,
              ctx.pgTenant.tenantId,
              ctx.pgTenant.externalSubject,
            );

            const rows = await tx<{ id: string }[]>`
              INSERT INTO maintenance_evidence (
                tenant_id,
                work_order_id,
                work_order_asset_id,
                finding_id,
                evidence_phase,
                media_type,
                file_name,
                mime_type,
                storage_key,
                file_url,
                caption,
                taken_at,
                uploaded_by_user_id,
                sort_order
              )
              VALUES (
                ${ctx.pgTenant.tenantId}::uuid,
                ${input.workOrderId}::uuid,
                ${input.workOrderAssetId ?? null}::uuid,
                ${input.findingId ?? null}::uuid,
                ${input.evidencePhase},
                ${input.mediaType},
                ${input.fileName},
                ${input.mimeType ?? null},
                ${input.storageKey},
                ${input.fileUrl ?? null},
                ${input.caption ?? null},
                ${input.takenAt ?? null},
                ${uploaderUserId}::uuid,
                ${input.sortOrder}
              )
              RETURNING id::text AS "id"
            `;

            const evidence = rows[0]!;
            await addWorkOrderEvent(tx, {
              tenantId: ctx.pgTenant.tenantId,
              workOrderId: input.workOrderId,
              eventType: "evidence_added",
              actorUserId: uploaderUserId,
              actorName: actorName(ctx),
              message: `${input.evidencePhase} evidence added: ${input.fileName}`,
              metadata: {
                evidenceId: evidence.id,
                workOrderAssetId: input.workOrderAssetId ?? null,
                findingId: input.findingId ?? null,
                phase: input.evidencePhase,
                mediaType: input.mediaType,
              },
            });

            return evidence;
          },
        );
      }),

  canonicalComplete:
    pgProtectedProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          summary: z.string().trim().min(1).max(20000),
          generalFindings: z.string().trim().max(20000).optional(),
          correctiveActions: z.string().trim().max(20000).optional(),
          recommendations: z.string().trim().max(20000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        return withTenantTransaction(
          ctx.pgTenant.tenantId,
          async tx => {
            const workOrder = await lockWorkOrder(tx, input.id);
            if (workOrder.status !== "in_progress") {
              throw new TRPCError({
                code: "CONFLICT",
                message: `Work order cannot complete from ${workOrder.status}`,
              });
            }

            const counts = await tx<{
              total: number;
              pending: number;
            }[]>`
              SELECT
                count(*)::int AS "total",
                count(*) FILTER (
                  WHERE status = 'pending'
                )::int AS "pending"
              FROM maintenance_work_order_assets
              WHERE work_order_id = ${input.id}::uuid
            `;

            if ((counts[0]?.total ?? 0) === 0) {
              throw new TRPCError({
                code: "CONFLICT",
                message: "Work order has no maintenance assets",
              });
            }

            if ((counts[0]?.pending ?? 0) > 0) {
              throw new TRPCError({
                code: "CONFLICT",
                message:
                  "Every maintenance asset must be inspected, serviced, skipped, or marked for follow-up before completion",
              });
            }

            await tx`
              UPDATE maintenance_work_orders
              SET
                status = 'completed',
                completed_at = COALESCE(completed_at, now()),
                summary = ${input.summary},
                general_findings = ${input.generalFindings ?? null},
                corrective_actions = ${input.correctiveActions ?? null},
                recommendations = ${input.recommendations ?? null},
                updated_at = now()
              WHERE id = ${input.id}::uuid
            `;

            const actorUserId = await resolveActorUserId(
              tx,
              ctx.pgTenant.tenantId,
              ctx.pgTenant.externalSubject,
            );
            await addWorkOrderEvent(tx, {
              tenantId: ctx.pgTenant.tenantId,
              workOrderId: input.id,
              eventType: "completed",
              actorUserId,
              actorName: actorName(ctx),
              message: "Maintenance execution completed",
              metadata: {
                summary: input.summary,
              },
            });

            return { success: true };
          },
        );
      }),

  canonicalCustomerAccept:
    pgProtectedProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          note: z.string().trim().max(10000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        return withTenantTransaction(
          ctx.pgTenant.tenantId,
          async tx => {
            const workOrder = await lockWorkOrder(tx, input.id);
            if (workOrder.status !== "completed") {
              throw new TRPCError({
                code: "CONFLICT",
                message: "Only completed maintenance can be accepted by the customer",
              });
            }

            await tx`
              UPDATE maintenance_work_orders
              SET
                customer_accepted_at = COALESCE(customer_accepted_at, now()),
                customer_acceptance_notes = ${input.note ?? null},
                updated_at = now()
              WHERE id = ${input.id}::uuid
            `;

            const actorUserId = await resolveActorUserId(
              tx,
              ctx.pgTenant.tenantId,
              ctx.pgTenant.externalSubject,
            );
            await addWorkOrderEvent(tx, {
              tenantId: ctx.pgTenant.tenantId,
              workOrderId: input.id,
              eventType: "customer_accepted",
              actorUserId,
              actorName: actorName(ctx),
              message: "Customer acceptance recorded",
              metadata: { note: input.note ?? null },
            });

            return { success: true };
          },
        );
      }),
});
