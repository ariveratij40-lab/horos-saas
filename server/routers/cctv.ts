import { z } from "zod";
import { eq, and, desc, like, or, lt, gte } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  cctvCameras, cctvIdfs, cctvLicenses, cctvMonitors,
  cctvServers, cctvSwitches, cctvUps,
} from "../../drizzle/schema";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function toDate(s?: string | null): Date | undefined {
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

// ─── Schemas de validación ────────────────────────────────────────────────────
const cameraSchema = z.object({
  idCamera: z.string().optional(),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  serie: z.string().optional(),
  familia: z.string().optional(),
  resolucion: z.string().optional(),
  tipo: z.enum(["bala", "domo", "ptz", "fisheye", "panoramica", "otro"]).optional(),
  poe: z.boolean().optional(),
  area: z.string().optional(),
  edificio: z.string().optional(),
  ip: z.string().optional(),
  mascara: z.string().optional(),
  gateway: z.string().optional(),
  mac: z.string().optional(),
  internet: z.boolean().optional(),
  conexion: z.string().optional(),
  switchId: z.number().optional(),
  puertoSw: z.string().optional(),
  proveedor: z.string().optional(),
  fechaCompra: z.string().optional(),
  po: z.string().optional(),
  tiempoUso: z.string().optional(),
  garantiaExpiracion: z.string().optional(),
  status: z.enum(["active", "inactive", "maintenance", "retired"]).optional(),
  observaciones: z.string().optional(),
  fotoUrl: z.string().optional(),
  branchId: z.number().optional(),
});

const idfSchema = z.object({
  idIdf: z.string().optional(),
  nombre: z.string().optional(),
  ubicacion: z.string().optional(),
  tipo: z.enum(["IDF", "MDF", "gabinete"]).optional(),
  numeroRacks: z.number().optional(),
  numGabinetes: z.number().optional(),
  capacidadRacks: z.number().optional(),
  capacidadGabinetes: z.number().optional(),
  fibraOptica: z.boolean().optional(),
  tipoFibra: z.string().optional(),
  idfCompartido: z.boolean().optional(),
  compartidoCon: z.string().optional(),
  noSwitches: z.number().optional(),
  noServidores: z.number().optional(),
  noUps: z.number().optional(),
  refrigerado: z.boolean().optional(),
  controlAcceso: z.boolean().optional(),
  tipoControlAcceso: z.string().optional(),
  comentarios: z.string().optional(),
  observaciones: z.string().optional(),
  fotoUrl: z.string().optional(),
  status: z.enum(["active", "inactive", "maintenance"]).optional(),
  branchId: z.number().optional(),
});

const licenseSchema = z.object({
  idLicencia: z.string().optional(),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  tipo: z.enum(["perpetua", "suscripcion", "trial", "otro"]).optional(),
  noContrato: z.string().optional(),
  fechaInicio: z.string().optional(),
  fechaExpiracion: z.string().optional(),
  equipoAsignado: z.string().optional(),
  ubicacion: z.string().optional(),
  proveedor: z.string().optional(),
  fechaCompra: z.string().optional(),
  ordenCompra: z.string().optional(),
  tiempoUso: z.string().optional(),
  otro: z.string().optional(),
  expirado: z.boolean().optional(),
  status: z.enum(["active", "expired", "cancelled", "pending_renewal"]).optional(),
  observaciones: z.string().optional(),
  branchId: z.number().optional(),
});

const monitorSchema = z.object({
  idMonitor: z.string().optional(),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  serie: z.string().optional(),
  tipo: z.enum(["monitor", "pantalla", "videowall", "otro"]).optional(),
  tamano: z.string().optional(),
  resolucion: z.enum(["HD 720p", "Full HD 1K", "QHD 2K", "UHD 4K", "8K", "otro"]).optional(),
  tecnologia: z.enum(["LED", "QLED", "OLED", "LCD", "IPS", "otro"]).optional(),
  puerto: z.enum(["HDMI", "VGA", "DVI", "DisplayPort", "USB-C", "otro"]).optional(),
  ubicacion: z.string().optional(),
  proveedor: z.string().optional(),
  fechaCompra: z.string().optional(),
  ordenCompra: z.string().optional(),
  garantiaExpiracion: z.string().optional(),
  tiempoUso: z.string().optional(),
  ups: z.boolean().optional(),
  conexion: z.string().optional(),
  status: z.enum(["active", "inactive", "maintenance", "retired"]).optional(),
  observaciones: z.string().optional(),
  fotoUrl: z.string().optional(),
  branchId: z.number().optional(),
});

const serverSchema = z.object({
  idServer: z.string().optional(),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  serie: z.string().optional(),
  tipo: z.enum(["nvr", "workstation", "appliance", "servidor", "otro"]).optional(),
  versionVms: z.string().optional(),
  licencias: z.number().optional(),
  licenciasLibres: z.number().optional(),
  versionLic: z.string().optional(),
  numCamaras: z.number().optional(),
  so: z.string().optional(),
  memoria: z.string().optional(),
  procesador: z.string().optional(),
  storage: z.string().optional(),
  ip: z.string().optional(),
  mascara: z.string().optional(),
  gateway: z.string().optional(),
  dns: z.string().optional(),
  nic: z.string().optional(),
  mac: z.string().optional(),
  ubicacion: z.string().optional(),
  usuario: z.string().optional(),
  contrasena: z.string().optional(),
  proveedor: z.string().optional(),
  fechaCompra: z.string().optional(),
  ordenCompra: z.string().optional(),
  garantiaExpiracion: z.string().optional(),
  tiempoUso: z.string().optional(),
  status: z.enum(["active", "inactive", "maintenance", "retired"]).optional(),
  observaciones: z.string().optional(),
  fotoUrl: z.string().optional(),
  branchId: z.number().optional(),
});

const switchSchema = z.object({
  idfId: z.number().optional(),
  idSwitch: z.string().optional(),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  serie: z.string().optional(),
  tipo: z.enum(["poe", "standard", "appliance", "core", "acceso", "otro"]).optional(),
  firmware: z.string().optional(),
  puertos: z.number().optional(),
  puertosPoe: z.number().optional(),
  capacidadPto: z.string().optional(),
  numCamaras: z.number().optional(),
  puertosLibres: z.number().optional(),
  ip: z.string().optional(),
  ubicacion: z.string().optional(),
  usuario: z.string().optional(),
  contrasena: z.string().optional(),
  proveedor: z.string().optional(),
  fechaCompra: z.string().optional(),
  ordenCompra: z.string().optional(),
  garantiaExpiracion: z.string().optional(),
  tiempoUso: z.string().optional(),
  status: z.enum(["active", "inactive", "maintenance", "retired"]).optional(),
  observaciones: z.string().optional(),
  fotoUrl: z.string().optional(),
  branchId: z.number().optional(),
});

const upsSchema = z.object({
  idfId: z.number().optional(),
  idUps: z.string().optional(),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  serie: z.string().optional(),
  tipo: z.enum(["torre", "rack", "online", "interactivo", "otro"]).optional(),
  capacidad: z.string().optional(),
  autonomia: z.string().optional(),
  equiposConectados: z.number().optional(),
  consumoActual: z.string().optional(),
  tarjetaRed: z.boolean().optional(),
  ip: z.string().optional(),
  ubicacion: z.string().optional(),
  proveedor: z.string().optional(),
  fechaCompra: z.string().optional(),
  ordenCompra: z.string().optional(),
  garantiaExpiracion: z.string().optional(),
  tiempoUso: z.string().optional(),
  status: z.enum(["active", "inactive", "maintenance", "retired"]).optional(),
  observaciones: z.string().optional(),
  fotoUrl: z.string().optional(),
  branchId: z.number().optional(),
});

const listInput = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  branchId: z.number().optional(),
  limit: z.number().default(100),
  offset: z.number().default(0),
}).optional();

