import { z } from "zod";
import { eq, and, desc, like, or } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  pagingAmplifiers, pagingSpeakers, pagingConsoles, pagingPowerSupplies,
  pagingMaintenanceLog, pagingMaintenancePrograms, pagingMaintenanceProgramItems,
} from "../../drizzle/schema";
import { storagePut } from "../storage";

function toDate(s?: string | null): Date | undefined {
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

const listInput = z.object({ search: z.string().optional(), status: z.string().optional(), branchId: z.number().optional(), limit: z.number().optional() }).optional();
const statusEnum = z.enum(["active", "inactive", "maintenance", "retired", "damaged", "warranty"]).nullish();

// ─── Amplifiers ───────────────────────────────────────────────────────────────
const amplifierSchema = z.object({
  idAmplifier: z.string().nullish(), marca: z.string().nullish(), modelo: z.string().nullish(), serie: z.string().nullish(),
  tipo: z.enum(["monocanal", "multicanal", "matricial", "ip", "otro"]).nullish(),
  potencia: z.string().nullish(), canales: z.number().nullish(), zonas: z.number().nullish(),
  ip: z.string().nullish(), rack: z.string().nullish(), unidadRack: z.string().nullish(),
  area: z.string().nullish(), edificio: z.string().nullish(), proveedor: z.string().nullish(),
  fechaCompra: z.string().nullish(), garantiaExpiracion: z.string().nullish(),
  po: z.string().nullish(), invoiceNumber: z.string().nullish(), amount: z.string().nullish(),
  slaTier: z.enum(["tier1", "tier2", "tier3"]).nullish(), rfidTag: z.string().nullish(),
  status: statusEnum, observaciones: z.string().nullish(), fotoUrl: z.string().nullish(), branchId: z.number().nullish(),
});

export const pagingAmplifiersRouter = router({
  list: protectedProcedure.input(listInput).query(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const conditions = [eq(pagingAmplifiers.tenantId, ctx.user.tenantId ?? 1)];
    if (input?.status) conditions.push(eq(pagingAmplifiers.status, input.status as any));
    if (input?.search) conditions.push(or(like(pagingAmplifiers.marca, `%${input.search}%`), like(pagingAmplifiers.modelo, `%${input.search}%`), like(pagingAmplifiers.idAmplifier, `%${input.search}%`))!);
    return db.select().from(pagingAmplifiers).where(and(...conditions)).orderBy(desc(pagingAmplifiers.createdAt)).limit(input?.limit ?? 200);
  }),
  get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const [row] = await db.select().from(pagingAmplifiers).where(and(eq(pagingAmplifiers.id, input.id), eq(pagingAmplifiers.tenantId, ctx.user.tenantId ?? 1))).limit(1);
    return row ?? null;
  }),
  create: protectedProcedure.input(amplifierSchema).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const [r] = await db.insert(pagingAmplifiers).values({ ...input, tenantId: ctx.user.tenantId ?? 1, fechaCompra: toDate(input.fechaCompra) as any, garantiaExpiracion: toDate(input.garantiaExpiracion) as any } as any);
    return { id: (r as any).insertId };
  }),
  update: protectedProcedure.input(z.object({ id: z.number() }).merge(amplifierSchema)).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const { id, ...data } = input;
    await db.update(pagingAmplifiers).set({ ...data, fechaCompra: toDate(data.fechaCompra) as any, garantiaExpiracion: toDate(data.garantiaExpiracion) as any } as any).where(and(eq(pagingAmplifiers.id, id), eq(pagingAmplifiers.tenantId, ctx.user.tenantId ?? 1)));
    return { success: true };
  }),
  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    await db.delete(pagingAmplifiers).where(and(eq(pagingAmplifiers.id, input.id), eq(pagingAmplifiers.tenantId, ctx.user.tenantId ?? 1)));
    return { success: true };
  }),
  stats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const rows = await db.select().from(pagingAmplifiers).where(eq(pagingAmplifiers.tenantId, ctx.user.tenantId ?? 1));
    return { total: rows.length, active: rows.filter(r => r.status === "active").length };
  }),
});

