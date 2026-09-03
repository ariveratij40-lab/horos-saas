import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { pgProtectedProcedure, router } from "../_core/trpc";
import { withTenantTransaction } from "../db.pg";

const statusSchema = z.enum(["active", "inactive"]);
const codeSchema = z.string().trim().min(2).max(64).regex(/^[A-Za-z0-9][A-Za-z0-9-]*$/);
const branchContext = z.object({ branchId: z.string().uuid() });

function requireAdministrator(role: string) {
  if (role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Administrator permission is required" });
  }
}

function controlledDatabaseError(error: unknown): never {
  const code = typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code)
    : "";
  if (code === "23505") throw new TRPCError({ code: "CONFLICT", message: "Solution code already exists in this branch" });
  if (code === "23503" || code === "23514") throw new TRPCError({ code: "BAD_REQUEST", message: "Solution context or asset compatibility is invalid" });
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Canonical solution operation failed" });
}

const solutionColumns = `
  ss.id::text AS "id", ss.branch_id::text AS "branchId",
  ss.branch_system_id::text AS "branchSystemId", bs.system_id::text AS "systemId",
  ss.code, ss.name, ss.description, ss.status,
  ss.commissioned_at::text AS "commissionedAt",
  ss.decommissioned_at::text AS "decommissionedAt",
  ss.created_at AS "createdAt", ss.updated_at AS "updatedAt"
`;

