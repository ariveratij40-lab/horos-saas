import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import type { TransactionSql } from "postgres";
import { z } from "zod";

import { pgProtectedProcedure, router } from "../_core/trpc";
import { withTenantTransaction } from "../db.pg";

const entityType = z.enum(["solution", "asset"]);
const aliasType = z.enum([
  "CUSTOMER_CODE",
  "PHYSICAL_LABEL",
  "LEGACY_CODE",
  "IMPORT_IDENTIFIER",
  "COMMON_NAME",
  "PREVIOUS_NAME",
]);
const branchEntity = z.object({
  branchId: z.string().uuid(),
  entityType,
  entityId: z.string().uuid(),
});

function requireAdmin(role: string) {
  if (role !== "admin")
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Administrator permission is required",
    });
}

function controlledError(error: unknown): never {
  if (error instanceof TRPCError) throw error;
  const code =
    typeof error === "object" && error && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";
  if (code === "23505")
    throw new TRPCError({
      code: "CONFLICT",
      message: "An equivalent active alias already exists in this branch",
    });
  if (code === "23503" || code === "23514")
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Alias context or value is invalid",
    });
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Canonical nomenclature operation failed",
  });
}

async function audit(
  tx: TransactionSql,
  entity: "solution" | "asset",
  tenantId: string,
  entityId: string,
  aliasId: string,
  event: string,
  actor: string,
  details: object
) {
  if (entity === "solution") {
    await tx`INSERT INTO system_solution_events (tenant_id, system_solution_id, event_type, actor_external_subject, details)
      VALUES (${tenantId}::uuid, ${entityId}::uuid, ${event}, ${actor}, ${JSON.stringify({ aliasId, ...details })}::jsonb)`;
  } else {
    await tx`INSERT INTO asset_alias_events (tenant_id, asset_alias_id, event_type, actor_external_subject, details)
      VALUES (${tenantId}::uuid, ${aliasId}::uuid, ${event}, ${actor}, ${JSON.stringify(details)}::jsonb)`;
  }
}