// ─── Speakers ─────────────────────────────────────────────────────────────────
const speakerSchema = z.object({
  idSpeaker: z.string().nullish(), marca: z.string().nullish(), modelo: z.string().nullish(), serie: z.string().nullish(),
  tipo: z.enum(["techo", "pared", "columna", "cuerno", "subwoofer", "otro"]).nullish(),
  potencia: z.string().nullish(), impedancia: z.string().nullish(), zona: z.string().nullish(),
  amplificadorId: z.number().nullish(), area: z.string().nullish(), edificio: z.string().nullish(),
  proveedor: z.string().nullish(), fechaCompra: z.string().nullish(), garantiaExpiracion: z.string().nullish(),
  po: z.string().nullish(), invoiceNumber: z.string().nullish(), amount: z.string().nullish(),
  slaTier: z.enum(["tier1", "tier2", "tier3"]).nullish(), rfidTag: z.string().nullish(),
  status: statusEnum, observaciones: z.string().nullish(), fotoUrl: z.string().nullish(), branchId: z.number().nullish(),
});

export const pagingSpeakersRouter = router({
  list: protectedProcedure.input(listInput).query(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const conditions = [eq(pagingSpeakers.tenantId, ctx.user.tenantId ?? 1)];
    if (input?.status) conditions.push(eq(pagingSpeakers.status, input.status as any));
    if (input?.search) conditions.push(or(like(pagingSpeakers.marca, `%${input.search}%`), like(pagingSpeakers.modelo, `%${input.search}%`))!);
    return db.select().from(pagingSpeakers).where(and(...conditions)).orderBy(desc(pagingSpeakers.createdAt)).limit(200);
  }),
  create: protectedProcedure.input(speakerSchema).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const [r] = await db.insert(pagingSpeakers).values({ ...input, tenantId: ctx.user.tenantId ?? 1, fechaCompra: toDate(input.fechaCompra) as any, garantiaExpiracion: toDate(input.garantiaExpiracion) as any } as any);
    return { id: (r as any).insertId };
  }),
  update: protectedProcedure.input(z.object({ id: z.number() }).merge(speakerSchema)).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const { id, ...data } = input;
    await db.update(pagingSpeakers).set({ ...data, fechaCompra: toDate(data.fechaCompra) as any, garantiaExpiracion: toDate(data.garantiaExpiracion) as any } as any).where(and(eq(pagingSpeakers.id, id), eq(pagingSpeakers.tenantId, ctx.user.tenantId ?? 1)));
    return { success: true };
  }),
  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    await db.delete(pagingSpeakers).where(and(eq(pagingSpeakers.id, input.id), eq(pagingSpeakers.tenantId, ctx.user.tenantId ?? 1)));
    return { success: true };
  }),
  stats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const rows = await db.select().from(pagingSpeakers).where(eq(pagingSpeakers.tenantId, ctx.user.tenantId ?? 1));
    return { total: rows.length, active: rows.filter(r => r.status === "active").length };
  }),
});

// ─── Consoles ─────────────────────────────────────────────────────────────────
const consoleSchema = z.object({
  idConsole: z.string().nullish(), marca: z.string().nullish(), modelo: z.string().nullish(), serie: z.string().nullish(),
  tipo: z.enum(["microfono_paging", "consola_ip", "telefono_paging", "panel_control", "otro"]).nullish(),
  zonas: z.number().nullish(), ip: z.string().nullish(), area: z.string().nullish(), edificio: z.string().nullish(),
  amplificadorId: z.number().nullish(), proveedor: z.string().nullish(),
  fechaCompra: z.string().nullish(), garantiaExpiracion: z.string().nullish(),
  po: z.string().nullish(), invoiceNumber: z.string().nullish(), amount: z.string().nullish(),
  slaTier: z.enum(["tier1", "tier2", "tier3"]).nullish(), rfidTag: z.string().nullish(),
  status: statusEnum, observaciones: z.string().nullish(), fotoUrl: z.string().nullish(), branchId: z.number().nullish(),
});

