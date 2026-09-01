import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  pgProtectedProcedure,
  router,
} from "../_core/trpc";
import {
  withTenantTransaction,
} from "../db.pg";

export const serviceTraceabilityRouter =
  router({
    canonicalForRequest:
      pgProtectedProcedure
        .input(
          z.object({
            requestId: z.string().uuid(),
          }),
        )
        .query(async ({ ctx, input }) => {
          return withTenantTransaction(
            ctx.pgTenant.tenantId,
            async tx => {
              const request = await tx<{ id: string }[]>`
                SELECT id::text AS "id"
                FROM service_requests
                WHERE id = ${input.requestId}::uuid
                LIMIT 1
              `;

              if (request.length !== 1) {
                throw new TRPCError({
                  code: "NOT_FOUND",
                  message: "Service request was not found",
                });
              }

              return tx<{
                linkId: string;
                relationType: string;
                createdAt: Date;
                ticketId: string;
                ticketNumber: string;
                title: string;
                operationalStatus: string;
                contractualStatus: string;
              }[]>`
                SELECT
                  l.id::text AS "linkId",
                  l.relation_type AS "relationType",
                  l.created_at AS "createdAt",
                  t.id::text AS "ticketId",
                  t.ticket_number AS "ticketNumber",
                  t.title AS "title",
                  t.operational_status AS "operationalStatus",
                  t.contractual_status AS "contractualStatus"
                FROM service_request_ticket_links l
                JOIN service_tickets t
                  ON t.id = l.service_ticket_id
                  AND t.tenant_id = l.tenant_id
                WHERE l.service_request_id = ${input.requestId}::uuid
                ORDER BY l.created_at ASC, l.id ASC
              `;
            },
          );
        }),

    canonicalForTicket:
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
              const ticket = await tx<{ id: string }[]>`
                SELECT id::text AS "id"
                FROM service_tickets
                WHERE id = ${input.ticketId}::uuid
                LIMIT 1
              `;

              if (ticket.length !== 1) {
                throw new TRPCError({
                  code: "NOT_FOUND",
                  message: "Canonical ticket was not found",
                });
              }

              return tx<{
                linkId: string;
                relationType: string;
                createdAt: Date;
                requestId: string;
                requestNumber: string;
                title: string;
                status: string;
                commercialStatus: string;
              }[]>`
                SELECT
                  l.id::text AS "linkId",
                  l.relation_type AS "relationType",
                  l.created_at AS "createdAt",
                  r.id::text AS "requestId",
                  r.request_number AS "requestNumber",
                  r.title AS "title",
                  r.status AS "status",
                  r.commercial_status AS "commercialStatus"
                FROM service_request_ticket_links l
                JOIN service_requests r
                  ON r.id = l.service_request_id
                  AND r.tenant_id = l.tenant_id
                WHERE l.service_ticket_id = ${input.ticketId}::uuid
                ORDER BY l.created_at ASC, l.id ASC
              `;
            },
          );
        }),
  });
