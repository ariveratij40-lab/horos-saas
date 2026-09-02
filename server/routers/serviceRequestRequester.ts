import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  pgProtectedProcedure,
  router,
} from "../_core/trpc";
import {
  withTenantTransaction,
} from "../db.pg";

function isLocalDevRequesterProxy(
  externalSubject: string,
  tenantCode: string,
) {
  return (
    process.env.NODE_ENV === "development"
    && externalSubject === "dev_local_horos_admin"
    && tenantCode === "HOROS_LOCAL"
  );
}

/**
 * Requester-side lifecycle actions for canonical Service Intake.
 *
 * These actions deliberately live outside the administrative review router.
 * A requester response is tenant-scoped, identity-aware and atomic with its
 * corresponding audit event.
 */
export const serviceRequestRequesterRouter =
  router({
    canonicalProvideInformation:
      pgProtectedProcedure
        .input(
          z.object({
            id: z.string().uuid(),
            response:
              z.string()
                .trim()
                .min(1)
                .max(5000),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          return withTenantTransaction(
            ctx.pgTenant.tenantId,
            async tx => {
              const requests = await tx<{
                id: string;
                status: string;
                requestedByUserId: string | null;
                requesterEmail: string | null;
                missingInformation: unknown;
              }[]>`
                SELECT
                  id::text AS "id",
                  status AS "status",
                  requested_by_user_id::text AS "requestedByUserId",
                  requester_email AS "requesterEmail",
                  missing_information AS "missingInformation"
                FROM service_requests
                WHERE id = ${input.id}::uuid
                LIMIT 1
                FOR UPDATE
              `;

              if (requests.length !== 1) {
                throw new TRPCError({
                  code: "NOT_FOUND",
                  message: "Service request was not found",
                });
              }

              const request = requests[0]!;

              if (request.status !== "needs_information") {
                throw new TRPCError({
                  code: "CONFLICT",
                  message:
                    `Information can only be provided while the request needs information; current status is ${request.status}`,
                });
              }

              const actors = await tx<{
                id: string;
                email: string | null;
                name: string | null;
              }[]>`
                SELECT
                  id::text AS "id",
                  email AS "email",
                  name AS "name"
                FROM users
                WHERE external_subject = ${ctx.user.openId}
                  AND is_active = true
                LIMIT 1
              `;

              if (actors.length !== 1) {
                throw new TRPCError({
                  code: "FORBIDDEN",
                  message:
                    "Canonical requester identity is not available",
                });
              }

              const actor = actors[0]!;
              const requesterEmail =
                request.requesterEmail?.trim().toLowerCase() ?? null;
              const actorEmail =
                actor.email?.trim().toLowerCase() ?? null;

              const ownsById =
                request.requestedByUserId === actor.id;
              const canClaimByEmail =
                request.requestedByUserId === null
                && requesterEmail !== null
                && actorEmail !== null
                && requesterEmail === actorEmail;
              const localDevProxy =
                isLocalDevRequesterProxy(
                  ctx.user.openId,
                  ctx.pgTenant.tenantCode,
                );

              if (
                !ownsById
                && !canClaimByEmail
                && !localDevProxy
              ) {
                throw new TRPCError({
                  code: "FORBIDDEN",
                  message:
                    "Only the requester may provide the requested information",
                });
              }

              const rows = await tx<{
                id: string;
                requestNumber: string;
                status: string;
                clarityStatus: string;
                requesterConfirmedAt: Date;
                updatedAt: Date;
              }[]>`
                UPDATE service_requests
                SET
                  status = 'submitted',
                  clarity_status = 'not_evaluated',
                  missing_information = '[]'::jsonb,
                  requester_confirmed_at = now(),
                  requested_by_user_id = COALESCE(
                    requested_by_user_id,
                    ${actor.id}::uuid
                  ),
                  updated_at = now()
                WHERE id = ${input.id}::uuid
                  AND status = 'needs_information'
                RETURNING
                  id::text AS "id",
                  request_number AS "requestNumber",
                  status AS "status",
                  clarity_status AS "clarityStatus",
                  requester_confirmed_at AS "requesterConfirmedAt",
                  updated_at AS "updatedAt"
              `;

              if (rows.length !== 1) {
                throw new TRPCError({
                  code: "CONFLICT",
                  message:
                    "Service request changed before the information response could be saved",
                });
              }

              const actorName =
                actor.name
                ?? actor.email
                ?? ctx.user.name
                ?? "Requester";

              await tx`
                INSERT INTO service_request_events (
                  tenant_id,
                  service_request_id,
                  event_type,
                  actor_user_id,
                  actor_name,
                  message,
                  metadata
                )
                VALUES (
                  ${ctx.pgTenant.tenantId}::uuid,
                  ${rows[0]!.id}::uuid,
                  'information_added',
                  ${actor.id}::uuid,
                  ${actorName},
                  ${input.response},
                  ${JSON.stringify({
                    fromStatus: "needs_information",
                    toStatus: "submitted",
                    requestedItems:
                      request.missingInformation,
                    requesterConfirmed: true,
                  })}::jsonb
                )
              `;

              return rows[0]!;
            },
          );
        }),
  });