export const pagingConsolesRouter = router({
  list: protectedProcedure.input(listInput).query(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const conditions = [eq(pagingConsoles.tenantId, ctx.user.tenantId ?? 1)];
    if (input?.status) conditions.push(eq(pagingConsoles.status, input.status as any));
    if (input?.search) conditions.push(or(like(pagingConsoles.marca, `%${input.search}%`), like(pagingConsoles.modelo, `%${input.search}%`))!);
    return db.select().from(pagingConsoles).where(and(...conditions)).orderBy(desc(pagingConsoles.createdAt)).limit(200);
  }),
  create: protectedProcedure.input(consoleSchema).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const [r] = await db.insert(pagingConsoles).values({ ...input, tenantId: ctx.user.tenantId ?? 1, fechaCompra: toDate(input.fechaCompra) as any, garantiaExpiracion: toDate(input.garantiaExpiracion) as any } as any);
    return { id: (r as any).insertId };
  }),
  update: protectedProcedure.input(z.object({ id: z.number() }).merge(consoleSchema)).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const { id, ...data } = input;
    await db.update(pagingConsoles).set({ ...data, fechaCompra: toDate(data.fechaCompra) as any, garantiaExpiracion: toDate(data.garantiaExpiracion) as any } as any).where(and(eq(pagingConsoles.id, id), eq(pagingConsoles.tenantId, ctx.user.tenantId ?? 1)));
    return { success: true };
  }),
  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    await db.delete(pagingConsoles).where(and(eq(pagingConsoles.id, input.id), eq(pagingConsoles.tenantId, ctx.user.tenantId ?? 1)));
    return { success: true };
  }),
  stats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const rows = await db.select().from(pagingConsoles).where(eq(pagingConsoles.tenantId, ctx.user.tenantId ?? 1));
    return { total: rows.length, active: rows.filter(r => r.status === "active").length };
  }),
});

// ─── Power Supplies ───────────────────────────────────────────────────────────
const powerSchema = z.object({
  idPower: z.string().nullish(), marca: z.string().nullish(), modelo: z.string().nullish(), serie: z.string().nullish(),
  tipo: z.enum(["ups", "fuente_regulada", "bateria_respaldo", "otro"]).nullish(),
  capacidad: z.string().nullish(), area: z.string().nullish(), edificio: z.string().nullish(),
  proveedor: z.string().nullish(), fechaCompra: z.string().nullish(), garantiaExpiracion: z.string().nullish(),
  po: z.string().nullish(), invoiceNumber: z.string().nullish(), amount: z.string().nullish(),
  slaTier: z.enum(["tier1", "tier2", "tier3"]).nullish(), rfidTag: z.string().nullish(),
  status: statusEnum, observaciones: z.string().nullish(), fotoUrl: z.string().nullish(), branchId: z.number().nullish(),
});

export const pagingPowerRouter = router({
  list: protectedProcedure.input(listInput).query(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const conditions = [eq(pagingPowerSupplies.tenantId, ctx.user.tenantId ?? 1)];
    if (input?.status) conditions.push(eq(pagingPowerSupplies.status, input.status as any));
    if (input?.search) conditions.push(or(like(pagingPowerSupplies.marca, `%${input.search}%`), like(pagingPowerSupplies.modelo, `%${input.search}%`))!);
    return db.select().from(pagingPowerSupplies).where(and(...conditions)).orderBy(desc(pagingPowerSupplies.createdAt)).limit(200);
  }),
  create: protectedProcedure.input(powerSchema).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const [r] = await db.insert(pagingPowerSupplies).values({ ...input, tenantId: ctx.user.tenantId ?? 1, fechaCompra: toDate(input.fechaCompra) as any, garantiaExpiracion: toDate(input.garantiaExpiracion) as any } as any);
    return { id: (r as any).insertId };
  }),
  update: protectedProcedure.input(z.object({ id: z.number() }).merge(powerSchema)).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const { id, ...data } = input;
    await db.update(pagingPowerSupplies).set({ ...data, fechaCompra: toDate(data.fechaCompra) as any, garantiaExpiracion: toDate(data.garantiaExpiracion) as any } as any).where(and(eq(pagingPowerSupplies.id, id), eq(pagingPowerSupplies.tenantId, ctx.user.tenantId ?? 1)));
    return { success: true };
  }),
  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    await db.delete(pagingPowerSupplies).where(and(eq(pagingPowerSupplies.id, input.id), eq(pagingPowerSupplies.tenantId, ctx.user.tenantId ?? 1)));
    return { success: true };
  }),
  stats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const rows = await db.select().from(pagingPowerSupplies).where(eq(pagingPowerSupplies.tenantId, ctx.user.tenantId ?? 1));
    return { total: rows.length };
  }),
});