// ─── Routers ─────────────────────────────────────────────────────────────────

// CÁMARAS
export const cctvCamerasRouter = router({
  list: protectedProcedure.input(listInput).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    const tenantId = ctx.user.tenantId ?? 1;
    const conditions = [eq(cctvCameras.tenantId, tenantId)];
    if (input?.status) conditions.push(eq(cctvCameras.status, input.status as any));
    if (input?.branchId) conditions.push(eq(cctvCameras.branchId, input.branchId));
    return db.select().from(cctvCameras).where(and(...conditions)).orderBy(desc(cctvCameras.createdAt)).limit(input?.limit ?? 100).offset(input?.offset ?? 0);
  }),

  get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return null;
    const tenantId = ctx.user.tenantId ?? 1;
    const [row] = await db.select().from(cctvCameras).where(and(eq(cctvCameras.id, input.id), eq(cctvCameras.tenantId, tenantId))).limit(1);
    return row ?? null;
  }),

  create: protectedProcedure.input(cameraSchema).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB no disponible");
    const tenantId = ctx.user.tenantId ?? 1;
    const [result] = await db.insert(cctvCameras).values({
      ...input,
      tenantId,
      fechaCompra: toDate(input.fechaCompra),
      garantiaExpiracion: toDate(input.garantiaExpiracion),
    } as any);
    return { id: (result as any).insertId };
  }),

  update: protectedProcedure.input(z.object({ id: z.number() }).merge(cameraSchema)).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB no disponible");
    const tenantId = ctx.user.tenantId ?? 1;
    const { id, ...data } = input;
    await db.update(cctvCameras).set({
      ...data,
      fechaCompra: toDate(data.fechaCompra),
      garantiaExpiracion: toDate(data.garantiaExpiracion),
    } as any).where(and(eq(cctvCameras.id, id), eq(cctvCameras.tenantId, tenantId)));
    return { success: true };
  }),

  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB no disponible");
    const tenantId = ctx.user.tenantId ?? 1;
    await db.delete(cctvCameras).where(and(eq(cctvCameras.id, input.id), eq(cctvCameras.tenantId, tenantId)));
    return { success: true };
  }),

  stats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { total: 0, active: 0, inactive: 0, maintenance: 0, retired: 0, poe: 0 };
    const tenantId = ctx.user.tenantId ?? 1;
    const rows = await db.select().from(cctvCameras).where(eq(cctvCameras.tenantId, tenantId));
    return {
      total: rows.length,
      active: rows.filter(r => r.status === "active").length,
      inactive: rows.filter(r => r.status === "inactive").length,
      maintenance: rows.filter(r => r.status === "maintenance").length,
      retired: rows.filter(r => r.status === "retired").length,
      poe: rows.filter(r => r.poe).length,
      domo: rows.filter(r => r.tipo === "domo").length,
      bala: rows.filter(r => r.tipo === "bala").length,
      ptz: rows.filter(r => r.tipo === "ptz").length,
    };
  }),
});

