import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import {
  resolveCanonicalTenantForSubject,
} from "../db.pg";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

/**
 * PostgreSQL canonical tenant boundary.
 *
 * This middleware is deliberately separate from protectedProcedure.
 * Legacy MySQL routers continue using the authenticated legacy user
 * without acquiring or assuming a PostgreSQL tenant.
 *
 * PostgreSQL routers must use pgProtectedProcedure so canonical
 * identity resolution is fail-closed before tenant-owned data access.
 */
const requirePgTenant = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: UNAUTHED_ERR_MSG,
    });
  }

  try {
    const pgTenant =
      await resolveCanonicalTenantForSubject(
        ctx.user.openId,
      );

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
        pgTenant,
      },
    });
  } catch {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "No active canonical tenant membership is available",
    });
  }
});

export const pgProtectedProcedure =
  t.procedure.use(requirePgTenant);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
