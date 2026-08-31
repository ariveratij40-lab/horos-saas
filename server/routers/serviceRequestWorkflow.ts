import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  pgProtectedProcedure,
  router,
} from "../_core/trpc";

import {
  withTenantTransaction,
} from "../db.pg";

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