export const systemSolutionsRouter = router({
  canonicalContext: pgProtectedProcedure.query(({ ctx }) =>
    withTenantTransaction(ctx.pgTenant.tenantId, async tx => {
      const branches = await tx<{ id: string; code: string; name: string }[]>`
        SELECT id::text, code, name FROM branches
        WHERE status = 'active' ORDER BY code, id
      `;
      const branchSystems = await tx<{ id: string; branchId: string; systemId: string; code: string; name: string }[]>`
        SELECT bs.id::text, bs.branch_id::text AS "branchId", bs.system_id::text AS "systemId",
          sc.code, COALESCE(bs.display_name, sc.name) AS name
        FROM branch_systems bs JOIN systems_catalog sc ON sc.id = bs.system_id
        WHERE bs.status <> 'disabled' ORDER BY sc.code, bs.id
      `;
      return { branches, branchSystems, canManage: ctx.pgTenant.tenantRole === "admin" };
    })),

  canonicalList: pgProtectedProcedure
    .input(branchContext.extend({ branchSystemId: z.string().uuid().optional() }))
    .query(({ ctx, input }) => withTenantTransaction(ctx.pgTenant.tenantId, tx => tx.unsafe<unknown[]>(`
      SELECT ${solutionColumns}, count(a.id)::integer AS "assetCount"
      FROM system_solutions ss
      JOIN branch_systems bs ON bs.tenant_id = ss.tenant_id AND bs.id = ss.branch_system_id
      LEFT JOIN assets a ON a.tenant_id = ss.tenant_id AND a.system_solution_id = ss.id
      WHERE ss.branch_id = $1::uuid AND ($2::uuid IS NULL OR ss.branch_system_id = $2::uuid)
      GROUP BY ss.id, bs.system_id ORDER BY ss.code, ss.id
    `, [input.branchId, input.branchSystemId ?? null]))),

  canonicalGet: pgProtectedProcedure
    .input(branchContext.extend({ solutionId: z.string().uuid() }))
    .query(({ ctx, input }) => withTenantTransaction(ctx.pgTenant.tenantId, async tx => {
      const rows = await tx.unsafe<unknown[]>(`
        SELECT ${solutionColumns}, COALESCE(jsonb_agg(jsonb_build_object(
          'id', a.id::text, 'assetCode', a.asset_code, 'manufacturer', a.manufacturer,
          'model', a.model) ORDER BY a.asset_code) FILTER (WHERE a.id IS NOT NULL), '[]') AS assets
        FROM system_solutions ss
        JOIN branch_systems bs ON bs.tenant_id = ss.tenant_id AND bs.id = ss.branch_system_id
        LEFT JOIN assets a ON a.tenant_id = ss.tenant_id AND a.system_solution_id = ss.id
        WHERE ss.id = $1::uuid AND ss.branch_id = $2::uuid
        GROUP BY ss.id, bs.system_id
      `, [input.solutionId, input.branchId]);
      if (rows.length !== 1) throw new TRPCError({ code: "NOT_FOUND", message: "System solution was not found" });
      return rows[0];
    })),

  canonicalCompatibleAssets: pgProtectedProcedure
    .input(branchContext.extend({ branchSystemId: z.string().uuid(), solutionId: z.string().uuid().optional() }))
    .query(({ ctx, input }) => withTenantTransaction(ctx.pgTenant.tenantId, tx => tx<{
      id: string; assetCode: string; manufacturer: string | null; model: string | null; assignedSolutionId: string | null;
    }[]>`
      SELECT a.id::text, a.asset_code AS "assetCode", a.manufacturer, a.model,
        a.system_solution_id::text AS "assignedSolutionId"
      FROM assets a
      JOIN asset_system_memberships asm ON asm.tenant_id = a.tenant_id AND asm.asset_id = a.id
      WHERE a.branch_id = ${input.branchId}::uuid
        AND asm.branch_system_id = ${input.branchSystemId}::uuid
        AND (a.system_solution_id IS NULL OR a.system_solution_id = ${input.solutionId ?? null}::uuid)
      ORDER BY a.asset_code, a.id
    `)),

  canonicalCreate: pgProtectedProcedure
    .input(branchContext.extend({
      tenantId: z.string().uuid().optional(), branchSystemId: z.string().uuid(),
      code: codeSchema, name: z.string().trim().min(1).max(255), description: z.string().max(5000).nullable().optional(),
      commissionedAt: z.string().date().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      requireAdministrator(ctx.pgTenant.tenantRole);
      try {
        return await withTenantTransaction(ctx.pgTenant.tenantId, async tx => {
          const id = randomUUID();
          const rows = await tx<{ id: string }[]>`
            INSERT INTO system_solutions (id, tenant_id, branch_id, branch_system_id, code, name, description, commissioned_at, created_by, updated_by)
            VALUES (${id}::uuid, ${ctx.pgTenant.tenantId}::uuid, ${input.branchId}::uuid, ${input.branchSystemId}::uuid,
              ${input.code.toUpperCase()}, ${input.name}, ${input.description ?? null}, ${input.commissionedAt ?? null}::date,
              ${ctx.pgTenant.externalSubject}, ${ctx.pgTenant.externalSubject})
            RETURNING id::text AS id
          `;
          await tx`INSERT INTO system_solution_events (tenant_id, system_solution_id, event_type, actor_external_subject)
            VALUES (${ctx.pgTenant.tenantId}::uuid, ${id}::uuid, 'created', ${ctx.pgTenant.externalSubject})`;
          return rows[0];
        });
      } catch (error) { return controlledDatabaseError(error); }
    }),

  canonicalUpdate: pgProtectedProcedure
    .input(branchContext.extend({
      tenantId: z.string().uuid().optional(), solutionId: z.string().uuid(),
      name: z.string().trim().min(1).max(255), description: z.string().max(5000).nullable().optional(),
      commissionedAt: z.string().date().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      requireAdministrator(ctx.pgTenant.tenantRole);
      try {
        return await withTenantTransaction(ctx.pgTenant.tenantId, async tx => {
          const rows = await tx<{ id: string }[]>`
            UPDATE system_solutions SET name = ${input.name}, description = ${input.description ?? null},
              commissioned_at = ${input.commissionedAt ?? null}::date, updated_by = ${ctx.pgTenant.externalSubject}
            WHERE id = ${input.solutionId}::uuid AND branch_id = ${input.branchId}::uuid RETURNING id::text AS id
          `;
          if (rows.length !== 1) throw new TRPCError({ code: "NOT_FOUND", message: "System solution was not found" });
          await tx`INSERT INTO system_solution_events (tenant_id, system_solution_id, event_type, actor_external_subject)
            VALUES (${ctx.pgTenant.tenantId}::uuid, ${input.solutionId}::uuid, 'updated', ${ctx.pgTenant.externalSubject})`;
          return rows[0];
        });
      } catch (error) { if (error instanceof TRPCError) throw error; return controlledDatabaseError(error); }
    }),

  canonicalSetStatus: pgProtectedProcedure
    .input(branchContext.extend({ solutionId: z.string().uuid(), status: statusSchema }))
    .mutation(async ({ ctx, input }) => {
      requireAdministrator(ctx.pgTenant.tenantRole);
      return withTenantTransaction(ctx.pgTenant.tenantId, async tx => {
        const rows = await tx<{ id: string }[]>`
          UPDATE system_solutions SET status = ${input.status}, updated_by = ${ctx.pgTenant.externalSubject}
          WHERE id = ${input.solutionId}::uuid AND branch_id = ${input.branchId}::uuid RETURNING id::text AS id
        `;
        if (rows.length !== 1) throw new TRPCError({ code: "NOT_FOUND", message: "System solution was not found" });
        await tx`INSERT INTO system_solution_events (tenant_id, system_solution_id, event_type, actor_external_subject, details)
          VALUES (${ctx.pgTenant.tenantId}::uuid, ${input.solutionId}::uuid, 'status_changed', ${ctx.pgTenant.externalSubject},
            jsonb_build_object('status', ${input.status}::text))`;
        return rows[0];
      });
    }),

  canonicalAssignAsset: pgProtectedProcedure
    .input(branchContext.extend({ solutionId: z.string().uuid(), assetId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      requireAdministrator(ctx.pgTenant.tenantRole);
      try {
        return await withTenantTransaction(ctx.pgTenant.tenantId, async tx => {
          const rows = await tx<{ id: string }[]>`
            UPDATE assets SET system_solution_id = ${input.solutionId}::uuid, updated_at = now()
            WHERE id = ${input.assetId}::uuid AND branch_id = ${input.branchId}::uuid RETURNING id::text AS id
          `;
          if (rows.length !== 1) throw new TRPCError({ code: "NOT_FOUND", message: "Asset was not found" });
          await tx`INSERT INTO system_solution_events (tenant_id, system_solution_id, event_type, actor_external_subject, details)
            VALUES (${ctx.pgTenant.tenantId}::uuid, ${input.solutionId}::uuid, 'asset_assigned', ${ctx.pgTenant.externalSubject},
              jsonb_build_object('assetId', ${input.assetId}::text))`;
          return rows[0];
        });
      } catch (error) { if (error instanceof TRPCError) throw error; return controlledDatabaseError(error); }
    }),

  canonicalUnassignAsset: pgProtectedProcedure
    .input(branchContext.extend({ solutionId: z.string().uuid(), assetId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      requireAdministrator(ctx.pgTenant.tenantRole);
      return withTenantTransaction(ctx.pgTenant.tenantId, async tx => {
        const rows = await tx<{ id: string }[]>`
          UPDATE assets SET system_solution_id = NULL, updated_at = now()
          WHERE id = ${input.assetId}::uuid AND branch_id = ${input.branchId}::uuid
            AND system_solution_id = ${input.solutionId}::uuid RETURNING id::text AS id
        `;
        if (rows.length !== 1) throw new TRPCError({ code: "NOT_FOUND", message: "Assigned asset was not found" });
        await tx`INSERT INTO system_solution_events (tenant_id, system_solution_id, event_type, actor_external_subject, details)
          VALUES (${ctx.pgTenant.tenantId}::uuid, ${input.solutionId}::uuid, 'asset_unassigned', ${ctx.pgTenant.externalSubject},
              jsonb_build_object('assetId', ${input.assetId}::text))`;
        return rows[0];
      });
    }),
});
