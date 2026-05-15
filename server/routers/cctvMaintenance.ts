/**
 * cctvMaintenance.ts
 * Router tRPC para la bitácora de mantenimiento por equipo CCTV.
 */
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { cctvMaintenanceLog } from "../../drizzle/schema";

// ─── Zod schemas ─────────────────────────────────────────────────────────────
const categoryEnum = z.enum(["cameras", "idfs", "licenses", "monitors", "servers", "switches", "ups"]);

const entrySchema = z.object({
  category: categoryEnum,
  itemId: z.number().int().positive(),
  itemName: z.string().nullish(),
  type: z.enum(["preventive", "corrective", "predictive", "inspection", "replacement", "upgrade", "other"]).default("preventive"),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).default("completed"),
  title: z.string().min(1, "El título es requerido"),
  description: z.string().nullish(),
  findings: z.string().nullish(),
  actions: z.string().nullish(),
  technician: z.string().nullish(),
  scheduledDate: z.string().nullish(),
  executedDate: z.string().nullish(),
  durationHours: z.number().nullish(),
  cost: z.number().nullish(),
  nextMaintenanceDate: z.string().nullish(),
  attachmentUrl: z.string().nullish(),
});

function toDate(s?: string | null): Date | undefined {
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const cctvMaintenanceRouter = router({

  // ── GET HISTORY ────────────────────────────────────────────────────────────
  getHistory: protectedProcedure
    .input(z.object({
      category: categoryEnum,
      itemId: z.number().int().positive(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const tenantId = ctx.user.tenantId;
      if (!tenantId) return [];
      const rows = await db
        .select()
        .from(cctvMaintenanceLog)
        .where(
          and(
            eq(cctvMaintenanceLog.tenantId, tenantId),
            eq(cctvMaintenanceLog.category, input.category),
            eq(cctvMaintenanceLog.itemId, input.itemId),
          )
        )
        .orderBy(desc(cctvMaintenanceLog.createdAt));
      return rows;
    }),

  // ── GET SUMMARY ────────────────────────────────────────────────────────────
  getSummary: protectedProcedure
    .input(z.object({
      category: categoryEnum,
      itemId: z.number().int().positive(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { total: 0, completed: 0, lastDate: null, lastTechnician: null, nextDate: null };
      const tenantId = ctx.user.tenantId;
      if (!tenantId) return { total: 0, completed: 0, lastDate: null, lastTechnician: null, nextDate: null };

      const rows = await db
        .select()
        .from(cctvMaintenanceLog)
        .where(
          and(
            eq(cctvMaintenanceLog.tenantId, tenantId),
            eq(cctvMaintenanceLog.category, input.category),
            eq(cctvMaintenanceLog.itemId, input.itemId),
          )
        )
        .orderBy(desc(cctvMaintenanceLog.executedDate));

      const total = rows.length;
      const completed = rows.filter((r) => r.status === "completed").length;
      const lastEntry = rows.find((r) => r.executedDate != null) ?? rows[0] ?? null;
      const nextEntry = rows
        .filter((r) => r.nextMaintenanceDate != null)
        .sort((a, b) => {
          const da = new Date(a.nextMaintenanceDate as Date).getTime();
          const db2 = new Date(b.nextMaintenanceDate as Date).getTime();
          return da - db2;
        })[0] ?? null;

      return {
        total,
        completed,
        lastDate: lastEntry?.executedDate ?? lastEntry?.scheduledDate ?? null,
        lastTechnician: lastEntry?.technician ?? null,
        nextDate: nextEntry?.nextMaintenanceDate ?? null,
      };
    }),

  // ── ADD ENTRY ──────────────────────────────────────────────────────────────
  addEntry: protectedProcedure
    .input(entrySchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const tenantId = ctx.user.tenantId;
      if (!tenantId) throw new Error("No tenantId");
      const [result] = await db.insert(cctvMaintenanceLog).values({
        tenantId,
        category: input.category,
        itemId: input.itemId,
        itemName: input.itemName ?? null,
        type: input.type,
        status: input.status,
        title: input.title,
        description: input.description ?? null,
        findings: input.findings ?? null,
        actions: input.actions ?? null,
        technician: input.technician ?? null,
        scheduledDate: toDate(input.scheduledDate),
        executedDate: toDate(input.executedDate),
        durationHours: input.durationHours != null ? String(input.durationHours) : null,
        cost: input.cost != null ? String(input.cost) : null,
        nextMaintenanceDate: toDate(input.nextMaintenanceDate),
        attachmentUrl: input.attachmentUrl ?? null,
        createdByUserId: ctx.user.id,
        createdByUserName: ctx.user.name ?? ctx.user.email ?? null,
      });
      return { success: true, id: (result as any).insertId };
    }),

  // ── UPDATE ENTRY ───────────────────────────────────────────────────────────
  updateEntry: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }).merge(entrySchema.partial()))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const tenantId = ctx.user.tenantId;
      if (!tenantId) throw new Error("No tenantId");
      const { id, ...rest } = input;
      const updateData: Record<string, unknown> = {};
      if (rest.type !== undefined) updateData.type = rest.type;
      if (rest.status !== undefined) updateData.status = rest.status;
      if (rest.title !== undefined) updateData.title = rest.title;
      if (rest.description !== undefined) updateData.description = rest.description;
      if (rest.findings !== undefined) updateData.findings = rest.findings;
      if (rest.actions !== undefined) updateData.actions = rest.actions;
      if (rest.technician !== undefined) updateData.technician = rest.technician;
      if (rest.scheduledDate !== undefined) updateData.scheduledDate = toDate(rest.scheduledDate);
      if (rest.executedDate !== undefined) updateData.executedDate = toDate(rest.executedDate);
      if (rest.durationHours !== undefined) updateData.durationHours = rest.durationHours != null ? String(rest.durationHours) : null;
      if (rest.cost !== undefined) updateData.cost = rest.cost != null ? String(rest.cost) : null;
      if (rest.nextMaintenanceDate !== undefined) updateData.nextMaintenanceDate = toDate(rest.nextMaintenanceDate);
      if (rest.attachmentUrl !== undefined) updateData.attachmentUrl = rest.attachmentUrl;

      await db
        .update(cctvMaintenanceLog)
        .set(updateData)
        .where(
          and(
            eq(cctvMaintenanceLog.id, id),
            eq(cctvMaintenanceLog.tenantId, tenantId),
          )
        );
      return { success: true };
    }),

  // ── DELETE ENTRY ───────────────────────────────────────────────────────────
  deleteEntry: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const tenantId = ctx.user.tenantId;
      if (!tenantId) throw new Error("No tenantId");
      await db
        .delete(cctvMaintenanceLog)
        .where(
          and(
            eq(cctvMaintenanceLog.id, input.id),
            eq(cctvMaintenanceLog.tenantId, tenantId),
          )
        );
      return { success: true };
    }),
});
