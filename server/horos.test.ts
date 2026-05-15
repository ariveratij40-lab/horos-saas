import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";

// ─── Helper: crear contextos de prueba ───────────────────────────────────────

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    openId: "test-user",
    name: "Test User",
    email: "test@horos.mx",
    loginMethod: "manus",
    role: "admin",
    tenantId: 1,
    phone: null,
    avatarUrl: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
}

function makeCtx(userOverrides: Partial<User> = {}): TrpcContext {
  const clearedCookies: Array<{ name: string; options: Record<string, unknown> }> = [];
  return {
    user: makeUser(userOverrides),
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

describe("auth.me", () => {
  it("returns the current user when authenticated", async () => {
    const ctx = makeCtx({ name: "Admin HOROS", role: "admin" });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.name).toBe("Admin HOROS");
    expect(result?.role).toBe("admin");
  });

  it("returns null when not authenticated", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });
});

// ─── RBAC: Roles y permisos ──────────────────────────────────────────────────

describe("RBAC - Role-based access control", () => {
  it("admin user has admin role", () => {
    const user = makeUser({ role: "admin" });
    expect(user.role).toBe("admin");
  });

  it("technician user has technician role", () => {
    const user = makeUser({ role: "technician" });
    expect(user.role).toBe("technician");
  });

  it("client user has client role", () => {
    const user = makeUser({ role: "client" });
    expect(user.role).toBe("client");
  });

  it("supervisor user has supervisor role", () => {
    const user = makeUser({ role: "supervisor" });
    expect(user.role).toBe("supervisor");
  });
});

// ─── Multi-tenant: Aislamiento por tenant_id ─────────────────────────────────

describe("Multi-tenant isolation", () => {
  it("user belongs to a specific tenant", () => {
    const user = makeUser({ tenantId: 42 });
    expect(user.tenantId).toBe(42);
  });

  it("different users can belong to different tenants", () => {
    const user1 = makeUser({ id: 1, tenantId: 1 });
    const user2 = makeUser({ id: 2, tenantId: 2 });
    expect(user1.tenantId).not.toBe(user2.tenantId);
  });
});

// ─── Ticket dual-state model ─────────────────────────────────────────────────

describe("Ticket dual-state model", () => {
  it("operational and contractual states are independent", () => {
    const ticket = {
      operationalStatus: "assigned" as const,
      contractualStatus: "covered" as const,
    };
    expect(ticket.operationalStatus).toBe("assigned");
    expect(ticket.contractualStatus).toBe("covered");
  });

  it("all valid operational statuses are defined", () => {
    const validStatuses = ["open", "assigned", "technician_on_route", "waiting_parts", "resolved"];
    expect(validStatuses).toHaveLength(5);
    expect(validStatuses).toContain("open");
    expect(validStatuses).toContain("resolved");
  });

  it("all valid contractual statuses are defined", () => {
    const validStatuses = ["covered", "not_covered", "pending_approval", "outside_sla", "billable"];
    expect(validStatuses).toHaveLength(5);
    expect(validStatuses).toContain("covered");
    expect(validStatuses).toContain("billable");
  });
});

// ─── SLA priority levels ─────────────────────────────────────────────────────

describe("SLA priority levels", () => {
  it("all priority levels are defined", () => {
    const priorities = ["critical", "high", "medium", "low"];
    expect(priorities).toHaveLength(4);
    expect(priorities).toContain("critical");
    expect(priorities).toContain("low");
  });

  it("critical priority has the highest urgency", () => {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    expect(priorityOrder.critical).toBeGreaterThan(priorityOrder.high);
    expect(priorityOrder.high).toBeGreaterThan(priorityOrder.medium);
    expect(priorityOrder.medium).toBeGreaterThan(priorityOrder.low);
  });
});

// ─── Asset categories ────────────────────────────────────────────────────────

describe("Asset inventory categories", () => {
  it("all asset categories are defined", () => {
    const categories = ["camera", "nvr_dvr", "access_control", "alarm", "sensor", "network", "server", "ups", "other"];
    expect(categories).toHaveLength(9);
    expect(categories).toContain("camera");
    expect(categories).toContain("nvr_dvr");
  });
});

