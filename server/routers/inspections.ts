import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { pgProtectedProcedure, router } from "../_core/trpc";
import { withTenantBranchTransaction } from "../db.pg";

const uuid = z.string().uuid();
const branch = z.object({ branchId: uuid, tenantId: uuid.optional() });
const responseType = z.enum([
  "PASS_FAIL",
  "YES_NO",
  "TEXT",
  "NUMBER",
  "DATE",
  "SINGLE_CHOICE",
  "MULTI_CHOICE",
  "PHOTO_REQUIRED",
]);
const outcome = z.enum([
  "PENDING",
  "PASS",
  "FAIL",
  "NOT_APPLICABLE",
  "NEEDS_FINDING_WORKFLOW",
]);
const inBranch = <T>(
  ctx: { pgTenant: { tenantId: string } },
  branchId: string,
  fn: Parameters<typeof withTenantBranchTransaction<T>>[2]
) => withTenantBranchTransaction(ctx.pgTenant.tenantId, branchId, fn);
function admin(role: string) {
  if (role !== "admin")
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Administrator permission is required",
    });
}
function controlled(error: unknown): never {
  if (error instanceof TRPCError) throw error;
  const code =
    typeof error === "object" && error && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";
  if (code === "23505")
    throw new TRPCError({
      code: "CONFLICT",
      message:
        "A canonical inspection record already uses that code, version, or order",
    });
  if (["23503", "23514", "P0002"].includes(code))
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Inspection context, lifecycle, target, or response is invalid",
    });
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Canonical inspection operation failed",
  });
}
async function actorUser(tx: any, tenantId: string, subject: string) {
  const rows = await tx<
    { id: string }[]
  >`SELECT u.id::text id FROM users u JOIN tenant_users tu ON tu.user_id=u.id AND tu.tenant_id=${tenantId}::uuid AND tu.is_active WHERE u.external_subject=${subject} AND u.is_active LIMIT 1`;
  if (rows.length !== 1)
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Active canonical user membership is required",
    });
  return rows[0].id;
}
async function audit(
  tx: any,
  tenantId: string,
  branchId: string,
  type: string,
  id: string,
  event: string,
  actor: string,
  details: object = {}
) {
  await tx`INSERT INTO inspection_events(tenant_id,branch_id,entity_type,entity_id,event_type,actor_external_subject,details) VALUES(${tenantId}::uuid,${branchId}::uuid,${type},${id}::uuid,${event},${actor},${tx.json(details)})`;
}

