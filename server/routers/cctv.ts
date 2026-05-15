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
  idCamera: z.string().nullish(),
  marca: z.string().nullish(),
  modelo: z.string().nullish(),
  serie: z.string().nullish(),
  familia: z.string().nullish(),
  resolucion: z.string().nullish(),
  tipo: z.enum(["bala", "domo", "ptz", "fisheye", "panoramica", "otro"]).nullish(),
  poe: z.boolean().nullish(),
  area: z.string().nullish(),
  edificio: z.string().nullish(),
  ip: z.string().nullish(),
  mascara: z.string().nullish(),
  gateway: z.string().nullish(),
  mac: z.string().nullish(),
  internet: z.boolean().nullish(),
  conexion: z.string().nullish(),
  switchId: z.number().nullish(),
  puertoSw: z.string().nullish(),
  proveedor: z.string().nullish(),
  fechaCompra: z.string().nullish(),
  po: z.string().nullish(),
  tiempoUso: z.string().nullish(),
  garantiaExpiracion: z.string().nullish(),
  status: z.enum(["active", "inactive", "maintenance", "retired"]).nullish(),
  observaciones: z.string().nullish(),
  fotoUrl: z.string().nullish(),
  sceneImageUrl: z.string().nullish(),
  sceneImageKey: z.string().nullish(),
  sceneDescription: z.string().nullish(),
  branchId: z.number().nullish(),
  ctpat: z.boolean().nullish(),
  invoiceNumber: z.string().nullish(),
  amount: z.string().nullish(),
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
  invoiceNumber: z.string().optional(),
  amount: z.string().optional(),
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
  invoiceNumber: z.string().optional(),
  amount: z.string().optional(),
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
  invoiceNumber: z.string().optional(),
  amount: z.string().optional(),
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
  invoiceNumber: z.string().optional(),
  amount: z.string().optional(),
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
  invoiceNumber: z.string().optional(),
  amount: z.string().optional(),
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
  invoiceNumber: z.string().optional(),
  amount: z.string().optional(),
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
      ctpat: rows.filter(r => r.ctpat).length,
      domo: rows.filter(r => r.tipo === "domo").length,
      bala: rows.filter(r => r.tipo === "bala").length,
      ptz: rows.filter(r => r.tipo === "ptz").length,
    };
  }),

  // Subir imagen de escena (base64 → S3)
  uploadScene: protectedProcedure.input(z.object({
    id: z.number(),
    imageBase64: z.string(),
    mimeType: z.string().default("image/jpeg"),
    description: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB no disponible");
    const tenantId = ctx.user.tenantId ?? 1;
    // Verify ownership
    const [cam] = await db.select().from(cctvCameras)
      .where(and(eq(cctvCameras.id, input.id), eq(cctvCameras.tenantId, tenantId))).limit(1);
    if (!cam) throw new Error("Cámara no encontrada");
    // Convert base64 to buffer and upload to S3
    const { storagePut } = await import("../storage");
    const buffer = Buffer.from(input.imageBase64.replace(/^data:[^;]+;base64,/, ""), "base64");
    const key = `cctv/scenes/${tenantId}/${input.id}-${Date.now()}.jpg`;
    const { url } = await storagePut(key, buffer, input.mimeType);
    // Update camera record
    await db.update(cctvCameras).set({
      sceneImageUrl: url,
      sceneImageKey: key,
      sceneDescription: input.description ?? cam.sceneDescription,
    } as any).where(and(eq(cctvCameras.id, input.id), eq(cctvCameras.tenantId, tenantId)));
    return { url, key };
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
    const now = new Date();
    const in90days = new Date();
    in90days.setDate(in90days.getDate() + 90);
    return db.select().from(cctvLicenses)
      .where(and(
        eq(cctvLicenses.tenantId, tenantId),
        eq(cctvLicenses.status, "active"),
        gte(cctvLicenses.fechaExpiracion, now),
        lt(cctvLicenses.fechaExpiracion, in90days),
      ))
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

// ─── Ficha Técnica ──────────────────────────────────────────────────────────
const equipmentTypeEnum = z.enum(["camera", "idf", "license", "monitor", "server", "switch", "ups"]);

// ─── Router principal CCTV ────────────────────────────────────────────────────
export const cctvRouter = router({
  cameras: cctvCamerasRouter,
  idfs: cctvIdfsRouter,
  licenses: cctvLicensesRouter,
  monitors: cctvMonitorsRouter,
  servers: cctvServersRouter,
  switches: cctvSwitchesRouter,
  ups: cctvUpsRouter,

  // Ficha técnica por tipo de equipo
  getSheet: protectedProcedure
    .input(z.object({ type: equipmentTypeEnum, id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;
      const tenantId = ctx.user.tenantId ?? 1;

      const tableMap = {
        camera:  { table: cctvCameras,  idField: cctvCameras.id,  tenantField: cctvCameras.tenantId },
        idf:     { table: cctvIdfs,     idField: cctvIdfs.id,     tenantField: cctvIdfs.tenantId },
        license: { table: cctvLicenses, idField: cctvLicenses.id, tenantField: cctvLicenses.tenantId },
        monitor: { table: cctvMonitors, idField: cctvMonitors.id, tenantField: cctvMonitors.tenantId },
        server:  { table: cctvServers,  idField: cctvServers.id,  tenantField: cctvServers.tenantId },
        switch:  { table: cctvSwitches, idField: cctvSwitches.id, tenantField: cctvSwitches.tenantId },
        ups:     { table: cctvUps,      idField: cctvUps.id,      tenantField: cctvUps.tenantId },
      } as const;

      const { table, idField, tenantField } = tableMap[input.type];
      const [row] = await db.select().from(table as any)
        .where(and(eq(idField as any, input.id), eq(tenantField as any, tenantId)))
        .limit(1);

      if (!row) return null;

      // Etiquetas legibles por tipo de equipo
      const labelMaps: Record<string, Record<string, string>> = {
        camera: {
          idCamera: "ID Cámara", marca: "Marca", modelo: "Modelo", serie: "Número de Serie",
          familia: "Familia", resolucion: "Resolución", tipo: "Tipo", poe: "PoE",
          area: "Área", edificio: "Edificio", ip: "Dirección IP", mascara: "Máscara",
          gateway: "Gateway", mac: "MAC", internet: "Acceso Internet", conexion: "Conexión",
          puertoSw: "Puerto Switch", proveedor: "Proveedor", fechaCompra: "Fecha Compra",
          po: "Orden de Compra", tiempoUso: "Tiempo en Uso", garantiaExpiracion: "Vencimiento Garantía",
          status: "Estado", observaciones: "Observaciones",
          sceneImageUrl: "Imagen de Escena", sceneDescription: "Descripción de Escena",
        },
        idf: {
          idIdf: "ID IDF", nombre: "Nombre", ubicacion: "Ubicación", tipo: "Tipo",
          numeroRacks: "Número de Racks", numGabinetes: "Número de Gabinetes",
          capacidadRacks: "Capacidad Racks (U)", capacidadGabinetes: "Capacidad Gabinetes (U)",
          fibraOptica: "Fibra Óptica", tipoFibra: "Tipo de Fibra",
          idfCompartido: "IDF Compartido", compartidoCon: "Compartido Con",
          noSwitches: "Número de Switches", noServidores: "Número de Servidores",
          noUps: "Número de UPS", refrigerado: "Refrigerado",
          controlAcceso: "Control de Acceso", tipoControlAcceso: "Tipo Control Acceso",
          status: "Estado", observaciones: "Observaciones",
        },
        license: {
          idLicencia: "ID Licencia", marca: "Marca", modelo: "Software/VMS",
          tipo: "Tipo", noContrato: "Número de Contrato",
          fechaInicio: "Fecha Inicio", fechaExpiracion: "Fecha Expiración",
          expirado: "Expirado", noLicencias: "Número de Licencias",
          noCanales: "Canales Habilitados", equipoAsignado: "Equipo Asignado",
          proveedor: "Proveedor", fechaCompra: "Fecha Compra", po: "Orden de Compra",
          status: "Estado", observaciones: "Observaciones",
        },
        monitor: {
          idMonitor: "ID Monitor", marca: "Marca", modelo: "Modelo", serie: "Número de Serie",
          tipo: "Tipo", tamano: "Tamaño", resolucion: "Resolución", tecnologia: "Tecnología",
          puertos: "Puertos", ubicacion: "Ubicación", ip: "Dirección IP",
          proveedor: "Proveedor", fechaCompra: "Fecha Compra",
          garantiaExpiracion: "Vencimiento Garantía", status: "Estado", observaciones: "Observaciones",
        },
        server: {
          idServer: "ID Servidor", marca: "Marca", modelo: "Modelo", serie: "Número de Serie",
          tipoVms: "Tipo VMS", versionVms: "Versión VMS", noLicencias: "Licencias VMS",
          noCanales: "Canales Grabados", so: "Sistema Operativo", ram: "Memoria RAM",
          cpu: "Procesador", almacenamiento: "Almacenamiento", raid: "RAID",
          ip: "Dirección IP", ubicacion: "Ubicación",
          proveedor: "Proveedor", fechaCompra: "Fecha Compra",
          garantiaExpiracion: "Vencimiento Garantía", status: "Estado", observaciones: "Observaciones",
        },
        switch: {
          idSwitch: "ID Switch", marca: "Marca", modelo: "Modelo", serie: "Número de Serie",
          tipo: "Tipo", firmware: "Firmware", puertos: "Total Puertos",
          puertosLibres: "Puertos Libres", poe: "PoE", puertosPoE: "Puertos PoE",
          camarasConectadas: "Cámaras Conectadas", ip: "IP Administración", vlan: "VLANs",
          proveedor: "Proveedor", fechaCompra: "Fecha Compra",
          garantiaExpiracion: "Vencimiento Garantía", status: "Estado", observaciones: "Observaciones",
        },
        ups: {
          idUps: "ID UPS", marca: "Marca", modelo: "Modelo", serie: "Número de Serie",
          tipo: "Tipo", capacidadKva: "Capacidad (KVA)", capacidadW: "Capacidad (W)",
          autonomia: "Autonomía", equiposConectados: "Equipos Conectados",
          baterias: "Número de Baterías", fechaBaterias: "Fecha Última Reposición Baterías",
          ubicacion: "Ubicación", proveedor: "Proveedor", fechaCompra: "Fecha Compra",
          garantiaExpiracion: "Vencimiento Garantía", status: "Estado", observaciones: "Observaciones",
        },
      };

      const typeLabels: Record<string, string> = {
        camera: "Cámara CCTV", idf: "IDF / MDF", license: "Licencia de Software",
        monitor: "Monitor / Pantalla", server: "Servidor / NVR", switch: "Switch", ups: "UPS",
      };

      const labels = labelMaps[input.type] ?? {};
      const fields: { label: string; value: string; key: string }[] = [];

      for (const [key, label] of Object.entries(labels)) {
        const raw = (row as any)[key];
        if (raw === null || raw === undefined || raw === "") continue;
        let value: string;
        if (raw instanceof Date) {
          value = raw.toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });
        } else if (typeof raw === "boolean") {
          value = raw ? "Sí" : "No";
        } else {
          value = String(raw);
        }
        fields.push({ key, label, value });
      }

      return {
        id: (row as any).id,
        type: input.type,
        typeLabel: typeLabels[input.type],
        fields,
        generatedAt: new Date().toISOString(),
      };
    }),

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
