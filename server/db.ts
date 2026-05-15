import { eq, and, desc, sql, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  tenants, InsertTenant,
  branches, InsertBranch,
  policies, InsertPolicy,
  policyCoverages, policyServices, policySlaRules, policyExclusions, policyOperationalRules,
  tickets, InsertTicket,
  ticketComments, ticketHistory,
  assets, InsertAsset,
  slaMonitoring,
  maintenancePlans, InsertMaintenancePlan,
  maintenanceTasks,
  auditLogs, InsertAuditLog,
  aiChatSessions, aiChatMessages,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── USERS ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    textFields.forEach((field) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    });
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    // Assign default tenantId=1 for all users who don't have one
    if (!values.tenantId) { values.tenantId = 1; updateSet.tenantId = 1; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers(tenantId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (tenantId) return db.select().from(users).where(eq(users.tenantId, tenantId)).orderBy(desc(users.createdAt));
  return db.select().from(users).orderBy(desc(users.createdAt));
}

// ─── TENANTS ─────────────────────────────────────────────────────────────────
export async function getAllTenants() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tenants).orderBy(desc(tenants.createdAt));
}

export async function getTenantById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  return result[0];
}

export async function createTenant(data: InsertTenant) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(tenants).values(data);
  return result;
}

export async function updateTenant(id: number, data: Partial<InsertTenant>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.update(tenants).set(data).where(eq(tenants.id, id));
}

// ─── BRANCHES ────────────────────────────────────────────────────────────────
export async function getBranchesByTenant(tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(branches).where(and(eq(branches.tenantId, tenantId), eq(branches.isActive, true))).orderBy(branches.name);
}

export async function getBranchById(id: number, tenantId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(branches).where(and(eq(branches.id, id), eq(branches.tenantId, tenantId))).limit(1);
  return result[0];
}

export async function createBranch(data: InsertBranch) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(branches).values(data);
}

export async function updateBranch(id: number, tenantId: number, data: Partial<InsertBranch>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.update(branches).set(data).where(and(eq(branches.id, id), eq(branches.tenantId, tenantId)));
}

// ─── POLICIES ────────────────────────────────────────────────────────────────
export async function getPoliciesByTenant(tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(policies).where(eq(policies.tenantId, tenantId)).orderBy(desc(policies.createdAt));
}

export async function getPolicyById(id: number, tenantId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(policies).where(and(eq(policies.id, id), eq(policies.tenantId, tenantId))).limit(1);
  return result[0];
}

export async function createPolicy(data: InsertPolicy) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(policies).values(data);
}

export async function updatePolicy(id: number, tenantId: number, data: Partial<InsertPolicy>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.update(policies).set(data).where(and(eq(policies.id, id), eq(policies.tenantId, tenantId)));
}

export async function getPolicyCoverages(policyId: number, tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(policyCoverages).where(and(eq(policyCoverages.policyId, policyId), eq(policyCoverages.tenantId, tenantId)));
}

export async function getPolicySlaRules(policyId: number, tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(policySlaRules).where(and(eq(policySlaRules.policyId, policyId), eq(policySlaRules.tenantId, tenantId)));
}

export async function getPolicyServices(policyId: number, tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(policyServices).where(and(eq(policyServices.policyId, policyId), eq(policyServices.tenantId, tenantId)));
}

export async function getPolicyExclusions(policyId: number, tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(policyExclusions).where(and(eq(policyExclusions.policyId, policyId), eq(policyExclusions.tenantId, tenantId)));
}

export async function getPolicyOperationalRules(policyId: number, tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(policyOperationalRules).where(and(eq(policyOperationalRules.policyId, policyId), eq(policyOperationalRules.tenantId, tenantId)));
}

// ─── TICKETS ─────────────────────────────────────────────────────────────────
export async function getTicketsByTenant(tenantId: number, filters?: { operationalStatus?: string; contractualStatus?: string; priority?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(tickets.tenantId, tenantId)];
  if (filters?.operationalStatus) conditions.push(eq(tickets.operationalStatus, filters.operationalStatus as any));
  if (filters?.contractualStatus) conditions.push(eq(tickets.contractualStatus, filters.contractualStatus as any));
  if (filters?.priority) conditions.push(eq(tickets.priority, filters.priority as any));
  return db.select().from(tickets).where(and(...conditions)).orderBy(desc(tickets.createdAt));
}

export async function getTicketById(id: number, tenantId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tickets).where(and(eq(tickets.id, id), eq(tickets.tenantId, tenantId))).limit(1);
  return result[0];
}