export const inspectionsRouter = router({
  context: pgProtectedProcedure.input(branch).query(({ ctx, input }) =>
    inBranch(ctx, input.branchId, async tx => ({
      canManage: ctx.pgTenant.tenantRole === "admin",
      assets:
        await tx`SELECT id::text,asset_code AS "assetCode" FROM assets ORDER BY asset_code`,
      templates:
        await tx`SELECT id::text,code,name,version,status FROM inspection_templates ORDER BY code,version DESC`,
    }))
  ),
  listComponents: pgProtectedProcedure
    .input(branch.extend({ assetId: uuid }))
    .query(({ ctx, input }) =>
      inBranch(
        ctx,
        input.branchId,
        tx =>
          tx`SELECT id::text,asset_id::text AS "assetId",parent_component_id::text AS "parentComponentId",replaces_component_id::text AS "replacesComponentId",code,name,component_type AS "componentType",manufacturer,model,serial_number AS "serialNumber",status,replaceable,description,active FROM asset_components WHERE asset_id=${input.assetId}::uuid ORDER BY code`
      )
    ),
  getComponent: pgProtectedProcedure
    .input(branch.extend({ id: uuid }))
    .query(async ({ ctx, input }) => {
      const r = await inBranch(
        ctx,
        input.branchId,
        tx => tx`SELECT * FROM asset_components WHERE id=${input.id}::uuid`
      );
      if (!r.length)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Component was not found",
        });
      return r[0];
    }),
  createComponent: pgProtectedProcedure
    .input(
      branch.extend({
        assetId: uuid,
        parentComponentId: uuid.nullable().optional(),
        code: z.string().trim().min(1).max(64),
        name: z.string().trim().min(1).max(255),
        componentType: z.string().trim().min(1).max(64),
        manufacturer: z.string().max(255).nullable().optional(),
        model: z.string().max(255).nullable().optional(),
        serialNumber: z.string().max(255).nullable().optional(),
        replaceable: z.boolean().default(true),
        description: z.string().max(5000).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      admin(ctx.pgTenant.tenantRole);
      try {
        return await inBranch(ctx, input.branchId, async tx => {
          const id = randomUUID();
          await tx`INSERT INTO asset_components(id,tenant_id,branch_id,asset_id,parent_component_id,code,name,component_type,manufacturer,model,serial_number,replaceable,description,created_by,updated_by) VALUES(${id}::uuid,${ctx.pgTenant.tenantId}::uuid,${input.branchId}::uuid,${input.assetId}::uuid,${input.parentComponentId ?? null}::uuid,${input.code.toUpperCase()},${input.name},${input.componentType},${input.manufacturer ?? null},${input.model ?? null},${input.serialNumber ?? null},${input.replaceable},${input.description ?? null},${ctx.pgTenant.externalSubject},${ctx.pgTenant.externalSubject})`;
          await audit(
            tx,
            ctx.pgTenant.tenantId,
            input.branchId,
            "COMPONENT",
            id,
            "component_created",
            ctx.pgTenant.externalSubject
          );
          return { id };
        });
      } catch (e) {
        controlled(e);
      }
    }),
  updateComponent: pgProtectedProcedure
    .input(
      branch.extend({
        id: uuid,
        parentComponentId: uuid.nullable().optional(),
        name: z.string().trim().min(1).max(255),
        componentType: z.string().trim().min(1).max(64),
        status: z.enum([
          "INSTALLED",
          "IN_SERVICE",
          "FAILED",
          "REMOVED",
          "REPLACED",
          "INACTIVE",
        ]),
        description: z.string().max(5000).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      admin(ctx.pgTenant.tenantRole);
      try {
        return await inBranch(ctx, input.branchId, async tx => {
          const before =
            await tx`SELECT name,status,parent_component_id FROM asset_components WHERE id=${input.id}::uuid`;
          const r =
            await tx`UPDATE asset_components SET parent_component_id=${input.parentComponentId ?? null}::uuid,name=${input.name},component_type=${input.componentType},status=${input.status},description=${input.description ?? null},updated_by=${ctx.pgTenant.externalSubject} WHERE id=${input.id}::uuid RETURNING id`;
          if (!r.length)
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Component was not found",
            });
          await audit(
            tx,
            ctx.pgTenant.tenantId,
            input.branchId,
            "COMPONENT",
            input.id,
            "component_updated",
            ctx.pgTenant.externalSubject,
            { before: before[0] }
          );
          return { id: input.id };
        });
      } catch (e) {
        controlled(e);
      }
    }),
  deactivateComponent: pgProtectedProcedure
    .input(branch.extend({ id: uuid }))
    .mutation(async ({ ctx, input }) => {
      admin(ctx.pgTenant.tenantRole);
      return inBranch(ctx, input.branchId, async tx => {
        const r =
          await tx`UPDATE asset_components SET active=false,status='INACTIVE',updated_by=${ctx.pgTenant.externalSubject} WHERE id=${input.id}::uuid RETURNING id`;
        if (!r.length)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Component was not found",
          });
        await audit(
          tx,
          ctx.pgTenant.tenantId,
          input.branchId,
          "COMPONENT",
          input.id,
          "component_deactivated",
          ctx.pgTenant.externalSubject
        );
        return { id: input.id };
      });
    }),
  replaceComponent: pgProtectedProcedure
    .input(
      branch.extend({
        id: uuid,
        code: z.string().trim().min(1).max(64),
        name: z.string().trim().min(1).max(255),
        componentType: z.string().trim().min(1).max(64),
      })
    )
    .mutation(async ({ ctx, input }) => {
      admin(ctx.pgTenant.tenantRole);
      try {
        return await inBranch(ctx, input.branchId, async tx => {
          const old = await tx<
            { assetId: string; parentId: string | null }[]
          >`SELECT asset_id::text AS "assetId",parent_component_id::text AS "parentId" FROM asset_components WHERE id=${input.id}::uuid AND active FOR UPDATE`;
          if (!old.length)
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Active component was not found",
            });
          const id = randomUUID();
          await tx`UPDATE asset_components SET active=false,status='REPLACED',replaced_at=now(),updated_by=${ctx.pgTenant.externalSubject} WHERE id=${input.id}::uuid`;
          await tx`INSERT INTO asset_components(id,tenant_id,branch_id,asset_id,parent_component_id,replaces_component_id,code,name,component_type,created_by,updated_by) VALUES(${id}::uuid,${ctx.pgTenant.tenantId}::uuid,${input.branchId}::uuid,${old[0].assetId}::uuid,${old[0].parentId}::uuid,${input.id}::uuid,${input.code.toUpperCase()},${input.name},${input.componentType},${ctx.pgTenant.externalSubject},${ctx.pgTenant.externalSubject})`;
          await audit(
            tx,
            ctx.pgTenant.tenantId,
            input.branchId,
            "COMPONENT",
            id,
            "component_replaced",
            ctx.pgTenant.externalSubject,
            { replaces: input.id }
          );
          return { id };
        });
      } catch (e) {
        controlled(e);
      }
    }),

  listTemplates: pgProtectedProcedure
    .input(branch)
    .query(({ ctx, input }) =>
      inBranch(
        ctx,
        input.branchId,
        tx =>
          tx`SELECT id::text,code,name,description,version,previous_version_id::text AS "previousVersionId",status,published_at AS "publishedAt",retired_at AS "retiredAt" FROM inspection_templates ORDER BY code,version DESC`
      )
    ),
  getTemplate: pgProtectedProcedure
    .input(branch.extend({ id: uuid }))
    .query(async ({ ctx, input }) =>
      inBranch(ctx, input.branchId, async tx => {
        const h =
          await tx`SELECT * FROM inspection_templates WHERE id=${input.id}::uuid`;
        if (!h.length)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Template was not found",
          });
        return {
          ...h[0],
          items:
            await tx`SELECT id::text,code,title,instructions,response_type AS "responseType",required,allow_not_applicable AS "allowNotApplicable",require_na_explanation AS "requireNaExplanation",options,expected_value AS "expectedValue",severity_on_failure AS "severityOnFailure",sequence,active FROM inspection_template_items WHERE template_id=${input.id}::uuid ORDER BY sequence`,
        };
      })
    ),
  createTemplate: pgProtectedProcedure
    .input(
      branch.extend({
        code: z.string().trim().min(1).max(64),
        name: z.string().trim().min(1).max(255),
        description: z.string().max(5000).nullable().optional(),
        branchSystemId: uuid.nullable().optional(),
        systemSolutionId: uuid.nullable().optional(),
        assetTypeId: uuid.nullable().optional(),
        assetId: uuid.nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      admin(ctx.pgTenant.tenantRole);
      try {
        return await inBranch(ctx, input.branchId, async tx => {
          const id = randomUUID();
          await tx`INSERT INTO inspection_templates(id,tenant_id,branch_id,code,name,description,branch_system_id,system_solution_id,asset_type_id,asset_id,created_by,updated_by) VALUES(${id}::uuid,${ctx.pgTenant.tenantId}::uuid,${input.branchId}::uuid,${input.code.toUpperCase()},${input.name},${input.description ?? null},${input.branchSystemId ?? null}::uuid,${input.systemSolutionId ?? null}::uuid,${input.assetTypeId ?? null}::uuid,${input.assetId ?? null}::uuid,${ctx.pgTenant.externalSubject},${ctx.pgTenant.externalSubject})`;
          await audit(
            tx,
            ctx.pgTenant.tenantId,
            input.branchId,
            "TEMPLATE",
            id,
            "template_created",
            ctx.pgTenant.externalSubject
          );
          return { id };
        });
      } catch (e) {
        controlled(e);
      }
    }),
  addItem: pgProtectedProcedure
    .input(
      branch.extend({
        templateId: uuid,
        code: z.string().trim().min(1).max(64),
        title: z.string().trim().min(1).max(500),
        instructions: z.string().max(10000).nullable().optional(),
        responseType,
        required: z.boolean().default(true),
        allowNotApplicable: z.boolean().default(false),
        requireNaExplanation: z.boolean().default(false),
        options: z
          .array(z.string().trim().min(1).max(255))
          .min(1)
          .nullable()
          .optional(),
        expectedValue: z.unknown().optional(),
        severityOnFailure: z
          .enum(["info", "low", "medium", "high", "critical"])
          .nullable()
          .optional(),
        sequence: z.number().int().nonnegative(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      admin(ctx.pgTenant.tenantRole);
      try {
        return await inBranch(ctx, input.branchId, async tx => {
          const id = randomUUID();
          await tx`INSERT INTO inspection_template_items(id,tenant_id,branch_id,template_id,code,title,instructions,response_type,required,allow_not_applicable,require_na_explanation,options,expected_value,severity_on_failure,sequence) VALUES(${id}::uuid,${ctx.pgTenant.tenantId}::uuid,${input.branchId}::uuid,${input.templateId}::uuid,${input.code.toUpperCase()},${input.title},${input.instructions ?? null},${input.responseType},${input.required},${input.allowNotApplicable},${input.requireNaExplanation},${input.options ? tx.json(input.options) : null},${input.expectedValue === undefined ? null : tx.json(input.expectedValue as any)},${input.severityOnFailure ?? null},${input.sequence})`;
          await audit(
            tx,
            ctx.pgTenant.tenantId,
            input.branchId,
            "ITEM",
            id,
            "item_created",
            ctx.pgTenant.externalSubject
          );
          return { id };
        });
      } catch (e) {
        controlled(e);
      }
    }),
  updateItem: pgProtectedProcedure
    .input(
      branch.extend({
        id: uuid,
        title: z.string().trim().min(1).max(500),
        instructions: z.string().max(10000).nullable().optional(),
        required: z.boolean(),
        allowNotApplicable: z.boolean(),
        sequence: z.number().int().nonnegative(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      admin(ctx.pgTenant.tenantRole);
      try {
        return await inBranch(ctx, input.branchId, async tx => {
          const r =
            await tx`UPDATE inspection_template_items SET title=${input.title},instructions=${input.instructions ?? null},required=${input.required},allow_not_applicable=${input.allowNotApplicable},sequence=${input.sequence} WHERE id=${input.id}::uuid RETURNING id`;
          if (!r.length)
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Template item was not found",
            });
          await audit(
            tx,
            ctx.pgTenant.tenantId,
            input.branchId,
            "ITEM",
            input.id,
            "item_updated",
            ctx.pgTenant.externalSubject
          );
          return { id: input.id };
        });
      } catch (e) {
        controlled(e);
      }
    }),
  reorderItems: pgProtectedProcedure
    .input(branch.extend({ templateId: uuid, itemIds: z.array(uuid).min(1) }))
    .mutation(async ({ ctx, input }) => {
      admin(ctx.pgTenant.tenantRole);
      try {
        return await inBranch(ctx, input.branchId, async tx => {
          await tx`UPDATE inspection_template_items SET sequence=sequence+100000 WHERE template_id=${input.templateId}::uuid`;
          for (
            let sequence = 0;
            sequence < input.itemIds.length;
            sequence += 1
          ) {
            const id = input.itemIds[sequence];
            await tx`UPDATE inspection_template_items SET sequence=${sequence} WHERE template_id=${input.templateId}::uuid AND id=${id}::uuid`;
          }
          await audit(
            tx,
            ctx.pgTenant.tenantId,
            input.branchId,
            "TEMPLATE",
            input.templateId,
            "items_reordered",
            ctx.pgTenant.externalSubject
          );
          return { updated: input.itemIds.length };
        });
      } catch (e) {
        controlled(e);
      }
    }),
  publishTemplate: pgProtectedProcedure
    .input(branch.extend({ id: uuid }))
    .mutation(async ({ ctx, input }) => {
      admin(ctx.pgTenant.tenantRole);
      try {
        return await inBranch(ctx, input.branchId, async tx => {
          const r =
            await tx`UPDATE inspection_templates t SET status='PUBLISHED',published_at=now(),updated_by=${ctx.pgTenant.externalSubject} WHERE id=${input.id}::uuid AND status='DRAFT' AND EXISTS(SELECT 1 FROM inspection_template_items i WHERE i.template_id=t.id AND i.active) RETURNING id`;
          if (!r.length)
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Only a non-empty draft can be published",
            });
          await audit(
            tx,
            ctx.pgTenant.tenantId,
            input.branchId,
            "TEMPLATE",
            input.id,
            "template_published",
            ctx.pgTenant.externalSubject
          );
          return { id: input.id };
        });
      } catch (e) {
        controlled(e);
      }
    }),
  newTemplateVersion: pgProtectedProcedure
    .input(branch.extend({ id: uuid }))
    .mutation(async ({ ctx, input }) => {
      admin(ctx.pgTenant.tenantRole);
      try {
        return await inBranch(ctx, input.branchId, async tx => {
          const id = randomUUID();
          const r =
            await tx`INSERT INTO inspection_templates(id,tenant_id,branch_id,code,name,description,version,previous_version_id,branch_system_id,system_solution_id,asset_type_id,asset_id,created_by,updated_by) SELECT ${id}::uuid,tenant_id,branch_id,code,name,description,version+1,id,branch_system_id,system_solution_id,asset_type_id,asset_id,${ctx.pgTenant.externalSubject},${ctx.pgTenant.externalSubject} FROM inspection_templates WHERE id=${input.id}::uuid AND status IN ('PUBLISHED','RETIRED') RETURNING id`;
          if (!r.length)
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "A new version requires a published or retired template",
            });
          await tx`INSERT INTO inspection_template_items(tenant_id,branch_id,template_id,code,title,instructions,response_type,required,allow_not_applicable,require_na_explanation,options,expected_value,severity_on_failure,sequence,active) SELECT tenant_id,branch_id,${id}::uuid,code,title,instructions,response_type,required,allow_not_applicable,require_na_explanation,options,expected_value,severity_on_failure,sequence,active FROM inspection_template_items WHERE template_id=${input.id}::uuid`;
          await audit(
            tx,
            ctx.pgTenant.tenantId,
            input.branchId,
            "TEMPLATE",
            id,
            "template_versioned",
            ctx.pgTenant.externalSubject,
            { previousVersionId: input.id }
          );
          return { id };
        });
      } catch (e) {
        controlled(e);
      }
    }),
  retireTemplate: pgProtectedProcedure
    .input(branch.extend({ id: uuid }))
    .mutation(async ({ ctx, input }) => {
      admin(ctx.pgTenant.tenantRole);
      try {
        return await inBranch(ctx, input.branchId, async tx => {
          const r =
            await tx`UPDATE inspection_templates SET status='RETIRED',retired_at=now(),updated_by=${ctx.pgTenant.externalSubject} WHERE id=${input.id}::uuid AND status='PUBLISHED' RETURNING id`;
          if (!r.length)
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Only a published template can be retired",
            });
          await audit(
            tx,
            ctx.pgTenant.tenantId,
            input.branchId,
            "TEMPLATE",
            input.id,
            "template_retired",
            ctx.pgTenant.externalSubject
          );
          return { id: input.id };
        });
      } catch (e) {
        controlled(e);
      }
    }),

  listInspections: pgProtectedProcedure
    .input(branch.extend({ assetId: uuid.optional() }))
    .query(({ ctx, input }) =>
      inBranch(
        ctx,
        input.branchId,
        tx =>
          tx`SELECT i.id::text,i.template_id::text AS "templateId",i.template_version AS "templateVersion",i.asset_id::text AS "assetId",i.component_id::text AS "componentId",i.status,i.started_at AS "startedAt",i.completed_at AS "completedAt",i.cancelled_at AS "cancelledAt",t.code AS "templateCode",t.name AS "templateName" FROM inspections i JOIN inspection_templates t ON t.id=i.template_id AND t.tenant_id=i.tenant_id WHERE (${input.assetId ?? null}::uuid IS NULL OR i.asset_id=${input.assetId ?? null}::uuid) ORDER BY i.created_at DESC`
      )
    ),
  getInspection: pgProtectedProcedure
    .input(branch.extend({ id: uuid }))
    .query(async ({ ctx, input }) =>
      inBranch(ctx, input.branchId, async tx => {
        const h =
          await tx`SELECT i.*,t.code AS template_code,t.name AS template_name FROM inspections i JOIN inspection_templates t ON t.id=i.template_id WHERE i.id=${input.id}::uuid`;
        if (!h.length)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Inspection was not found",
          });
        return {
          ...h[0],
          results:
            await tx`SELECT id::text,item_code_snapshot AS "itemCode",title_snapshot AS title,instructions_snapshot AS instructions,response_type_snapshot AS "responseType",options_snapshot AS options,required_snapshot AS required,allow_not_applicable_snapshot AS "allowNotApplicable",sequence_snapshot AS sequence,response,outcome,observation,maintenance_finding_id::text AS "maintenanceFindingId" FROM inspection_results WHERE inspection_id=${input.id}::uuid ORDER BY sequence_snapshot`,
        };
      })
    ),
  createInspection: pgProtectedProcedure
    .input(
      branch.extend({
        templateId: uuid,
        branchSystemId: uuid.nullable().optional(),
        systemSolutionId: uuid.nullable().optional(),
        assetId: uuid.nullable().optional(),
        componentId: uuid.nullable().optional(),
        maintenanceWorkOrderId: uuid.nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await inBranch(ctx, input.branchId, async tx => {
          const userId = await actorUser(
            tx,
            ctx.pgTenant.tenantId,
            ctx.pgTenant.externalSubject
          );
          const id = randomUUID();
          const r =
            await tx`INSERT INTO inspections(id,tenant_id,branch_id,template_id,template_version,branch_system_id,system_solution_id,asset_id,component_id,maintenance_work_order_id,inspector_user_id) SELECT ${id}::uuid,tenant_id,branch_id,id,version,${input.branchSystemId ?? null}::uuid,${input.systemSolutionId ?? null}::uuid,${input.assetId ?? null}::uuid,${input.componentId ?? null}::uuid,${input.maintenanceWorkOrderId ?? null}::uuid,${userId}::uuid FROM inspection_templates WHERE id=${input.templateId}::uuid AND status='PUBLISHED' RETURNING id`;
          if (!r.length)
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "A published template is required",
            });
          await audit(
            tx,
            ctx.pgTenant.tenantId,
            input.branchId,
            "INSPECTION",
            id,
            "inspection_created",
            ctx.pgTenant.externalSubject
          );
          return { id };
        });
      } catch (e) {
        controlled(e);
      }
    }),
  startInspection: pgProtectedProcedure
    .input(branch.extend({ id: uuid }))
    .mutation(async ({ ctx, input }) =>
      inBranch(ctx, input.branchId, async tx => {
        const r =
          await tx`UPDATE inspections SET status='IN_PROGRESS',started_at=COALESCE(started_at,now()) WHERE id=${input.id}::uuid AND status='DRAFT' RETURNING id`;
        if (!r.length)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Only a draft inspection can start",
          });
        await audit(
          tx,
          ctx.pgTenant.tenantId,
          input.branchId,
          "INSPECTION",
          input.id,
          "inspection_started",
          ctx.pgTenant.externalSubject
        );
        return { id: input.id };
      })
    ),
  saveResult: pgProtectedProcedure
    .input(
      branch.extend({
        id: uuid,
        response: z.unknown().nullable().optional(),
        outcome,
        observation: z.string().max(10000).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await inBranch(ctx, input.branchId, async tx => {
          const userId = await actorUser(
            tx,
            ctx.pgTenant.tenantId,
            ctx.pgTenant.externalSubject
          );
          const r =
            await tx`UPDATE inspection_results r SET response=${input.response === undefined || input.response === null ? null : tx.json(input.response as any)},outcome=${input.outcome},observation=${input.observation ?? null},inspected_at=now(),inspected_by=${userId}::uuid WHERE r.id=${input.id}::uuid AND EXISTS(SELECT 1 FROM inspections i WHERE i.id=r.inspection_id AND i.status IN ('DRAFT','IN_PROGRESS')) RETURNING r.inspection_id::text AS "inspectionId"`;
          if (!r.length)
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Only an open inspection result can be saved",
            });
          await audit(
            tx,
            ctx.pgTenant.tenantId,
            input.branchId,
            "RESULT",
            input.id,
            "result_saved",
            ctx.pgTenant.externalSubject
          );
          return { id: input.id };
        });
      } catch (e) {
        controlled(e);
      }
    }),
  completeInspection: pgProtectedProcedure
    .input(
      branch.extend({
        id: uuid,
        summary: z.string().max(10000).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await inBranch(ctx, input.branchId, async tx => {
          await tx`SELECT id FROM inspections WHERE id=${input.id}::uuid FOR UPDATE`;
          const pending =
            await tx`SELECT count(*)::int count FROM inspection_results WHERE inspection_id=${input.id}::uuid AND required_snapshot AND outcome='PENDING'`;
          if (Number(pending[0]?.count) > 0)
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Required inspection results remain pending",
            });
          const photo =
            await tx`SELECT count(*)::int count FROM inspection_results WHERE inspection_id=${input.id}::uuid AND response_type_snapshot='PHOTO_REQUIRED' AND required_snapshot AND outcome<>'NOT_APPLICABLE' AND NOT horos_photo_required_satisfied(id)`;
          if (Number(photo[0]?.count) > 0)
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Required photo evidence is not satisfied",
            });
          await tx`UPDATE inspection_results r SET outcome='NEEDS_FINDING_WORKFLOW' WHERE inspection_id=${input.id}::uuid AND outcome='FAIL' AND maintenance_finding_id IS NULL AND EXISTS(SELECT 1 FROM inspections i WHERE i.id=r.inspection_id AND i.maintenance_work_order_id IS NULL)`;
          const r =
            await tx`UPDATE inspections SET status='COMPLETED',completed_at=now(),summary=${input.summary ?? null} WHERE id=${input.id}::uuid AND status IN ('DRAFT','IN_PROGRESS') RETURNING id`;
          if (!r.length)
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Inspection is already terminal",
            });
          await audit(
            tx,
            ctx.pgTenant.tenantId,
            input.branchId,
            "INSPECTION",
            input.id,
            "inspection_completed",
            ctx.pgTenant.externalSubject
          );
          return { id: input.id };
        });
      } catch (e) {
        controlled(e);
      }
    }),
  cancelInspection: pgProtectedProcedure
    .input(
      branch.extend({ id: uuid, reason: z.string().trim().min(1).max(5000) })
    )
    .mutation(async ({ ctx, input }) =>
      inBranch(ctx, input.branchId, async tx => {
        const r =
          await tx`UPDATE inspections SET status='CANCELLED',cancelled_at=now(),cancellation_reason=${input.reason} WHERE id=${input.id}::uuid AND status IN ('DRAFT','IN_PROGRESS') RETURNING id`;
        if (!r.length)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Inspection is already terminal",
          });
        await audit(
          tx,
          ctx.pgTenant.tenantId,
          input.branchId,
          "INSPECTION",
          input.id,
          "inspection_cancelled",
          ctx.pgTenant.externalSubject
        );
        return { id: input.id };
      })
    ),
  associateFinding: pgProtectedProcedure
    .input(branch.extend({ resultId: uuid, findingId: uuid }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await inBranch(ctx, input.branchId, async tx => {
          const r =
            await tx`UPDATE inspection_results SET maintenance_finding_id=${input.findingId}::uuid,outcome=CASE WHEN outcome='NEEDS_FINDING_WORKFLOW' THEN 'FAIL' ELSE outcome END WHERE id=${input.resultId}::uuid RETURNING id`;
          if (!r.length)
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Inspection result was not found",
            });
          await audit(
            tx,
            ctx.pgTenant.tenantId,
            input.branchId,
            "RESULT",
            input.resultId,
            "finding_associated",
            ctx.pgTenant.externalSubject,
            { findingId: input.findingId }
          );
          return { id: input.resultId };
        });
      } catch (e) {
        controlled(e);
      }
    }),
});