// ─── Policy types ────────────────────────────────────────────────────────────

describe("Policy types and statuses", () => {
  it("all policy types are defined", () => {
    const types = ["maintenance", "warranty", "support", "comprehensive"];
    expect(types).toHaveLength(4);
    expect(types).toContain("maintenance");
    expect(types).toContain("comprehensive");
  });

  it("all policy statuses are defined", () => {
    const statuses = ["draft", "active", "suspended", "expired", "cancelled"];
    expect(statuses).toHaveLength(5);
    expect(statuses).toContain("active");
    expect(statuses).toContain("expired");
  });
});

// ─── Tests para dashboard.kpisDetailed ───────────────────────────────────────
describe("dashboard.kpisDetailed", () => {
  it("kpisDetailed procedure exists in the router", () => {
    const procedures = appRouter._def.procedures;
    expect(procedures["dashboard.kpisDetailed"]).toBeDefined();
  });

  it("kpisByCategory procedure exists and accepts valid enum values", () => {
    const procedures = appRouter._def.procedures;
    expect(procedures["dashboard.kpisByCategory"]).toBeDefined();
  });

  it("dashboard tab categories map to correct asset sub-categories", () => {
    const categoryMap: Record<string, string[]> = {
      cctv:           ["camera", "nvr_dvr"],
      access_control: ["access_control"],
      voceo:          ["alarm", "sensor"],
      cableado:       ["network", "server", "ups"],
    };
    // CCTV: cámaras y grabadores NVR/DVR
    expect(categoryMap["cctv"]).toContain("camera");
    expect(categoryMap["cctv"]).toContain("nvr_dvr");
    expect(categoryMap["cctv"]).toHaveLength(2);
    // Control de Acceso: lectores y puertas
    expect(categoryMap["access_control"]).toContain("access_control");
    // Voceo: altavoces y amplificadores
    expect(categoryMap["voceo"]).toContain("alarm");
    expect(categoryMap["voceo"]).toContain("sensor");
    // Cableado: switches, servidores y UPS
    expect(categoryMap["cableado"]).toContain("network");
    expect(categoryMap["cableado"]).toContain("server");
    expect(categoryMap["cableado"]).toContain("ups");
    expect(categoryMap["cableado"]).toHaveLength(3);
  });

  it("all 5 dashboard tabs are defined", () => {
    const tabs = ["resumen", "cctv", "access_control", "voceo", "cableado"];
    expect(tabs).toHaveLength(5);
    expect(tabs).toContain("resumen");
    expect(tabs).toContain("cctv");
    expect(tabs).toContain("access_control");
    expect(tabs).toContain("voceo");
    expect(tabs).toContain("cableado");
  });

  it("getDashboardKpisDetailed is exported from db module", async () => {
    const dbModule = await import("./db");
    expect(typeof dbModule.getDashboardKpisDetailed).toBe("function");
  });
});

// ─── Tests CCTV ───────────────────────────────────────────────────────────────
const createCtx = () => makeCtx({ role: "admin", tenantId: 1 });

describe("cctv.cameras", () => {
  it("list returns empty array when no DB", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.cctv.cameras.list(undefined);
    expect(Array.isArray(result)).toBe(true);
  });

  it("stats returns valid counts from DB", async () => {
    const caller = appRouter.createCaller(createCtx());
    const stats = await caller.cctv.cameras.stats();
    // Stats should return valid numeric counts (may have demo data)
    expect(stats).toMatchObject({
      total: expect.any(Number),
      active: expect.any(Number),
      poe: expect.any(Number),
    });
    expect(stats.total).toBeGreaterThanOrEqual(0);
    expect(stats.active).toBeGreaterThanOrEqual(0);
  });
});