// IDF / MDF
export const cctvIdfsRouter = router({
  list: protectedProcedure.input(listInput).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    const tenantId = ctx.user.tenantId ?? 1;
    const conditions = [eq(cctvIdfs.tenantId, tenantId)];
    if (input?.status) conditions.push(eq(cctvIdfs.status, input.status as any));
    if (input?.branchId) conditions.push(eq(cctvIdfs.branchId, input.branchId));
    return db.select().from(cctvIdfs).where(and(...conditions)).orderBy(desc(cctvIdfs.createdAt)).limit(input?.limit ?? 100);
  }),

  get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return null;
    const tenantId = ctx.user.tenantId ?? 1;
    const [row] = await db.select().from(cctvIdfs).where(and(eq(cctvIdfs.id, input.id), eq(cctvIdfs.tenantId, tenantId))).limit(1);
    return row ?? null;
  }),

  create: protectedProcedure.input(idfSchema).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB no disponible");
    const tenantId = ctx.user.tenantId ?? 1;
    const [result] = await db.insert(cctvIdfs).values({ ...input, tenantId } as any);
    return { id: (result as any).insertId };
  }),

  update: protectedProcedure.input(z.object({ id: z.number() }).merge(idfSchema)).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB no disponible");
    const tenantId = ctx.user.tenantId ?? 1;
    const { id, ...data } = input;
    await db.update(cctvIdfs).set(data as any).where(and(eq(cctvIdfs.id, id), eq(cctvIdfs.tenantId, tenantId)));
    return { success: true };
  }),

  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB no disponible");
    const tenantId = ctx.user.tenantId ?? 1;
    await db.delete(cctvIdfs).where(and(eq(cctvIdfs.id, input.id), eq(cctvIdfs.tenantId, tenantId)));
    return { success: true };
  }),
});