// ─── Maintenance ──────────────────────────────────────────────────────────────
const maintenanceLogSchema = z.object({
  category: z.enum(["amplifiers", "speakers", "consoles", "power_supplies"]),
  itemId: z.number(), itemName: z.string().nullish(),
  type: z.enum(["preventive", "corrective", "predictive", "inspection", "replacement", "upgrade", "other"]).default("preventive"),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).default("completed"),
  title: z.string().min(1), description: z.string().nullish(), findings: z.string().nullish(), actions: z.string().nullish(),
  technician: z.string().nullish(), scheduledDate: z.string().nullish(), executedDate: z.string().nullish(),
  durationHours: z.string().nullish(), cost: z.string().nullish(), nextMaintenanceDate: z.string().nullish(),
  beforePhotoUrl: z.string().nullish(), beforePhotoKey: z.string().nullish(),
  afterPhotoUrl: z.string().nullish(), afterPhotoKey: z.string().nullish(),
  clientSignatureUrl: z.string().nullish(), clientSignatureKey: z.string().nullish(), clientName: z.string().nullish(),
  policyId: z.number().nullish(), programId: z.number().nullish(),
});

export const pagingMaintenanceRouter = router({
  list: protectedProcedure.input(z.object({ category: z.string().optional(), itemId: z.number().optional(), limit: z.number().optional() }).optional()).query(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const conditions = [eq(pagingMaintenanceLog.tenantId, ctx.user.tenantId ?? 1)];
    if (input?.category) conditions.push(eq(pagingMaintenanceLog.category, input.category as any));
    if (input?.itemId) conditions.push(eq(pagingMaintenanceLog.itemId, input.itemId));
    return db.select().from(pagingMaintenanceLog).where(and(...conditions)).orderBy(desc(pagingMaintenanceLog.createdAt)).limit(input?.limit ?? 200);
  }),
  create: protectedProcedure.input(maintenanceLogSchema).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const [r] = await db.insert(pagingMaintenanceLog).values({ ...input, tenantId: ctx.user.tenantId ?? 1, scheduledDate: toDate(input.scheduledDate) as any, executedDate: toDate(input.executedDate) as any, nextMaintenanceDate: toDate(input.nextMaintenanceDate) as any, createdByUserId: ctx.user.id, createdByUserName: ctx.user.name } as any);
    return { id: (r as any).insertId };
  }),
  update: protectedProcedure.input(z.object({ id: z.number() }).merge(maintenanceLogSchema)).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const { id, ...data } = input;
    await db.update(pagingMaintenanceLog).set({ ...data, scheduledDate: toDate(data.scheduledDate) as any, executedDate: toDate(data.executedDate) as any, nextMaintenanceDate: toDate(data.nextMaintenanceDate) as any } as any).where(and(eq(pagingMaintenanceLog.id, id), eq(pagingMaintenanceLog.tenantId, ctx.user.tenantId ?? 1)));
    return { success: true };
  }),
  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    await db.delete(pagingMaintenanceLog).where(and(eq(pagingMaintenanceLog.id, input.id), eq(pagingMaintenanceLog.tenantId, ctx.user.tenantId ?? 1)));
    return { success: true };
  }),
  uploadPhoto: protectedProcedure.input(z.object({ imageBase64: z.string(), mimeType: z.string().default("image/jpeg"), type: z.enum(["before", "after", "signature"]) })).mutation(async ({ ctx, input }) => {
    const buffer = Buffer.from(input.imageBase64.replace(/^data:[^;]+;base64,/, ""), "base64");
    const key = `paging/maintenance/${ctx.user.tenantId}/${input.type}-${Date.now()}.jpg`;
    const { url } = await storagePut(key, buffer, input.mimeType);
    return { url, key };
  }),
  calendarEvents: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    return db.select().from(pagingMaintenanceLog).where(eq(pagingMaintenanceLog.tenantId, ctx.user.tenantId ?? 1)).orderBy(desc(pagingMaintenanceLog.scheduledDate));
  }),
});

