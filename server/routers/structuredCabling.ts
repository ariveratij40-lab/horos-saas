import { z } from "zod";
import { eq, and, desc, like, or } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  cabledSwitches, cabledPatchPanels, cabledOutlets, cabledDucts,
  cabledMaintenanceLog, cabledMaintenancePrograms, cabledMaintenanceProgramItems,
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
}).optional();

const statusEnum = z.enum(["active", "inactive", "maintenance", "retired", "damaged", "warranty"]).nullish();

// ─── Switches ─────────────────────────────────────────────────────────────────
const switchSchema = z.object({
  idSwitch: z.string().nullish(),
  marca: z.string().nullish(),
  modelo: z.string().nullish(),
  serie: z.string().nullish(),
  tipo: z.enum(["switch_l2", "switch_l3", "router", "core", "distribucion", "acceso", "otro"]).nullish(),
  puertos: z.number().nullish(),
  puertosPoE: z.number().nullish(),
  velocidad: z.string().nullish(),
  administrable: z.boolean().nullish(),
  ip: z.string().nullish(),
  mac: z.string().nullish(),
  vlan: z.string().nullish(),
  firmware: z.string().nullish(),
  rack: z.string().nullish(),
  unidadRack: z.string().nullish(),
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

export const cabledSwitchesRouter = router({
  list: protectedProcedure.input(listInput).query(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const tenantId = ctx.user.tenantId ?? 1;
    const conditions = [eq(cabledSwitches.tenantId, tenantId)];
    if (input?.status) conditions.push(eq(cabledSwitches.status, input.status as any));
    if (input?.branchId) conditions.push(eq(cabledSwitches.branchId, input.branchId));
    if (input?.search) conditions.push(or(like(cabledSwitches.marca, `%${input.search}%`), like(cabledSwitches.modelo, `%${input.search}%`), like(cabledSwitches.idSwitch, `%${input.search}%`))!);
    return db.select().from(cabledSwitches).where(and(...conditions)).orderBy(desc(cabledSwitches.createdAt)).limit(input?.limit ?? 200);
  }),
  get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const [row] = await db.select().from(cabledSwitches).where(and(eq(cabledSwitches.id, input.id), eq(cabledSwitches.tenantId, ctx.user.tenantId ?? 1))).limit(1);
    return row ?? null;
  }),
  create: protectedProcedure.input(switchSchema).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const [r] = await db.insert(cabledSwitches).values({ ...input, tenantId: ctx.user.tenantId ?? 1, fechaCompra: toDate(input.fechaCompra) as any, garantiaExpiracion: toDate(input.garantiaExpiracion) as any } as any);
    return { id: (r as any).insertId };
  }),
  update: protectedProcedure.input(z.object({ id: z.number() }).merge(switchSchema)).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const { id, ...data } = input;
    await db.update(cabledSwitches).set({ ...data, fechaCompra: toDate(data.fechaCompra) as any, garantiaExpiracion: toDate(data.garantiaExpiracion) as any } as any).where(and(eq(cabledSwitches.id, id), eq(cabledSwitches.tenantId, ctx.user.tenantId ?? 1)));
    return { success: true };
  }),
  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    await db.delete(cabledSwitches).where(and(eq(cabledSwitches.id, input.id), eq(cabledSwitches.tenantId, ctx.user.tenantId ?? 1)));
    return { success: true };
  }),
  stats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const rows = await db.select().from(cabledSwitches).where(eq(cabledSwitches.tenantId, ctx.user.tenantId ?? 1));
    return { total: rows.length, active: rows.filter(r => r.status === "active").length };
  }),
});

// ─── Patch Panels ─────────────────────────────────────────────────────────────
const patchPanelSchema = z.object({
  idPanel: z.string().nullish(),
  marca: z.string().nullish(),
  modelo: z.string().nullish(),
  serie: z.string().nullish(),
  puertos: z.number().nullish(),
  categoria: z.enum(["cat5e", "cat6", "cat6a", "cat7", "fibra", "otro"]).nullish(),
  rack: z.string().nullish(),
  unidadRack: z.string().nullish(),
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
  status: z.enum(["active", "inactive", "maintenance", "retired", "damaged"]).nullish(),
  observaciones: z.string().nullish(),
  fotoUrl: z.string().nullish(),
  branchId: z.number().nullish(),
});