// LICENCIAS
export const cctvLicensesRouter = router({
  list: protectedProcedure.input(listInput).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    const tenantId = ctx.user.tenantId ?? 1;
    const conditions = [eq(cctvLicenses.tenantId, tenantId)];
    if (input?.status) conditions.push(eq(cctvLicenses.status, input.status as any));
    if (input?.branchId) conditions.push(eq(cctvLicenses.branchId, input.branchId));
    return db.select().from(cctvLicenses).where(and(...conditions)).orderBy(desc(cctvLicenses.createdAt)).limit(input?.limit ?? 100);
  }),

  get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return null;
    const tenantId = ctx.user.tenantId ?? 1;
    const [row] = await db.select().from(cctvLicenses).where(and(eq(cctvLicenses.id, input.id), eq(cctvLicenses.tenantId, tenantId))).limit(1);
    return row ?? null;
  }),

  create: protectedProcedure.input(licenseSchema).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB no disponible");
    const tenantId = ctx.user.tenantId ?? 1;
    const [result] = await db.insert(cctvLicenses).values({
      ...input, tenantId,
      fechaInicio: toDate(input.fechaInicio),
      fechaExpiracion: toDate(input.fechaExpiracion),
      fechaCompra: toDate(input.fechaCompra),
    } as any);
    return { id: (result as any).insertId };
  }),

  update: protectedProcedure.input(z.object({ id: z.number() }).merge(licenseSchema)).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB no disponible");
    const tenantId = ctx.user.tenantId ?? 1;
    const { id, ...data } = input;
    await db.update(cctvLicenses).set({
      ...data,
      fechaInicio: toDate(data.fechaInicio),
      fechaExpiracion: toDate(data.fechaExpiracion),
      fechaCompra: toDate(data.fechaCompra),
    } as any).where(and(eq(cctvLicenses.id, id), eq(cctvLicenses.tenantId, tenantId)));
    return { success: true };
  }),

  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB no disponible");
    const tenantId = ctx.user.tenantId ?? 1;
    await db.delete(cctvLicenses).where(and(eq(cctvLicenses.id, input.id), eq(cctvLicenses.tenantId, tenantId)));
    return { success: true };
  }),

  expiringSoon: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const tenantId = ctx.user.tenantId ?? 1;
    const in90days = new Date();
    in90days.setDate(in90days.getDate() + 90);
    return db.select().from(cctvLicenses)
      .where(and(eq(cctvLicenses.tenantId, tenantId), eq(cctvLicenses.status, "active")))
      .orderBy(cctvLicenses.fechaExpiracion).limit(20);
  }),
});

// MONITORES / PANTALLAS
export const cctvMonitorsRouter = router({
  list: protectedProcedure.input(listInput).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    const tenantId = ctx.user.tenantId ?? 1;
    const conditions = [eq(cctvMonitors.tenantId, tenantId)];
    if (input?.status) conditions.push(eq(cctvMonitors.status, input.status as any));
    if (input?.branchId) conditions.push(eq(cctvMonitors.branchId, input.branchId));
    return db.select().from(cctvMonitors).where(and(...conditions)).orderBy(desc(cctvMonitors.createdAt)).limit(input?.limit ?? 100);
  }),

  get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return null;
    const tenantId = ctx.user.tenantId ?? 1;
    const [row] = await db.select().from(cctvMonitors).where(and(eq(cctvMonitors.id, input.id), eq(cctvMonitors.tenantId, tenantId))).limit(1);
    return row ?? null;
  }),

  create: protectedProcedure.input(monitorSchema).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB no disponible");
    const tenantId = ctx.user.tenantId ?? 1;
    const [result] = await db.insert(cctvMonitors).values({
      ...input, tenantId,
      fechaCompra: toDate(input.fechaCompra),
      garantiaExpiracion: toDate(input.garantiaExpiracion),
    } as any);
    return { id: (result as any).insertId };
  }),

  update: protectedProcedure.input(z.object({ id: z.number() }).merge(monitorSchema)).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB no disponible");
    const tenantId = ctx.user.tenantId ?? 1;
    const { id, ...data } = input;
    await db.update(cctvMonitors).set({
      ...data,
      fechaCompra: toDate(data.fechaCompra),
      garantiaExpiracion: toDate(data.garantiaExpiracion),
    } as any).where(and(eq(cctvMonitors.id, id), eq(cctvMonitors.tenantId, tenantId)));
    return { success: true };
  }),

  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB no disponible");
    const tenantId = ctx.user.tenantId ?? 1;
    await db.delete(cctvMonitors).where(and(eq(cctvMonitors.id, input.id), eq(cctvMonitors.tenantId, tenantId)));
    return { success: true };
  }),
});