export async function createTicket(data: InsertTicket) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(tickets).values(data);
  // result[0].insertId contains the auto-increment ID in MySQL/TiDB
  const insertId = (result as any)?.[0]?.insertId ?? null;
  return { id: insertId as number | null };
}

export async function updateTicket(id: number, tenantId: number, data: Partial<InsertTicket>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.update(tickets).set(data).where(and(eq(tickets.id, id), eq(tickets.tenantId, tenantId)));
}

export async function getTicketComments(ticketId: number, tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(ticketComments).where(and(eq(ticketComments.ticketId, ticketId), eq(ticketComments.tenantId, tenantId))).orderBy(ticketComments.createdAt);
}

export async function addTicketComment(data: { ticketId: number; tenantId: number; userId: number; comment: string; isInternal?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(ticketComments).values(data);
}

export async function getTicketHistory(ticketId: number, tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(ticketHistory).where(and(eq(ticketHistory.ticketId, ticketId), eq(ticketHistory.tenantId, tenantId))).orderBy(desc(ticketHistory.createdAt));
}

// ─── ASSETS ──────────────────────────────────────────────────────────────────
export async function getAssetsByTenant(tenantId: number, filters?: { status?: string; criticality?: string; category?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(assets.tenantId, tenantId)];
  if (filters?.status) conditions.push(eq(assets.status, filters.status as any));
  if (filters?.criticality) conditions.push(eq(assets.criticality, filters.criticality as any));
  if (filters?.category) conditions.push(eq(assets.category, filters.category as any));
  return db.select().from(assets).where(and(...conditions)).orderBy(desc(assets.createdAt));
}

export async function getAssetById(id: number, tenantId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(assets).where(and(eq(assets.id, id), eq(assets.tenantId, tenantId))).limit(1);
  return result[0];
}

export async function createAsset(data: InsertAsset) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(assets).values(data);
}

export async function updateAsset(id: number, tenantId: number, data: Partial<InsertAsset>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.update(assets).set(data).where(and(eq(assets.id, id), eq(assets.tenantId, tenantId)));
}

// ─── SLA MONITORING ───────────────────────────────────────────────────────────
export async function getSlaMonitoringByTenant(tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(slaMonitoring).where(eq(slaMonitoring.tenantId, tenantId)).orderBy(desc(slaMonitoring.createdAt));
}

// ─── MAINTENANCE ─────────────────────────────────────────────────────────────
export async function getMaintenancePlansByTenant(tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(maintenancePlans).where(eq(maintenancePlans.tenantId, tenantId)).orderBy(desc(maintenancePlans.createdAt));
}

export async function getMaintenancePlanById(id: number, tenantId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(maintenancePlans).where(and(eq(maintenancePlans.id, id), eq(maintenancePlans.tenantId, tenantId))).limit(1);
  return result[0];
}

export async function createMaintenancePlan(data: InsertMaintenancePlan) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(maintenancePlans).values(data);
}

export async function updateMaintenancePlan(id: number, tenantId: number, data: Partial<InsertMaintenancePlan>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.update(maintenancePlans).set(data).where(and(eq(maintenancePlans.id, id), eq(maintenancePlans.tenantId, tenantId)));
}

export async function getMaintenanceTasksByPlan(planId: number, tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(maintenanceTasks).where(and(eq(maintenanceTasks.planId, planId), eq(maintenanceTasks.tenantId, tenantId))).orderBy(maintenanceTasks.scheduledDate);
}

export async function getMaintenanceTasksByTenant(tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(maintenanceTasks).where(eq(maintenanceTasks.tenantId, tenantId)).orderBy(maintenanceTasks.scheduledDate);
}

// ─── AUDIT LOGS ───────────────────────────────────────────────────────────────
export async function createAuditLog(data: InsertAuditLog) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(auditLogs).values(data);
  } catch (e) {
    console.warn("[Audit] Failed to log:", e);
  }
}

export async function getAuditLogs(tenantId: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditLogs).where(eq(auditLogs.tenantId, tenantId)).orderBy(desc(auditLogs.createdAt)).limit(limit);
}

// ─── AI CHAT ─────────────────────────────────────────────────────────────────
export async function getAiChatSessions(userId: number, tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(aiChatSessions).where(and(eq(aiChatSessions.userId, userId), eq(aiChatSessions.tenantId, tenantId))).orderBy(desc(aiChatSessions.updatedAt));
}

export async function createAiChatSession(userId: number, tenantId: number, title?: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(aiChatSessions).values({ userId, tenantId, title: title || "Nueva conversación" });
  const insertId = (result as any)[0]?.insertId ?? (result as any).insertId;
  const rows = await db.select().from(aiChatSessions).where(eq(aiChatSessions.id, insertId)).limit(1);
  return rows[0]!;
}