export const cabledPatchPanelsRouter = router({
  list: protectedProcedure.input(listInput).query(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const conditions = [eq(cabledPatchPanels.tenantId, ctx.user.tenantId ?? 1)];
    if (input?.status) conditions.push(eq(cabledPatchPanels.status, input.status as any));
    if (input?.search) conditions.push(or(like(cabledPatchPanels.marca, `%${input.search}%`), like(cabledPatchPanels.modelo, `%${input.search}%`))!);
    return db.select().from(cabledPatchPanels).where(and(...conditions)).orderBy(desc(cabledPatchPanels.createdAt)).limit(200);
  }),
  get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const [row] = await db.select().from(cabledPatchPanels).where(and(eq(cabledPatchPanels.id, input.id), eq(cabledPatchPanels.tenantId, ctx.user.tenantId ?? 1))).limit(1);
    return row ?? null;
  }),
  create: protectedProcedure.input(patchPanelSchema).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const [r] = await db.insert(cabledPatchPanels).values({ ...input, tenantId: ctx.user.tenantId ?? 1, fechaCompra: toDate(input.fechaCompra) as any, garantiaExpiracion: toDate(input.garantiaExpiracion) as any } as any);
    return { id: (r as any).insertId };
  }),
  update: protectedProcedure.input(z.object({ id: z.number() }).merge(patchPanelSchema)).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const { id, ...data } = input;
    await db.update(cabledPatchPanels).set({ ...data, fechaCompra: toDate(data.fechaCompra) as any, garantiaExpiracion: toDate(data.garantiaExpiracion) as any } as any).where(and(eq(cabledPatchPanels.id, id), eq(cabledPatchPanels.tenantId, ctx.user.tenantId ?? 1)));
    return { success: true };
  }),
  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    await db.delete(cabledPatchPanels).where(and(eq(cabledPatchPanels.id, input.id), eq(cabledPatchPanels.tenantId, ctx.user.tenantId ?? 1)));
    return { success: true };
  }),
  stats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const rows = await db.select().from(cabledPatchPanels).where(eq(cabledPatchPanels.tenantId, ctx.user.tenantId ?? 1));
    return { total: rows.length, active: rows.filter(r => r.status === "active").length };
  }),
});

// ─── Outlets ──────────────────────────────────────────────────────────────────
const outletSchema = z.object({
  idOutlet: z.string().nullish(),
  marca: z.string().nullish(),
  modelo: z.string().nullish(),
  puertos: z.number().nullish(),
  categoria: z.enum(["cat5e", "cat6", "cat6a", "cat7", "fibra", "otro"]).nullish(),
  area: z.string().nullish(),
  edificio: z.string().nullish(),
  patchPanelId: z.number().nullish(),
  puertoPanel: z.string().nullish(),
  switchId: z.number().nullish(),
  puertoSwitch: z.string().nullish(),
  proveedor: z.string().nullish(),
  fechaCompra: z.string().nullish(),
  po: z.string().nullish(),
  invoiceNumber: z.string().nullish(),
  amount: z.string().nullish(),
  slaTier: z.enum(["tier1", "tier2", "tier3"]).nullish(),
  rfidTag: z.string().nullish(),
  status: z.enum(["active", "inactive", "maintenance", "retired", "damaged"]).nullish(),
  observaciones: z.string().nullish(),
  branchId: z.number().nullish(),
});

export const cabledOutletsRouter = router({
  list: protectedProcedure.input(listInput).query(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const conditions = [eq(cabledOutlets.tenantId, ctx.user.tenantId ?? 1)];
    if (input?.status) conditions.push(eq(cabledOutlets.status, input.status as any));
    if (input?.search) conditions.push(or(like(cabledOutlets.idOutlet, `%${input.search}%`), like(cabledOutlets.area, `%${input.search}%`))!);
    return db.select().from(cabledOutlets).where(and(...conditions)).orderBy(desc(cabledOutlets.createdAt)).limit(200);
  }),
  create: protectedProcedure.input(outletSchema).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const [r] = await db.insert(cabledOutlets).values({ ...input, tenantId: ctx.user.tenantId ?? 1, fechaCompra: toDate(input.fechaCompra) as any } as any);
    return { id: (r as any).insertId };
  }),
  update: protectedProcedure.input(z.object({ id: z.number() }).merge(outletSchema)).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const { id, ...data } = input;
    await db.update(cabledOutlets).set({ ...data, fechaCompra: toDate(data.fechaCompra) as any } as any).where(and(eq(cabledOutlets.id, id), eq(cabledOutlets.tenantId, ctx.user.tenantId ?? 1)));
    return { success: true };
  }),
  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    await db.delete(cabledOutlets).where(and(eq(cabledOutlets.id, input.id), eq(cabledOutlets.tenantId, ctx.user.tenantId ?? 1)));
    return { success: true };
  }),
  stats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const rows = await db.select().from(cabledOutlets).where(eq(cabledOutlets.tenantId, ctx.user.tenantId ?? 1));
    return { total: rows.length, active: rows.filter(r => r.status === "active").length };
  }),
});