// SERVIDORES / NVR
export const cctvServersRouter = router({
  list: protectedProcedure.input(listInput).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    const tenantId = ctx.user.tenantId ?? 1;
    const conditions = [eq(cctvServers.tenantId, tenantId)];
    if (input?.status) conditions.push(eq(cctvServers.status, input.status as any));
    if (input?.branchId) conditions.push(eq(cctvServers.branchId, input.branchId));
    return db.select().from(cctvServers).where(and(...conditions)).orderBy(desc(cctvServers.createdAt)).limit(input?.limit ?? 100);
  }),

  get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return null;
    const tenantId = ctx.user.tenantId ?? 1;
    const [row] = await db.select().from(cctvServers).where(and(eq(cctvServers.id, input.id), eq(cctvServers.tenantId, tenantId))).limit(1);
    return row ?? null;
  }),

  create: protectedProcedure.input(serverSchema).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB no disponible");
    const tenantId = ctx.user.tenantId ?? 1;
    const [result] = await db.insert(cctvServers).values({
      ...input, tenantId,
      fechaCompra: toDate(input.fechaCompra),
      garantiaExpiracion: toDate(input.garantiaExpiracion),
    } as any);
    return { id: (result as any).insertId };
  }),

  update: protectedProcedure.input(z.object({ id: z.number() }).merge(serverSchema)).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB no disponible");
    const tenantId = ctx.user.tenantId ?? 1;
    const { id, ...data } = input;
    await db.update(cctvServers).set({
      ...data,
      fechaCompra: toDate(data.fechaCompra),
      garantiaExpiracion: toDate(data.garantiaExpiracion),
    } as any).where(and(eq(cctvServers.id, id), eq(cctvServers.tenantId, tenantId)));
    return { success: true };
  }),

  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB no disponible");
    const tenantId = ctx.user.tenantId ?? 1;
    await db.delete(cctvServers).where(and(eq(cctvServers.id, input.id), eq(cctvServers.tenantId, tenantId)));
    return { success: true };
  }),
});

// SWITCHES
export const cctvSwitchesRouter = router({
  list: protectedProcedure.input(listInput).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    const tenantId = ctx.user.tenantId ?? 1;
    const conditions = [eq(cctvSwitches.tenantId, tenantId)];
    if (input?.status) conditions.push(eq(cctvSwitches.status, input.status as any));
    if (input?.branchId) conditions.push(eq(cctvSwitches.branchId, input.branchId));
    return db.select().from(cctvSwitches).where(and(...conditions)).orderBy(desc(cctvSwitches.createdAt)).limit(input?.limit ?? 100);
  }),

  get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return null;
    const tenantId = ctx.user.tenantId ?? 1;
    const [row] = await db.select().from(cctvSwitches).where(and(eq(cctvSwitches.id, input.id), eq(cctvSwitches.tenantId, tenantId))).limit(1);
    return row ?? null;
  }),

  create: protectedProcedure.input(switchSchema).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB no disponible");
    const tenantId = ctx.user.tenantId ?? 1;
    const [result] = await db.insert(cctvSwitches).values({
      ...input, tenantId,
      fechaCompra: toDate(input.fechaCompra),
      garantiaExpiracion: toDate(input.garantiaExpiracion),
    } as any);
    return { id: (result as any).insertId };
  }),

  update: protectedProcedure.input(z.object({ id: z.number() }).merge(switchSchema)).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB no disponible");
    const tenantId = ctx.user.tenantId ?? 1;
    const { id, ...data } = input;
    await db.update(cctvSwitches).set({
      ...data,
      fechaCompra: toDate(data.fechaCompra),
      garantiaExpiracion: toDate(data.garantiaExpiracion),
    } as any).where(and(eq(cctvSwitches.id, id), eq(cctvSwitches.tenantId, tenantId)));
    return { success: true };
  }),

  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB no disponible");
    const tenantId = ctx.user.tenantId ?? 1;
    await db.delete(cctvSwitches).where(and(eq(cctvSwitches.id, input.id), eq(cctvSwitches.tenantId, tenantId)));
    return { success: true };
  }),
});

