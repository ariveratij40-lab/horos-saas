import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  floorPlans,
  floorPlanLayers,
  floorPlanAnnotations,
} from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { storagePut } from "../storage";
import { TRPCError } from "@trpc/server";
import { ENV } from "../_core/env";

// ─── FLOOR PLANS ─────────────────────────────────────────────────────────────
export const floorPlansRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const tenantId = ctx.user.tenantId ?? 1;
    return db
      .select()
      .from(floorPlans)
      .where(eq(floorPlans.tenantId, tenantId))
      .orderBy(floorPlans.createdAt);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const tenantId = ctx.user.tenantId ?? 1;
      const [plan] = await db
        .select()
        .from(floorPlans)
        .where(and(eq(floorPlans.id, input.id), eq(floorPlans.tenantId, tenantId)));
      if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "Plano no encontrado" });
      return plan;
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        building: z.string().optional(),
        floor: z.string().optional(),
        format: z.enum(["pdf", "dwg", "dxf", "png", "jpg"]).default("pdf"),
        dimensions: z.string().optional(),
        scale: z.string().optional(),
        status: z.enum(["active", "inactive", "draft"]).default("active"),
        fileKey: z.string().optional(),
        fileUrl: z.string().optional(),
        fileSize: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const tenantId = ctx.user.tenantId ?? 1;
      const [result] = await db.insert(floorPlans).values({
        ...input,
        tenantId,
      });
      return { id: (result as any).insertId };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        building: z.string().optional(),
        floor: z.string().optional(),
        format: z.enum(["pdf", "dwg", "dxf", "png", "jpg"]).optional(),
        dimensions: z.string().optional(),
        scale: z.string().optional(),
        status: z.enum(["active", "inactive", "draft"]).optional(),
        fileKey: z.string().optional(),
        fileUrl: z.string().optional(),
        fileSize: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const tenantId = ctx.user.tenantId ?? 1;
      const { id, ...data } = input;
      await db
        .update(floorPlans)
        .set(data)
        .where(and(eq(floorPlans.id, id), eq(floorPlans.tenantId, tenantId)));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const tenantId = ctx.user.tenantId ?? 1;
      // Delete annotations first
      await db
        .delete(floorPlanAnnotations)
        .where(
          and(
            eq(floorPlanAnnotations.planId, input.id),
            eq(floorPlanAnnotations.tenantId, tenantId)
          )
        );
      await db
        .delete(floorPlans)
        .where(and(eq(floorPlans.id, input.id), eq(floorPlans.tenantId, tenantId)));
      return { success: true };
    }),

  /**
   * Upload file directly to S3 via base64 (for files up to ~20 MB via tRPC).
   * For larger files (>20 MB), use getUploadUrl to get a presigned URL and upload directly from the browser.
   */
  uploadFile: protectedProcedure
    .input(
      z.object({
        planId: z.number(),
        fileName: z.string(),
        fileBase64: z.string(),
        mimeType: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const tenantId = ctx.user.tenantId ?? 1;
      const buffer = Buffer.from(input.fileBase64, "base64");
      const key = `floor-plans/${tenantId}/${input.planId}/${Date.now()}-${input.fileName}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      // Update plan with file info
      await db
        .update(floorPlans)
        .set({ fileKey: key, fileUrl: url, fileSize: buffer.length })
        .where(and(eq(floorPlans.id, input.planId), eq(floorPlans.tenantId, tenantId)));
      return { key, url };
    }),

  /**
   * Generate a presigned URL for direct browser-to-S3 upload (for files >20 MB).
   * The browser uploads directly to S3, then calls confirmUpload with the key.
   */
  getUploadUrl: protectedProcedure
    .input(
      z.object({
        planId: z.number(),
        fileName: z.string(),
        mimeType: z.string(),
        fileSize: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId ?? 1;
      const key = `floor-plans/${tenantId}/${input.planId}/${Date.now()}-${input.fileName}`;

      // Use Manus built-in storage API to get a presigned upload URL
      const apiUrl = ENV.builtInForgeApiUrl;
      const apiKey = ENV.builtInForgeApiKey;

      if (!apiUrl || !apiKey) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Storage API not configured",
        });
      }

      try {
        const response = await fetch(`${apiUrl}/storage/presign-upload`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            key,
            contentType: input.mimeType,
            expiresIn: 3600,
          }),
        });

        if (!response.ok) {
          // Fallback: return a direct upload endpoint
          throw new Error("Presign API not available");
        }

        const data = await response.json() as { uploadUrl: string; url: string };
        return {
          uploadUrl: data.uploadUrl,
          key,
          fileUrl: data.url,
        };
      } catch {
        // Fallback: tell client to use the uploadFile endpoint with chunked base64
        return {
          uploadUrl: null,
          key,
          fileUrl: `/manus-storage/${key}`,
          useChunked: true,
        };
      }
    }),

  confirmUpload: protectedProcedure
    .input(
      z.object({
        planId: z.number(),
        key: z.string(),
        fileUrl: z.string(),
        fileSize: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const tenantId = ctx.user.tenantId ?? 1;
      await db
        .update(floorPlans)
        .set({ fileKey: input.key, fileUrl: input.fileUrl, fileSize: input.fileSize })
        .where(and(eq(floorPlans.id, input.planId), eq(floorPlans.tenantId, tenantId)));
      return { success: true };
    }),
});

// ─── FLOOR PLAN LAYERS ───────────────────────────────────────────────────────
export const floorPlanLayersRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const tenantId = ctx.user.tenantId ?? 1;
    return db
      .select()
      .from(floorPlanLayers)
      .where(eq(floorPlanLayers.tenantId, tenantId))
      .orderBy(floorPlanLayers.createdAt);
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).regex(/^[a-z0-9_]+$/, "Solo minúsculas, números y guiones bajos"),
        label: z.string().min(1),
        color: z.string().default("#3b82f6"),
        icon: z.string().default("📍"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const tenantId = ctx.user.tenantId ?? 1;
      const [result] = await db.insert(floorPlanLayers).values({ ...input, tenantId });
      return { id: (result as any).insertId };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        label: z.string().min(1).optional(),
        color: z.string().optional(),
        icon: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const tenantId = ctx.user.tenantId ?? 1;
      const { id, ...data } = input;
      await db
        .update(floorPlanLayers)
        .set(data)
        .where(and(eq(floorPlanLayers.id, id), eq(floorPlanLayers.tenantId, tenantId)));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const tenantId = ctx.user.tenantId ?? 1;
      await db
        .delete(floorPlanLayers)
        .where(and(eq(floorPlanLayers.id, input.id), eq(floorPlanLayers.tenantId, tenantId)));
      return { success: true };
    }),
});

// ─── FLOOR PLAN ANNOTATIONS ──────────────────────────────────────────────────
export const floorPlanAnnotationsRouter = router({
  listByPlan: protectedProcedure
    .input(z.object({ planId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const tenantId = ctx.user.tenantId ?? 1;
      return db
        .select()
        .from(floorPlanAnnotations)
        .where(
          and(
            eq(floorPlanAnnotations.planId, input.planId),
            eq(floorPlanAnnotations.tenantId, tenantId)
          )
        )
        .orderBy(floorPlanAnnotations.createdAt);
    }),

  create: protectedProcedure
    .input(
      z.object({
        planId: z.number(),
        layerId: z.number().optional(),
        type: z.string().default("marker"),
        x: z.string(),
        y: z.string(),
        label: z.string().optional(),
        color: z.string().optional(),
        icon: z.string().optional(),
        data: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const tenantId = ctx.user.tenantId ?? 1;
      const [result] = await db.insert(floorPlanAnnotations).values({ ...input, tenantId });
      return { id: (result as any).insertId };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        label: z.string().optional(),
        x: z.string().optional(),
        y: z.string().optional(),
        data: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const tenantId = ctx.user.tenantId ?? 1;
      const { id, ...data } = input;
      await db
        .update(floorPlanAnnotations)
        .set(data)
        .where(and(eq(floorPlanAnnotations.id, id), eq(floorPlanAnnotations.tenantId, tenantId)));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const tenantId = ctx.user.tenantId ?? 1;
      await db
        .delete(floorPlanAnnotations)
        .where(
          and(
            eq(floorPlanAnnotations.id, input.id),
            eq(floorPlanAnnotations.tenantId, tenantId)
          )
        );
      return { success: true };
    }),
});