// ─── Ducts ────────────────────────────────────────────────────────────────────
const ductSchema = z.object({
  idDuct: z.string().nullish(),
  tipo: z.enum(["canaleta", "bandeja", "tuberia", "charola", "otro"]).nullish(),
  material: z.string().nullish(),
  dimensiones: z.string().nullish(),
  longitud: z.string().nullish(),
  area: z.string().nullish(),
  edificio: z.string().nullish(),
  proveedor: z.string().nullish(),
  fechaCompra: z.string().nullish(),
  po: z.string().nullish(),
  invoiceNumber: z.string().nullish(),
  amount: z.string().nullish(),
  slaTier: z.enum(["tier1", "tier2", "tier3"]).nullish(),
  rfidTag: z.string().nullish(),
  status: z.enum(["active", "inactive", "maintenance", "retired", "damaged"]).nullish(),
  observaciones: z.string().nullish(),
  branchId: z.number().nullish(),
});

export const cabledDuctsRouter = router({
  list: protectedProcedure.input(listInput).query(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const conditions = [eq(cabledDucts.tenantId, ctx.user.tenantId ?? 1)];
    if (input?.status) conditions.push(eq(cabledDucts.status, input.status as any));
    if (input?.search) conditions.push(or(like(cabledDucts.idDuct, `%${input.search}%`), like(cabledDucts.area, `%${input.search}%`))!);
    return db.select().from(cabledDucts).where(and(...conditions)).orderBy(desc(cabledDucts.createdAt)).limit(200);
  }),
  create: protectedProcedure.input(ductSchema).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const [r] = await db.insert(cabledDucts).values({ ...input, tenantId: ctx.user.tenantId ?? 1, fechaCompra: toDate(input.fechaCompra) as any } as any);
    return { id: (r as any).insertId };
  }),
  update: protectedProcedure.input(z.object({ id: z.number() }).merge(ductSchema)).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const { id, ...data } = input;
    await db.update(cabledDucts).set({ ...data, fechaCompra: toDate(data.fechaCompra) as any } as any).where(and(eq(cabledDucts.id, id), eq(cabledDucts.tenantId, ctx.user.tenantId ?? 1)));
    return { success: true };
  }),
  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    await db.delete(cabledDucts).where(and(eq(cabledDucts.id, input.id), eq(cabledDucts.tenantId, ctx.user.tenantId ?? 1)));
    return { success: true };
  }),
  stats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const rows = await db.select().from(cabledDucts).where(eq(cabledDucts.tenantId, ctx.user.tenantId ?? 1));
    return { total: rows.length };
  }),
});

