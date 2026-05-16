import { z } from "zod";
import { eq, and, desc, like, or, sql } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  acReaders, acControllers, acDoors,
  acMaintenanceLog, acMaintenancePrograms, acMaintenanceProgramItems,
} from "../../drizzle/schema";
import { storagePut } from "../storage";

function toDate(s?: string | null): Date | undefined {
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

const listInput = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  branchId: z.number().optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
}).optional();

const statusEnum = z.enum(["active", "inactive", "maintenance", "retired", "damaged", "warranty"]).nullish();

// ─── Readers ──────────────────────────────────────────────────────────────────
const readerSchema = z.object({
  idReader: z.string().nullish(),
  marca: z.string().nullish(),
  modelo: z.string().nullish(),
  serie: z.string().nullish(),
  tipo: z.enum(["hid", "biometrico", "tarjeta", "pin", "facial", "rfid", "otro"]).nullish(),
  tecnologia: z.string().nullish(),
  area: z.string().nullish(),
  edificio: z.string().nullish(),
  puerta: z.string().nullish(),
  ip: z.string().nullish(),
  mac: z.string().nullish(),
  controladoraId: z.number().nullish(),
  proveedor: z.string().nullish(),
  fechaCompra: z.string().nullish(),
  garantiaExpiracion: z.string().nullish(),
  po: z.string().nullish(),
  invoiceNumber: z.string().nullish(),
  amount: z.string().nullish(),
  slaTier: z.enum(["tier1", "tier2", "tier3"]).nullish(),
  rfidTag: z.string().nullish(),
  status: statusEnum,
  observaciones: z.string().nullish(),
  fotoUrl: z.string().nullish(),
  branchId: z.number().nullish(),
});

export const acReadersRouter = router({
  list: protectedProcedure.input(listInput).query(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const tenantId = ctx.user.tenantId ?? 1;
    const conditions = [eq(acReaders.tenantId, tenantId)];
    if (input?.status) conditions.push(eq(acReaders.status, input.status as any));
    if (input?.branchId) conditions.push(eq(acReaders.branchId, input.branchId));
    if (input?.search) {
      conditions.push(or(
        like(acReaders.marca, `%${input.search}%`),
        like(acReaders.modelo, `%${input.search}%`),
        like(acReaders.idReader, `%${input.search}%`),
        like(acReaders.serie, `%${input.search}%`),
      )!);
    }
    return db.select().from(acReaders).where(and(...conditions)).orderBy(desc(acReaders.createdAt)).limit(input?.limit ?? 200);
  }),
  get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const [row] = await db.select().from(acReaders).where(and(eq(acReaders.id, input.id), eq(acReaders.tenantId, ctx.user.tenantId ?? 1))).limit(1);
    return row ?? null;
  }),
  create: protectedProcedure.input(readerSchema).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const [result] = await db.insert(acReaders).values({
      ...input, tenantId: ctx.user.tenantId ?? 1,
      fechaCompra: toDate(input.fechaCompra) as any,
      garantiaExpiracion: toDate(input.garantiaExpiracion) as any,
    } as any);
    return { id: (result as any).insertId };
  }),
  update: protectedProcedure.input(z.object({ id: z.number() }).merge(readerSchema)).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const { id, ...data } = input;
    await db.update(acReaders).set({
      ...data,
      fechaCompra: toDate(data.fechaCompra) as any,
      garantiaExpiracion: toDate(data.garantiaExpiracion) as any,
    } as any).where(and(eq(acReaders.id, id), eq(acReaders.tenantId, ctx.user.tenantId ?? 1)));
    return { success: true };
  }),
  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    await db.delete(acReaders).where(and(eq(acReaders.id, input.id), eq(acReaders.tenantId, ctx.user.tenantId ?? 1)));
    return { success: true };
  }),
  stats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const tenantId = ctx.user.tenantId ?? 1;
    const rows = await db.select().from(acReaders).where(eq(acReaders.tenantId, tenantId));
    return {
      total: rows.length,
      active: rows.filter(r => r.status === "active").length,
      maintenance: rows.filter(r => r.status === "maintenance").length,
      inactive: rows.filter(r => r.status === "inactive").length,
    };
  }),
});

