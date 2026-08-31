import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  pgProtectedProcedure,
  router,
} from "../_core/trpc";

import {
  withTenantTransaction,
} from "../db.pg";

function requireReviewerRole(
  tenantRole: string,
) {
  if (tenantRole !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Service request review requires tenant administrator access",
    });
  }
}

/**
 * Canonical lifecycle actions for Service Intake.
 *
 * State transitions and their audit events are written in the same
 * PostgreSQL tenant transaction so the request cannot move without
 * its corresponding history entry.
 */
export const serviceRequestWorkflowRouter =
  router({
    canonicalSubmit:
      pgProtectedProcedure
        .input(
          z.object({
            id: z.string().uuid(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          return withTenantTransaction(
            ctx.pgTenant.tenantId,
            async tx => {
              const rows = await tx<{
                id: string;
                requestNumber: string;
                status: string;
                submittedAt: Date;
                updatedAt: Date;
              }[]>`
                UPDATE service_requests
                SET
                  status = 'submitted',
                  submitted_at = now(),
                  updated_at = now()
                WHERE id = ${input.id}::uuid
                  AND status = 'draft'
                RETURNING
                  id::text AS "id",
                  request_number AS "requestNumber",
                  status AS "status",
                  submitted_at AS "submittedAt",
                  updated_at AS "updatedAt"
              `;

              if (rows.length !== 1) {
                const current = await tx<{
                  status: string;
                }[]>`
                  SELECT status AS "status"
                  FROM service_requests
                  WHERE id = ${input.id}::uuid
                  LIMIT 1
                `;

                if (current.length !== 1) {
                  throw new TRPCError({
                    code: "NOT_FOUND",
                    message:
                      "Service request was not found",
                  });
                }

                throw new TRPCError({
                  code: "CONFLICT",
                  message:
                    `Service request cannot be submitted from status ${current[0]!.status}`,
                });
              }

              const actorName =
                ctx.user.name
                ?? ctx.user.email
                ?? "Authenticated user";

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
                  'submitted',
                  ${actorName},
                  'Service request submitted',
                  ${JSON.stringify({
                    fromStatus: "draft",
                    toStatus: "submitted",
                  })}::jsonb
                )
              `;

              return rows[0]!;
            },
          );
        }),

    canonicalCancel:
      pgProtectedProcedure
        .input(
          z.object({
            id: z.string().uuid(),
            reason:
              z.string()
                .trim()
                .min(1)
                .max(1000)
                .optional(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          return withTenantTransaction(
            ctx.pgTenant.tenantId,
            async tx => {
              const rows = await tx<{
                id: string;
                requestNumber: string;
                status: string;
                cancelledAt: Date;
                updatedAt: Date;
              }[]>`
                UPDATE service_requests
                SET
                  status = 'cancelled',
                  cancelled_at = now(),
                  updated_at = now()
                WHERE id = ${input.id}::uuid
                  AND status IN (
                    'draft',
                    'submitted',
                    'needs_information',
                    'ready_for_review'
                  )
                RETURNING
                  id::text AS "id",
                  request_number AS "requestNumber",
                  status AS "status",
                  cancelled_at AS "cancelledAt",
                  updated_at AS "updatedAt"
              `;

              if (rows.length !== 1) {
                const current = await tx<{
                  status: string;
                }[]>`
                  SELECT status AS "status"
                  FROM service_requests
                  WHERE id = ${input.id}::uuid
                  LIMIT 1
                `;

                if (current.length !== 1) {
                  throw new TRPCError({
                    code: "NOT_FOUND",
                    message:
                      "Service request was not found",
                  });
                }

                throw new TRPCError({
                  code: "CONFLICT",
                  message:
                    `Service request cannot be cancelled from status ${current[0]!.status}`,
                });
              }

              const actorName =
                ctx.user.name
                ?? ctx.user.email
                ?? "Authenticated user";

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
                  'cancelled',
                  ${actorName},
                  ${input.reason
                    ? `Service request cancelled: ${input.reason}`
                    : 'Service request cancelled'},
                  ${JSON.stringify({
                    toStatus: "cancelled",
                    reason:
                      input.reason ?? null,
                  })}::jsonb
                )
              `;

              return rows[0]!;
            },
          );
        }),

    canonicalRequestInformation:
      pgProtectedProcedure
        .input(
          z.object({
            id: z.string().uuid(),
            missingInformation:
              z.array(
                z.string()
                  .trim()
                  .min(1)
                  .max(255),
              )
                .min(1)
                .max(25),
            message:
              z.string()
                .trim()
                .min(1)
                .max(2000)
                .optional(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          requireReviewerRole(
            ctx.pgTenant.tenantRole,
          );

          return withTenantTransaction(
            ctx.pgTenant.tenantId,
            async tx => {
              const current = await tx<{
                id: string;
                status: string;
              }[]>`
                SELECT
                  id::text AS "id",
                  status AS "status"
                FROM service_requests
                WHERE id = ${input.id}::uuid
                LIMIT 1
                FOR UPDATE
              `;

              if (current.length !== 1) {
                throw new TRPCError({
                  code: "NOT_FOUND",
                  message:
                    "Service request was not found",
                });
              }

              const fromStatus =
                current[0]!.status;

              if (
                ![
                  "submitted",
                  "needs_information",
                  "ready_for_review",
                ].includes(fromStatus)
              ) {
                throw new TRPCError({
                  code: "CONFLICT",
                  message:
                    `Service request cannot request more information from status ${fromStatus}`,
                });
              }

              const rows = await tx<{
                id: string;
                requestNumber: string;
                status: string;
                clarityStatus: string;
                missingInformation: unknown;
                updatedAt: Date;
              }[]>`
                UPDATE service_requests
                SET
                  status = 'needs_information',
                  clarity_status = 'needs_clarification',
                  clarity_summary =
                    ${input.message ?? null},
                  missing_information =
                    ${JSON.stringify(
                      input.missingInformation,
                    )}::jsonb,
                  requester_confirmed_at = NULL,
                  updated_at = now()
                WHERE id = ${input.id}::uuid
                RETURNING
                  id::text AS "id",
                  request_number AS "requestNumber",
                  status AS "status",
                  clarity_status AS "clarityStatus",
                  missing_information AS "missingInformation",
                  updated_at AS "updatedAt"
              `;

              const actorName =
                ctx.user.name
                ?? ctx.user.email
                ?? "Authenticated user";

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
                  'information_requested',
                  ${actorName},
                  ${input.message
                    ?? 'Additional information requested'},
                  ${JSON.stringify({
                    fromStatus,
                    toStatus:
                      "needs_information",
                    missingInformation:
                      input.missingInformation,
                  })}::jsonb
                )
              `;

              return rows[0]!;
            },
          );
        }),

    canonicalMarkReadyForReview:
      pgProtectedProcedure
        .input(
          z.object({
            id: z.string().uuid(),
            clarityScore:
              z.number()
                .int()
                .min(0)
                .max(100)
                .optional(),
            summary:
              z.string()
                .trim()
                .min(1)
                .max(2000)
                .optional(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          requireReviewerRole(
            ctx.pgTenant.tenantRole,
          );

          return withTenantTransaction(
            ctx.pgTenant.tenantId,
            async tx => {
              const current = await tx<{
                id: string;
                status: string;
              }[]>`
                SELECT
                  id::text AS "id",
                  status AS "status"
                FROM service_requests
                WHERE id = ${input.id}::uuid
                LIMIT 1
                FOR UPDATE
              `;

              if (current.length !== 1) {
                throw new TRPCError({
                  code: "NOT_FOUND",
                  message:
                    "Service request was not found",
                });
              }

              const fromStatus =
                current[0]!.status;

              if (
                ![
                  "submitted",
                  "needs_information",
                ].includes(fromStatus)
              ) {
                throw new TRPCError({
                  code: "CONFLICT",
                  message:
                    `Service request cannot be marked ready for review from status ${fromStatus}`,
                });
              }

              const rows = await tx<{
                id: string;
                requestNumber: string;
                status: string;
                clarityStatus: string;
                clarityScore: number | null;
                updatedAt: Date;
              }[]>`
                UPDATE service_requests
                SET
                  status = 'ready_for_review',
                  clarity_status = 'sufficient',
                  clarity_score = COALESCE(
                    ${input.clarityScore ?? null}::integer,
                    clarity_score
                  ),
                  clarity_summary = COALESCE(
                    ${input.summary ?? null}::text,
                    clarity_summary
                  ),
                  missing_information = '[]'::jsonb,
                  updated_at = now()
                WHERE id = ${input.id}::uuid
                RETURNING
                  id::text AS "id",
                  request_number AS "requestNumber",
                  status AS "status",
                  clarity_status AS "clarityStatus",
                  clarity_score AS "clarityScore",
                  updated_at AS "updatedAt"
              `;

              const actorName =
                ctx.user.name
                ?? ctx.user.email
                ?? "Authenticated user";

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
                  'clarity_evaluated',
                  ${actorName},
                  ${input.summary
                    ?? 'Service request clarity marked sufficient'},
                  ${JSON.stringify({
                    fromStatus,
                    toStatus:
                      "ready_for_review",
                    clarityStatus:
                      "sufficient",
                    clarityScore:
                      input.clarityScore ?? null,
                  })}::jsonb
                )
              `;

              return rows[0]!;
            },
          );
        }),

    canonicalEvents:
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
              const request = await tx<{
                id: string;
              }[]>`
                SELECT id::text AS "id"
                FROM service_requests
                WHERE id = ${input.id}::uuid
                LIMIT 1
              `;

              if (request.length !== 1) {
                throw new TRPCError({
                  code: "NOT_FOUND",
                  message:
                    "Service request was not found",
                });
              }

              return tx<{
                id: string;
                eventType: string;
                actorName: string | null;
                message: string | null;
                metadata: unknown;
                createdAt: Date;
              }[]>`
                SELECT
                  id::text AS "id",
                  event_type AS "eventType",
                  actor_name AS "actorName",
                  message AS "message",
                  metadata AS "metadata",
                  created_at AS "createdAt"
                FROM service_request_events
                WHERE service_request_id =
                  ${input.id}::uuid
                ORDER BY created_at ASC, id ASC
              `;
            },
          );
        }),
  });
