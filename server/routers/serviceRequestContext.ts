import { z } from "zod";

import {
  pgProtectedProcedure,
  router,
} from "../_core/trpc";

import {
  withTenantTransaction,
} from "../db.pg";

import {
  serviceRequestWorkflowRouter,
} from "./serviceRequestWorkflow";
import {
  serviceRequestRequesterRouter,
} from "./serviceRequestRequester";
import {
  serviceRequestReviewRouter,
} from "./serviceRequestReview";
import {
  serviceRequestFulfillmentRouter,
} from "./serviceRequestFulfillment";

/**
 * Canonical lookup surfaces used by the Service Intake create UX.
 *
 * All reads execute inside the PostgreSQL tenant transaction and also
 * constrain tenant_id explicitly. Optional technical context remains
 * progressive: a request may be created without branch/system/asset.
 *
 * Lifecycle actions are nested under `workflow`; requester-side actions are
 * separated under `requester`; review-only actions under `review`; authorized
 * execution handoff under `fulfillment` so authorities remain explicit.
 */
export const serviceRequestContextRouter =
  router({
    workflow:
      serviceRequestWorkflowRouter,

    requester:
      serviceRequestRequesterRouter,

    review:
      serviceRequestReviewRouter,

    fulfillment:
      serviceRequestFulfillmentRouter,

    canonicalOptions:
      pgProtectedProcedure
        .input(
          z.object({
            branchId:
              z.string().uuid().optional().nullable(),
            departmentId:
              z.string().uuid().optional().nullable(),
          }).optional(),
        )
        .query(async ({ ctx, input }) => {
          return withTenantTransaction(
            ctx.pgTenant.tenantId,
            async tx => {
              const tenantId =
                ctx.pgTenant.tenantId;

              const branchId =
                input?.branchId ?? null;

              const departmentId =
                input?.departmentId ?? null;

              const branches = await tx<{
                id: string;
                code: string;
                name: string;
                timezone: string;
              }[]>`
                SELECT
                  id::text AS "id",
                  code AS "code",
                  name AS "name",
                  timezone AS "timezone"
                FROM branches
                WHERE tenant_id = ${tenantId}::uuid
                  AND is_active = true
                  AND status = 'active'
                ORDER BY name, code
              `;

              const departments = await tx<{
                id: string;
                code: string;
                name: string;
              }[]>`
                SELECT
                  id::text AS "id",
                  code AS "code",
                  name AS "name"
                FROM departments
                WHERE tenant_id = ${tenantId}::uuid
                  AND status = 'active'
                ORDER BY name, code
              `;

              const systems = await tx<{
                id: string;
                branchId: string;
                departmentId: string | null;
                systemCode: string;
                displayName: string;
                functionalStatus: string;
                normativeStatus: string;
              }[]>`
                SELECT
                  bs.id::text AS "id",
                  bs.branch_id::text AS "branchId",
                  bs.department_id::text AS "departmentId",
                  sc.code AS "systemCode",
                  COALESCE(bs.display_name, sc.name) AS "displayName",
                  bs.functional_status AS "functionalStatus",
                  bs.normative_status AS "normativeStatus"
                FROM branch_systems bs
                JOIN systems_catalog sc
                  ON sc.id = bs.system_id
                WHERE bs.tenant_id = ${tenantId}::uuid
                  AND (
                    ${branchId}::uuid IS NULL
                    OR bs.branch_id = ${branchId}::uuid
                  )
                  AND (
                    ${departmentId}::uuid IS NULL
                    OR bs.department_id = ${departmentId}::uuid
                  )
                ORDER BY
                  COALESCE(bs.display_name, sc.name),
                  sc.code
              `;

              const assets = await tx<{
                id: string;
                branchId: string;
                assetCode: string;
                manufacturer: string | null;
                model: string | null;
                lifecycleStatus: string;
                operationalStatus: string;
              }[]>`
                SELECT
                  a.id::text AS "id",
                  a.branch_id::text AS "branchId",
                  a.asset_code AS "assetCode",
                  a.manufacturer AS "manufacturer",
                  a.model AS "model",
                  a.lifecycle_status AS "lifecycleStatus",
                  a.operational_status AS "operationalStatus"
                FROM assets a
                WHERE a.tenant_id = ${tenantId}::uuid
                  AND (
                    ${branchId}::uuid IS NULL
                    OR a.branch_id = ${branchId}::uuid
                  )
                ORDER BY a.asset_code
              `;

              return {
                branches,
                departments,
                systems,
                assets,
              };
            },
          );
        }),
  });