// ─── Controllers ──────────────────────────────────────────────────────────────
const controllerSchema = z.object({
  idController: z.string().nullish(),
  marca: z.string().nullish(),
  modelo: z.string().nullish(),
  serie: z.string().nullish(),
  tipo: z.enum(["standalone", "networked", "cloud", "otro"]).nullish(),
  puertas: z.number().nullish(),
  ip: z.string().nullish(),
  mac: z.string().nullish(),
  firmware: z.string().nullish(),
  area: z.string().nullish(),
  edificio: z.string().nullish(),
  proveedor: z.string().nullish(),
  fechaCompra: z.string().nullish(),
  garantiaExpiracion: z.string().nullish(),
  po: z.string().nullish(),
  invoiceNumber: z.string().nullish(),
  amount: z.string().nullish(),
  slaTier: z.enum(["tier1", "tier2", "tier3"]).nullish(),
  rfidTag: z.string().nullish(),
  status: statusEnum,
  observaciones: z.string().nullish(),
  fotoUrl: z.string().nullish(),
  branchId: z.number().nullish(),
});

export const acControllersRouter = router({
  list: protectedProcedure.input(listInput).query(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const tenantId = ctx.user.tenantId ?? 1;
    const conditions = [eq(acControllers.tenantId, tenantId)];
    if (input?.status) conditions.push(eq(acControllers.status, input.status as any));
    if (input?.branchId) conditions.push(eq(acControllers.branchId, input.branchId));
    if (input?.search) {
      conditions.push(or(
        like(acControllers.marca, `%${input.search}%`),
        like(acControllers.modelo, `%${input.search}%`),
        like(acControllers.idController, `%${input.search}%`),
      )!);
    }
    return db.select().from(acControllers).where(and(...conditions)).orderBy(desc(acControllers.createdAt)).limit(input?.limit ?? 200);
  }),
  get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const [row] = await db.select().from(acControllers).where(and(eq(acControllers.id, input.id), eq(acControllers.tenantId, ctx.user.tenantId ?? 1))).limit(1);
    return row ?? null;
  }),
  create: protectedProcedure.input(controllerSchema).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const [result] = await db.insert(acControllers).values({
      ...input, tenantId: ctx.user.tenantId ?? 1,
      fechaCompra: toDate(input.fechaCompra) as any,
      garantiaExpiracion: toDate(input.garantiaExpiracion) as any,
    } as any);
    return { id: (result as any).insertId };
  }),
  update: protectedProcedure.input(z.object({ id: z.number() }).merge(controllerSchema)).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const { id, ...data } = input;
    await db.update(acControllers).set({
      ...data,
      fechaCompra: toDate(data.fechaCompra) as any,
      garantiaExpiracion: toDate(data.garantiaExpiracion) as any,
    } as any).where(and(eq(acControllers.id, id), eq(acControllers.tenantId, ctx.user.tenantId ?? 1)));
    return { success: true };
  }),
  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    await db.delete(acControllers).where(and(eq(acControllers.id, input.id), eq(acControllers.tenantId, ctx.user.tenantId ?? 1)));
    return { success: true };
  }),
  stats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const rows = await db.select().from(acControllers).where(eq(acControllers.tenantId, ctx.user.tenantId ?? 1));
    return {
      total: rows.length,
      active: rows.filter(r => r.status === "active").length,
      maintenance: rows.filter(r => r.status === "maintenance").length,
    };
  }),
});

// ─── Doors ────────────────────────────────────────────────────────────────────
const doorSchema = z.object({
  idDoor: z.string().nullish(),
  nombre: z.string().min(1),
  tipo: z.enum(["entrada", "salida", "bidireccional", "emergencia", "otro"]).nullish(),
  material: z.string().nullish(),
  cerradura: z.string().nullish(),
  area: z.string().nullish(),
  edificio: z.string().nullish(),
  controladoraId: z.number().nullish(),
  lectoresIds: z.string().nullish(),
  proveedor: z.string().nullish(),
  fechaCompra: z.string().nullish(),
  garantiaExpiracion: z.string().nullish(),
  po: z.string().nullish(),
  invoiceNumber: z.string().nullish(),
  amount: z.string().nullish(),
  slaTier: z.enum(["tier1", "tier2", "tier3"]).nullish(),
  rfidTag: z.string().nullish(),
  status: z.enum(["active", "inactive", "maintenance", "retired", "damaged"]).nullish(),
  observaciones: z.string().nullish(),
  fotoUrl: z.string().nullish(),
  branchId: z.number().nullish(),
});