// ─── Programs ─────────────────────────────────────────────────────────────────
const programSchema = z.object({
  policyId: z.number().nullish(), name: z.string().min(1), description: z.string().nullish(),
  totalVisits: z.number().min(1), frequency: z.enum(["monthly", "bimonthly", "quarterly", "biannual", "annual", "custom"]).default("quarterly"),
  startDate: z.string(), endDate: z.string(), technician: z.string().nullish(), schedule: z.string().nullish(),
  visitWeekStart: z.string().nullish(), programMonth: z.string().nullish(), programYear: z.string().nullish(),
  status: z.enum(["active", "completed", "cancelled"]).default("active"),
});

export const pagingProgramsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    return db.select().from(pagingMaintenancePrograms).where(eq(pagingMaintenancePrograms.tenantId, ctx.user.tenantId ?? 1)).orderBy(desc(pagingMaintenancePrograms.createdAt));
  }),
  get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const [prog] = await db.select().from(pagingMaintenancePrograms).where(and(eq(pagingMaintenancePrograms.id, input.id), eq(pagingMaintenancePrograms.tenantId, ctx.user.tenantId ?? 1))).limit(1);
    if (!prog) return null;
    const items = await db.select().from(pagingMaintenanceProgramItems).where(and(eq(pagingMaintenanceProgramItems.programId, input.id), eq(pagingMaintenanceProgramItems.tenantId, ctx.user.tenantId ?? 1)));
    return { ...prog, items };
  }),
  create: protectedProcedure.input(programSchema).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const [r] = await db.insert(pagingMaintenancePrograms).values({ ...input, tenantId: ctx.user.tenantId ?? 1, startDate: toDate(input.startDate) as any, endDate: toDate(input.endDate) as any, visitWeekStart: toDate(input.visitWeekStart) as any, createdByUserId: ctx.user.id, createdByUserName: ctx.user.name } as any);
    return { id: (r as any).insertId };
  }),
  update: protectedProcedure.input(z.object({ id: z.number() }).merge(programSchema)).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const { id, ...data } = input;
    await db.update(pagingMaintenancePrograms).set({ ...data, startDate: toDate(data.startDate) as any, endDate: toDate(data.endDate) as any, visitWeekStart: toDate(data.visitWeekStart) as any } as any).where(and(eq(pagingMaintenancePrograms.id, id), eq(pagingMaintenancePrograms.tenantId, ctx.user.tenantId ?? 1)));
    return { success: true };
  }),
  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    await db.delete(pagingMaintenanceProgramItems).where(and(eq(pagingMaintenanceProgramItems.programId, input.id), eq(pagingMaintenanceProgramItems.tenantId, ctx.user.tenantId ?? 1)));
    await db.delete(pagingMaintenanceLog).where(and(eq(pagingMaintenanceLog.programId, input.id), eq(pagingMaintenanceLog.tenantId, ctx.user.tenantId ?? 1)));
    await db.delete(pagingMaintenancePrograms).where(and(eq(pagingMaintenancePrograms.id, input.id), eq(pagingMaintenancePrograms.tenantId, ctx.user.tenantId ?? 1)));
    return { success: true };
  }),
  addItem: protectedProcedure.input(z.object({ programId: z.number(), category: z.enum(["amplifiers", "speakers", "consoles", "power_supplies"]), itemId: z.number(), itemName: z.string().nullish(), itemLocation: z.string().nullish(), area: z.string().nullish(), requiresLift: z.boolean().default(false), noTechnicians: z.number().default(1), observations: z.string().nullish(), sortOrder: z.number().default(0), scheduledDays: z.string().nullish(), scheduledDates: z.string().nullish() })).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const [r] = await db.insert(pagingMaintenanceProgramItems).values({ ...input, tenantId: ctx.user.tenantId } as any);
    return { id: (r as any).insertId };
  }),
  removeItem: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    await db.delete(pagingMaintenanceProgramItems).where(and(eq(pagingMaintenanceProgramItems.id, input.id), eq(pagingMaintenanceProgramItems.tenantId, ctx.user.tenantId ?? 1)));
    return { success: true };
  }),
  generateCalendar: protectedProcedure.input(z.object({ programId: z.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const tenantId = ctx.user.tenantId ?? 1;
    const [prog] = await db.select().from(pagingMaintenancePrograms).where(and(eq(pagingMaintenancePrograms.id, input.programId), eq(pagingMaintenancePrograms.tenantId, tenantId))).limit(1);
    if (!prog) throw new Error("Programa no encontrado");
    const items = await db.select().from(pagingMaintenanceProgramItems).where(and(eq(pagingMaintenanceProgramItems.programId, input.programId), eq(pagingMaintenanceProgramItems.tenantId, tenantId)));
    await db.delete(pagingMaintenanceLog).where(and(eq(pagingMaintenanceLog.programId, input.programId), eq(pagingMaintenanceLog.tenantId, tenantId)));
    let count = 0;
    for (const item of items) {
      const dates = item.scheduledDates ? item.scheduledDates.split(",").filter(Boolean) : [];
      for (const dateStr of dates) {
        await db.insert(pagingMaintenanceLog).values({ tenantId, category: item.category, itemId: item.itemId, itemName: item.itemName, type: "preventive", status: "scheduled", title: `Mantenimiento Preventivo — ${item.itemName ?? "Equipo"}`, scheduledDate: toDate(dateStr), programId: input.programId, createdByUserId: ctx.user.id, createdByUserName: ctx.user.name } as any);
        count++;
      }
    }
    return { generated: count };
  }),
  stats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const tenantId = ctx.user.tenantId ?? 1;
    const [programs, logs] = await Promise.all([
      db.select().from(pagingMaintenancePrograms).where(eq(pagingMaintenancePrograms.tenantId, tenantId)),
      db.select().from(pagingMaintenanceLog).where(eq(pagingMaintenanceLog.tenantId, tenantId)),
    ]);
    return { totalPrograms: programs.length, activePrograms: programs.filter(p => p.status === "active").length, totalEvents: logs.length, completedEvents: logs.filter(l => l.status === "completed").length, scheduledEvents: logs.filter(l => l.status === "scheduled").length };
  }),
});

// ─── Summary ──────────────────────────────────────────────────────────────────
export const pagingStatsRouter = router({
  summary: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const tenantId = ctx.user.tenantId ?? 1;
    const [amp, spk, con, pwr] = await Promise.all([
      db.select().from(pagingAmplifiers).where(eq(pagingAmplifiers.tenantId, tenantId)),
      db.select().from(pagingSpeakers).where(eq(pagingSpeakers.tenantId, tenantId)),
      db.select().from(pagingConsoles).where(eq(pagingConsoles.tenantId, tenantId)),
      db.select().from(pagingPowerSupplies).where(eq(pagingPowerSupplies.tenantId, tenantId)),
    ]);
    const all = [...amp, ...spk, ...con, ...pwr];
    const totalCapex = all.reduce((s, e) => s + parseFloat((e as any).amount ?? "0"), 0);
    return { amplifiers: amp.length, speakers: spk.length, consoles: con.length, powerSupplies: pwr.length, total: all.length, totalCapex };
  }),
});
