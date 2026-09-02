import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  pgProtectedProcedure,
  router,
} from "../_core/trpc";
import {
  withTenantTransaction,
} from "../db.pg";
import { storagePut } from "../storage";

const evidencePhaseSchema = z.enum([
  "before",
  "during",
  "after",
  "general",
]);

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

function safeFileName(name: string) {
  const cleaned = name
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "");

  return cleaned || "evidence-file";
}

function actorName(ctx: {
  user: {
    name?: string | null;
    email?: string | null;
  };
}) {
  return ctx.user.name ?? ctx.user.email ?? "HOROS user";
}

async function resolveActorUserId(
  tx: Parameters<Parameters<typeof withTenantTransaction>[1]>[0],
  tenantId: string,
  externalSubject: string,
) {
  const rows = await tx<{ userId: string }[]>`
    SELECT u.id::text AS "userId"
    FROM tenant_users tu
    JOIN users u
      ON u.id = tu.user_id
    WHERE tu.tenant_id = ${tenantId}::uuid
      AND u.external_subject = ${externalSubject}
      AND tu.is_active = true
      AND u.is_active = true
    LIMIT 1
  `;

  return rows[0]?.userId ?? null;
}

export const canonicalMaintenanceEvidenceRouter = router({
  upload:
    pgProtectedProcedure
      .input(
        z.object({
          workOrderId: z.string().uuid(),
          workOrderAssetId: z.string().uuid().optional(),
          findingId: z.string().uuid().optional(),
          evidencePhase: evidencePhaseSchema.default("general"),
          fileName: z.string().trim().min(1).max(255),
          mimeType: z.string().trim().min(1).max(128),
          fileBase64: z.string().min(1).max(30_000_000),
          caption: z.string().trim().max(5000).optional(),
          takenAt: z.coerce.date().optional(),
          sortOrder: z.number().int().min(0).max(100000).default(0),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        if (!allowedMimeTypes.has(input.mimeType)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Evidence must be JPEG, PNG, WEBP or PDF",
          });
        }

        const buffer = Buffer.from(input.fileBase64, "base64");
        const maxBytes = 20 * 1024 * 1024;
        if (buffer.length === 0 || buffer.length > maxBytes) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Evidence file must be between 1 byte and 20 MB",
          });
        }

        const validated = await withTenantTransaction(
          ctx.pgTenant.tenantId,
          async tx => {
            const orders = await tx<{
              id: string;
              status: string;
            }[]>`
              SELECT
                id::text AS "id",
                status
              FROM maintenance_work_orders
              WHERE id = ${input.workOrderId}::uuid
              LIMIT 1
            `;

            const order = orders[0];
            if (!order) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Canonical maintenance work order was not found",
              });
            }

            if (!["in_progress", "completed"].includes(order.status)) {
              throw new TRPCError({
                code: "CONFLICT",
                message: "Evidence can only be uploaded during or after maintenance execution",
              });
            }

            if (input.workOrderAssetId) {
              const assetRows = await tx<{ id: string; assetId: string }[]>`
                SELECT
                  id::text AS "id",
                  asset_id::text AS "assetId"
                FROM maintenance_work_order_assets
                WHERE id = ${input.workOrderAssetId}::uuid
                  AND work_order_id = ${input.workOrderId}::uuid
                LIMIT 1
              `;

              if (assetRows.length !== 1) {
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message: "Evidence asset is not part of this work order",
                });
              }
            }

            if (input.findingId) {
              const findingRows = await tx<{ id: string }[]>`
                SELECT id::text AS "id"
                FROM maintenance_findings
                WHERE id = ${input.findingId}::uuid
                  AND work_order_id = ${input.workOrderId}::uuid
                LIMIT 1
              `;

              if (findingRows.length !== 1) {
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message: "Evidence finding is not part of this work order",
                });
              }
            }

            return { status: order.status };
          },
        );

        const fileName = safeFileName(input.fileName);
        const assetPath = input.workOrderAssetId ?? "general";
        const requestedKey = [
          "maintenance",
          ctx.pgTenant.tenantId,
          input.workOrderId,
          assetPath,
          input.evidencePhase,
          `${Date.now()}-${fileName}`,
        ].join("/");

        let stored: { key: string; url: string };
        try {
          stored = await storagePut(
            requestedKey,
            buffer,
            input.mimeType,
          );
        } catch (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              error instanceof Error
                ? `Evidence storage failed: ${error.message}`
                : "Evidence storage failed",
          });
        }

        return withTenantTransaction(
          ctx.pgTenant.tenantId,
          async tx => {
            const uploaderUserId = await resolveActorUserId(
              tx,
              ctx.pgTenant.tenantId,
              ctx.pgTenant.externalSubject,
            );

            const rows = await tx<{ id: string }[]>`
              INSERT INTO maintenance_evidence (
                tenant_id,
                work_order_id,
                work_order_asset_id,
                finding_id,
                evidence_phase,
                media_type,
                file_name,
                mime_type,
                storage_key,
                file_url,
                caption,
                taken_at,
                uploaded_by_user_id,
                sort_order
              )
              VALUES (
                ${ctx.pgTenant.tenantId}::uuid,
                ${input.workOrderId}::uuid,
                ${input.workOrderAssetId ?? null}::uuid,
                ${input.findingId ?? null}::uuid,
                ${input.evidencePhase},
                ${input.mimeType === "application/pdf" ? "document" : "photo"},
                ${fileName},
                ${input.mimeType},
                ${stored.key},
                ${stored.url},
                ${input.caption ?? null},
                ${input.takenAt ?? null},
                ${uploaderUserId}::uuid,
                ${input.sortOrder}
              )
              RETURNING id::text AS "id"
            `;

            const evidence = rows[0]!;

            await tx`
              INSERT INTO maintenance_work_order_events (
                tenant_id,
                work_order_id,
                event_type,
                actor_user_id,
                actor_name,
                message,
                metadata
              )
              VALUES (
                ${ctx.pgTenant.tenantId}::uuid,
                ${input.workOrderId}::uuid,
                'evidence_added',
                ${uploaderUserId}::uuid,
                ${actorName(ctx)},
                ${`${input.evidencePhase} evidence uploaded: ${fileName}`},
                ${JSON.stringify({
                  evidenceId: evidence.id,
                  workOrderAssetId: input.workOrderAssetId ?? null,
                  findingId: input.findingId ?? null,
                  phase: input.evidencePhase,
                  mimeType: input.mimeType,
                  bytes: buffer.length,
                  orderStatus: validated.status,
                })}::jsonb
              )
            `;

            return {
              id: evidence.id,
              key: stored.key,
              url: stored.url,
              fileName,
              mimeType: input.mimeType,
              bytes: buffer.length,
            };
          },
        );
      }),
});