export const acDoorsRouter = router({
  list: protectedProcedure.input(listInput).query(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const tenantId = ctx.user.tenantId ?? 1;
    const conditions = [eq(acDoors.tenantId, tenantId)];
    if (input?.status) conditions.push(eq(acDoors.status, input.status as any));
    if (input?.branchId) conditions.push(eq(acDoors.branchId, input.branchId));
    if (input?.search) {
      conditions.push(or(
        like(acDoors.nombre, `%${input.search}%`),
        like(acDoors.area, `%${input.search}%`),
        like(acDoors.idDoor, `%${input.search}%`),
      )!);
    }
    return db.select().from(acDoors).where(and(...conditions)).orderBy(desc(acDoors.createdAt)).limit(input?.limit ?? 200);
  }),
  get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const [row] = await db.select().from(acDoors).where(and(eq(acDoors.id, input.id), eq(acDoors.tenantId, ctx.user.tenantId ?? 1))).limit(1);
    return row ?? null;
  }),
  create: protectedProcedure.input(doorSchema).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const [result] = await db.insert(acDoors).values({
      ...input, tenantId: ctx.user.tenantId ?? 1,
      fechaCompra: toDate(input.fechaCompra) as any,
      garantiaExpiracion: toDate(input.garantiaExpiracion) as any,
    } as any);
    return { id: (result as any).insertId };
  }),
  update: protectedProcedure.input(z.object({ id: z.number() }).merge(doorSchema)).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const { id, ...data } = input;
    await db.update(acDoors).set({
      ...data,
      fechaCompra: toDate(data.fechaCompra) as any,
      garantiaExpiracion: toDate(data.garantiaExpiracion) as any,
    } as any).where(and(eq(acDoors.id, id), eq(acDoors.tenantId, ctx.user.tenantId ?? 1)));
    return { success: true };
  }),
  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    await db.delete(acDoors).where(and(eq(acDoors.id, input.id), eq(acDoors.tenantId, ctx.user.tenantId ?? 1)));
    return { success: true };
  }),
  stats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const rows = await db.select().from(acDoors).where(eq(acDoors.tenantId, ctx.user.tenantId ?? 1));
    return {
      total: rows.length,
      active: rows.filter(r => r.status === "active").length,
      maintenance: rows.filter(r => r.status === "maintenance").length,
    };
  }),
});

// ─── Maintenance Log ──────────────────────────────────────────────────────────
const maintenanceLogSchema = z.object({
  category: z.enum(["readers", "controllers", "doors"]),
  itemId: z.number(),
  itemName: z.string().nullish(),
  type: z.enum(["preventive", "corrective", "predictive", "inspection", "replacement", "upgrade", "other"]).default("preventive"),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).default("completed"),
  title: z.string().min(1),
  description: z.string().nullish(),
  findings: z.string().nullish(),
  actions: z.string().nullish(),
  technician: z.string().nullish(),
  scheduledDate: z.string().nullish(),
  executedDate: z.string().nullish(),
  durationHours: z.string().nullish(),
  cost: z.string().nullish(),
  nextMaintenanceDate: z.string().nullish(),
  beforePhotoUrl: z.string().nullish(),
  beforePhotoKey: z.string().nullish(),
  afterPhotoUrl: z.string().nullish(),
  afterPhotoKey: z.string().nullish(),
  clientSignatureUrl: z.string().nullish(),
  clientSignatureKey: z.string().nullish(),
  clientName: z.string().nullish(),
  policyId: z.number().nullish(),
  programId: z.number().nullish(),
});

