import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { and, eq, desc, sql } from "drizzle-orm";
import {
  cctvMaintenancePrograms,
  cctvMaintenanceProgramItems,
  cctvMaintenanceLog,
  policies,
  policyCoverages,
  policyServices,
  cctvCameras,
  cctvIdfs,
  cctvLicenses,
  cctvMonitors,
  cctvServers,
  cctvSwitches,
  cctvUps,
  auditLogs,
} from "../../drizzle/schema";
import { storagePut } from "../storage";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toDate(v: string | Date | null | undefined): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

// Calcular fechas de visitas según frecuencia
function generateVisitDates(
  startDate: Date,
  endDate: Date,
  totalVisits: number,
  frequency: string,
): Date[] {
  const dates: Date[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (frequency === "custom") {
    // Distribuir uniformemente en el rango
    const totalMs = end.getTime() - start.getTime();
    const interval = totalMs / (totalVisits - 1 || 1);
    for (let i = 0; i < totalVisits; i++) {
      const d = new Date(start.getTime() + interval * i);
      if (d <= end) dates.push(d);
    }
    return dates;
  }

  const monthsMap: Record<string, number> = {
    monthly: 1,
    bimonthly: 2,
    quarterly: 3,
    biannual: 6,
    annual: 12,
  };
  const monthsInterval = monthsMap[frequency] ?? 3;
  let current = new Date(start);
  while (current <= end && dates.length < totalVisits) {
    dates.push(new Date(current));
    current = new Date(current);
    current.setMonth(current.getMonth() + monthsInterval);
  }
  return dates.slice(0, totalVisits);
}

// Obtener nombre de tabla para lookup de equipo
async function getItemName(
  db: any,
  category: string,
  itemId: number,
  tenantId: number,
): Promise<{ name: string; location: string; area: string }> {
  try {
    const tableMap: Record<string, any> = {
      cameras: cctvCameras,
      idfs: cctvIdfs,
      monitors: cctvMonitors,
      servers: cctvServers,
      switches: cctvSwitches,
      ups: cctvUps,
    };
    const table = tableMap[category];
    if (!table) return { name: `${category} #${itemId}`, location: "", area: "" };
    const [row] = await db
      .select()
      .from(table)
      .where(and(eq(table.id, itemId), eq(table.tenantId, tenantId)))
      .limit(1);
    if (!row) return { name: `${category} #${itemId}`, location: "", area: "" };
    const name = [row.marca, row.modelo].filter(Boolean).join(" ") || `${category} #${itemId}`;
    const location = row.ubicacion ?? row.zona ?? row.area ?? "";
    const area = row.area ?? row.zona ?? row.ubicacion ?? "";
    return { name, location, area };
  } catch {
    return { name: `${category} #${itemId}`, location: "", area: "" };
  }
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const cctvMaintenanceProgramsRouter = router({

  // ── LIST PROGRAMS ──────────────────────────────────────────────────────────
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const tenantId = ctx.user.tenantId ?? 1;
    const programs = await db
      .select()
      .from(cctvMaintenancePrograms)
      .where(eq(cctvMaintenancePrograms.tenantId, tenantId))
      .orderBy(desc(cctvMaintenancePrograms.createdAt));

    // For each program, attach items and policy name
    const result = await Promise.all(
      programs.map(async (prog) => {
        const items = await db
          .select()
          .from(cctvMaintenanceProgramItems)
          .where(
            and(
              eq(cctvMaintenanceProgramItems.programId, prog.id),
              eq(cctvMaintenanceProgramItems.tenantId, tenantId),
            ),
          );
        let policyName: string | null = null;
        let policyNumber: string | null = null;
        if (prog.policyId) {
          const [pol] = await db
            .select({ name: policies.name, policyNumber: policies.policyNumber })
            .from(policies)
            .where(and(eq(policies.id, prog.policyId), eq(policies.tenantId, tenantId)))
            .limit(1);
          policyName = pol?.name ?? null;
          policyNumber = pol?.policyNumber ?? null;
        }
        // Count completed visits from log
        const [logCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(cctvMaintenanceLog)
          .where(
            and(
              eq(cctvMaintenanceLog.programId, prog.id),
              eq(cctvMaintenanceLog.tenantId, tenantId),
              eq(cctvMaintenanceLog.status, "completed"),
            ),
          );
        return {
          ...prog,
          items,
          policyName,
          policyNumber,
          completedVisits: Number(logCount?.count ?? 0),
          remainingVisits: prog.totalVisits - Number(logCount?.count ?? 0),
        };
      }),
    );
    return result;
  }),

  // ── GET PROGRAM BY ID ──────────────────────────────────────────────────────
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;
      const tenantId = ctx.user.tenantId ?? 1;
      const [prog] = await db
        .select()
        .from(cctvMaintenancePrograms)
        .where(and(eq(cctvMaintenancePrograms.id, input.id), eq(cctvMaintenancePrograms.tenantId, tenantId)))
        .limit(1);
      if (!prog) return null;

      const items = await db
        .select()
        .from(cctvMaintenanceProgramItems)
        .where(and(eq(cctvMaintenanceProgramItems.programId, prog.id), eq(cctvMaintenanceProgramItems.tenantId, tenantId)));

      const logs = await db
        .select()
        .from(cctvMaintenanceLog)
        .where(and(eq(cctvMaintenanceLog.programId, prog.id), eq(cctvMaintenanceLog.tenantId, tenantId)))
        .orderBy(desc(cctvMaintenanceLog.scheduledDate));

      let policy = null;
      if (prog.policyId) {
        const [pol] = await db
          .select()
          .from(policies)
          .where(and(eq(policies.id, prog.policyId), eq(policies.tenantId, tenantId)))
          .limit(1);
        if (pol) {
          const coverages = await db
            .select()
            .from(policyCoverages)
            .where(and(eq(policyCoverages.policyId, pol.id), eq(policyCoverages.tenantId, tenantId)));
          const services = await db
            .select()
            .from(policyServices)
            .where(and(eq(policyServices.policyId, pol.id), eq(policyServices.tenantId, tenantId)));
          policy = { ...pol, coverages, services };
        }
      }

      return { ...prog, items, logs, policy };
    }),

  // ── CREATE PROGRAM ─────────────────────────────────────────────────────────
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        policyId: z.number().optional(),
        totalVisits: z.number().int().min(1),
        frequency: z.enum(["monthly", "bimonthly", "quarterly", "biannual", "annual", "custom"]),
        startDate: z.string(),
        endDate: z.string(),
        technician: z.string().optional(),
        schedule: z.string().optional(),
        visitWeekStart: z.string().optional(),
        programMonth: z.string().optional(),
        programYear: z.string().optional(),
        // Equipment items to include
        items: z.array(
          z.object({
            category: z.enum(["cameras", "idfs", "licenses", "monitors", "servers", "switches", "ups"]),
            itemId: z.number(),
            itemName: z.string().optional(),
            itemLocation: z.string().optional(),
            area: z.string().optional(),
            requiresLift: z.boolean().optional(),
            noTechnicians: z.number().int().optional(),
            observations: z.string().optional(),
            sortOrder: z.number().int().optional(),
            scheduledDays: z.string().optional(), // "1,3,5" comma-separated day numbers
            scheduledDates: z.string().optional(), // "2026-05-11,2026-05-13" exact dates
          }),
        ),
        // Whether to auto-generate scheduled log entries
        generateSchedule: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const tenantId = ctx.user.tenantId ?? 1;

      // Create program
      const [progResult] = await db.insert(cctvMaintenancePrograms).values({
        tenantId,
        policyId: input.policyId ?? null,
        name: input.name,
        description: input.description ?? null,
        totalVisits: input.totalVisits,
        completedVisits: 0,
        frequency: input.frequency,
        startDate: toDate(input.startDate) as Date,
        endDate: toDate(input.endDate) as Date,
        technician: input.technician ?? null,
        schedule: input.schedule ?? null,
        visitWeekStart: input.visitWeekStart ? toDate(input.visitWeekStart) as Date : null,
        programMonth: input.programMonth ?? null,
        programYear: input.programYear ?? null,
        status: "active",
        createdByUserId: ctx.user.id,
        createdByUserName: ctx.user.name ?? ctx.user.email ?? null,
      });
      const programId = (progResult as any).insertId as number;

      // Insert items — auto-populate area from inventory if not provided
      if (input.items.length > 0) {
        const itemsWithArea = await Promise.all(
          input.items.map(async (item, idx) => {
            let area = item.area ?? null;
            if (!area) {
              const info = await getItemName(db, item.category, item.itemId, tenantId);
              area = info.area || null;
            }
            return {
              programId,
              tenantId,
              category: item.category,
              itemId: item.itemId,
              itemName: item.itemName ?? null,
              itemLocation: item.itemLocation ?? null,
              area,
              requiresLift: item.requiresLift ?? false,
              noTechnicians: item.noTechnicians ?? 1,
              observations: item.observations ?? null,
              sortOrder: item.sortOrder ?? idx,
              scheduledDays: item.scheduledDays ?? null,
              scheduledDates: item.scheduledDates ?? null,
            };
          }),
        );
        await db.insert(cctvMaintenanceProgramItems).values(itemsWithArea);
      }

      // Auto-generate scheduled maintenance log entries
      if (input.generateSchedule && input.items.length > 0) {
        // Check if any items have explicit scheduledDates from the Programa de Obra step
        const hasExplicitDates = input.items.some(item => item.scheduledDates && item.scheduledDates.trim().length > 0);

        const logEntries: any[] = [];

        if (hasExplicitDates) {
          // Use exact dates selected per item in the Programa de Obra
          for (const item of input.items) {
            const itemInfo = item.itemName
              ? { name: item.itemName, location: item.itemLocation ?? "" }
              : await getItemName(db, item.category, item.itemId, tenantId);
            const dates = item.scheduledDates
              ? item.scheduledDates.split(",").map(d => d.trim()).filter(Boolean)
              : [];
            for (const dateStr of dates) {
              const visitDate = toDate(dateStr) as Date;
              if (!visitDate || isNaN(visitDate.getTime())) continue;
              logEntries.push({
                tenantId,
                category: item.category,
                itemId: item.itemId,
                itemName: itemInfo.name,
                type: "preventive" as const,
                status: "scheduled" as const,
                title: `Mantenimiento preventivo — ${itemInfo.name}`,
                description: input.description ?? null,
                technician: input.technician ?? null,
                scheduledDate: visitDate,
                policyId: input.policyId ?? null,
                programId,
                createdByUserId: ctx.user.id,
                createdByUserName: ctx.user.name ?? ctx.user.email ?? null,
              });
            }
          }
        } else {
          // Fallback: auto-generate dates from frequency/range
          const visitDates = generateVisitDates(
            toDate(input.startDate) as Date,
            toDate(input.endDate) as Date,
            input.totalVisits,
            input.frequency,
          );
          for (const visitDate of visitDates) {
            for (const item of input.items) {
              const itemInfo = item.itemName
                ? { name: item.itemName, location: item.itemLocation ?? "" }
                : await getItemName(db, item.category, item.itemId, tenantId);
              logEntries.push({
                tenantId,
                category: item.category,
                itemId: item.itemId,
                itemName: itemInfo.name,
                type: "preventive" as const,
                status: "scheduled" as const,
                title: `Mantenimiento preventivo — ${itemInfo.name}`,
                description: input.description ?? null,
                technician: input.technician ?? null,
                scheduledDate: visitDate,
                policyId: input.policyId ?? null,
                programId,
                createdByUserId: ctx.user.id,
                createdByUserName: ctx.user.name ?? ctx.user.email ?? null,
              });
            }
          }
        }

        if (logEntries.length > 0) {
          // Insert in batches of 50
          for (let i = 0; i < logEntries.length; i += 50) {
            await db.insert(cctvMaintenanceLog).values(logEntries.slice(i, i + 50));
          }
        }
      }

      return { success: true, id: programId };
    }),

  // ── UPDATE PROGRAM ─────────────────────────────────────────────────────────
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        technician: z.string().optional(),
        status: z.enum(["active", "completed", "cancelled"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const tenantId = ctx.user.tenantId ?? 1;
      const { id, ...rest } = input;
      const updateData: Record<string, unknown> = {};
      if (rest.name !== undefined) updateData.name = rest.name;
      if (rest.description !== undefined) updateData.description = rest.description;
      if (rest.technician !== undefined) updateData.technician = rest.technician;
      if (rest.status !== undefined) updateData.status = rest.status;
      await db
        .update(cctvMaintenancePrograms)
        .set(updateData)
        .where(and(eq(cctvMaintenancePrograms.id, id), eq(cctvMaintenancePrograms.tenantId, tenantId)));
      return { success: true };
    }),

  // ── UPDATE PROGRAM SCHEDULE FIELDS ──────────────────────────────────────────
  updateSchedule: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        schedule: z.string().optional(),
        visitWeekStart: z.string().optional(),
        technician: z.string().optional(),
        status: z.enum(["active", "completed", "cancelled"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const tenantId = ctx.user.tenantId ?? 1;
      const { id, visitWeekStart, ...rest } = input;
      const updateData: Record<string, unknown> = {};
      if (rest.schedule !== undefined) updateData.schedule = rest.schedule;
      if (rest.technician !== undefined) updateData.technician = rest.technician;
      if (rest.status !== undefined) updateData.status = rest.status;
      if (visitWeekStart !== undefined) updateData.visitWeekStart = visitWeekStart ? toDate(visitWeekStart) : null;
      await db
        .update(cctvMaintenancePrograms)
        .set(updateData)
        .where(and(eq(cctvMaintenancePrograms.id, id), eq(cctvMaintenancePrograms.tenantId, tenantId)));
      return { success: true };
    }),

  // ── UPDATE PROGRAM (with audit log) ────────────────────────────────────────
  updateProgram: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        totalVisits: z.number().int().optional(),
        frequency: z.enum(["weekly", "biweekly", "monthly", "quarterly", "semiannual", "annual"]).optional(),
        technician: z.string().optional(),
        schedule: z.string().optional(),
        programMonth: z.string().optional(),
        programYear: z.string().optional(),
        status: z.enum(["active", "completed", "cancelled"]).optional(),
        changeReason: z.string().optional(), // Motivo del cambio para el log
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const tenantId = ctx.user.tenantId ?? 1;
      const { id, changeReason, ...fields } = input;

      // Fetch current program for audit
      const [current] = await db
        .select()
        .from(cctvMaintenancePrograms)
        .where(and(eq(cctvMaintenancePrograms.id, id), eq(cctvMaintenancePrograms.tenantId, tenantId)))
        .limit(1);
      if (!current) throw new Error("Programa no encontrado");

      // Build update payload
      const updateData: Record<string, unknown> = {};
      if (fields.name !== undefined) updateData.name = fields.name;
      if (fields.description !== undefined) updateData.description = fields.description;
      if (fields.startDate !== undefined) updateData.startDate = toDate(fields.startDate);
      if (fields.endDate !== undefined) updateData.endDate = toDate(fields.endDate);
      if (fields.totalVisits !== undefined) updateData.totalVisits = fields.totalVisits;
      if (fields.frequency !== undefined) updateData.frequency = fields.frequency;
      if (fields.technician !== undefined) updateData.technician = fields.technician;
      if (fields.schedule !== undefined) updateData.schedule = fields.schedule;
      if (fields.programMonth !== undefined) updateData.programMonth = fields.programMonth;
      if (fields.programYear !== undefined) updateData.programYear = fields.programYear;
      if (fields.status !== undefined) updateData.status = fields.status;

      await db
        .update(cctvMaintenancePrograms)
        .set(updateData)
        .where(and(eq(cctvMaintenancePrograms.id, id), eq(cctvMaintenancePrograms.tenantId, tenantId)));

      // Build human-readable diff for audit log
      const FIELD_LABELS: Record<string, string> = {
        name: "Nombre", description: "Descripción", startDate: "Fecha Inicio",
        endDate: "Fecha Fin", totalVisits: "Total Visitas", frequency: "Frecuencia",
        technician: "Técnico", schedule: "Horario", programMonth: "Mes",
        programYear: "Año", status: "Estado",
      };
      const changes: string[] = [];
      for (const [key, newVal] of Object.entries(fields)) {
        const oldVal = (current as any)[key];
        if (String(oldVal) !== String(newVal)) {
          changes.push(`${FIELD_LABELS[key] ?? key}: "${oldVal ?? ""}" → "${newVal ?? ""}"`); 
        }
      }
      const description = [
        `Programa "${current.name}" modificado por ${ctx.user.name ?? ctx.user.email ?? "usuario"}.`,
        changes.length ? `Cambios: ${changes.join("; ")}.` : "",
        changeReason ? `Motivo: ${changeReason}` : "",
      ].filter(Boolean).join(" ");

      await db.insert(auditLogs).values({
        tenantId,
        userId: ctx.user.id,
        userName: ctx.user.name ?? ctx.user.email ?? null,
        action: "update",
        module: "cctv_maintenance_program",
        entityType: "cctv_maintenance_program",
        entityId: id,
        description,
        oldData: current as any,
        newData: { ...current, ...updateData } as any,
      });

      return { success: true };
    }),

  // ── UPDATE PROGRAM ITEM ────────────────────────────────────────────────────
  updateItem: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        area: z.string().optional(),
        requiresLift: z.boolean().optional(),
        noTechnicians: z.number().int().optional(),
        observations: z.string().optional(),
        sortOrder: z.number().int().optional(),
        scheduledDays: z.string().optional(),
        scheduledDates: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const tenantId = ctx.user.tenantId ?? 1;
      const { id, ...rest } = input;
      const updateData: Record<string, unknown> = {};
      if (rest.area !== undefined) updateData.area = rest.area;
      if (rest.requiresLift !== undefined) updateData.requiresLift = rest.requiresLift;
      if (rest.noTechnicians !== undefined) updateData.noTechnicians = rest.noTechnicians;
      if (rest.observations !== undefined) updateData.observations = rest.observations;
      if (rest.sortOrder !== undefined) updateData.sortOrder = rest.sortOrder;
      if (rest.scheduledDays !== undefined) updateData.scheduledDays = rest.scheduledDays;
      if (rest.scheduledDates !== undefined) updateData.scheduledDates = rest.scheduledDates;
      await db
        .update(cctvMaintenanceProgramItems)
        .set(updateData)
        .where(and(eq(cctvMaintenanceProgramItems.id, id), eq(cctvMaintenanceProgramItems.tenantId, tenantId)));
      return { success: true };
    }),

  // ── DELETE PROGRAM ─────────────────────────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const tenantId = ctx.user.tenantId ?? 1;
      // Eliminar eventos del calendario asociados al programa
      await db
        .delete(cctvMaintenanceLog)
        .where(and(eq(cctvMaintenanceLog.programId, input.id), eq(cctvMaintenanceLog.tenantId, tenantId)));
      await db
        .delete(cctvMaintenanceProgramItems)
        .where(and(eq(cctvMaintenanceProgramItems.programId, input.id), eq(cctvMaintenanceProgramItems.tenantId, tenantId)));
      await db
        .delete(cctvMaintenancePrograms)
        .where(and(eq(cctvMaintenancePrograms.id, input.id), eq(cctvMaintenancePrograms.tenantId, tenantId)));
      return { success: true };
    }),

  // ── REORDER ITEMS ─────────────────────────────────────────────────────────
  reorderItems: protectedProcedure
    .input(z.object({
      programId: z.number(),
      orderedIds: z.array(z.number()), // item IDs in new order
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const tenantId = ctx.user.tenantId ?? 1;
      // Update sortOrder for each item
      await Promise.all(
        input.orderedIds.map((id, idx) =>
          db
            .update(cctvMaintenanceProgramItems)
            .set({ sortOrder: idx })
            .where(
              and(
                eq(cctvMaintenanceProgramItems.id, id),
                eq(cctvMaintenanceProgramItems.programId, input.programId),
                eq(cctvMaintenanceProgramItems.tenantId, tenantId),
              ),
            ),
        ),
      );
      return { success: true };
    }),

  // ── GET POLICY COVERAGE SUMMARY ────────────────────────────────────────────
  // Returns how many maintenances are covered by a policy and how many have been used
  getPolicyCoverage: protectedProcedure
    .input(z.object({ policyId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;
      const tenantId = ctx.user.tenantId ?? 1;

      const [pol] = await db
        .select()
        .from(policies)
        .where(and(eq(policies.id, input.policyId), eq(policies.tenantId, tenantId)))
        .limit(1);
      if (!pol) return null;

      const coverages = await db
        .select()
        .from(policyCoverages)
        .where(and(eq(policyCoverages.policyId, input.policyId), eq(policyCoverages.tenantId, tenantId)));

      const services = await db
        .select()
        .from(policyServices)
        .where(and(eq(policyServices.policyId, input.policyId), eq(policyServices.tenantId, tenantId)));

      // Count completed maintenances linked to this policy
      const [usedCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(cctvMaintenanceLog)
        .where(
          and(
            eq(cctvMaintenanceLog.policyId, input.policyId),
            eq(cctvMaintenanceLog.tenantId, tenantId),
            eq(cctvMaintenanceLog.status, "completed"),
          ),
        );

      // Count programs linked to this policy
      const programs = await db
        .select()
        .from(cctvMaintenancePrograms)
        .where(and(eq(cctvMaintenancePrograms.policyId, input.policyId), eq(cctvMaintenancePrograms.tenantId, tenantId)));

      const preventiveCoverage = coverages.find((c) => c.coverageType === "preventive");
      const totalCovered = preventiveCoverage?.maxIncidents ?? null;
      const isUnlimited = preventiveCoverage?.isUnlimited ?? false;
      const usedMaintenances = Number(usedCount?.count ?? 0);

      return {
        policy: pol,
        coverages,
        services,
        programs,
        totalCovered,
        isUnlimited,
        usedMaintenances,
        remainingMaintenances: isUnlimited ? null : (totalCovered != null ? totalCovered - usedMaintenances : null),
      };
    }),

  // ── UPLOAD PHOTO (before/after) ────────────────────────────────────────────
  uploadPhoto: protectedProcedure
    .input(
      z.object({
        logId: z.number(),
        photoType: z.enum(["before", "after"]),
        imageBase64: z.string(),
        mimeType: z.string().default("image/jpeg"),
        fileName: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const tenantId = ctx.user.tenantId ?? 1;

      const [log] = await db
        .select()
        .from(cctvMaintenanceLog)
        .where(and(eq(cctvMaintenanceLog.id, input.logId), eq(cctvMaintenanceLog.tenantId, tenantId)))
        .limit(1);
      if (!log) throw new Error("Registro no encontrado");

      const ext = input.mimeType.split("/")[1] ?? "jpg";
      const fileName = input.fileName ?? `maintenance-${input.photoType}-${input.logId}.${ext}`;
      const key = `maintenance/${tenantId}/${input.photoType}/${Date.now()}-${fileName}`;
      const buffer = Buffer.from(input.imageBase64, "base64");
      const { url } = await storagePut(key, buffer, input.mimeType);

      const updateData =
        input.photoType === "before"
          ? { beforePhotoUrl: url, beforePhotoKey: key }
          : { afterPhotoUrl: url, afterPhotoKey: key };

      await db
        .update(cctvMaintenanceLog)
        .set(updateData)
        .where(and(eq(cctvMaintenanceLog.id, input.logId), eq(cctvMaintenanceLog.tenantId, tenantId)));

      return { success: true, url, key };
    }),

  // ── SAVE CLIENT SIGNATURE ──────────────────────────────────────────────────
  saveSignature: protectedProcedure
    .input(
      z.object({
        logId: z.number(),
        signatureBase64: z.string(), // PNG data URL or base64
        clientName: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const tenantId = ctx.user.tenantId ?? 1;

      const [log] = await db
        .select()
        .from(cctvMaintenanceLog)
        .where(and(eq(cctvMaintenanceLog.id, input.logId), eq(cctvMaintenanceLog.tenantId, tenantId)))
        .limit(1);
      if (!log) throw new Error("Registro no encontrado");

      // Strip data URL prefix if present
      const base64Data = input.signatureBase64.replace(/^data:image\/\w+;base64,/, "");
      const key = `maintenance/${tenantId}/signatures/${Date.now()}-sig-${input.logId}.png`;
      const buffer = Buffer.from(base64Data, "base64");
      const { url } = await storagePut(key, buffer, "image/png");

      await db
        .update(cctvMaintenanceLog)
        .set({ clientSignatureUrl: url, clientSignatureKey: key, clientName: input.clientName, reportGenerated: true })
        .where(and(eq(cctvMaintenanceLog.id, input.logId), eq(cctvMaintenanceLog.tenantId, tenantId)));

      // Update completedVisits in program if linked
      if (log.programId) {
        await db
          .update(cctvMaintenancePrograms)
          .set({ completedVisits: sql`completedVisits + 1` })
          .where(and(eq(cctvMaintenancePrograms.id, log.programId), eq(cctvMaintenancePrograms.tenantId, tenantId)));
      }

      return { success: true, url };
    }),

  // ── GET FULL INVENTORY (all CCTV assets for maintenance program) ────────────
  getFullInventory: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const tenantId = ctx.user.tenantId ?? 1;

    const [cameras, idfs, licenses, monitors, servers, switches, ups] = await Promise.all([
      db.select({ id: cctvCameras.id, marca: cctvCameras.marca, modelo: cctvCameras.modelo,
        area: cctvCameras.area, edificio: cctvCameras.edificio, ip: cctvCameras.ip,
        status: cctvCameras.status, tipo: cctvCameras.tipo, idCamera: cctvCameras.idCamera })
        .from(cctvCameras).where(eq(cctvCameras.tenantId, tenantId)),
      db.select({ id: cctvIdfs.id, nombre: cctvIdfs.nombre, ubicacion: cctvIdfs.ubicacion,
        tipo: cctvIdfs.tipo, status: cctvIdfs.status })
        .from(cctvIdfs).where(eq(cctvIdfs.tenantId, tenantId)),
      db.select({ id: cctvLicenses.id, idLicencia: cctvLicenses.idLicencia, marca: cctvLicenses.marca,
        modelo: cctvLicenses.modelo, ubicacion: cctvLicenses.ubicacion, status: cctvLicenses.status,
        tipo: cctvLicenses.tipo })
        .from(cctvLicenses).where(eq(cctvLicenses.tenantId, tenantId)),
      db.select({ id: cctvMonitors.id, marca: cctvMonitors.marca, modelo: cctvMonitors.modelo,
        ubicacion: cctvMonitors.ubicacion, status: cctvMonitors.status })
        .from(cctvMonitors).where(eq(cctvMonitors.tenantId, tenantId)),
      db.select({ id: cctvServers.id, marca: cctvServers.marca, modelo: cctvServers.modelo,
        ip: cctvServers.ip, status: cctvServers.status, tipo: cctvServers.tipo })
        .from(cctvServers).where(eq(cctvServers.tenantId, tenantId)),
      db.select({ id: cctvSwitches.id, marca: cctvSwitches.marca, modelo: cctvSwitches.modelo,
        ubicacion: cctvSwitches.ubicacion, status: cctvSwitches.status, ip: cctvSwitches.ip })
        .from(cctvSwitches).where(eq(cctvSwitches.tenantId, tenantId)),
      db.select({ id: cctvUps.id, marca: cctvUps.marca, modelo: cctvUps.modelo,
        ubicacion: cctvUps.ubicacion, status: cctvUps.status })
        .from(cctvUps).where(eq(cctvUps.tenantId, tenantId)),
    ]);

    const toItem = (category: string, label: string, rows: any[]) =>
      rows.map((r) => ({
        id: r.id,
        category,
        categoryLabel: label,
        name: r.idLicencia
          ? `${r.idLicencia}${r.marca ? " — " + r.marca : ""}${r.modelo ? " " + r.modelo : ""}`
          : r.nombre
            ? r.nombre
            : [r.marca, r.modelo].filter(Boolean).join(" ") || `${label} #${r.id}`,
        location: r.area ?? r.edificio ?? r.ubicacion ?? "",
        status: r.status ?? "active",
        extra: r.ip ?? r.idCamera ?? r.tipo ?? "",
      }));

    return [
      ...toItem("cameras", "Cámara", cameras),
      ...toItem("idfs", "IDF/MDF", idfs),
      ...toItem("licenses", "Licencia", licenses),
      ...toItem("monitors", "Monitor", monitors),
      ...toItem("servers", "Servidor", servers),
      ...toItem("switches", "Switch", switches),
      ...toItem("ups", "UPS", ups),
    ];
  }),

  // ── GET CALENDAR EVENTS (for CCTVCalendar) ─────────────────────────────────
  getCalendarEvents: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const tenantId = ctx.user.tenantId ?? 1;
    const logs = await db
      .select()
      .from(cctvMaintenanceLog)
      .where(eq(cctvMaintenanceLog.tenantId, tenantId))
      .orderBy(desc(cctvMaintenanceLog.scheduledDate));
    return logs.map((l) => ({
      id: l.id,
      title: l.title,
      date: l.scheduledDate,
      executedDate: l.executedDate,
      status: l.status,
      type: l.type,
      category: l.category,
      itemName: l.itemName,
      technician: l.technician,
      programId: l.programId,
      policyId: l.policyId,
      reportGenerated: l.reportGenerated,
    }));
  }),
});