// ─── Maintenance ──────────────────────────────────────────────────────────────
const maintenanceLogSchema = z.object({
  category: z.enum(["switches", "patch_panels", "outlets", "ducts"]),
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

export const cabledMaintenanceRouter = router({
  list: protectedProcedure.input(z.object({ category: z.string().optional(), itemId: z.number().optional(), limit: z.number().optional() }).optional()).query(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const conditions = [eq(cabledMaintenanceLog.tenantId, ctx.user.tenantId ?? 1)];
    if (input?.category) conditions.push(eq(cabledMaintenanceLog.category, input.category as any));
    if (input?.itemId) conditions.push(eq(cabledMaintenanceLog.itemId, input.itemId));
    return db.select().from(cabledMaintenanceLog).where(and(...conditions)).orderBy(desc(cabledMaintenanceLog.createdAt)).limit(input?.limit ?? 200);
  }),
  create: protectedProcedure.input(maintenanceLogSchema).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const [r] = await db.insert(cabledMaintenanceLog).values({ ...input, tenantId: ctx.user.tenantId ?? 1, scheduledDate: toDate(input.scheduledDate) as any, executedDate: toDate(input.executedDate) as any, nextMaintenanceDate: toDate(input.nextMaintenanceDate) as any, createdByUserId: ctx.user.id, createdByUserName: ctx.user.name } as any);
    return { id: (r as any).insertId };
  }),
  update: protectedProcedure.input(z.object({ id: z.number() }).merge(maintenanceLogSchema)).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const { id, ...data } = input;
    await db.update(cabledMaintenanceLog).set({ ...data, scheduledDate: toDate(data.scheduledDate) as any, executedDate: toDate(data.executedDate) as any, nextMaintenanceDate: toDate(data.nextMaintenanceDate) as any } as any).where(and(eq(cabledMaintenanceLog.id, id), eq(cabledMaintenanceLog.tenantId, ctx.user.tenantId ?? 1)));
    return { success: true };
  }),
  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    await db.delete(cabledMaintenanceLog).where(and(eq(cabledMaintenanceLog.id, input.id), eq(cabledMaintenanceLog.tenantId, ctx.user.tenantId ?? 1)));
    return { success: true };
  }),
  uploadPhoto: protectedProcedure.input(z.object({ imageBase64: z.string(), mimeType: z.string().default("image/jpeg"), type: z.enum(["before", "after", "signature"]) })).mutation(async ({ ctx, input }) => {
    const buffer = Buffer.from(input.imageBase64.replace(/^data:[^;]+;base64,/, ""), "base64");
    const key = `cabled/maintenance/${ctx.user.tenantId}/${input.type}-${Date.now()}.jpg`;
    const { url } = await storagePut(key, buffer, input.mimeType);
    return { url, key };
  }),
  calendarEvents: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    return db.select().from(cabledMaintenanceLog).where(eq(cabledMaintenanceLog.tenantId, ctx.user.tenantId ?? 1)).orderBy(desc(cabledMaintenanceLog.scheduledDate));
  }),
});

// ─── Programs ─────────────────────────────────────────────────────────────────
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