export const acMaintenanceRouter = router({
  list: protectedProcedure.input(z.object({
    category: z.enum(["readers", "controllers", "doors"]).optional(),
    itemId: z.number().optional(),
    limit: z.number().optional(),
  }).optional()).query(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const tenantId = ctx.user.tenantId ?? 1;
    const conditions = [eq(acMaintenanceLog.tenantId, tenantId)];
    if (input?.category) conditions.push(eq(acMaintenanceLog.category, input.category));
    if (input?.itemId) conditions.push(eq(acMaintenanceLog.itemId, input.itemId));
    return db.select().from(acMaintenanceLog).where(and(...conditions)).orderBy(desc(acMaintenanceLog.createdAt)).limit(input?.limit ?? 200);
  }),
  create: protectedProcedure.input(maintenanceLogSchema).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const [result] = await db.insert(acMaintenanceLog).values({
      ...input, tenantId: ctx.user.tenantId ?? 1,
      scheduledDate: toDate(input.scheduledDate) as any,
      executedDate: toDate(input.executedDate) as any,
      nextMaintenanceDate: toDate(input.nextMaintenanceDate) as any,
      createdByUserId: ctx.user.id,
      createdByUserName: ctx.user.name,
    } as any);
    return { id: (result as any).insertId };
  }),
  update: protectedProcedure.input(z.object({ id: z.number() }).merge(maintenanceLogSchema)).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const { id, ...data } = input;
    await db.update(acMaintenanceLog).set({
      ...data,
      scheduledDate: toDate(data.scheduledDate) as any,
      executedDate: toDate(data.executedDate) as any,
      nextMaintenanceDate: toDate(data.nextMaintenanceDate) as any,
    } as any).where(and(eq(acMaintenanceLog.id, id), eq(acMaintenanceLog.tenantId, ctx.user.tenantId ?? 1)));
    return { success: true };
  }),
  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    await db.delete(acMaintenanceLog).where(and(eq(acMaintenanceLog.id, input.id), eq(acMaintenanceLog.tenantId, ctx.user.tenantId ?? 1)));
    return { success: true };
  }),
  uploadPhoto: protectedProcedure.input(z.object({
    imageBase64: z.string(),
    mimeType: z.string().default("image/jpeg"),
    type: z.enum(["before", "after", "signature"]),
    logId: z.number().optional(),
  })).mutation(async ({ ctx, input }) => {
    const buffer = Buffer.from(input.imageBase64.replace(/^data:[^;]+;base64,/, ""), "base64");
    const key = `ac/maintenance/${ctx.user.tenantId}/${input.type}-${Date.now()}.jpg`;
    const { url } = await storagePut(key, buffer, input.mimeType);
    return { url, key };
  }),
  calendarEvents: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const rows = await db.select().from(acMaintenanceLog)
      .where(and(eq(acMaintenanceLog.tenantId, ctx.user.tenantId ?? 1)))
      .orderBy(desc(acMaintenanceLog.scheduledDate));
    return rows;
  }),
});

// ─── Maintenance Programs ─────────────────────────────────────────────────────
const programSchema = z.object({
  policyId: z.number().nullish(),
  name: z.string().min(1),
  description: z.string().nullish(),
  totalVisits: z.number().min(1),
  frequency: z.enum(["monthly", "bimonthly", "quarterly", "biannual", "annual", "custom"]).default("quarterly"),
  startDate: z.string(),
  endDate: z.string(),
  technician: z.string().nullish(),
  schedule: z.string().nullish(),
  visitWeekStart: z.string().nullish(),
  programMonth: z.string().nullish(),
  programYear: z.string().nullish(),
  status: z.enum(["active", "completed", "cancelled"]).default("active"),
});

const programItemSchema = z.object({
  programId: z.number(),
  category: z.enum(["readers", "controllers", "doors"]),
  itemId: z.number(),
  itemName: z.string().nullish(),
  itemLocation: z.string().nullish(),
  area: z.string().nullish(),
  requiresLift: z.boolean().default(false),
  noTechnicians: z.number().default(1),
  observations: z.string().nullish(),
  sortOrder: z.number().default(0),
  scheduledDays: z.string().nullish(),
  scheduledDates: z.string().nullish(),
});

