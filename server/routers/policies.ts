import { z } from "zod";
import { invokeLLM } from "../_core/llm";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getPoliciesByTenant, getPolicyById, createPolicy, updatePolicy,
  getPolicyCoverages, getPolicySlaRules, getPolicyServices, getPolicyExclusions, getPolicyOperationalRules,
  createAuditLog,
} from "../db";
import { getDb } from "../db";
import { policyCoverages, policyServices, policySlaRules, policyExclusions, policyOperationalRules } from "../../drizzle/schema";
import { and, eq } from "drizzle-orm";

export const policiesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId ?? 1;
    const rows = await getPoliciesByTenant(tenantId);
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const in90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    return rows.map((p: any) => {
      const end = p.endDate ? new Date(p.endDate) : null;
      let coverageStatus: string = "active";
      if (end) {
        if (end < now) coverageStatus = "expired";
        else if (end <= in30) coverageStatus = "expiring_30";
        else if (end <= in90) coverageStatus = "expiring_soon";
      }
      return { ...p, coverageStatus };
    });
  }),

  getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    const tenantId = ctx.user.tenantId ?? 1;
    const policy = await getPolicyById(input.id, tenantId);
    if (!policy) throw new TRPCError({ code: "NOT_FOUND" });
    const [coverages, slaRules, services, exclusions, operationalRules] = await Promise.all([
      getPolicyCoverages(input.id, tenantId),
      getPolicySlaRules(input.id, tenantId),
      getPolicyServices(input.id, tenantId),
      getPolicyExclusions(input.id, tenantId),
      getPolicyOperationalRules(input.id, tenantId),
    ]);
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const in90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const end = policy.endDate ? new Date(policy.endDate) : null;
    let coverageStatus: string = "active";
    if (end) {
      if (end < now) coverageStatus = "expired";
      else if (end <= in30) coverageStatus = "expiring_30";
      else if (end <= in90) coverageStatus = "expiring_soon";
    }
    return { ...policy, coverageStatus, coverages, slaRules, services, exclusions, operationalRules };
  }),

  create: protectedProcedure.input(z.object({
    policyNumber: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    status: z.enum(["draft", "active", "suspended", "expired", "cancelled"]).optional(),
    type: z.enum(["maintenance", "warranty", "support", "comprehensive"]).optional(),
    startDate: z.string(),
    endDate: z.string(),
    renewalDate: z.string().optional(),
    monthlyValue: z.string().optional(),
    annualValue: z.string().optional(),
    currency: z.string().optional(),
    clientName: z.string().optional(),
    clientContact: z.string().optional(),
    clientEmail: z.string().optional(),
    clientPhone: z.string().optional(),
    branchId: z.number().optional(),
    notes: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    if (!["admin", "supervisor"].includes(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN" });
    const tenantId = ctx.user.tenantId ?? 1;
    const result = await createPolicy({
      ...input,
      tenantId,
      startDate: new Date(input.startDate) as any,
      endDate: new Date(input.endDate) as any,
      renewalDate: input.renewalDate ? new Date(input.renewalDate) as any : undefined,
      assignedUserId: ctx.user.id,
    });
    await createAuditLog({ tenantId, userId: ctx.user.id, userName: ctx.user.name ?? undefined, action: "CREATE", module: "policies", entityType: "policy", description: `Póliza creada: ${input.name} (${input.policyNumber})` });
    return result;
  }),

  update: protectedProcedure.input(z.object({
    id: z.number(),
    name: z.string().optional(),
    description: z.string().optional(),
    status: z.enum(["draft", "active", "suspended", "expired", "cancelled"]).optional(),
    type: z.enum(["maintenance", "warranty", "support", "comprehensive"]).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    renewalDate: z.string().optional(),
    monthlyValue: z.string().optional(),
    annualValue: z.string().optional(),
    clientName: z.string().optional(),
    clientContact: z.string().optional(),
    clientEmail: z.string().optional(),
    clientPhone: z.string().optional(),
    notes: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    if (!["admin", "supervisor"].includes(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN" });
    const tenantId = ctx.user.tenantId ?? 1;
    const { id, startDate, endDate, renewalDate, ...rest } = input;
    const data = {
      ...rest,
      ...(startDate ? { startDate: new Date(startDate) as any } : {}),
      ...(endDate ? { endDate: new Date(endDate) as any } : {}),
      ...(renewalDate ? { renewalDate: new Date(renewalDate) as any } : {}),
    };
    await updatePolicy(id, tenantId, data);
    await createAuditLog({ tenantId, userId: ctx.user.id, userName: ctx.user.name ?? undefined, action: "UPDATE", module: "policies", entityType: "policy", entityId: id, description: `Póliza actualizada: ID ${id}` });
    return { success: true };
  }),

  addCoverage: protectedProcedure.input(z.object({
    policyId: z.number(),
    name: z.string().min(1),
    description: z.string().optional(),
    coverageType: z.enum(["preventive", "corrective", "emergency", "parts", "labor", "travel"]),
    maxIncidents: z.number().optional(),
    maxAmount: z.string().optional(),
    isUnlimited: z.boolean().optional(),
  })).mutation(async ({ ctx, input }) => {
    if (!["admin", "supervisor"].includes(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN" });
    const tenantId = ctx.user.tenantId ?? 1;
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await db.insert(policyCoverages).values({ ...input, tenantId });
    return { success: true };
  }),

  addSlaRule: protectedProcedure.input(z.object({
    policyId: z.number(),
    name: z.string().min(1),
    priority: z.enum(["critical", "high", "medium", "low"]),
    responseTimeHours: z.number(),
    resolutionTimeHours: z.number(),
    escalationTimeHours: z.number().optional(),
    penaltyPerHour: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    if (!["admin", "supervisor"].includes(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN" });
    const tenantId = ctx.user.tenantId ?? 1;
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await db.insert(policySlaRules).values({ ...input, tenantId });
    return { success: true };
  }),

  addService: protectedProcedure.input(z.object({
    policyId: z.number(),
    serviceName: z.string().min(1),
    serviceCode: z.string().optional(),
    description: z.string().optional(),
    frequency: z.enum(["on_demand", "monthly", "quarterly", "biannual", "annual"]).optional(),
    isIncluded: z.boolean().optional(),
  })).mutation(async ({ ctx, input }) => {
    if (!["admin", "supervisor"].includes(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN" });
    const tenantId = ctx.user.tenantId ?? 1;
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await db.insert(policyServices).values({ ...input, tenantId });
    return { success: true };
  }),

  addExclusion: protectedProcedure.input(z.object({
    policyId: z.number(),
    description: z.string().min(1),
    category: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    if (!["admin", "supervisor"].includes(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN" });
    const tenantId = ctx.user.tenantId ?? 1;
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await db.insert(policyExclusions).values({ ...input, tenantId });
    return { success: true };
  }),

  addOperationalRule: protectedProcedure.input(z.object({
    policyId: z.number(),
    ruleType: z.string().min(1),
    description: z.string().min(1),
    value: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    if (!["admin", "supervisor"].includes(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN" });
    const tenantId = ctx.user.tenantId ?? 1;
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await db.insert(policyOperationalRules).values({ ...input, tenantId });
    return { success: true };
  }),

  // ─── Extract policy data from PDF or image using LLM ─────────────────────
  extractFromDocument: protectedProcedure.input(z.object({
    fileBase64: z.string(),
    mimeType: z.string(),
    fileName: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    if (!['admin', 'supervisor'].includes(ctx.user.role)) throw new TRPCError({ code: 'FORBIDDEN' });

    const isImage = input.mimeType.startsWith('image/');
    const isPdf = input.mimeType === 'application/pdf';

    if (!isImage && !isPdf) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Solo se aceptan archivos PDF o imágenes (JPG, PNG, WEBP)' });
    }

    const dataUrl = `data:${input.mimeType};base64,${input.fileBase64}`;

    const systemPrompt = `Eres un asistente especializado en extracción de datos de pólizas de servicio y contratos de mantenimiento.
Extrae TODOS los campos que puedas identificar del documento. Si un campo no está presente, devuelve null para ese campo.
Devuelve ÚNICAMENTE un objeto JSON válido, sin texto adicional, sin markdown, sin explicaciones.`;

    const userPrompt = `Analiza este documento (póliza de servicio / contrato de mantenimiento) y extrae los siguientes campos:

- policyNumber: número o folio de la póliza/contrato
- name: nombre o título de la póliza/contrato
- description: descripción general del servicio
- type: tipo de póliza (uno de: maintenance, warranty, support, comprehensive)
- status: estado actual (uno de: draft, active, suspended, expired, cancelled) — si no se especifica, usa "active"
- startDate: fecha de inicio en formato YYYY-MM-DD
- endDate: fecha de vencimiento/fin en formato YYYY-MM-DD
- renewalDate: fecha de renovación en formato YYYY-MM-DD (si aplica)
- clientName: nombre del cliente o empresa contratante
- clientContact: nombre del contacto del cliente
- clientEmail: correo electrónico del cliente
- clientPhone: teléfono del cliente
- annualValue: valor anual del contrato como número (solo dígitos y punto decimal, sin símbolos)
- monthlyValue: valor mensual del contrato como número (solo dígitos y punto decimal, sin símbolos)
- currency: moneda (MXN, USD o EUR)
- notes: observaciones o notas adicionales relevantes
- maintenancesPerYear: número de mantenimientos preventivos cubiertos por año (si se menciona)
- coverages: array de strings con los servicios/coberturas incluidos en la póliza
- exclusions: array de strings con las exclusiones de la póliza
- slaResponseTime: tiempo de respuesta SLA en horas (si se menciona)
- slaResolutionTime: tiempo de resolución SLA en horas (si se menciona)

Devuelve SOLO el JSON, sin texto adicional.`;

    let response: any;
    if (isImage) {
      response = await invokeLLM({
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
              { type: 'text', text: userPrompt },
            ],
          },
        ],
        response_format: { type: 'json_object' },
      });
    } else {
      // PDF: send as file_url
      response = await invokeLLM({
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'file_url', file_url: { url: dataUrl, mime_type: 'application/pdf' } },
              { type: 'text', text: userPrompt },
            ],
          },
        ],
        response_format: { type: 'json_object' },
      });
    }

    const raw = response?.choices?.[0]?.message?.content ?? '{}';
    let extracted: Record<string, any> = {};
    try {
      extracted = JSON.parse(typeof raw === 'string' ? raw : JSON.stringify(raw));
    } catch {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'No se pudo interpretar la respuesta de la IA' });
    }

    return { extracted };
  }),
});
