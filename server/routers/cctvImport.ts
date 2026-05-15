/**
 * Router: CCTV Inventory Import
 * Handles file parsing (CSV, Excel, Word, PDF) and bulk insertion
 * into the corresponding CCTV table.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  cctvCameras, cctvIdfs, cctvLicenses, cctvMonitors,
  cctvServers, cctvSwitches, cctvUps,
} from "../../drizzle/schema";
import * as XLSX from "xlsx";
import mammoth from "mammoth";
import { invokeLLM } from "../_core/llm";

// ─── Column definitions per category ─────────────────────────────────────────

export const CATEGORY_COLUMNS: Record<string, { key: string; label: string }[]> = {
  cameras: [
    { key: "idCamera", label: "ID Cámara" },
    { key: "marca", label: "Marca" },
    { key: "modelo", label: "Modelo" },
    { key: "serie", label: "Serie" },
    { key: "familia", label: "Familia" },
    { key: "resolucion", label: "Resolución" },
    { key: "tipo", label: "Tipo" },
    { key: "area", label: "Área / Zona" },
    { key: "edificio", label: "Edificio" },
    { key: "ip", label: "IP" },
    { key: "mascara", label: "Máscara" },
    { key: "gateway", label: "Gateway" },
    { key: "mac", label: "MAC" },
    { key: "conexion", label: "Conexión (IDF)" },
    { key: "puertoSw", label: "Puerto Switch" },
    { key: "proveedor", label: "Proveedor" },
    { key: "fechaCompra", label: "Fecha de Compra" },
    { key: "po", label: "Orden de Compra (PO)" },
    { key: "tiempoUso", label: "Tiempo de Uso" },
    { key: "garantiaExpiracion", label: "Expiración Garantía" },
    { key: "status", label: "Estado" },
    { key: "observaciones", label: "Observaciones" },
  ],
  idfs: [
    { key: "idIdf", label: "ID IDF" },
    { key: "nombre", label: "Nombre" },
    { key: "tipo", label: "Tipo (IDF/MDF)" },
    { key: "ubicacion", label: "Ubicación" },
    { key: "numeroRacks", label: "N° Racks" },
    { key: "numGabinetes", label: "N° Gabinetes" },
    { key: "capacidadRacks", label: "Capacidad Racks (U)" },
    { key: "capacidadGabinetes", label: "Capacidad Gabinetes" },
    { key: "fibraOptica", label: "Fibra Óptica" },
    { key: "tipoFibra", label: "Tipo Fibra" },
    { key: "noSwitches", label: "N° Switches" },
    { key: "noServidores", label: "N° Servidores" },
    { key: "noUps", label: "N° UPS" },
    { key: "refrigerado", label: "Refrigerado" },
    { key: "controlAcceso", label: "Control de Acceso" },
    { key: "status", label: "Estado" },
    { key: "observaciones", label: "Observaciones" },
    { key: "comentarios", label: "Comentarios" },
  ],
  licenses: [
    { key: "idLicencia", label: "ID Licencia" },
    { key: "marca", label: "Marca" },
    { key: "modelo", label: "Modelo" },
    { key: "tipo", label: "Tipo" },
    { key: "noContrato", label: "N° Contrato" },
    { key: "fechaInicio", label: "Fecha Inicio" },
    { key: "fechaExpiracion", label: "Fecha Expiración" },
    { key: "equipoAsignado", label: "Equipo Asignado" },
    { key: "ubicacion", label: "Ubicación" },
    { key: "proveedor", label: "Proveedor" },
    { key: "fechaCompra", label: "Fecha de Compra" },
    { key: "ordenCompra", label: "Orden de Compra" },
    { key: "tiempoUso", label: "Tiempo de Uso" },
    { key: "status", label: "Estado" },
    { key: "observaciones", label: "Observaciones" },
  ],
  monitors: [
    { key: "idMonitor", label: "ID Monitor" },
    { key: "marca", label: "Marca" },
    { key: "modelo", label: "Modelo" },
    { key: "serie", label: "Serie" },
    { key: "tipo", label: "Tipo" },
    { key: "tamano", label: "Tamaño" },
    { key: "resolucion", label: "Resolución" },
    { key: "tecnologia", label: "Tecnología" },
    { key: "puerto", label: "Puerto" },
    { key: "ubicacion", label: "Ubicación" },
    { key: "proveedor", label: "Proveedor" },
    { key: "fechaCompra", label: "Fecha de Compra" },
    { key: "garantiaExpiracion", label: "Expiración Garantía" },
    { key: "tiempoUso", label: "Tiempo de Uso" },
    { key: "status", label: "Estado" },
    { key: "ups", label: "UPS" },
    { key: "observaciones", label: "Observaciones" },
  ],
  servers: [
    { key: "idServer", label: "ID Servidor" },
    { key: "marca", label: "Marca" },
    { key: "modelo", label: "Modelo" },
    { key: "serie", label: "Serie" },
    { key: "tipo", label: "Tipo (NVR/WS)" },
    { key: "versionVms", label: "Versión VMS" },
    { key: "licencias", label: "Licencias" },
    { key: "licenciasLibres", label: "Licencias Libres" },
    { key: "versionLic", label: "Versión Licencia" },
    { key: "numCamaras", label: "N° Cámaras" },
    { key: "so", label: "Sistema Operativo" },
    { key: "memoria", label: "Memoria" },
    { key: "procesador", label: "Procesador" },
    { key: "storage", label: "Storage" },
    { key: "ip", label: "IP" },
    { key: "mascara", label: "Máscara" },
    { key: "gateway", label: "Gateway" },
    { key: "dns", label: "DNS" },
    { key: "nic", label: "NIC" },
    { key: "mac", label: "MAC" },
    { key: "ubicacion", label: "Ubicación" },
    { key: "proveedor", label: "Proveedor" },
    { key: "fechaCompra", label: "Fecha de Compra" },
    { key: "garantiaExpiracion", label: "Expiración Garantía" },
    { key: "tiempoUso", label: "Tiempo de Uso" },
    { key: "status", label: "Estado" },
    { key: "observaciones", label: "Observaciones" },
    { key: "usuario", label: "Usuario" },
  ],
  switches: [
    { key: "idSwitch", label: "ID Switch" },
    { key: "marca", label: "Marca" },
    { key: "modelo", label: "Modelo" },
    { key: "serie", label: "Serie" },
    { key: "tipo", label: "Tipo" },
    { key: "firmware", label: "Firmware" },
    { key: "puertos", label: "Puertos Totales" },
    { key: "puertosPoe", label: "Puertos PoE" },
    { key: "capacidadPto", label: "Capacidad Puerto" },
    { key: "numCamaras", label: "N° Cámaras" },
    { key: "puertosLibres", label: "Puertos Libres" },
    { key: "ip", label: "IP" },
    { key: "ubicacion", label: "Ubicación" },
    { key: "proveedor", label: "Proveedor" },
    { key: "fechaCompra", label: "Fecha de Compra" },
    { key: "garantiaExpiracion", label: "Expiración Garantía" },
    { key: "tiempoUso", label: "Tiempo de Uso" },
    { key: "status", label: "Estado" },
    { key: "observaciones", label: "Observaciones" },
    { key: "usuario", label: "Usuario" },
  ],
  ups: [
    { key: "idUps", label: "ID UPS" },
    { key: "marca", label: "Marca" },
    { key: "modelo", label: "Modelo" },
    { key: "serie", label: "Serie" },
    { key: "tipo", label: "Tipo" },
    { key: "capacidad", label: "Capacidad" },
    { key: "autonomia", label: "Autonomía" },
    { key: "equiposConectados", label: "Equipos Conectados" },
    { key: "consumoActual", label: "Consumo Actual" },
    { key: "ip", label: "IP" },
    { key: "ubicacion", label: "Ubicación" },
    { key: "proveedor", label: "Proveedor" },
    { key: "fechaCompra", label: "Fecha de Compra" },
    { key: "garantiaExpiracion", label: "Expiración Garantía" },
    { key: "tiempoUso", label: "Tiempo de Uso" },
    { key: "status", label: "Estado" },
    { key: "observaciones", label: "Observaciones" },
  ],
};

// ─── File parsing helpers ─────────────────────────────────────────────────────

function parseCSV(content: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map(line => {
    const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
  });
  return { headers, rows };
}

function parseExcel(base64: string): { headers: string[]; rows: Record<string, string>[] } {
  const buf = Buffer.from(base64, "base64");
  const wb = XLSX.read(buf, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });
  if (raw.length === 0) return { headers: [], rows: [] };
  const headers = Object.keys(raw[0]);
  const rows = raw.map(r => Object.fromEntries(headers.map(h => [h, String(r[h] ?? "")])));
  return { headers, rows };
}

async function parseWord(base64: string): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const buf = Buffer.from(base64, "base64");
  const result = await mammoth.extractRawText({ buffer: buf });
  const text = result.value;
  // Try to find table-like structure (tab or pipe separated)
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const tableLike = lines.filter(l => l.includes("\t") || l.includes("|"));
  if (tableLike.length >= 2) {
    const sep = tableLike[0].includes("\t") ? "\t" : "|";
    const headers = tableLike[0].split(sep).map(h => h.trim()).filter(Boolean);
    const rows = tableLike.slice(1).map(line => {
      const vals = line.split(sep).map(v => v.trim()).filter((_, i) => i < headers.length);
      return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
    });
    return { headers, rows };
  }
  // Fallback: return raw text as single column
  return { headers: ["contenido"], rows: lines.map(l => ({ contenido: l })) };
}

// ─── AI column mapping ────────────────────────────────────────────────────────

async function suggestColumnMapping(
  fileHeaders: string[],
  targetColumns: { key: string; label: string }[]
): Promise<Record<string, string>> {
  const prompt = `You are a data mapping assistant. Map file column headers to target database fields.

File headers: ${JSON.stringify(fileHeaders)}

Target fields (key: label):
${targetColumns.map(c => `${c.key}: ${c.label}`).join("\n")}

Return a JSON object where keys are file header names and values are target field keys.
Only map headers that clearly correspond to a target field. Use null for unmapped headers.
Return ONLY the JSON object, no explanation.`;

  try {
    const res = await invokeLLM({
      messages: [
        { role: "system", content: "You are a data mapping assistant. Return only valid JSON." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });
    const rawContent = res.choices?.[0]?.message?.content;
    const content = typeof rawContent === "string" ? rawContent : "{}";
    return JSON.parse(content);
  } catch {
    // Fallback: fuzzy match by similarity
    const mapping: Record<string, string> = {};
    for (const fh of fileHeaders) {
      const normalized = fh.toLowerCase().replace(/[^a-z0-9]/g, "");
      const match = targetColumns.find(tc => {
        const tcNorm = tc.label.toLowerCase().replace(/[^a-z0-9]/g, "");
        const keyNorm = tc.key.toLowerCase();
        return tcNorm.includes(normalized) || normalized.includes(tcNorm) ||
               keyNorm.includes(normalized) || normalized.includes(keyNorm);
      });
      if (match) mapping[fh] = match.key;
    }
    return mapping;
  }
}

// ─── Bulk insert helpers ──────────────────────────────────────────────────────

function applyMapping(
  rows: Record<string, string>[],
  mapping: Record<string, string>,
  tenantId: number
): Record<string, any>[] {
  return rows.map(row => {
    const rec: Record<string, any> = { tenantId };
    for (const [fileCol, dbKey] of Object.entries(mapping)) {
      if (!dbKey || dbKey === "null") continue;
      const val = row[fileCol];
      if (val === undefined || val === "") continue;
      // Type coercions
      if (["poe", "internet", "ctpat", "fibraOptica", "idfCompartido", "refrigerado",
           "controlAcceso", "expirado", "ups", "tarjetaRed"].includes(dbKey)) {
        rec[dbKey] = ["true", "1", "si", "sí", "yes", "x"].includes(val.toLowerCase());
      } else if (["numeroRacks", "numGabinetes", "capacidadRacks", "capacidadGabinetes",
                  "noSwitches", "noServidores", "noUps", "licencias", "licenciasLibres",
                  "numCamaras", "puertos", "puertosPoe", "puertosLibres", "equiposConectados"].includes(dbKey)) {
        const n = parseInt(val);
        if (!isNaN(n)) rec[dbKey] = n;
      } else if (["fechaCompra", "garantiaExpiracion", "fechaInicio", "fechaExpiracion"].includes(dbKey)) {
        // Accept various date formats
        const d = new Date(val);
        if (!isNaN(d.getTime())) rec[dbKey] = d.toISOString().split("T")[0];
      } else {
        rec[dbKey] = val;
      }
    }
    return rec;
  });
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const cctvImportRouter = router({
  // Step 1: parse file and get headers + preview rows
  parseFile: protectedProcedure
    .input(z.object({
      fileBase64: z.string(),
      fileName: z.string(),
      category: z.enum(["cameras", "idfs", "licenses", "monitors", "servers", "switches", "ups"]),
    }))
    .mutation(async ({ input }) => {
      const ext = input.fileName.split(".").pop()?.toLowerCase() ?? "";
      let headers: string[] = [];
      let rows: Record<string, string>[] = [];

      if (ext === "csv") {
        const text = Buffer.from(input.fileBase64, "base64").toString("utf-8");
        ({ headers, rows } = parseCSV(text));
      } else if (["xlsx", "xls"].includes(ext)) {
        ({ headers, rows } = parseExcel(input.fileBase64));
      } else if (["docx", "doc"].includes(ext)) {
        ({ headers, rows } = await parseWord(input.fileBase64));
      } else if (ext === "pdf") {
        // For PDF, use LLM to extract tabular data
        const pdfText = Buffer.from(input.fileBase64, "base64").toString("base64");
        const res = await invokeLLM({
          messages: [
            { role: "system", content: "Extract tabular inventory data from this document. Return a JSON object with 'headers' (array of strings) and 'rows' (array of objects). If no table found, return {headers:[], rows:[]}." },
            {
              role: "user",
              content: `[PDF base64 data for category: ${input.category}. File size: ${pdfText.length} chars]`,
            },
          ],
          response_format: { type: "json_object" },
        });
        try {
          const rawC = res.choices?.[0]?.message?.content;
          const parsed = JSON.parse(typeof rawC === "string" ? rawC : "{}");
          headers = parsed.headers ?? [];
          rows = parsed.rows ?? [];
        } catch {
          headers = [];
          rows = [];
        }
      }

      const targetCols = CATEGORY_COLUMNS[input.category] ?? [];
      const mapping = await suggestColumnMapping(headers, targetCols);

      return {
        headers,
        previewRows: rows.slice(0, 5),
        totalRows: rows.length,
        suggestedMapping: mapping,
        targetColumns: targetCols,
      };
    }),

  // Step 3→4: apply mapping and insert rows
  importRows: protectedProcedure
    .input(z.object({
      fileBase64: z.string(),
      fileName: z.string(),
      category: z.enum(["cameras", "idfs", "licenses", "monitors", "servers", "switches", "ups"]),
      mapping: z.record(z.string(), z.string().nullable()),
    }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.user.tenantId ?? 1;
      const ext = input.fileName.split(".").pop()?.toLowerCase() ?? "";
      let rows: Record<string, string>[] = [];

      if (ext === "csv") {
        const text = Buffer.from(input.fileBase64, "base64").toString("utf-8");
        ({ rows } = parseCSV(text));
      } else if (["xlsx", "xls"].includes(ext)) {
        ({ rows } = parseExcel(input.fileBase64));
      } else if (["docx", "doc"].includes(ext)) {
        ({ rows } = await parseWord(input.fileBase64));
      } else {
        // PDF rows already parsed in parseFile step; re-parse
        const pdfText = Buffer.from(input.fileBase64, "base64").toString("base64");
        const res = await invokeLLM({
          messages: [
            { role: "system", content: "Extract tabular inventory data. Return JSON {headers:[], rows:[]}." },
            { role: "user", content: `[PDF base64 data for category: ${input.category}. File size: ${pdfText.length} chars]` },
          ],
          response_format: { type: "json_object" },
        });
        try {
          const rawC2 = res.choices?.[0]?.message?.content;
          const parsed = JSON.parse(typeof rawC2 === "string" ? rawC2 : "{}");
          rows = parsed.rows ?? [];
        } catch { rows = []; }
      }

      const mappingStr: Record<string, string> = Object.fromEntries(
        Object.entries(input.mapping).map(([k, v]) => [k, String(v ?? "")])
      );
      const records = applyMapping(rows, mappingStr, tenantId);
      let inserted = 0;
      let skipped = 0;
      const errors: string[] = [];
      const skippedNames: string[] = [];

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No hay conexión a la base de datos" });

      // Load existing IDs and names for duplicate detection
      const { eq } = await import("drizzle-orm");
      const existingIds = new Set<string>();
      const existingNames = new Set<string>();

      if (input.category === "cameras") {
        const existing = await db.select({ idCamera: cctvCameras.idCamera, area: cctvCameras.area }).from(cctvCameras).where(eq(cctvCameras.tenantId, tenantId));
        existing.forEach(r => { if (r.idCamera) existingIds.add(r.idCamera.toLowerCase()); if (r.area) existingNames.add(r.area.toLowerCase()); });
      } else if (input.category === "idfs") {
        const existing = await db.select({ idIdf: cctvIdfs.idIdf, nombre: cctvIdfs.nombre }).from(cctvIdfs).where(eq(cctvIdfs.tenantId, tenantId));
        existing.forEach(r => { if (r.idIdf) existingIds.add(r.idIdf.toLowerCase()); if (r.nombre) existingNames.add(r.nombre.toLowerCase()); });
      } else if (input.category === "licenses") {
        const existing = await db.select({ idLicencia: cctvLicenses.idLicencia, marca: cctvLicenses.marca }).from(cctvLicenses).where(eq(cctvLicenses.tenantId, tenantId));
        existing.forEach(r => { if (r.idLicencia) existingIds.add(r.idLicencia.toLowerCase()); if (r.marca) existingNames.add(r.marca.toLowerCase()); });
      } else if (input.category === "monitors") {
        const existing = await db.select({ idMonitor: cctvMonitors.idMonitor, marca: cctvMonitors.marca }).from(cctvMonitors).where(eq(cctvMonitors.tenantId, tenantId));
        existing.forEach(r => { if (r.idMonitor) existingIds.add(r.idMonitor.toLowerCase()); if (r.marca) existingNames.add(r.marca.toLowerCase()); });
      } else if (input.category === "servers") {
        const existing = await db.select({ idServer: cctvServers.idServer, marca: cctvServers.marca }).from(cctvServers).where(eq(cctvServers.tenantId, tenantId));
        existing.forEach(r => { if (r.idServer) existingIds.add(r.idServer.toLowerCase()); if (r.marca) existingNames.add(r.marca.toLowerCase()); });
      } else if (input.category === "switches") {
        const existing = await db.select({ idSwitch: cctvSwitches.idSwitch, marca: cctvSwitches.marca }).from(cctvSwitches).where(eq(cctvSwitches.tenantId, tenantId));
        existing.forEach(r => { if (r.idSwitch) existingIds.add(r.idSwitch.toLowerCase()); if (r.marca) existingNames.add(r.marca.toLowerCase()); });
      } else if (input.category === "ups") {
        const existing = await db.select({ idUps: cctvUps.idUps, marca: cctvUps.marca }).from(cctvUps).where(eq(cctvUps.tenantId, tenantId));
        existing.forEach(r => { if (r.idUps) existingIds.add(r.idUps.toLowerCase()); if (r.marca) existingNames.add(r.marca.toLowerCase()); });
      }

      // ID field per category
      const ID_FIELD: Record<string, string> = {
        cameras: "idCamera", idfs: "idIdf", licenses: "idLicencia",
        monitors: "idMonitor", servers: "idServer", switches: "idSwitch", ups: "idUps",
      };
      const idField = ID_FIELD[input.category];

      for (const rec of records) {
        // Duplicate check by ID
        const recId = rec[idField] ? String(rec[idField]).toLowerCase() : null;
        const recName = rec.nombre ? String(rec.nombre).toLowerCase() : (rec.area ? String(rec.area).toLowerCase() : null);
        if (recId && existingIds.has(recId)) {
          skipped++;
          skippedNames.push(String(rec[idField]));
          continue;
        }
        if (recName && existingNames.has(recName)) {
          skipped++;
          skippedNames.push(recName);
          continue;
        }
        try {
          if (input.category === "cameras") await db.insert(cctvCameras).values(rec as any);
          else if (input.category === "idfs") await db.insert(cctvIdfs).values(rec as any);
          else if (input.category === "licenses") await db.insert(cctvLicenses).values(rec as any);
          else if (input.category === "monitors") await db.insert(cctvMonitors).values(rec as any);
          else if (input.category === "servers") await db.insert(cctvServers).values(rec as any);
          else if (input.category === "switches") await db.insert(cctvSwitches).values(rec as any);
          else if (input.category === "ups") await db.insert(cctvUps).values(rec as any);
          inserted++;
          // Add to sets to prevent duplicates within the same import batch
          if (recId) existingIds.add(recId);
          if (recName) existingNames.add(recName);
        } catch (e: any) {
          errors.push(e?.message ?? "Error desconocido");
        }
      }

      return { inserted, skipped, skippedNames, errors, total: records.length };
    }),

  // Get category definitions (for step 1 UI)
  getCategories: protectedProcedure.query(() => {
    return Object.entries(CATEGORY_COLUMNS).map(([key, cols]) => ({
      key,
      label: {
        cameras: "Cámaras",
        idfs: "IDF / MDF",
        licenses: "Licencias",
        monitors: "Monitores / Pantallas",
        servers: "Servidores",
        switches: "Switches",
        ups: "UPS",
      }[key] ?? key,
      columnCount: cols.length,
    }));
  }),
});