export const acProgramsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    return db.select().from(acMaintenancePrograms).where(eq(acMaintenancePrograms.tenantId, ctx.user.tenantId ?? 1)).orderBy(desc(acMaintenancePrograms.createdAt));
  }),
  get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const [prog] = await db.select().from(acMaintenancePrograms).where(and(eq(acMaintenancePrograms.id, input.id), eq(acMaintenancePrograms.tenantId, ctx.user.tenantId ?? 1))).limit(1);
    if (!prog) return null;
    const items = await db.select().from(acMaintenanceProgramItems).where(and(eq(acMaintenanceProgramItems.programId, input.id), eq(acMaintenanceProgramItems.tenantId, ctx.user.tenantId ?? 1)));
    return { ...prog, items };
  }),
  create: protectedProcedure.input(programSchema).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const [result] = await db.insert(acMaintenancePrograms).values({
      ...input, tenantId: ctx.user.tenantId ?? 1,
      startDate: toDate(input.startDate) as any,
      endDate: toDate(input.endDate) as any,
      visitWeekStart: toDate(input.visitWeekStart) as any,
      createdByUserId: ctx.user.id,
      createdByUserName: ctx.user.name,
    } as any);
    return { id: (result as any).insertId };
  }),
  update: protectedProcedure.input(z.object({ id: z.number() }).merge(programSchema)).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const { id, ...data } = input;
    await db.update(acMaintenancePrograms).set({
      ...data,
      startDate: toDate(data.startDate) as any,
      endDate: toDate(data.endDate) as any,
      visitWeekStart: toDate(data.visitWeekStart) as any,
    } as any).where(and(eq(acMaintenancePrograms.id, id), eq(acMaintenancePrograms.tenantId, ctx.user.tenantId ?? 1)));
    return { success: true };
  }),
  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    await db.delete(acMaintenanceProgramItems).where(and(eq(acMaintenanceProgramItems.programId, input.id), eq(acMaintenanceProgramItems.tenantId, ctx.user.tenantId ?? 1)));
    await db.delete(acMaintenanceLog).where(and(eq(acMaintenanceLog.programId, input.id), eq(acMaintenanceLog.tenantId, ctx.user.tenantId ?? 1)));
    await db.delete(acMaintenancePrograms).where(and(eq(acMaintenancePrograms.id, input.id), eq(acMaintenancePrograms.tenantId, ctx.user.tenantId ?? 1)));
    return { success: true };
  }),
  addItem: protectedProcedure.input(programItemSchema).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const [result] = await db.insert(acMaintenanceProgramItems).values({ ...input, tenantId: ctx.user.tenantId } as any);
    return { id: (result as any).insertId };
  }),
  removeItem: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    await db.delete(acMaintenanceProgramItems).where(and(eq(acMaintenanceProgramItems.id, input.id), eq(acMaintenanceProgramItems.tenantId, ctx.user.tenantId ?? 1)));
    return { success: true };
  }),
  generateCalendar: protectedProcedure.input(z.object({ programId: z.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const tenantId = ctx.user.tenantId ?? 1;
    const [prog] = await db.select().from(acMaintenancePrograms).where(and(eq(acMaintenancePrograms.id, input.programId), eq(acMaintenancePrograms.tenantId, tenantId))).limit(1);
    if (!prog) throw new Error("Programa no encontrado");
    const items = await db.select().from(acMaintenanceProgramItems).where(and(eq(acMaintenanceProgramItems.programId, input.programId), eq(acMaintenanceProgramItems.tenantId, tenantId)));
    await db.delete(acMaintenanceLog).where(and(eq(acMaintenanceLog.programId, input.programId), eq(acMaintenanceLog.tenantId, tenantId)));
    const events: any[] = [];
    for (const item of items) {
      const dates = item.scheduledDates ? item.scheduledDates.split(",").filter(Boolean) : [];
      for (const dateStr of dates) {
        events.push({
          tenantId,
          category: item.category,
          itemId: item.itemId,
          itemName: item.itemName,
          type: "preventive",
          status: "scheduled",
          title: `Mantenimiento Preventivo — ${item.itemName ?? "Equipo"}`,
          scheduledDate: toDate(dateStr),
          programId: input.programId,
          createdByUserId: ctx.user.id,
          createdByUserName: ctx.user.name,
        });
      }
    }
    if (events.length > 0) {
      for (const ev of events) {
        await db.insert(acMaintenanceLog).values(ev as any);
      }
    }
    return { generated: events.length };
  }),
  stats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const tenantId = ctx.user.tenantId ?? 1;
    const programs = await db.select().from(acMaintenancePrograms).where(eq(acMaintenancePrograms.tenantId, tenantId));
    const logs = await db.select().from(acMaintenanceLog).where(eq(acMaintenanceLog.tenantId, tenantId));
    return {
      totalPrograms: programs.length,
      activePrograms: programs.filter(p => p.status === "active").length,
      totalEvents: logs.length,
      completedEvents: logs.filter(l => l.status === "completed").length,
      scheduledEvents: logs.filter(l => l.status === "scheduled").length,
    };
  }),
});

// ─── Combined stats ───────────────────────────────────────────────────────────
export const acStatsRouter = router({
  summary: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const tenantId = ctx.user.tenantId ?? 1;
    const [readers, controllers, doors] = await Promise.all([
      db.select().from(acReaders).where(eq(acReaders.tenantId, tenantId)),
      db.select().from(acControllers).where(eq(acControllers.tenantId, tenantId)),
      db.select().from(acDoors).where(eq(acDoors.tenantId, tenantId)),
    ]);
    const allEquipment = [...readers, ...controllers, ...doors];
    const totalCapex = allEquipment.reduce((sum, e) => sum + parseFloat((e as any).amount ?? "0"), 0);
    return {
      readers: readers.length,
      controllers: controllers.length,
      doors: doors.length,
      total: allEquipment.length,
      totalCapex,
    };
  }),
});