// UPS
export const cctvUpsRouter = router({
  list: protectedProcedure.input(listInput).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    const tenantId = ctx.user.tenantId ?? 1;
    const conditions = [eq(cctvUps.tenantId, tenantId)];
    if (input?.status) conditions.push(eq(cctvUps.status, input.status as any));
    if (input?.branchId) conditions.push(eq(cctvUps.branchId, input.branchId));
    return db.select().from(cctvUps).where(and(...conditions)).orderBy(desc(cctvUps.createdAt)).limit(input?.limit ?? 100);
  }),

  get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return null;
    const tenantId = ctx.user.tenantId ?? 1;
    const [row] = await db.select().from(cctvUps).where(and(eq(cctvUps.id, input.id), eq(cctvUps.tenantId, tenantId))).limit(1);
    return row ?? null;
  }),

  create: protectedProcedure.input(upsSchema).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB no disponible");
    const tenantId = ctx.user.tenantId ?? 1;
    const [result] = await db.insert(cctvUps).values({
      ...input, tenantId,
      fechaCompra: toDate(input.fechaCompra),
      garantiaExpiracion: toDate(input.garantiaExpiracion),
    } as any);
    return { id: (result as any).insertId };
  }),

  update: protectedProcedure.input(z.object({ id: z.number() }).merge(upsSchema)).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB no disponible");
    const tenantId = ctx.user.tenantId ?? 1;
    const { id, ...data } = input;
    await db.update(cctvUps).set({
      ...data,
      fechaCompra: toDate(data.fechaCompra),
      garantiaExpiracion: toDate(data.garantiaExpiracion),
    } as any).where(and(eq(cctvUps.id, id), eq(cctvUps.tenantId, tenantId)));
    return { success: true };
  }),

  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB no disponible");
    const tenantId = ctx.user.tenantId ?? 1;
    await db.delete(cctvUps).where(and(eq(cctvUps.id, input.id), eq(cctvUps.tenantId, tenantId)));
    return { success: true };
  }),
});

// ─── Router principal CCTV ────────────────────────────────────────────────────
export const cctvRouter = router({
  cameras: cctvCamerasRouter,
  idfs: cctvIdfsRouter,
  licenses: cctvLicensesRouter,
  monitors: cctvMonitorsRouter,
  servers: cctvServersRouter,
  switches: cctvSwitchesRouter,
  ups: cctvUpsRouter,

  // Resumen global del módulo CCTV
  summary: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;
    const tenantId = ctx.user.tenantId ?? 1;
    const [cameras, idfs, licenses, monitors, servers, switches, ups] = await Promise.all([
      db.select().from(cctvCameras).where(eq(cctvCameras.tenantId, tenantId)),
      db.select().from(cctvIdfs).where(eq(cctvIdfs.tenantId, tenantId)),
      db.select().from(cctvLicenses).where(eq(cctvLicenses.tenantId, tenantId)),
      db.select().from(cctvMonitors).where(eq(cctvMonitors.tenantId, tenantId)),
      db.select().from(cctvServers).where(eq(cctvServers.tenantId, tenantId)),
      db.select().from(cctvSwitches).where(eq(cctvSwitches.tenantId, tenantId)),
      db.select().from(cctvUps).where(eq(cctvUps.tenantId, tenantId)),
    ]);
    return {
      cameras: { total: cameras.length, active: cameras.filter(c => c.status === "active").length },
      idfs: { total: idfs.length, active: idfs.filter(i => i.status === "active").length },
      licenses: {
        total: licenses.length,
        active: licenses.filter(l => l.status === "active").length,
        expired: licenses.filter(l => l.status === "expired" || l.expirado).length,
      },
      monitors: { total: monitors.length, active: monitors.filter(m => m.status === "active").length },
      servers: { total: servers.length, active: servers.filter(s => s.status === "active").length },
      switches: {
        total: switches.length,
        active: switches.filter(s => s.status === "active").length,
        totalPorts: switches.reduce((acc, s) => acc + (s.puertos ?? 0), 0),
        freePorts: switches.reduce((acc, s) => acc + (s.puertosLibres ?? 0), 0),
      },
      ups: { total: ups.length, active: ups.filter(u => u.status === "active").length },
    };
  }),
});
