import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  pgProtectedProcedure,
  router,
} from "../_core/trpc";
import {
  withTenantTransaction,
} from "../db.pg";

function requireReviewerRole(tenantRole: string) {
  if (tenantRole !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Service request review requires tenant administrator access",
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

/**
 * Administrative review actions that occur after Service Intake clarity
 * evaluation. This router is deliberately separate from requester actions.
 *
 * The existing 0036 event taxonomy has no dedicated review_started or
 * authorization_requested values. Until a future taxonomy migration is
 * introduced, those transitions reuse an existing compatible event type and
 * distinguish the action in metadata. Applied migration 0036 is not rewritten.
 */
export const serviceRequestReviewRouter =
  router({
    canonicalStartReview:
      pgProtectedProcedure
        .input(
          z.object({
            id: z.string().uuid(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          requireReviewerRole(
            ctx.pgTenant.tenantRole,
          );

          return withTenantTransaction(
            ctx.pgTenant.tenantId,
            async tx => {
              const rows = await tx<{
                id: string;
                requestNumber: string;
                status: string;
                updatedAt: Date;
              }[]>`
                UPDATE service_requests
                SET
                  status = 'under_review',
                  updated_at = now()
                WHERE id = ${input.id}::uuid
                  AND status = 'ready_for_review'
                  AND clarity_status IN (
                    'sufficient',
                    'confirmed'
                  )
                RETURNING
                  id::text AS "id",
                  request_number AS "requestNumber",
                  status AS "status",
                  updated_at AS "updatedAt"
              `;

              if (rows.length !== 1) {
                const current = await tx<{
                  status: string;
                  clarityStatus: string;
                }[]>`
                  SELECT
                    status AS "status",
                    clarity_status AS "clarityStatus"
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
                    `Service request cannot start review from status ${current[0]!.status} with clarity ${current[0]!.clarityStatus}`,
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
                  'clarity_evaluated',
                  ${actorName(ctx)},
                  'Service request review started',
                  ${JSON.stringify({
                    action: "review_started",
                    fromStatus:
                      "ready_for_review",
                    toStatus:
                      "under_review",
                  })}::jsonb
                )
              `;

              return rows[0]!;
            },
          );
        }),

    canonicalRequestQuote:
      pgProtectedProcedure
        .input(
          z.object({
            id: z.string().uuid(),
            estimatedAmount:
              z.number()
                .finite()
                .nonnegative()
                .max(999999999999.99)
                .optional(),
            note:
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
              const rows = await tx<{
                id: string;
                requestNumber: string;
                status: string;
                commercialStatus: string;
                estimatedAmount: string | null;
                updatedAt: Date;
              }[]>`
                UPDATE service_requests
                SET
                  commercial_status = 'pending_quote',
                  estimated_amount = COALESCE(
                    ${input.estimatedAmount ?? null}::numeric,
                    estimated_amount
                  ),
                  updated_at = now()
                WHERE id = ${input.id}::uuid
                  AND status = 'under_review'
                  AND commercial_status = 'not_required'
                RETURNING
                  id::text AS "id",
                  request_number AS "requestNumber",
                  status AS "status",
                  commercial_status AS "commercialStatus",
                  estimated_amount::text AS "estimatedAmount",
                  updated_at AS "updatedAt"
              `;

              if (rows.length !== 1) {
                const current = await tx<{
                  status: string;
                  commercialStatus: string;
                }[]>`
                  SELECT
                    status AS "status",
                    commercial_status AS "commercialStatus"
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
                    `Quote cannot be requested from status ${current[0]!.status} with commercial status ${current[0]!.commercialStatus}`,
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
                  'quote_requested',
                  ${actorName(ctx)},
                  ${input.note ?? 'Quote requested for service request'},
                  ${JSON.stringify({
                    action: "quote_requested",
                    status: "under_review",
                    commercialStatus:
                      "pending_quote",
                    estimatedAmount:
                      input.estimatedAmount ?? null,
                  })}::jsonb
                )
              `;

              return rows[0]!;
            },
          );
        }),

    canonicalRegisterQuote:
      pgProtectedProcedure
        .input(
          z.object({
            id: z.string().uuid(),
            amount:
              z.number()
                .finite()
                .positive()
                .max(999999999999.99),
            reference:
              z.string()
                .trim()
                .min(1)
                .max(255)
                .optional(),
            note:
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
              const rows = await tx<{
                id: string;
                requestNumber: string;
                status: string;
                commercialStatus: string;
                estimatedAmount: string;
                quotedAt: Date;
                updatedAt: Date;
              }[]>`
                UPDATE service_requests
                SET
                  commercial_status = 'quoted',
                  estimated_amount = ${input.amount}::numeric,
                  quoted_at = now(),
                  updated_at = now()
                WHERE id = ${input.id}::uuid
                  AND status = 'under_review'
                  AND commercial_status = 'pending_quote'
                RETURNING
                  id::text AS "id",
                  request_number AS "requestNumber",
                  status AS "status",
                  commercial_status AS "commercialStatus",
                  estimated_amount::text AS "estimatedAmount",
                  quoted_at AS "quotedAt",
                  updated_at AS "updatedAt"
              `;

              if (rows.length !== 1) {
                const current = await tx<{
                  status: string;
                  commercialStatus: string;
                }[]>`
                  SELECT
                    status AS "status",
                    commercial_status AS "commercialStatus"
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
                    `Quote cannot be registered from status ${current[0]!.status} with commercial status ${current[0]!.commercialStatus}`,
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
                  'quoted',
                  ${actorName(ctx)},
                  ${input.note ?? 'Service request quote registered'},
                  ${JSON.stringify({
                    action: "quote_registered",
                    commercialStatus: "quoted",
                    amount: input.amount,
                    reference: input.reference ?? null,
                  })}::jsonb
                )
              `;

              return rows[0]!;
            },
          );
        }),

    canonicalRequestAuthorization:
      pgProtectedProcedure
        .input(
          z.object({
            id: z.string().uuid(),
            note:
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
              const rows = await tx<{
                id: string;
                requestNumber: string;
                status: string;
                commercialStatus: string;
                updatedAt: Date;
              }[]>`
                UPDATE service_requests
                SET
                  commercial_status = 'pending_authorization',
                  updated_at = now()
                WHERE id = ${input.id}::uuid
                  AND status = 'under_review'
                  AND commercial_status = 'quoted'
                  AND quoted_at IS NOT NULL
                RETURNING
                  id::text AS "id",
                  request_number AS "requestNumber",
                  status AS "status",
                  commercial_status AS "commercialStatus",
                  updated_at AS "updatedAt"
              `;

              if (rows.length !== 1) {
                const current = await tx<{
                  status: string;
                  commercialStatus: string;
                }[]>`
                  SELECT
                    status AS "status",
                    commercial_status AS "commercialStatus"
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
                    `Authorization cannot be requested from status ${current[0]!.status} with commercial status ${current[0]!.commercialStatus}`,
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
                  'quoted',
                  ${actorName(ctx)},
                  ${input.note ?? 'Authorization requested for quoted service request'},
                  ${JSON.stringify({
                    action: "authorization_requested",
                    commercialStatus:
                      "pending_authorization",
                  })}::jsonb
                )
              `;

              return rows[0]!;
            },
          );
        }),

    canonicalAuthorize:
      pgProtectedProcedure
        .input(
          z.object({
            id: z.string().uuid(),
            note:
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
                WHERE id = ${input.id}::uuid
                  AND status = 'under_review'
                  AND commercial_status = 'pending_authorization'
                  AND quoted_at IS NOT NULL
                RETURNING
                  id::text AS "id",
                  request_number AS "requestNumber",
                  status AS "status",
                  commercial_status AS "commercialStatus",
                  authorized_at AS "authorizedAt",
                  updated_at AS "updatedAt"
              `;

              if (rows.length !== 1) {
                const current = await tx<{
                  status: string;
                  commercialStatus: string;
                }[]>`
                  SELECT
                    status AS "status",
                    commercial_status AS "commercialStatus"
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
                    `Service request cannot be authorized from status ${current[0]!.status} with commercial status ${current[0]!.commercialStatus}`,
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
                  'authorized',
                  ${actorName(ctx)},
                  ${input.note ?? 'Service request commercial authorization granted'},
                  ${JSON.stringify({
                    action: "authorized",
                    status: "under_review",
                    commercialStatus: "authorized",
                  })}::jsonb
                )
              `;

              return rows[0]!;
            },
          );
        }),

    canonicalRejectAuthorization:
      pgProtectedProcedure
        .input(
          z.object({
            id: z.string().uuid(),
            reason:
              z.string()
                .trim()
                .min(1)
                .max(2000),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          requireReviewerRole(
            ctx.pgTenant.tenantRole,
          );

          return withTenantTransaction(
            ctx.pgTenant.tenantId,
            async tx => {
              const rows = await tx<{
                id: string;
                requestNumber: string;
                status: string;
                commercialStatus: string;
                rejectedAt: Date;
                rejectionReason: string;
                updatedAt: Date;
              }[]>`
                UPDATE service_requests
                SET
                  status = 'rejected',
                  commercial_status = 'rejected',
                  rejected_at = now(),
                  rejection_reason = ${input.reason},
                  authorized_at = NULL,
                  updated_at = now()
                WHERE id = ${input.id}::uuid
                  AND status = 'under_review'
                  AND commercial_status = 'pending_authorization'
                  AND quoted_at IS NOT NULL
                RETURNING
                  id::text AS "id",
                  request_number AS "requestNumber",
                  status AS "status",
                  commercial_status AS "commercialStatus",
                  rejected_at AS "rejectedAt",
                  rejection_reason AS "rejectionReason",
                  updated_at AS "updatedAt"
              `;

              if (rows.length !== 1) {
                const current = await tx<{
                  status: string;
                  commercialStatus: string;
                }[]>`
                  SELECT
                    status AS "status",
                    commercial_status AS "commercialStatus"
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
                    `Service request authorization cannot be rejected from status ${current[0]!.status} with commercial status ${current[0]!.commercialStatus}`,
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
                  'rejected',
                  ${actorName(ctx)},
                  ${input.reason},
                  ${JSON.stringify({
                    action: "authorization_rejected",
                    status: "rejected",
                    commercialStatus: "rejected",
                  })}::jsonb
                )
              `;

              return rows[0]!;
            },
          );
        }),
  });
