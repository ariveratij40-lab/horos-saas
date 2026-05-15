import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { tenantsRouter, branchesRouter } from "./routers/tenants";
import { policiesRouter } from "./routers/policies";
import { ticketsRouter } from "./routers/tickets";
import { assetsRouter } from "./routers/assets";
import { maintenanceRouter } from "./routers/maintenance";
import { dashboardRouter, auditRouter, aiAssistantRouter } from "./routers/dashboard";
import { slaRouter } from "./routers/sla";
import { getAllUsers } from "./db";
import { protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  dashboard: dashboardRouter,
  tenants: tenantsRouter,
  branches: branchesRouter,
  policies: policiesRouter,
  tickets: ticketsRouter,
  assets: assetsRouter,
  maintenance: maintenanceRouter,
  sla: slaRouter,
  audit: auditRouter,
  ai: aiAssistantRouter,

  users: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (!["admin", "supervisor"].includes(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN" });
      const tenantId = ctx.user.tenantId ?? undefined;
      return getAllUsers(tenantId);
    }),

    updateRole: protectedProcedure.input(z.object({
      userId: z.number(),
      role: z.enum(["admin", "supervisor", "technician", "client", "user"]),
    })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