export async function getAiChatMessages(sessionId: number, tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(aiChatMessages).where(and(eq(aiChatMessages.sessionId, sessionId), eq(aiChatMessages.tenantId, tenantId))).orderBy(aiChatMessages.createdAt);
}

export async function addAiChatMessage(data: { sessionId: number; tenantId: number; role: "user" | "assistant" | "system"; content: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(aiChatMessages).values(data);
}

// ─── DASHBOARD KPIs ───────────────────────────────────────────────────────────
export async function getDashboardKpis(tenantId: number) {
  const db = await getDb();
  if (!db) return null;

  const [activePolicies] = await db.select({ count: sql<number>`count(*)` }).from(policies).where(and(eq(policies.tenantId, tenantId), eq(policies.status, "active")));
  const [openTickets] = await db.select({ count: sql<number>`count(*)` }).from(tickets).where(and(eq(tickets.tenantId, tenantId), or(eq(tickets.operationalStatus, "open"), eq(tickets.operationalStatus, "assigned"))));
  const [slaAtRisk] = await db.select({ count: sql<number>`count(*)` }).from(slaMonitoring).where(and(eq(slaMonitoring.tenantId, tenantId), eq(slaMonitoring.resolutionBreached, true)));
  const [criticalAssets] = await db.select({ count: sql<number>`count(*)` }).from(assets).where(and(eq(assets.tenantId, tenantId), eq(assets.criticality, "critical"), eq(assets.status, "active")));
  const [totalAssets] = await db.select({ count: sql<number>`count(*)` }).from(assets).where(eq(assets.tenantId, tenantId));
  const [pendingMaintenance] = await db.select({ count: sql<number>`count(*)` }).from(maintenanceTasks).where(and(eq(maintenanceTasks.tenantId, tenantId), eq(maintenanceTasks.status, "pending")));
  const [resolvedTickets] = await db.select({ count: sql<number>`count(*)` }).from(tickets).where(and(eq(tickets.tenantId, tenantId), eq(tickets.operationalStatus, "resolved")));
  const [totalBranches] = await db.select({ count: sql<number>`count(*)` }).from(branches).where(and(eq(branches.tenantId, tenantId), eq(branches.isActive, true)));

  return {
    activePolicies: Number(activePolicies?.count ?? 0),
    openTickets: Number(openTickets?.count ?? 0),
    slaAtRisk: Number(slaAtRisk?.count ?? 0),
    criticalAssets: Number(criticalAssets?.count ?? 0),
    totalAssets: Number(totalAssets?.count ?? 0),
    pendingMaintenance: Number(pendingMaintenance?.count ?? 0),
    resolvedTickets: Number(resolvedTickets?.count ?? 0),
    totalBranches: Number(totalBranches?.count ?? 0),
  };
}

// ─── DASHBOARD KPIs POR CATEGORÍA ────────────────────────────────────────────
export async function getDashboardKpisByCategory(tenantId: number, category: string) {
  const db = await getDb();
  if (!db) return null;

  // Mapeo de categorías de UI a categorías de activos en la base de datos
  const categoryMap: Record<string, string[]> = {
    cctv:             ["camera", "nvr_dvr"],
    access_control:   ["access_control"],
    voceo:            ["alarm", "sensor"],
    cableado:         ["network", "server", "ups"],
  };

  const assetCategories = categoryMap[category] ?? [];

  // Activos totales de la categoría
  const totalAssetsRows = await Promise.all(
    assetCategories.map((cat) =>
      db.select({ count: sql<number>`count(*)` })
        .from(assets)
        .where(and(eq(assets.tenantId, tenantId), eq(assets.category, cat as any)))
    )
  );
  const totalAssets = totalAssetsRows.reduce((acc, rows) => acc + Number(rows[0]?.count ?? 0), 0);

  // Activos activos de la categoría
  const activeAssetsRows = await Promise.all(
    assetCategories.map((cat) =>
      db.select({ count: sql<number>`count(*)` })
        .from(assets)
        .where(and(eq(assets.tenantId, tenantId), eq(assets.category, cat as any), eq(assets.status, "active")))
    )
  );
  const activeAssets = activeAssetsRows.reduce((acc, rows) => acc + Number(rows[0]?.count ?? 0), 0);

  // Activos críticos de la categoría
  const criticalAssetsRows = await Promise.all(
    assetCategories.map((cat) =>
      db.select({ count: sql<number>`count(*)` })
        .from(assets)
        .where(and(eq(assets.tenantId, tenantId), eq(assets.category, cat as any), eq(assets.criticality, "critical"), eq(assets.status, "active")))
    )
  );
  const criticalAssets = criticalAssetsRows.reduce((acc, rows) => acc + Number(rows[0]?.count ?? 0), 0);

  // Activos en mantenimiento
  const maintenanceAssetsRows = await Promise.all(
    assetCategories.map((cat) =>
      db.select({ count: sql<number>`count(*)` })
        .from(assets)
        .where(and(eq(assets.tenantId, tenantId), eq(assets.category, cat as any), eq(assets.status, "maintenance")))
    )
  );
  const maintenanceAssets = maintenanceAssetsRows.reduce((acc, rows) => acc + Number(rows[0]?.count ?? 0), 0);

  // Activos obsoletos
  const obsoleteAssetsRows = await Promise.all(
    assetCategories.map((cat) =>
      db.select({ count: sql<number>`count(*)` })
        .from(assets)
        .where(and(eq(assets.tenantId, tenantId), eq(assets.category, cat as any), eq(assets.status, "obsolete")))
    )
  );
  const obsoleteAssets = obsoleteAssetsRows.reduce((acc, rows) => acc + Number(rows[0]?.count ?? 0), 0);

  // Tickets abiertos relacionados con activos de la categoría (via category en el asset)
  // Se obtienen todos los tickets del tenant y se filtra por activos de la categoría
  const assetIdsRows = await Promise.all(
    assetCategories.map((cat) =>
      db.select({ id: assets.id })
        .from(assets)
        .where(and(eq(assets.tenantId, tenantId), eq(assets.category, cat as any)))
    )
  );
  const assetIds = assetIdsRows.flat().map((r) => r.id);

  let openTickets = 0;
  let resolvedTickets = 0;
  let outsideSla = 0;

  if (assetIds.length > 0) {
    const ticketRows = await db.select().from(tickets)
      .where(and(eq(tickets.tenantId, tenantId), sql`${tickets.assetId} IN (${sql.join(assetIds.map((id) => sql`${id}`), sql`, `)})`));
    openTickets = ticketRows.filter((t) => t.operationalStatus !== "resolved").length;
    resolvedTickets = ticketRows.filter((t) => t.operationalStatus === "resolved").length;
    outsideSla = ticketRows.filter((t) => t.contractualStatus === "outside_sla").length;
  }

  return {
    totalAssets,
    activeAssets,
    criticalAssets,
    maintenanceAssets,
    obsoleteAssets,
    openTickets,
    resolvedTickets,
    outsideSla,
  };
}

// ─── DASHBOARD KPIs DETALLADOS POR SUB-CATEGORÍA ─────────────────────────────
export async function getDashboardKpisDetailed(tenantId: number) {
  const db = await getDb();
  if (!db) return null;

  const safeDb = db!;

  // Helper: contar activos por categoría y estado
  async function countAssets(category: string, status?: string, criticality?: string) {
    const conditions = [eq(assets.tenantId, tenantId), eq(assets.category, category as any)];
    if (status) conditions.push(eq(assets.status, status as any));
    if (criticality) conditions.push(eq(assets.criticality, criticality as any));
    const [row] = await safeDb.select({ count: sql<number>`count(*)` }).from(assets).where(and(...conditions));
    return Number(row?.count ?? 0);
  }

  // Helper: contar tickets por categorías de activos
  async function countTicketsByCategories(categories: string[], operationalStatus?: string, contractualStatus?: string) {
    const assetRows = await safeDb.select({ id: assets.id }).from(assets)
      .where(and(eq(assets.tenantId, tenantId), sql`${assets.category} IN (${sql.join(categories.map((c) => sql`${c}`), sql`, `)})`));
    const ids = assetRows.map((r) => r.id);
    if (ids.length === 0) return 0;
    const conditions = [eq(tickets.tenantId, tenantId), sql`${tickets.assetId} IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`];
    if (operationalStatus) conditions.push(eq(tickets.operationalStatus, operationalStatus as any));
    if (contractualStatus) conditions.push(eq(tickets.contractualStatus, contractualStatus as any));
    const [row] = await safeDb.select({ count: sql<number>`count(*)` }).from(tickets).where(and(...conditions));
    return Number(row?.count ?? 0);
  }

  // ── CCTV ──────────────────────────────────────────────────────────────────
  const [
    camarasTotal, camarasActivas, camarasCriticas,
    nvrTotal, nvrActivos, nvrCriticos,
    ticketsCctvAbiertos, ticketsCctvResueltos, ticketsCctvFueraSla,
  ] = await Promise.all([
    countAssets("camera"),
    countAssets("camera", "active"),
    countAssets("camera", "active", "critical"),
    countAssets("nvr_dvr"),
    countAssets("nvr_dvr", "active"),
    countAssets("nvr_dvr", "active", "critical"),
    countTicketsByCategories(["camera", "nvr_dvr"], undefined, undefined),
    countTicketsByCategories(["camera", "nvr_dvr"], "resolved"),
    countTicketsByCategories(["camera", "nvr_dvr"], undefined, "outside_sla"),
  ]);

  // ── CONTROL DE ACCESO ─────────────────────────────────────────────────────
  const [
    lectoresTotal, lectoresActivos, lectoresCriticos,
    ticketsAccesoAbiertos, ticketsAccesoResueltos, ticketsAccesoFueraSla,
  ] = await Promise.all([
    countAssets("access_control"),
    countAssets("access_control", "active"),
    countAssets("access_control", "active", "critical"),
    countTicketsByCategories(["access_control"]),
    countTicketsByCategories(["access_control"], "resolved"),
    countTicketsByCategories(["access_control"], undefined, "outside_sla"),
  ]);

  // ── VOCEO ─────────────────────────────────────────────────────────────────
  const [
    alarmasTotal, alarmasActivas, alarmasCriticas,
    sensoresTotal, sensoresActivos,
    ticketsVoceoAbiertos, ticketsVoceoResueltos, ticketsVoceoFueraSla,
  ] = await Promise.all([
    countAssets("alarm"),
    countAssets("alarm", "active"),
    countAssets("alarm", "active", "critical"),
    countAssets("sensor"),
    countAssets("sensor", "active"),
    countTicketsByCategories(["alarm", "sensor"]),
    countTicketsByCategories(["alarm", "sensor"], "resolved"),
    countTicketsByCategories(["alarm", "sensor"], undefined, "outside_sla"),
  ]);

  // ── CABLEADO ESTRUCTURADO ─────────────────────────────────────────────────
  const [
    switchesTotal, switchesActivos, switchesCriticos,
    servidoresTotal, servidoresActivos,
    upsTotal, upsActivos,
    ticketsRedAbiertos, ticketsRedResueltos, ticketsRedFueraSla,
  ] = await Promise.all([
    countAssets("network"),
    countAssets("network", "active"),
    countAssets("network", "active", "critical"),
    countAssets("server"),
    countAssets("server", "active"),
    countAssets("ups"),
    countAssets("ups", "active"),
    countTicketsByCategories(["network", "server", "ups"]),
    countTicketsByCategories(["network", "server", "ups"], "resolved"),
    countTicketsByCategories(["network", "server", "ups"], undefined, "outside_sla"),
  ]);

  return {
    cctv: {
      camarasTotal, camarasActivas, camarasCriticas,
      nvrTotal, nvrActivos, nvrCriticos,
      ticketsAbiertos: ticketsCctvAbiertos,
      ticketsResueltos: ticketsCctvResueltos,
      ticketsFueraSla: ticketsCctvFueraSla,
    },
    accessControl: {
      lectoresTotal, lectoresActivos, lectoresCriticos,
      // Puertas controladas = activos de access_control activos (cada lector controla una puerta)
      puertasControladas: lectoresActivos,
      ticketsAbiertos: ticketsAccesoAbiertos,
      ticketsResueltos: ticketsAccesoResueltos,
      ticketsFueraSla: ticketsAccesoFueraSla,
    },
    voceo: {
      equiposTotal: alarmasTotal + sensoresTotal,
      equiposActivos: alarmasActivas + sensoresActivos,
      altavocesTotal: alarmasTotal,
      altavocesActivos: alarmasActivas,
      amplificadoresTotal: sensoresTotal,
      amplificadoresActivos: sensoresActivos,
      criticos: alarmasCriticas,
      ticketsAbiertos: ticketsVoceoAbiertos,
      ticketsResueltos: ticketsVoceoResueltos,
      ticketsFueraSla: ticketsVoceoFueraSla,
    },
    cableado: {
      switchesTotal, switchesActivos, switchesCriticos,
      servidoresTotal, servidoresActivos,
      upsTotal, upsActivos,
      // Puertos activos = activos de red activos (representación lógica)
      puertosActivos: switchesActivos,
      ticketsAbiertos: ticketsRedAbiertos,
      ticketsResueltos: ticketsRedResueltos,
      ticketsFueraSla: ticketsRedFueraSla,
    },
  };
}
