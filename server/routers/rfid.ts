/**
 * Router: RFID Tag Management
 * Handles generation of consecutive RFID tags for CCTV inventory items,
 * lookup by tag code, and listing all tags per tenant.
 *
 * Tag format: HOROS-{CAT}-{NNNNNN}
 * Examples: HOROS-CAM-000001, HOROS-SRV-000042, HOROS-UPS-000007
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  rfidRegistry,
  cctvCameras, cctvIdfs, cctvLicenses, cctvMonitors,
  cctvServers, cctvSwitches, cctvUps,
} from "../../drizzle/schema";

// ─── Category prefix map ──────────────────────────────────────────────────────
const CAT_PREFIX: Record<string, string> = {
  cameras:  "CAM",
  idfs:     "IDF",
  licenses: "LIC",
  monitors: "MON",
  servers:  "SRV",
  switches: "SWT",
  ups:      "UPS",
};

// ─── Helper: get item info from any CCTV table ────────────────────────────────
async function getItemInfo(db: any, category: string, itemId: number, tenantId: number) {
  let row: any = null;
  if (category === "cameras") {
    const r = await db.select().from(cctvCameras).where(and(eq(cctvCameras.id, itemId), eq(cctvCameras.tenantId, tenantId))).limit(1);
    row = r[0];
    if (row) return { name: row.area ?? row.idCamera ?? "Cámara", brand: row.marca, model: row.modelo, serial: row.serie, location: row.ubicacion ?? row.area, status: row.status };
  } else if (category === "idfs") {
    const r = await db.select().from(cctvIdfs).where(and(eq(cctvIdfs.id, itemId), eq(cctvIdfs.tenantId, tenantId))).limit(1);
    row = r[0];
    if (row) return { name: row.nombre ?? row.idIdf ?? "IDF", brand: null, model: null, serial: null, location: row.ubicacion, status: row.status };
  } else if (category === "licenses") {
    const r = await db.select().from(cctvLicenses).where(and(eq(cctvLicenses.id, itemId), eq(cctvLicenses.tenantId, tenantId))).limit(1);
    row = r[0];
    if (row) return { name: row.software ?? row.idLicencia ?? "Licencia", brand: row.marca, model: row.software, serial: row.llave, location: null, status: row.status };
  } else if (category === "monitors") {
    const r = await db.select().from(cctvMonitors).where(and(eq(cctvMonitors.id, itemId), eq(cctvMonitors.tenantId, tenantId))).limit(1);
    row = r[0];
    if (row) return { name: `${row.marca ?? ""} ${row.modelo ?? ""}`.trim() || row.idMonitor || "Monitor", brand: row.marca, model: row.modelo, serial: row.serie, location: row.ubicacion, status: row.status };
  } else if (category === "servers") {
    const r = await db.select().from(cctvServers).where(and(eq(cctvServers.id, itemId), eq(cctvServers.tenantId, tenantId))).limit(1);
    row = r[0];
    if (row) return { name: `${row.marca ?? ""} ${row.modelo ?? ""}`.trim() || row.idServer || "Servidor", brand: row.marca, model: row.modelo, serial: row.serie, location: row.ubicacion, status: row.status };
  } else if (category === "switches") {
    const r = await db.select().from(cctvSwitches).where(and(eq(cctvSwitches.id, itemId), eq(cctvSwitches.tenantId, tenantId))).limit(1);
    row = r[0];
    if (row) return { name: `${row.marca ?? ""} ${row.modelo ?? ""}`.trim() || row.idSwitch || "Switch", brand: row.marca, model: row.modelo, serial: row.serie, location: row.ubicacion, status: row.status };
  } else if (category === "ups") {
    const r = await db.select().from(cctvUps).where(and(eq(cctvUps.id, itemId), eq(cctvUps.tenantId, tenantId))).limit(1);
    row = r[0];
    if (row) return { name: `${row.marca ?? ""} ${row.modelo ?? ""}`.trim() || row.idUps || "UPS", brand: row.marca, model: row.modelo, serial: row.serie, location: row.ubicacion, status: row.status };
  }
  return null;
}

// ─── Helper: get full item details for lookup ─────────────────────────────────
async function getFullItem(db: any, category: string, itemId: number, tenantId: number) {
  if (category === "cameras") {
    const r = await db.select().from(cctvCameras).where(and(eq(cctvCameras.id, itemId), eq(cctvCameras.tenantId, tenantId))).limit(1);
    return r[0] ?? null;
  } else if (category === "idfs") {
    const r = await db.select().from(cctvIdfs).where(and(eq(cctvIdfs.id, itemId), eq(cctvIdfs.tenantId, tenantId))).limit(1);
    return r[0] ?? null;
  } else if (category === "licenses") {
    const r = await db.select().from(cctvLicenses).where(and(eq(cctvLicenses.id, itemId), eq(cctvLicenses.tenantId, tenantId))).limit(1);
    return r[0] ?? null;
  } else if (category === "monitors") {
    const r = await db.select().from(cctvMonitors).where(and(eq(cctvMonitors.id, itemId), eq(cctvMonitors.tenantId, tenantId))).limit(1);
    return r[0] ?? null;
  } else if (category === "servers") {
    const r = await db.select().from(cctvServers).where(and(eq(cctvServers.id, itemId), eq(cctvServers.tenantId, tenantId))).limit(1);
    return r[0] ?? null;
  } else if (category === "switches") {
    const r = await db.select().from(cctvSwitches).where(and(eq(cctvSwitches.id, itemId), eq(cctvSwitches.tenantId, tenantId))).limit(1);
    return r[0] ?? null;
  } else if (category === "ups") {
    const r = await db.select().from(cctvUps).where(and(eq(cctvUps.id, itemId), eq(cctvUps.tenantId, tenantId))).limit(1);
    return r[0] ?? null;
  }
  return null;
}

export const rfidRouter = router({

  // ── Generate a new RFID tag for an item ──────────────────────────────────────
  generateTag: protectedProcedure
    .input(z.object({
      category: z.enum(["cameras", "idfs", "licenses", "monitors", "servers", "switches", "ups"]),
      itemId: z.number().int().positive(),
    }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.user.tenantId ?? 1;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Sin conexión a BD" });

      // Check if item already has a tag
      const existing = await db.select().from(rfidRegistry)
        .where(and(eq(rfidRegistry.category, input.category), eq(rfidRegistry.itemId, input.itemId), eq(rfidRegistry.tenantId, tenantId)))
        .limit(1);
      if (existing.length > 0) {
        return { rfidTag: existing[0].rfidTag, isNew: false };
      }

      // Get next consecutive number for this tenant+category
      const countResult = await db.select({ count: sql<number>`COUNT(*)` })
        .from(rfidRegistry)
        .where(and(eq(rfidRegistry.tenantId, tenantId), eq(rfidRegistry.category, input.category)));
      const nextNum = (Number(countResult[0]?.count ?? 0)) + 1;
      const prefix = CAT_PREFIX[input.category] ?? "EQP";
      const rfidTag = `HOROS-${prefix}-${String(nextNum).padStart(6, "0")}`;

      // Get item info for snapshot
      const info = await getItemInfo(db, input.category, input.itemId, tenantId);
      if (!info) throw new TRPCError({ code: "NOT_FOUND", message: "Equipo no encontrado" });

      // Insert into registry
      await db.insert(rfidRegistry).values({
        tenantId,
        rfidTag,
        category: input.category,
        itemId: input.itemId,
        itemName: info.name ?? undefined,
        itemBrand: info.brand ?? undefined,
        itemModel: info.model ?? undefined,
        itemSerial: info.serial ?? undefined,
        itemLocation: info.location ?? undefined,
        itemStatus: info.status ?? undefined,
      });

      // Update the item's rfidTag field in its own table
      if (input.category === "cameras") await db.update(cctvCameras).set({ rfidTag }).where(and(eq(cctvCameras.id, input.itemId), eq(cctvCameras.tenantId, tenantId)));
      else if (input.category === "idfs") await db.update(cctvIdfs).set({ rfidTag }).where(and(eq(cctvIdfs.id, input.itemId), eq(cctvIdfs.tenantId, tenantId)));
      else if (input.category === "licenses") await db.update(cctvLicenses).set({ rfidTag }).where(and(eq(cctvLicenses.id, input.itemId), eq(cctvLicenses.tenantId, tenantId)));
      else if (input.category === "monitors") await db.update(cctvMonitors).set({ rfidTag }).where(and(eq(cctvMonitors.id, input.itemId), eq(cctvMonitors.tenantId, tenantId)));
      else if (input.category === "servers") await db.update(cctvServers).set({ rfidTag }).where(and(eq(cctvServers.id, input.itemId), eq(cctvServers.tenantId, tenantId)));
      else if (input.category === "switches") await db.update(cctvSwitches).set({ rfidTag }).where(and(eq(cctvSwitches.id, input.itemId), eq(cctvSwitches.tenantId, tenantId)));
      else if (input.category === "ups") await db.update(cctvUps).set({ rfidTag }).where(and(eq(cctvUps.id, input.itemId), eq(cctvUps.tenantId, tenantId)));

      return { rfidTag, isNew: true };
    }),

  // ── Lookup item by RFID tag (used by mobile scanner) ─────────────────────────
  // Public so it can be accessed from mobile without full auth (uses tenantId param)
  lookup: publicProcedure
    .input(z.object({
      rfidTag: z.string().min(1),
      tenantId: z.number().int().positive().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Sin conexión a BD" });

      // Find the registry entry
      const tenantId = input.tenantId ?? ctx.user?.tenantId ?? 1;
      const entries = await db.select().from(rfidRegistry)
        .where(and(eq(rfidRegistry.rfidTag, input.rfidTag), eq(rfidRegistry.tenantId, tenantId)))
        .limit(1);

      if (entries.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: `No se encontró ningún equipo con el tag: ${input.rfidTag}` });
      }

      const entry = entries[0];
      // Get full item details
      const fullItem = await getFullItem(db, entry.category, entry.itemId, tenantId);

      return {
        registry: entry,
        item: fullItem,
        category: entry.category,
      };
    }),

  // ── List all RFID tags for tenant ─────────────────────────────────────────────
  listByTenant: protectedProcedure
    .input(z.object({
      category: z.enum(["cameras", "idfs", "licenses", "monitors", "servers", "switches", "ups", "all"]).optional().default("all"),
    }))
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.user.tenantId ?? 1;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Sin conexión a BD" });

      const conditions = [eq(rfidRegistry.tenantId, tenantId)];
      if (input.category !== "all") {
        conditions.push(eq(rfidRegistry.category, input.category as any));
      }

      const rows = await db.select().from(rfidRegistry)
        .where(and(...conditions))
        .orderBy(desc(rfidRegistry.generatedAt));

      return rows;
    }),

  // ── Refresh snapshot data for an existing tag ─────────────────────────────────
  refreshSnapshot: protectedProcedure
    .input(z.object({ rfidTag: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.user.tenantId ?? 1;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Sin conexión a BD" });

      const entries = await db.select().from(rfidRegistry)
        .where(and(eq(rfidRegistry.rfidTag, input.rfidTag), eq(rfidRegistry.tenantId, tenantId)))
        .limit(1);
      if (entries.length === 0) throw new TRPCError({ code: "NOT_FOUND" });

      const entry = entries[0];
      const info = await getItemInfo(db, entry.category, entry.itemId, tenantId);
      if (!info) throw new TRPCError({ code: "NOT_FOUND", message: "Equipo no encontrado" });

      await db.update(rfidRegistry).set({
        itemName: info.name ?? undefined,
        itemBrand: info.brand ?? undefined,
        itemModel: info.model ?? undefined,
        itemSerial: info.serial ?? undefined,
        itemLocation: info.location ?? undefined,
        itemStatus: info.status ?? undefined,
      }).where(and(eq(rfidRegistry.rfidTag, input.rfidTag), eq(rfidRegistry.tenantId, tenantId)));

      return { success: true };
    }),

  // ── Delete/unassign a tag ─────────────────────────────────────────────────────
  deleteTag: protectedProcedure
    .input(z.object({ rfidTag: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.user.tenantId ?? 1;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Sin conexión a BD" });

      const entries = await db.select().from(rfidRegistry)
        .where(and(eq(rfidRegistry.rfidTag, input.rfidTag), eq(rfidRegistry.tenantId, tenantId)))
        .limit(1);
      if (entries.length === 0) throw new TRPCError({ code: "NOT_FOUND" });

      const entry = entries[0];
      // Clear rfidTag from item table
      if (entry.category === "cameras") await db.update(cctvCameras).set({ rfidTag: null }).where(and(eq(cctvCameras.id, entry.itemId), eq(cctvCameras.tenantId, tenantId)));
      else if (entry.category === "idfs") await db.update(cctvIdfs).set({ rfidTag: null }).where(and(eq(cctvIdfs.id, entry.itemId), eq(cctvIdfs.tenantId, tenantId)));
      else if (entry.category === "licenses") await db.update(cctvLicenses).set({ rfidTag: null }).where(and(eq(cctvLicenses.id, entry.itemId), eq(cctvLicenses.tenantId, tenantId)));
      else if (entry.category === "monitors") await db.update(cctvMonitors).set({ rfidTag: null }).where(and(eq(cctvMonitors.id, entry.itemId), eq(cctvMonitors.tenantId, tenantId)));
      else if (entry.category === "servers") await db.update(cctvServers).set({ rfidTag: null }).where(and(eq(cctvServers.id, entry.itemId), eq(cctvServers.tenantId, tenantId)));
      else if (entry.category === "switches") await db.update(cctvSwitches).set({ rfidTag: null }).where(and(eq(cctvSwitches.id, entry.itemId), eq(cctvSwitches.tenantId, tenantId)));
      else if (entry.category === "ups") await db.update(cctvUps).set({ rfidTag: null }).where(and(eq(cctvUps.id, entry.itemId), eq(cctvUps.tenantId, tenantId)));

      // Delete from registry
      await db.delete(rfidRegistry).where(and(eq(rfidRegistry.rfidTag, input.rfidTag), eq(rfidRegistry.tenantId, tenantId)));

      return { success: true };
    }),
});
