import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDashboardKpis, getAuditLogs, getAiChatSessions, createAiChatSession, getAiChatMessages, addAiChatMessage } from "../db";
import { invokeLLM } from "../_core/llm";

export const dashboardRouter = router({
  kpis: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId ?? 1;
    return getDashboardKpis(tenantId);
  }),
});

export const auditRouter = router({
  list: protectedProcedure.input(z.object({ limit: z.number().optional() }).optional()).query(async ({ ctx, input }) => {
    const tenantId = ctx.user.tenantId ?? 1;
    return getAuditLogs(tenantId, input?.limit ?? 100);
  }),
});

export const aiAssistantRouter = router({
  getSessions: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId ?? 1;
    return getAiChatSessions(ctx.user.id, tenantId);
  }),

  createSession: protectedProcedure.input(z.object({ title: z.string().optional() })).mutation(async ({ ctx, input }) => {
    const tenantId = ctx.user.tenantId ?? 1;
    const result = await createAiChatSession(ctx.user.id, tenantId, input.title);
    return result;
  }),

  getMessages: protectedProcedure.input(z.object({ sessionId: z.number() })).query(async ({ ctx, input }) => {
    const tenantId = ctx.user.tenantId ?? 1;
    return getAiChatMessages(input.sessionId, tenantId);
  }),

  sendMessage: protectedProcedure.input(z.object({
    sessionId: z.number(),
    message: z.string().min(1),
  })).mutation(async ({ ctx, input }) => {
    const tenantId = ctx.user.tenantId ?? 1;

    // Guardar mensaje del usuario
    await addAiChatMessage({ sessionId: input.sessionId, tenantId, role: "user", content: input.message });

    // Obtener historial de mensajes
    const history = await getAiChatMessages(input.sessionId, tenantId);
    const messages = [
      {
        role: "system" as const,
        content: `Eres HOROS AI, el asistente inteligente de la plataforma HOROS de gestión de pólizas y servicios técnicos de seguridad electrónica. 
        Ayudas a los usuarios con consultas sobre:
        - Pólizas de mantenimiento y sus coberturas, servicios, reglas SLA y exclusiones
        - Gestión de tickets y estados operativos/contractuales
        - Inventario técnico de activos (cámaras, NVR/DVR, control de acceso, alarmas, sensores)
        - Análisis CAPEX/OPEX y vida útil de activos
        - Planes de mantenimiento preventivo y correctivo
        - Cumplimiento de SLA y alertas operacionales
        - Procedimientos técnicos de instalación y mantenimiento
        Responde siempre en español, de forma precisa, profesional y concisa.`,
      },
      ...history.slice(-10).map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
    ];

    const response = await invokeLLM({ messages });
    const rawContent = response.choices[0]?.message?.content;
    const assistantMessage = typeof rawContent === "string" ? rawContent : (rawContent ? JSON.stringify(rawContent) : "No pude generar una respuesta. Por favor intenta de nuevo.");

    // Guardar respuesta del asistente
    await addAiChatMessage({ sessionId: input.sessionId, tenantId, role: "assistant", content: assistantMessage });

    return { message: assistantMessage };
  }),
});
