import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { tenantsRouter, branchesRouter } from "./routers/tenants";
import { policiesRouter } from "./routers/policies";
import { ticketsRouter } from "./routers/tickets";
import { ticketWorkflowRouter } from "./routers/ticketWorkflow";
import { serviceRequestsRouter } from "./routers/serviceRequests";
import { serviceRequestContextRouter } from "./routers/serviceRequestContext";
import { assetsRouter } from "./routers/assets";
import { maintenanceRouter } from "./routers/maintenance";
import { dashboardRouter, auditRouter, aiAssistantRouter } from "./routers/dashboard";
import { slaRouter } from "./routers/sla";
import { cctvRouter } from "./routers/cctv";
import { cctvImportRouter } from "./routers/cctvImport";
import { rfidRouter } from "./routers/rfid";
import { cctvMaintenanceRouter } from "./routers/cctvMaintenance";
import { cctvMaintenanceProgramsRouter } from "./routers/cctvMaintenancePrograms";
import { floorPlansRouter, floorPlanLayersRouter, floorPlanAnnotationsRouter, floorPlanVersionsRouter, floorPlanSharesRouter } from "./routers/floorPlans";
import { acReadersRouter, acControllersRouter, acDoorsRouter, acMaintenanceRouter, acProgramsRouter, acStatsRouter } from "./routers/accessControl";
import { cabledSwitchesRouter, cabledPatchPanelsRouter, cabledOutletsRouter, cabledDuctsRouter, cabledMaintenanceRouter, cabledProgramsRouter, cabledStatsRouter } from "./routers/structuredCabling";
import { pagingAmplifiersRouter, pagingSpeakersRouter, pagingConsolesRouter, pagingPowerRouter, pagingMaintenanceRouter, pagingProgramsRouter, pagingStatsRouter } from "./routers/pagingSystem";
import { getAllUsers } from "./db";
import { protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { sdk } from "./_core/sdk";
import { ONE_YEAR_MS, COOKIE_NAME } from "@shared/const";
import { sendPasswordResetEmail } from "./_core/mailer";
import { passwordResetTokens } from "../drizzle/schema";
import { and, lt, isNull, gt } from "drizzle-orm";
import crypto from "crypto";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    // ── LOCAL AUTH (email + password, for self-hosted VPS) ─────────────────
    localLogin: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(6),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        // Find user by email
        const [user] = await db.select().from(users)
          .where(eq(users.email, input.email))
          .limit(1);

        if (!user || !user.passwordHash) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Email o contraseña incorrectos" });
        }

        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Email o contraseña incorrectos" });
        }

        const token = await sdk.signSession({
          openId: user.openId,
          appId: "local",
          name: user.name ?? user.email ?? "",
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });

        return { success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
      }),

    localRegister: publicProcedure
      .input(z.object({
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(6),
        registerKey: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        const [existing] = await db.select({ id: users.id }).from(users)
          .where(eq(users.email, input.email))
          .limit(1);

        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "Este email ya está registrado" });
        }

        const passwordHash = await bcrypt.hash(input.password, 12);
        const openId = `local_${Date.now()}_${Math.random().toString(36).slice(2)}`;

        const allUsers = await db.select({ id: users.id }).from(users).limit(1);
        const isFirstUser = allUsers.length === 0;

        await db.insert(users).values({
          openId,
          name: input.name,
          email: input.email,
          passwordHash,
          authProvider: "local",
          loginMethod: "local",
          role: isFirstUser ? "admin" : "user",
          tenantId: 1,
          isActive: true,
          lastSignedIn: new Date(),
        });

        const [newUser] = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
        if (!newUser) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const token = await sdk.signSession({
          openId: newUser.openId,
          appId: "local",
          name: newUser.name ?? newUser.email ?? "",
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });

        return { success: true, user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role } };
      }),

    requestPasswordReset: publicProcedure
      .input(z.object({
        email: z.string().email(),
        origin: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const [user] = await db.select().from(users)
          .where(and(eq(users.email, input.email), eq(users.authProvider, "local")))
          .limit(1);

        if (user) {
          await db.update(passwordResetTokens)
            .set({ usedAt: new Date() })
            .where(and(
              eq(passwordResetTokens.userId, user.id),
              isNull(passwordResetTokens.usedAt)
            ));

          const token = crypto.randomBytes(48).toString("hex");
          const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

          await db.insert(passwordResetTokens).values({
            userId: user.id,
            token,
            expiresAt,
          });

          const origin = input.origin ?? "http://localhost:3000";
          const resetUrl = `${origin}/reset-password?token=${token}`;

          await sendPasswordResetEmail({
            to: user.email!,
            name: user.name,
            resetUrl,
          });
        }

        return { success: true };
      }),

    confirmPasswordReset: publicProcedure
      .input(z.object({
        token: z.string().min(10),
        newPassword: z.string().min(6),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const now = new Date();

        const [resetToken] = await db.select().from(passwordResetTokens)
          .where(and(
            eq(passwordResetTokens.token, input.token),
            isNull(passwordResetTokens.usedAt),
            gt(passwordResetTokens.expiresAt, now)
          ))
          .limit(1);

        if (!resetToken) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "El enlace de restablecimiento es inválido o ha expirado",
          });
        }

        const passwordHash = await bcrypt.hash(input.newPassword, 12);

        await db.update(users)
          .set({ passwordHash, updatedAt: now })
          .where(eq(users.id, resetToken.userId));

        await db.update(passwordResetTokens)
          .set({ usedAt: now })
          .where(eq(passwordResetTokens.id, resetToken.id));

        return { success: true };
      }),
  }),

  dashboard: dashboardRouter,
  tenants: tenantsRouter,
  branches: branchesRouter,
  policies: policiesRouter,
  tickets: ticketsRouter,
  ticketWorkflow: ticketWorkflowRouter,
  serviceRequests: serviceRequestsRouter,
  serviceRequestContext: serviceRequestContextRouter,
  assets: assetsRouter,
  maintenance: maintenanceRouter,
  sla: slaRouter,
  cctv: cctvRouter,
  cctvImport: cctvImportRouter,
  rfid: rfidRouter,
  cctvMaintenance: cctvMaintenanceRouter,
  cctvPrograms: cctvMaintenanceProgramsRouter,
  floorPlans: floorPlansRouter,
  floorPlanLayers: floorPlanLayersRouter,
  floorPlanAnnotations: floorPlanAnnotationsRouter,
  floorPlanVersions: floorPlanVersionsRouter,
  floorPlanShares: floorPlanSharesRouter,
  audit: auditRouter,
  ai: aiAssistantRouter,

  acReaders: acReadersRouter,
  acControllers: acControllersRouter,
  acDoors: acDoorsRouter,
  acMaintenance: acMaintenanceRouter,
  acPrograms: acProgramsRouter,
  acStats: acStatsRouter,

  cabledSwitches: cabledSwitchesRouter,
  cabledPatchPanels: cabledPatchPanelsRouter,
  cabledOutlets: cabledOutletsRouter,
  cabledDucts: cabledDuctsRouter,
  cabledMaintenance: cabledMaintenanceRouter,
  cabledPrograms: cabledProgramsRouter,
  cabledStats: cabledStatsRouter,

  pagingAmplifiers: pagingAmplifiersRouter,
  pagingSpeakers: pagingSpeakersRouter,
  pagingConsoles: pagingConsolesRouter,
  pagingPower: pagingPowerRouter,
  pagingMaintenance: pagingMaintenanceRouter,
  pagingPrograms: pagingProgramsRouter,
  pagingStats: pagingStatsRouter,

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