export const cabledProgramsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    return db.select().from(cabledMaintenancePrograms).where(eq(cabledMaintenancePrograms.tenantId, ctx.user.tenantId ?? 1)).orderBy(desc(cabledMaintenancePrograms.createdAt));
  }),
  get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const [prog] = await db.select().from(cabledMaintenancePrograms).where(and(eq(cabledMaintenancePrograms.id, input.id), eq(cabledMaintenancePrograms.tenantId, ctx.user.tenantId ?? 1))).limit(1);
    if (!prog) return null;
    const items = await db.select().from(cabledMaintenanceProgramItems).where(and(eq(cabledMaintenanceProgramItems.programId, input.id), eq(cabledMaintenanceProgramItems.tenantId, ctx.user.tenantId ?? 1)));
    return { ...prog, items };
  }),
  create: protectedProcedure.input(programSchema).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const [r] = await db.insert(cabledMaintenancePrograms).values({ ...input, tenantId: ctx.user.tenantId ?? 1, startDate: toDate(input.startDate) as any, endDate: toDate(input.endDate) as any, visitWeekStart: toDate(input.visitWeekStart) as any, createdByUserId: ctx.user.id, createdByUserName: ctx.user.name } as any);
    return { id: (r as any).insertId };
  }),
  update: protectedProcedure.input(z.object({ id: z.number() }).merge(programSchema)).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const { id, ...data } = input;
    await db.update(cabledMaintenancePrograms).set({ ...data, startDate: toDate(data.startDate) as any, endDate: toDate(data.endDate) as any, visitWeekStart: toDate(data.visitWeekStart) as any } as any).where(and(eq(cabledMaintenancePrograms.id, id), eq(cabledMaintenancePrograms.tenantId, ctx.user.tenantId ?? 1)));
    return { success: true };
  }),
  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    await db.delete(cabledMaintenanceProgramItems).where(and(eq(cabledMaintenanceProgramItems.programId, input.id), eq(cabledMaintenanceProgramItems.tenantId, ctx.user.tenantId ?? 1)));
    await db.delete(cabledMaintenanceLog).where(and(eq(cabledMaintenanceLog.programId, input.id), eq(cabledMaintenanceLog.tenantId, ctx.user.tenantId ?? 1)));
    await db.delete(cabledMaintenancePrograms).where(and(eq(cabledMaintenancePrograms.id, input.id), eq(cabledMaintenancePrograms.tenantId, ctx.user.tenantId ?? 1)));
    return { success: true };
  }),
  addItem: protectedProcedure.input(z.object({ programId: z.number(), category: z.enum(["switches", "patch_panels", "outlets", "ducts"]), itemId: z.number(), itemName: z.string().nullish(), itemLocation: z.string().nullish(), area: z.string().nullish(), requiresLift: z.boolean().default(false), noTechnicians: z.number().default(1), observations: z.string().nullish(), sortOrder: z.number().default(0), scheduledDays: z.string().nullish(), scheduledDates: z.string().nullish() })).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const [r] = await db.insert(cabledMaintenanceProgramItems).values({ ...input, tenantId: ctx.user.tenantId } as any);
    return { id: (r as any).insertId };
  }),
  removeItem: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    await db.delete(cabledMaintenanceProgramItems).where(and(eq(cabledMaintenanceProgramItems.id, input.id), eq(cabledMaintenanceProgramItems.tenantId, ctx.user.tenantId ?? 1)));
    return { success: true };
  }),
  generateCalendar: protectedProcedure.input(z.object({ programId: z.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const tenantId = ctx.user.tenantId ?? 1;
    const [prog] = await db.select().from(cabledMaintenancePrograms).where(and(eq(cabledMaintenancePrograms.id, input.programId), eq(cabledMaintenancePrograms.tenantId, tenantId))).limit(1);
    if (!prog) throw new Error("Programa no encontrado");
    const items = await db.select().from(cabledMaintenanceProgramItems).where(and(eq(cabledMaintenanceProgramItems.programId, input.programId), eq(cabledMaintenanceProgramItems.tenantId, tenantId)));
    await db.delete(cabledMaintenanceLog).where(and(eq(cabledMaintenanceLog.programId, input.programId), eq(cabledMaintenanceLog.tenantId, tenantId)));
    let count = 0;
    for (const item of items) {
      const dates = item.scheduledDates ? item.scheduledDates.split(",").filter(Boolean) : [];
      for (const dateStr of dates) {
        await db.insert(cabledMaintenanceLog).values({ tenantId, category: item.category, itemId: item.itemId, itemName: item.itemName, type: "preventive", status: "scheduled", title: `Mantenimiento Preventivo — ${item.itemName ?? "Equipo"}`, scheduledDate: toDate(dateStr), programId: input.programId, createdByUserId: ctx.user.id, createdByUserName: ctx.user.name } as any);
        count++;
      }
    }
    return { generated: count };
  }),
  stats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const tenantId = ctx.user.tenantId ?? 1;
    const [programs, logs] = await Promise.all([
      db.select().from(cabledMaintenancePrograms).where(eq(cabledMaintenancePrograms.tenantId, tenantId)),
      db.select().from(cabledMaintenanceLog).where(eq(cabledMaintenanceLog.tenantId, tenantId)),
    ]);
    return { totalPrograms: programs.length, activePrograms: programs.filter(p => p.status === "active").length, totalEvents: logs.length, completedEvents: logs.filter(l => l.status === "completed").length, scheduledEvents: logs.filter(l => l.status === "scheduled").length };
  }),
});

// ─── Summary ──────────────────────────────────────────────────────────────────
export const cabledStatsRouter = router({
  summary: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb(); if (!db) throw new Error("DB not available");
    const tenantId = ctx.user.tenantId ?? 1;
    const [sw, pp, out, du] = await Promise.all([
      db.select().from(cabledSwitches).where(eq(cabledSwitches.tenantId, tenantId)),
      db.select().from(cabledPatchPanels).where(eq(cabledPatchPanels.tenantId, tenantId)),
      db.select().from(cabledOutlets).where(eq(cabledOutlets.tenantId, tenantId)),
      db.select().from(cabledDucts).where(eq(cabledDucts.tenantId, tenantId)),
    ]);
    const all = [...sw, ...pp, ...out, ...du];
    const totalCapex = all.reduce((s, e) => s + parseFloat((e as any).amount ?? "0"), 0);
    return { switches: sw.length, patchPanels: pp.length, outlets: out.length, ducts: du.length, total: all.length, totalCapex };
  }),
});