export const nomenclatureRouter = router({
  listAliases: pgProtectedProcedure
    .input(branchEntity.extend({ includeInactive: z.boolean().default(false) }))
    .query(({ ctx, input }) => {
      if (input.includeInactive) requireAdmin(ctx.pgTenant.tenantRole);
      return withTenantTransaction(ctx.pgTenant.tenantId, tx =>
        tx.unsafe<
          Array<{
            id: string;
            aliasType: string;
            aliasValue: string;
            normalizedValue: string;
            source: string;
            active: boolean;
            validFrom: Date;
            validUntil: Date | null;
            createdAt: Date;
            updatedAt: Date;
          }>
        >(
          `
      SELECT id::text, alias_type AS "aliasType", alias_value AS "aliasValue", normalized_value AS "normalizedValue",
        source, active, valid_from AS "validFrom", valid_until AS "validUntil", created_at AS "createdAt", updated_at AS "updatedAt"
      FROM ${input.entityType === "solution" ? "system_solution_aliases" : "asset_aliases"}
      WHERE branch_id = $1::uuid AND ${input.entityType === "solution" ? "system_solution_id" : "asset_id"} = $2::uuid
        AND ($3::boolean OR active) ORDER BY active DESC, alias_type, alias_value, id
    `,
          [input.branchId, input.entityId, input.includeInactive]
        )
      );
    }),

  addAlias: pgProtectedProcedure
    .input(
      branchEntity.extend({
        tenantId: z.string().uuid().optional(),
        aliasType,
        aliasValue: z.string().trim().min(1).max(255),
        source: z.string().trim().min(1).max(128),
      })
    )
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.pgTenant.tenantRole);
      try {
        return await withTenantTransaction(ctx.pgTenant.tenantId, async tx => {
          const aliasId = randomUUID();
          const table =
            input.entityType === "solution"
              ? "system_solution_aliases"
              : "asset_aliases";
          const column =
            input.entityType === "solution" ? "system_solution_id" : "asset_id";
          const rows = await tx.unsafe<{ id: string }[]>(
            `INSERT INTO ${table}
        (id, tenant_id, branch_id, ${column}, alias_type, alias_value, source, created_by, updated_by)
        VALUES ($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5,$6,$7,$8,$8) RETURNING id::text`,
            [
              aliasId,
              ctx.pgTenant.tenantId,
              input.branchId,
              input.entityId,
              input.aliasType,
              input.aliasValue,
              input.source,
              ctx.pgTenant.externalSubject,
            ]
          );
          await audit(
            tx,
            input.entityType,
            ctx.pgTenant.tenantId,
            input.entityId,
            aliasId,
            "alias_created",
            ctx.pgTenant.externalSubject,
            { aliasType: input.aliasType }
          );
          return rows[0];
        });
      } catch (error) {
        return controlledError(error);
      }
    }),

  updateAlias: pgProtectedProcedure
    .input(
      branchEntity.extend({
        aliasId: z.string().uuid(),
        aliasType,
        aliasValue: z.string().trim().min(1).max(255),
        source: z.string().trim().min(1).max(128),
      })
    )
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.pgTenant.tenantRole);
      try {
        return await withTenantTransaction(ctx.pgTenant.tenantId, async tx => {
          const table =
            input.entityType === "solution"
              ? "system_solution_aliases"
              : "asset_aliases";
          const column =
            input.entityType === "solution" ? "system_solution_id" : "asset_id";
          const rows = await tx.unsafe<{ id: string }[]>(
            `UPDATE ${table} SET alias_type=$1, alias_value=$2, source=$3, updated_by=$4
        WHERE id=$5::uuid AND branch_id=$6::uuid AND ${column}=$7::uuid RETURNING id::text`,
            [
              input.aliasType,
              input.aliasValue,
              input.source,
              ctx.pgTenant.externalSubject,
              input.aliasId,
              input.branchId,
              input.entityId,
            ]
          );
          if (rows.length !== 1)
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Alias was not found",
            });
          await audit(
            tx,
            input.entityType,
            ctx.pgTenant.tenantId,
            input.entityId,
            input.aliasId,
            "alias_updated",
            ctx.pgTenant.externalSubject,
            { aliasType: input.aliasType }
          );
          return rows[0];
        });
      } catch (error) {
        return controlledError(error);
      }
    }),

  setAliasStatus: pgProtectedProcedure
    .input(
      branchEntity.extend({ aliasId: z.string().uuid(), active: z.boolean() })
    )
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.pgTenant.tenantRole);
      try {
        return await withTenantTransaction(ctx.pgTenant.tenantId, async tx => {
          const table =
            input.entityType === "solution"
              ? "system_solution_aliases"
              : "asset_aliases";
          const column =
            input.entityType === "solution" ? "system_solution_id" : "asset_id";
          const rows = await tx.unsafe<{ id: string }[]>(
            `UPDATE ${table} SET active=$1, updated_by=$2
        WHERE id=$3::uuid AND branch_id=$4::uuid AND ${column}=$5::uuid RETURNING id::text`,
            [
              input.active,
              ctx.pgTenant.externalSubject,
              input.aliasId,
              input.branchId,
              input.entityId,
            ]
          );
          if (rows.length !== 1)
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Alias was not found",
            });
          await audit(
            tx,
            input.entityType,
            ctx.pgTenant.tenantId,
            input.entityId,
            input.aliasId,
            input.active ? "alias_reactivated" : "alias_deactivated",
            ctx.pgTenant.externalSubject,
            {}
          );
          return rows[0];
        });
      } catch (error) {
        return controlledError(error);
      }
    }),

  resolve: pgProtectedProcedure
    .input(
      z.object({
        branchId: z.string().uuid(),
        entityType,
        identifier: z.string().trim().min(1).max(255),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        return await withTenantTransaction(ctx.pgTenant.tenantId, async tx => {
          const entityTable =
            input.entityType === "solution" ? "system_solutions" : "assets";
          const codeColumn =
            input.entityType === "solution" ? "code" : "asset_code";
          const aliasTable =
            input.entityType === "solution"
              ? "system_solution_aliases"
              : "asset_aliases";
          const entityColumn =
            input.entityType === "solution" ? "system_solution_id" : "asset_id";
          const rows = await tx.unsafe<
            { id: string; code: string; matchedBy: string }[]
          >(
            `
        SELECT id::text, ${codeColumn} AS code, 'uuid' AS "matchedBy" FROM ${entityTable}
          WHERE branch_id=$1::uuid AND id::text=$2
        UNION ALL SELECT id::text, ${codeColumn}, 'code' FROM ${entityTable}
          WHERE branch_id=$1::uuid AND lower(${codeColumn})=lower($2) AND NOT EXISTS (SELECT 1 FROM ${entityTable} WHERE branch_id=$1::uuid AND id::text=$2)
        UNION ALL SELECT e.id::text, e.${codeColumn}, 'alias' FROM ${entityTable} e JOIN ${aliasTable} a ON a.tenant_id=e.tenant_id AND a.${entityColumn}=e.id
          WHERE e.branch_id=$1::uuid AND a.branch_id=$1::uuid AND a.active AND a.normalized_value=horos_normalize_alias($2)
            AND NOT EXISTS (SELECT 1 FROM ${entityTable} WHERE branch_id=$1::uuid AND (id::text=$2 OR lower(${codeColumn})=lower($2)))`,
            [input.branchId, input.identifier]
          );
          if (rows.length === 0)
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Identifier did not resolve to an entity",
            });
          if (rows.length !== 1)
            throw new TRPCError({
              code: "CONFLICT",
              message: "Identifier resolution is ambiguous",
            });
          return rows[0];
        });
      } catch (error) {
        return controlledError(error);
      }
    }),

  search: pgProtectedProcedure
    .input(
      z.object({
        branchId: z.string().uuid(),
        entityType,
        query: z.string().trim().min(1).max(255),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        return await withTenantTransaction(ctx.pgTenant.tenantId, tx => {
          const entityTable =
            input.entityType === "solution" ? "system_solutions" : "assets";
          const codeColumn =
            input.entityType === "solution" ? "code" : "asset_code";
          const nameExpr =
            input.entityType === "solution"
              ? "e.name"
              : "concat_ws(' ', e.manufacturer, e.model)";
          const aliasTable =
            input.entityType === "solution"
              ? "system_solution_aliases"
              : "asset_aliases";
          const entityColumn =
            input.entityType === "solution" ? "system_solution_id" : "asset_id";
          return tx.unsafe<Array<{ id: string; code: string; name: string }>>(
            `SELECT DISTINCT e.id::text, e.${codeColumn} AS code, ${nameExpr} AS name
        FROM ${entityTable} e LEFT JOIN ${aliasTable} a ON a.tenant_id=e.tenant_id AND a.${entityColumn}=e.id AND a.active
        WHERE e.branch_id=$1::uuid AND (e.${codeColumn} ILIKE '%'||$2||'%' OR ${nameExpr} ILIKE '%'||$2||'%' OR a.alias_value ILIKE '%'||$2||'%')
        ORDER BY code, 1 LIMIT 50`,
            [input.branchId, input.query]
          );
        });
      } catch (error) {
        return controlledError(error);
      }
    }),
});
