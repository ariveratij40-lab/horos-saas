import { randomUUID } from "node:crypto";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

import {
  pgProtectedProcedure,
  router,
} from "../_core/trpc";

import {
  withTenantTransaction,
} from "../db.pg";

const requestTypeSchema = z.enum([
  "service_attention",
  "meeting",
  "event_service",
  "infrastructure_assessment",
  "inventory_capture",
  "other",
]);

const requestStatusSchema = z.enum([
  "draft",
  "submitted",
  "needs_information",
  "ready_for_review",
  "under_review",
  "completed",
  "cancelled",
  "rejected",
]);

const clarityStatusSchema = z.enum([
  "not_evaluated",
  "incomplete",
  "needs_clarification",
  "sufficient",
  "confirmed",
]);

const commercialStatusSchema = z.enum([
  "not_required",
  "pending_quote",
  "quoted",
  "pending_authorization",
  "authorized",
  "rejected",
]);

export const serviceRequestsRouter =
  router({

    canonicalList:
      pgProtectedProcedure
        .input(
          z.object({
            status:
              requestStatusSchema.optional(),

            requestType:
              requestTypeSchema.optional(),

            clarityStatus:
              clarityStatusSchema.optional(),

            commercialStatus:
              commercialStatusSchema.optional(),

            branchId:
              z.string().uuid().optional(),

            departmentId:
              z.string().uuid().optional(),
          }).optional(),
        )
        .query(async ({ ctx, input }) => {
          return withTenantTransaction(
            ctx.pgTenant.tenantId,
            async tx => {
              const status =
                input?.status ?? null;

              const requestType =
                input?.requestType ?? null;

              const clarityStatus =
                input?.clarityStatus ?? null;

              const commercialStatus =
                input?.commercialStatus ?? null;

              const branchId =
                input?.branchId ?? null;

              const departmentId =
                input?.departmentId ?? null;

              return tx<{
                id: string;
                requestNumber: string;
                requestType: string;
                status: string;

                title: string;
                description: string | null;

                requesterName: string;
                requesterEmail: string | null;
                requesterPhone: string | null;

                branchId: string | null;
                branchCode: string | null;
                branchName: string | null;

                departmentId: string | null;
                departmentCode: string | null;
                departmentName: string | null;

                branchSystemId: string | null;
                systemCode: string | null;
                systemName: string | null;

                assetId: string | null;
                assetCode: string | null;
                assetManufacturer: string | null;
                assetModel: string | null;

                clarityStatus: string;
                clarityScore: number | null;

                commercialStatus: string;
                estimatedAmount: string | null;

                desiredDate: string | null;
                desiredStartTime: string | null;
                desiredEndTime: string | null;
                remoteAllowed: boolean | null;

                submittedAt: Date | null;
                createdAt: Date;
                updatedAt: Date;
              }[]>`
                SELECT
                  sr.id::text
                    AS "id",

                  sr.request_number
                    AS "requestNumber",

                  sr.request_type
                    AS "requestType",

                  sr.status
                    AS "status",

                  sr.title
                    AS "title",

                  sr.description
                    AS "description",

                  sr.requester_name
                    AS "requesterName",

                  sr.requester_email
                    AS "requesterEmail",

                  sr.requester_phone
                    AS "requesterPhone",

                  sr.branch_id::text
                    AS "branchId",

                  b.code
                    AS "branchCode",

                  b.name
                    AS "branchName",

                  sr.department_id::text
                    AS "departmentId",

                  d.code
                    AS "departmentCode",

                  d.name
                    AS "departmentName",

                  sr.branch_system_id::text
                    AS "branchSystemId",

                  sc.code
                    AS "systemCode",

                  COALESCE(
                    bs.display_name,
                    sc.name
                  )
                    AS "systemName",

                  sr.asset_id::text
                    AS "assetId",

                  a.asset_code
                    AS "assetCode",

                  a.manufacturer
                    AS "assetManufacturer",

                  a.model
                    AS "assetModel",

                  sr.clarity_status
                    AS "clarityStatus",

                  sr.clarity_score
                    AS "clarityScore",

                  sr.commercial_status
                    AS "commercialStatus",

                  sr.estimated_amount::text
                    AS "estimatedAmount",

                  sr.desired_date::text
                    AS "desiredDate",

                  sr.desired_start_time::text
                    AS "desiredStartTime",

                  sr.desired_end_time::text
                    AS "desiredEndTime",

                  sr.remote_allowed
                    AS "remoteAllowed",

                  sr.submitted_at
                    AS "submittedAt",

                  sr.created_at
                    AS "createdAt",

                  sr.updated_at
                    AS "updatedAt"

                FROM service_requests sr

                LEFT JOIN branches b
                  ON b.id =
                    sr.branch_id
                  AND b.tenant_id =
                    sr.tenant_id

                LEFT JOIN departments d
                  ON d.id =
                    sr.department_id
                  AND d.tenant_id =
                    sr.tenant_id

                LEFT JOIN branch_systems bs
                  ON bs.id =
                    sr.branch_system_id
                  AND bs.tenant_id =
                    sr.tenant_id

                LEFT JOIN systems_catalog sc
                  ON sc.id =
                    bs.system_id

                LEFT JOIN assets a
                  ON a.id =
                    sr.asset_id
                  AND a.tenant_id =
                    sr.tenant_id

                WHERE
                  (
                    ${status}::text
                      IS NULL
                    OR sr.status =
                      ${status}
                  )

                  AND (
                    ${requestType}::text
                      IS NULL
                    OR sr.request_type =
                      ${requestType}
                  )

                  AND (
                    ${clarityStatus}::text
                      IS NULL
                    OR sr.clarity_status =
                      ${clarityStatus}
                  )

                  AND (
                    ${commercialStatus}::text
                      IS NULL
                    OR sr.commercial_status =
                      ${commercialStatus}
                  )

                  AND (
                    ${branchId}::uuid
                      IS NULL
                    OR sr.branch_id =
                      ${branchId}::uuid
                  )

                  AND (
                    ${departmentId}::uuid
                      IS NULL
                    OR sr.department_id =
                      ${departmentId}::uuid
                  )

                ORDER BY
                  sr.created_at DESC,
                  sr.request_number DESC
              `;
            },
          );
        }),


    canonicalGetById:
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
                requestNumber: string;
                requestType: string;
                status: string;

                requestedByUserId: string | null;

                requesterName: string;
                requesterEmail: string | null;
                requesterPhone: string | null;

                branchId: string | null;
                branchCode: string | null;
                branchName: string | null;

                departmentId: string | null;
                departmentCode: string | null;
                departmentName: string | null;

                branchSystemId: string | null;
                systemCode: string | null;
                systemName: string | null;

                assetId: string | null;
                assetCode: string | null;
                assetManufacturer: string | null;
                assetModel: string | null;

                title: string;
                description: string | null;

                desiredDate: string | null;
                desiredStartTime: string | null;
                desiredEndTime: string | null;
                remoteAllowed: boolean | null;

                accessRequirements: string | null;
                safetyRequirements: string | null;
                personnelRequirements: string | null;
                certificationRequirements: string | null;
                equipmentRequirements: string | null;
                toolRequirements: string | null;

                clarityStatus: string;
                clarityScore: number | null;
                claritySummary: string | null;
                missingInformation: unknown;

                requesterConfirmedAt: Date | null;

                commercialStatus: string;
                estimatedAmount: string | null;
                quotedAt: Date | null;
                authorizedAt: Date | null;
                rejectedAt: Date | null;
                rejectionReason: string | null;

                submittedAt: Date | null;
                completedAt: Date | null;
                cancelledAt: Date | null;

                createdAt: Date;
                updatedAt: Date;
              }[]>`
                SELECT
                  sr.id::text
                    AS "id",

                  sr.request_number
                    AS "requestNumber",

                  sr.request_type
                    AS "requestType",

                  sr.status
                    AS "status",

                  sr.requested_by_user_id::text
                    AS "requestedByUserId",

                  sr.requester_name
                    AS "requesterName",

                  sr.requester_email
                    AS "requesterEmail",

                  sr.requester_phone
                    AS "requesterPhone",

                  sr.branch_id::text
                    AS "branchId",

                  b.code
                    AS "branchCode",

                  b.name
                    AS "branchName",

                  sr.department_id::text
                    AS "departmentId",

                  d.code
                    AS "departmentCode",

                  d.name
                    AS "departmentName",

                  sr.branch_system_id::text
                    AS "branchSystemId",

                  sc.code
                    AS "systemCode",

                  COALESCE(
                    bs.display_name,
                    sc.name
                  )
                    AS "systemName",

                  sr.asset_id::text
                    AS "assetId",

                  a.asset_code
                    AS "assetCode",

                  a.manufacturer
                    AS "assetManufacturer",

                  a.model
                    AS "assetModel",

                  sr.title
                    AS "title",

                  sr.description
                    AS "description",

                  sr.desired_date::text
                    AS "desiredDate",

                  sr.desired_start_time::text
                    AS "desiredStartTime",

                  sr.desired_end_time::text
                    AS "desiredEndTime",

                  sr.remote_allowed
                    AS "remoteAllowed",

                  sr.access_requirements
                    AS "accessRequirements",

                  sr.safety_requirements
                    AS "safetyRequirements",

                  sr.personnel_requirements
                    AS "personnelRequirements",

                  sr.certification_requirements
                    AS "certificationRequirements",

                  sr.equipment_requirements
                    AS "equipmentRequirements",

                  sr.tool_requirements
                    AS "toolRequirements",

                  sr.clarity_status
                    AS "clarityStatus",

                  sr.clarity_score
                    AS "clarityScore",

                  sr.clarity_summary
                    AS "claritySummary",

                  sr.missing_information
                    AS "missingInformation",

                  sr.requester_confirmed_at
                    AS "requesterConfirmedAt",

                  sr.commercial_status
                    AS "commercialStatus",

                  sr.estimated_amount::text
                    AS "estimatedAmount",

                  sr.quoted_at
                    AS "quotedAt",

                  sr.authorized_at
                    AS "authorizedAt",

                  sr.rejected_at
                    AS "rejectedAt",

                  sr.rejection_reason
                    AS "rejectionReason",

                  sr.submitted_at
                    AS "submittedAt",

                  sr.completed_at
                    AS "completedAt",

                  sr.cancelled_at
                    AS "cancelledAt",

                  sr.created_at
                    AS "createdAt",

                  sr.updated_at
                    AS "updatedAt"

                FROM service_requests sr

                LEFT JOIN branches b
                  ON b.id =
                    sr.branch_id
                  AND b.tenant_id =
                    sr.tenant_id

                LEFT JOIN departments d
                  ON d.id =
                    sr.department_id
                  AND d.tenant_id =
                    sr.tenant_id

                LEFT JOIN branch_systems bs
                  ON bs.id =
                    sr.branch_system_id
                  AND bs.tenant_id =
                    sr.tenant_id

                LEFT JOIN systems_catalog sc
                  ON sc.id =
                    bs.system_id

                LEFT JOIN assets a
                  ON a.id =
                    sr.asset_id
                  AND a.tenant_id =
                    sr.tenant_id

                WHERE
                  sr.id =
                    ${input.id}::uuid

                LIMIT 1
              `;

              if (rows.length !== 1) {
                throw new TRPCError({
                  code: "NOT_FOUND",
                  message:
                    "Service request was not found",
                });
              }

              return rows[0];
            },
          );
        }),


    canonicalCreate:
      pgProtectedProcedure
        .input(
          z.object({
            requestType:
              requestTypeSchema,

            requesterName:
              z.string()
                .trim()
                .min(1)
                .max(255),

            requesterEmail:
              z.string()
                .email()
                .max(320)
                .optional()
                .nullable(),

            requesterPhone:
              z.string()
                .trim()
                .max(64)
                .optional()
                .nullable(),

            title:
              z.string()
                .trim()
                .min(1)
                .max(255),

            description:
              z.string()
                .trim()
                .max(10000)
                .optional()
                .nullable(),

            branchId:
              z.string()
                .uuid()
                .optional()
                .nullable(),

            departmentId:
              z.string()
                .uuid()
                .optional()
                .nullable(),

            branchSystemId:
              z.string()
                .uuid()
                .optional()
                .nullable(),

            assetId:
              z.string()
                .uuid()
                .optional()
                .nullable(),

            desiredDate:
              z.string()
                .date()
                .optional()
                .nullable(),

            desiredStartTime:
              z.string()
                .regex(
                  /^([01]\d|2[0-3]):[0-5]\d$/,
                )
                .optional()
                .nullable(),

            desiredEndTime:
              z.string()
                .regex(
                  /^([01]\d|2[0-3]):[0-5]\d$/,
                )
                .optional()
                .nullable(),

            remoteAllowed:
              z.boolean()
                .optional()
                .default(false),

            accessRequirements:
              z.string()
                .trim()
                .max(5000)
                .optional()
                .nullable(),

            safetyRequirements:
              z.string()
                .trim()
                .max(5000)
                .optional()
                .nullable(),

            personnelRequirements:
              z.string()
                .trim()
                .max(5000)
                .optional()
                .nullable(),

            certificationRequirements:
              z.string()
                .trim()
                .max(5000)
                .optional()
                .nullable(),

            equipmentRequirements:
              z.string()
                .trim()
                .max(5000)
                .optional()
                .nullable(),

            toolRequirements:
              z.string()
                .trim()
                .max(5000)
                .optional()
                .nullable(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          return withTenantTransaction(
            ctx.pgTenant.tenantId,
            async tx => {
              const normalize =
                (
                  value:
                    | string
                    | null
                    | undefined,
                ) => {
                  if (value == null) {
                    return null;
                  }

                  const trimmed =
                    value.trim();

                  return trimmed || null;
                };

              const branchId =
                input.branchId ?? null;

              const departmentId =
                input.departmentId ?? null;

              const branchSystemId =
                input.branchSystemId ?? null;

              const assetId =
                input.assetId ?? null;

              if (branchId) {
                const rows = await tx<{
                  id: string;
                }[]>`
                  SELECT id::text AS "id"
                  FROM branches
                  WHERE id =
                    ${branchId}::uuid
                  LIMIT 1
                `;

                if (rows.length !== 1) {
                  throw new TRPCError({
                    code: "BAD_REQUEST",
                    message:
                      "Branch is not available for this tenant",
                  });
                }
              }

              if (departmentId) {
                const rows = await tx<{
                  id: string;
                }[]>`
                  SELECT id::text AS "id"
                  FROM departments
                  WHERE id =
                    ${departmentId}::uuid
                  LIMIT 1
                `;

                if (rows.length !== 1) {
                  throw new TRPCError({
                    code: "BAD_REQUEST",
                    message:
                      "Department is not available for this tenant",
                  });
                }
              }

              if (branchSystemId) {
                const rows = await tx<{
                  id: string;
                  branchId: string;
                }[]>`
                  SELECT
                    id::text
                      AS "id",
                    branch_id::text
                      AS "branchId"
                  FROM branch_systems
                  WHERE id =
                    ${branchSystemId}::uuid
                  LIMIT 1
                `;

                if (rows.length !== 1) {
                  throw new TRPCError({
                    code: "BAD_REQUEST",
                    message:
                      "System is not available for this tenant",
                  });
                }

                if (
                  branchId
                  && rows[0]?.branchId
                    !== branchId
                ) {
                  throw new TRPCError({
                    code: "BAD_REQUEST",
                    message:
                      "System does not belong to the selected branch",
                  });
                }
              }

              if (assetId) {
                const rows = await tx<{
                  id: string;
                  branchId: string;
                }[]>`
                  SELECT
                    id::text
                      AS "id",
                    branch_id::text
                      AS "branchId"
                  FROM assets
                  WHERE id =
                    ${assetId}::uuid
                  LIMIT 1
                `;

                if (rows.length !== 1) {
                  throw new TRPCError({
                    code: "BAD_REQUEST",
                    message:
                      "Asset is not available for this tenant",
                  });
                }

                if (
                  branchId
                  && rows[0]?.branchId
                    !== branchId
                ) {
                  throw new TRPCError({
                    code: "BAD_REQUEST",
                    message:
                      "Asset does not belong to the selected branch",
                  });
                }
              }

              const requestNumber =
                `SR-${ctx.pgTenant.tenantCode}-${Date.now()}-${randomUUID()
                  .replaceAll("-", "")
                  .slice(0, 6)
                  .toUpperCase()}`;

              const rows = await tx<{
                id: string;
                requestNumber: string;
                requestType: string;
                status: string;
                clarityStatus: string;
                commercialStatus: string;
                createdAt: Date;
              }[]>`
                INSERT INTO service_requests (
                  tenant_id,
                  request_number,
                  request_type,
                  status,
                  requester_name,
                  requester_email,
                  requester_phone,
                  branch_id,
                  department_id,
                  branch_system_id,
                  asset_id,
                  title,
                  description,
                  desired_date,
                  desired_start_time,
                  desired_end_time,
                  remote_allowed,
                  access_requirements,
                  safety_requirements,
                  personnel_requirements,
                  certification_requirements,
                  equipment_requirements,
                  tool_requirements,
                  clarity_status,
                  commercial_status
                )
                VALUES (
                  ${ctx.pgTenant.tenantId}::uuid,
                  ${requestNumber},
                  ${input.requestType},
                  'draft',
                  ${input.requesterName.trim()},
                  ${normalize(
                    input.requesterEmail,
                  )},
                  ${normalize(
                    input.requesterPhone,
                  )},
                  ${branchId}::uuid,
                  ${departmentId}::uuid,
                  ${branchSystemId}::uuid,
                  ${assetId}::uuid,
                  ${input.title.trim()},
                  ${normalize(
                    input.description,
                  )},
                  ${input.desiredDate ?? null}::date,
                  ${input.desiredStartTime ?? null}::time,
                  ${input.desiredEndTime ?? null}::time,
                  ${input.remoteAllowed},
                  ${normalize(
                    input.accessRequirements,
                  )},
                  ${normalize(
                    input.safetyRequirements,
                  )},
                  ${normalize(
                    input.personnelRequirements,
                  )},
                  ${normalize(
                    input.certificationRequirements,
                  )},
                  ${normalize(
                    input.equipmentRequirements,
                  )},
                  ${normalize(
                    input.toolRequirements,
                  )},
                  'not_evaluated',
                  'not_required'
                )
                RETURNING
                  id::text
                    AS "id",
                  request_number
                    AS "requestNumber",
                  request_type
                    AS "requestType",
                  status
                    AS "status",
                  clarity_status
                    AS "clarityStatus",
                  commercial_status
                    AS "commercialStatus",
                  created_at
                    AS "createdAt"
              `;

              if (rows.length !== 1) {
                throw new TRPCError({
                  code:
                    "INTERNAL_SERVER_ERROR",
                  message:
                    "Service request could not be created",
                });
              }

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
                  ${rows[0]!.id}::uuid,
                  'created',
                  ${input.requesterName.trim()},
                  'Service request created',
                  ${JSON.stringify({
                    requestType:
                      input.requestType,
                  })}::jsonb
                )
              `;

              return rows[0]!;
            },
          );
        }),

  });