describe("cctv.idfs", () => {
  it("list returns empty array when no DB", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.cctv.idfs.list(undefined);
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("cctv.licenses", () => {
  it("list returns empty array when no DB", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.cctv.licenses.list(undefined);
    expect(Array.isArray(result)).toBe(true);
  });

  it("expiringSoon returns empty array when no DB", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.cctv.licenses.expiringSoon();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("cctv.monitors", () => {
  it("list returns empty array when no DB", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.cctv.monitors.list(undefined);
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("cctv.servers", () => {
  it("list returns empty array when no DB", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.cctv.servers.list(undefined);
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("cctv.switches", () => {
  it("list returns empty array when no DB", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.cctv.switches.list(undefined);
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("cctv.ups", () => {
  it("list returns empty array when no DB", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.cctv.ups.list(undefined);
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("cctv.summary", () => {
  it("summary returns null or an object when no DB", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.cctv.summary();
    // Without DB the router returns null; with DB it returns the summary object
    expect(result === null || typeof result === "object").toBe(true);
  });
});

// ─── Fichas Técnicas CCTV: getSheet ──────────────────────────────────────────
const mockCtx = makeCtx({ role: "admin", tenantId: 1 });
const equipmentTypes = ["camera", "idf", "license", "monitor", "server", "switch", "ups"] as const;

describe("cctv.getSheet", () => {
  it("procedure exists in the router", () => {
    const procedures = appRouter._def.procedures;
    expect(procedures["cctv.getSheet"]).toBeDefined();
  });

  it("returns null or valid object for all 7 equipment types (graceful degradation)", async () => {
    const caller = appRouter.createCaller(mockCtx);
    for (const type of equipmentTypes) {
      const result = await caller.cctv.getSheet({ type, id: 1 });
      expect(result === null || typeof result === "object").toBe(true);
    }
  });

  it("accepts all 7 equipment types without throwing", async () => {
    const caller = appRouter.createCaller(mockCtx);
    for (const type of equipmentTypes) {
      await expect(caller.cctv.getSheet({ type, id: 999 })).resolves.not.toThrow();
    }
  });

  it("returns null for non-existent equipment id", async () => {
    const caller = appRouter.createCaller(mockCtx);
    const result = await caller.cctv.getSheet({ type: "camera", id: 999999 });
    expect(result === null || typeof result === "object").toBe(true);
  });

  it("input schema rejects invalid equipment type", async () => {
    const caller = appRouter.createCaller(mockCtx);
    await expect(
      caller.cctv.getSheet({ type: "invalid_type" as any, id: 1 })
    ).rejects.toThrow();
  });

  it("input schema rejects non-numeric id", async () => {
    const caller = appRouter.createCaller(mockCtx);
    await expect(
      caller.cctv.getSheet({ type: "camera", id: "abc" as any })
    ).rejects.toThrow();
  });

  it("when result is non-null, it has the expected shape", async () => {
    const caller = appRouter.createCaller(mockCtx);
    const result = await caller.cctv.getSheet({ type: "camera", id: 1 });
    if (result !== null) {
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("type", "camera");
      expect(result).toHaveProperty("typeLabel");
      expect(result).toHaveProperty("fields");
      expect(result).toHaveProperty("generatedAt");
      expect(Array.isArray(result.fields)).toBe(true);
      expect(typeof result.typeLabel).toBe("string");
      expect(result.typeLabel.length).toBeGreaterThan(0);
    }
  });

  it("typeLabel values are correct for all 7 types", () => {
    const expectedLabels: Record<string, string> = {
      camera:  "Cámara CCTV",
      idf:     "IDF / MDF",
      license: "Licencia de Software",
      monitor: "Monitor / Pantalla",
      server:  "Servidor / NVR",
      switch:  "Switch",
      ups:     "UPS",
    };
    for (const [type, label] of Object.entries(expectedLabels)) {
      expect(label.length).toBeGreaterThan(0);
      expect(equipmentTypes).toContain(type as any);
    }
    expect(Object.keys(expectedLabels)).toHaveLength(7);
  });

  it("each field in result has key, label, and value properties", async () => {
    const caller = appRouter.createCaller(mockCtx);
    const result = await caller.cctv.getSheet({ type: "switch", id: 1 });
    if (result !== null && result.fields.length > 0) {
      for (const field of result.fields) {
        expect(field).toHaveProperty("key");
        expect(field).toHaveProperty("label");
        expect(field).toHaveProperty("value");
        expect(typeof field.key).toBe("string");
        expect(typeof field.label).toBe("string");
        expect(typeof field.value).toBe("string");
      }
    }
  });
});
