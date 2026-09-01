import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  pgProtectedProcedure,
  router,
} from "../_core/trpc";
import {
  withTenantTransaction,
} from "../db.pg";

function requireFulfillmentRole(tenantRole: string) {
  if (tenantRole !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Service request fulfillment requires tenant administrator access",
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

function ticketCategoryForRequestType(requestType: string) {
  switch (requestType) {
    case "service_attention":
    case "event_service":
      return "service_request";
    case "infrastructure_assessment":
    case "inventory_capture":
      return "inspection";
    case "other":
      return "other";
    case "meeting":
      throw new TRPCError({
        code: "CONFLICT",
        message:
          "Meeting requests are not converted to service tickets",
      });
    default:
      throw new TRPCError({
        code: "CONFLICT",
        message:
          `Unsupported service request type ${requestType}`,
      });
  }
}

/**
 * Authorized Service Intake fulfillment.
 *
 * A service request remains the intake record. Operational work starts only
 * after an explicit conversion to a canonical service ticket. Ticket
 * conversion requires branch context because service_tickets.branch_id is
 * mandatory. Context enrichment and conversion are intentionally separate
 * procedures so an authorized request can be completed safely before the
 * execution record is created.
 */
export const serviceRequestFulfillmentRouter =
  router({
    canonicalSetOperationalContext:
      pgProtectedProcedure
        .input(
          z.object({
            id: z.string().uuid(),
            branchId: z.string().uuid(),
            departmentId:
              z.string().uuid().nullable().optional(),
            branchSystemId:
              z.string().uuid().nullable().optional(),
            assetId:
              z.string().uuid().nullable().optional(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          requireFulfillmentRole(
            ctx.pgTenant.tenantRole,
          );

          return withTenantTransaction(
            ctx.pgTenant.tenantId,
            async tx => {
              const requestRows = await tx<{
                id: string;
                requestNumber: string;
                status: string;
                commercialStatus: string;
              }[]>`
                SELECT
                  id::text AS "id",
                  request_number AS "requestNumber",
                  status AS "status",
                  commercial_status AS "commercialStatus"
                FROM service_requests
                WHERE id = ${input.id}::uuid
                LIMIT 1
              `;

              if (requestRows.length !== 1) {
                throw new TRPCError({
                  code: "NOT_FOUND",
                  message:
                    "Service request was not found",
                });
              }

              const request = requestRows[0]!;

              if (
                request.status !== "under_review"
                || request.commercialStatus !== "authorized"
              ) {
                throw new TRPCError({
                  code: "CONFLICT",
                  message:
                    `Operational context cannot be changed from status ${request.status} with commercial status ${request.commercialStatus}`,
                });
              }

              const branches = await tx<{
                id: string;
              }[]>`
                SELECT id::text AS "id"
                FROM branches
                WHERE id = ${input.branchId}::uuid
                  AND tenant_id = ${ctx.pgTenant.tenantId}::uuid
                  AND is_active = true
                  AND status = 'active'
                LIMIT 1
              `;

              if (branches.length !== 1) {
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message:
                    "Branch is not available for this tenant",
                });
              }

              const departmentId =
                input.departmentId ?? null;
              const branchSystemId =
                input.branchSystemId ?? null;
              const assetId =
                input.assetId ?? null;

              if (departmentId) {
                const departments = await tx<{
                  id: string;
                }[]>`
                  SELECT id::text AS "id"
                  FROM departments
                  WHERE id = ${departmentId}::uuid
                    AND tenant_id = ${ctx.pgTenant.tenantId}::uuid
                    AND status = 'active'
                  LIMIT 1
                `;

                if (departments.length !== 1) {
                  throw new TRPCError({
                    code: "BAD_REQUEST",
                    message:
                      "Department is not available for this tenant",
                  });
                }
              }

              if (branchSystemId) {
                const systems = await tx<{
                  id: string;
                }[]>`
                  SELECT id::text AS "id"
                  FROM branch_systems
                  WHERE id = ${branchSystemId}::uuid
                    AND tenant_id = ${ctx.pgTenant.tenantId}::uuid
                    AND branch_id = ${input.branchId}::uuid
                    AND (
                      ${departmentId}::uuid IS NULL
                      OR department_id = ${departmentId}::uuid
                    )
                  LIMIT 1
                `;

                if (systems.length !== 1) {
                  throw new TRPCError({
                    code: "BAD_REQUEST",
                    message:
                      "System is not available for the selected branch and department",
                  });
                }
              }

              if (assetId) {
                const assets = await tx<{
                  id: string;
                }[]>`
                  SELECT id::text AS "id"
                  FROM assets
                  WHERE id = ${assetId}::uuid
                    AND tenant_id = ${ctx.pgTenant.tenantId}::uuid
                    AND branch_id = ${input.branchId}::uuid
                  LIMIT 1
                `;

                if (assets.length !== 1) {
                  throw new TRPCError({
                    code: "BAD_REQUEST",
                    message:
                      "Asset is not available for the selected branch",
                  });
                }
              }

              const rows = await tx<{
                id: string;
                requestNumber: string;
                branchId: string;
                departmentId: string | null;
                branchSystemId: string | null;
                assetId: string | null;
                updatedAt: Date;
              }[]>`
                UPDATE service_requests
                SET
                  branch_id = ${input.branchId}::uuid,
                  department_id = ${departmentId}::uuid,
                  branch_system_id = ${branchSystemId}::uuid,
                  asset_id = ${assetId}::uuid,
                  updated_at = now()
                WHERE id = ${input.id}::uuid
                  AND status = 'under_review'
                  AND commercial_status = 'authorized'
                RETURNING
                  id::text AS "id",
                  request_number AS "requestNumber",
                  branch_id::text AS "branchId",
                  department_id::text AS "departmentId",
                  branch_system_id::text AS "branchSystemId",
                  asset_id::text AS "assetId",
                  updated_at AS "updatedAt"
              `;

              if (rows.length !== 1) {
                throw new TRPCError({
                  code: "CONFLICT",
                  message:
                    "Service request operational context could not be updated",
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
                  'information_added',
                  ${actorName(ctx)},
                  'Operational context completed for authorized request',
                  ${JSON.stringify({
                    action:
                      "operational_context_completed",
                    branchId: input.branchId,
                    departmentId,
                    branchSystemId,
                    assetId,
                  })}::jsonb
                )
              `;

              return rows[0]!;
            },
          );
        }),

    canonicalConvertToTicket:
      pgProtectedProcedure
        .input(
          z.object({
            id: z.string().uuid(),
            priority:
              z.enum([
                "critical",
                "high",
                "medium",
                "low",
              ]).default("medium"),
            note:
              z.string()
                .trim()
                .min(1)
                .max(2000)
                .optional(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          requireFulfillmentRole(
            ctx.pgTenant.tenantRole,
          );

          return withTenantTransaction(
            ctx.pgTenant.tenantId,
            async tx => {
              const requestRows = await tx<{
                id: string;
                requestNumber: string;
                requestType: string;
                status: string;
                commercialStatus: string;
                branchId: string | null;
                assetId: string | null;
                title: string;
                description: string | null;
                estimatedAmount: string | null;
              }[]>`
                SELECT
                  id::text AS "id",
                  request_number AS "requestNumber",
                  request_type AS "requestType",
                  status AS "status",
                  commercial_status AS "commercialStatus",
                  branch_id::text AS "branchId",
                  asset_id::text AS "assetId",
                  title AS "title",
                  description AS "description",
                  estimated_amount::text AS "estimatedAmount"
                FROM service_requests
                WHERE id = ${input.id}::uuid
                FOR UPDATE
              `;

              if (requestRows.length !== 1) {
                throw new TRPCError({
                  code: "NOT_FOUND",
                  message:
                    "Service request was not found",
                });
              }

              const request = requestRows[0]!;

              if (
                request.status !== "under_review"
                || request.commercialStatus !== "authorized"
              ) {
                throw new TRPCError({
                  code: "CONFLICT",
                  message:
                    `Ticket conversion requires an authorized request under review; current status is ${request.status} / ${request.commercialStatus}`,
                });
              }

              if (!request.branchId) {
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message:
                    "A branch is required before converting the request to a ticket",
                });
              }

              const category =
                ticketCategoryForRequestType(
                  request.requestType,
                );

              const existingLinks = await tx<{
                ticketId: string;
              }[]>`
                SELECT
                  service_ticket_id::text AS "ticketId"
                FROM service_request_ticket_links
                WHERE service_request_id = ${request.id}::uuid
                  AND relation_type = 'converted'
                LIMIT 1
              `;

              if (existingLinks.length > 0) {
                throw new TRPCError({
                  code: "CONFLICT",
                  message:
                    "Service request has already been converted to a ticket",
                });
              }

              const ticketRows = await tx<{
                id: string;
                ticketNumber: string;
                operationalStatus: string;
                contractualStatus: string;
              }[]>`
                INSERT INTO service_tickets (
                  tenant_id,
                  branch_id,
                  asset_id,
                  ticket_number,
                  title,
                  description,
                  operational_status,
                  contractual_status,
                  priority,
                  category,
                  estimated_cost,
                  is_billable,
                  notes
                )
                VALUES (
                  ${ctx.pgTenant.tenantId}::uuid,
                  ${request.branchId}::uuid,
                  ${request.assetId}::uuid,
                  'TKT-' || upper(
                    substr(
                      replace(
                        gen_random_uuid()::text,
                        '-',
                        ''
                      ),
                      1,
                      12
                    )
                  ),
                  ${request.title},
                  ${request.description},
                  'open',
                  'approved',
                  ${input.priority},
                  ${category},
                  ${request.estimatedAmount}::numeric,
                  true,
                  ${input.note
                    ? `Converted from ${request.requestNumber}: ${input.note}`
                    : `Converted from ${request.requestNumber}`}
                )
                RETURNING
                  id::text AS "id",
                  ticket_number AS "ticketNumber",
                  operational_status AS "operationalStatus",
                  contractual_status AS "contractualStatus"
              `;

              if (ticketRows.length !== 1) {
                throw new TRPCError({
                  code: "INTERNAL_SERVER_ERROR",
                  message:
                    "Canonical ticket could not be created",
                });
              }

              const ticket = ticketRows[0]!;

              await tx`
                INSERT INTO service_request_ticket_links (
                  tenant_id,
                  service_request_id,
                  service_ticket_id,
                  relation_type
                )
                VALUES (
                  ${ctx.pgTenant.tenantId}::uuid,
                  ${request.id}::uuid,
                  ${ticket.id}::uuid,
                  'converted'
                )
              `;

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
                  'converted_to_ticket',
                  ${actorName(ctx)},
                  'Authorized service request converted to ticket',
                  ${JSON.stringify({
                    action: "converted_to_ticket",
                    ticketId: ticket.id,
                    ticketNumber: ticket.ticketNumber,
                  })}::jsonb
                )
              `;

              const completedRows = await tx<{
                id: string;
                status: string;
                completedAt: Date;
              }[]>`
                UPDATE service_requests
                SET
                  status = 'completed',
                  completed_at = now(),
                  updated_at = now()
                WHERE id = ${request.id}::uuid
                  AND status = 'under_review'
                  AND commercial_status = 'authorized'
                RETURNING
                  id::text AS "id",
                  status AS "status",
                  completed_at AS "completedAt"
              `;

              if (completedRows.length !== 1) {
                throw new TRPCError({
                  code: "CONFLICT",
                  message:
                    "Service request could not be completed after ticket conversion",
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
                  ${request.id}::uuid,
                  'completed',
                  ${actorName(ctx)},
                  'Service Intake completed after ticket conversion',
                  ${JSON.stringify({
                    action:
                      "intake_completed_after_ticket_conversion",
                    ticketId: ticket.id,
                    ticketNumber: ticket.ticketNumber,
                  })}::jsonb
                )
              `;

              return {
                requestId: request.id,
                requestStatus:
                  completedRows[0]!.status,
                completedAt:
                  completedRows[0]!.completedAt,
                ticket,
              };
            },
          );
        }),
  });
