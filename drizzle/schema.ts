import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  json,
  date,
} from "drizzle-orm/mysql-core";

// ─── USERS ───────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["admin", "supervisor", "technician", "client", "user"]).default("user").notNull(),
  tenantId: int("tenantId"),
  phone: varchar("phone", { length: 32 }),
  avatarUrl: text("avatarUrl"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── TENANTS ─────────────────────────────────────────────────────────────────
export const tenants = mysqlTable("tenants", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  rfc: varchar("rfc", { length: 20 }),
  address: text("address"),
  phone: varchar("phone", { length: 32 }),
  email: varchar("email", { length: 320 }),
  logoUrl: text("logoUrl"),
  isActive: boolean("isActive").default(true).notNull(),
  plan: mysqlEnum("plan", ["basic", "professional", "enterprise"]).default("professional").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;

// ─── BRANCHES (SUCURSALES) ────────────────────────────────────────────────────
export const branches = mysqlTable("branches", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  country: varchar("country", { length: 100 }).default("México"),
  phone: varchar("phone", { length: 32 }),
  contactName: varchar("contactName", { length: 255 }),
  contactEmail: varchar("contactEmail", { length: 320 }),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Branch = typeof branches.$inferSelect;
export type InsertBranch = typeof branches.$inferInsert;

// ─── POLICIES (PÓLIZAS) ───────────────────────────────────────────────────────
export const policies = mysqlTable("policies", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  branchId: int("branchId"),
  policyNumber: varchar("policyNumber", { length: 100 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["draft", "active", "suspended", "expired", "cancelled"]).default("draft").notNull(),
  type: mysqlEnum("type", ["maintenance", "warranty", "support", "comprehensive"]).default("maintenance").notNull(),
  startDate: date("startDate").notNull(),
  endDate: date("endDate").notNull(),
  renewalDate: date("renewalDate"),
  monthlyValue: decimal("monthlyValue", { precision: 12, scale: 2 }),
  annualValue: decimal("annualValue", { precision: 12, scale: 2 }),
  currency: varchar("currency", { length: 10 }).default("MXN"),
  clientName: varchar("clientName", { length: 255 }),
  clientContact: varchar("clientContact", { length: 255 }),
  clientEmail: varchar("clientEmail", { length: 320 }),
  clientPhone: varchar("clientPhone", { length: 32 }),
  assignedUserId: int("assignedUserId"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Policy = typeof policies.$inferSelect;
export type InsertPolicy = typeof policies.$inferInsert;

// ─── POLICY COVERAGES ─────────────────────────────────────────────────────────
export const policyCoverages = mysqlTable("policy_coverages", {
  id: int("id").autoincrement().primaryKey(),
  policyId: int("policyId").notNull(),
  tenantId: int("tenantId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  coverageType: mysqlEnum("coverageType", ["preventive", "corrective", "emergency", "parts", "labor", "travel"]).notNull(),
  maxIncidents: int("maxIncidents"),
  maxAmount: decimal("maxAmount", { precision: 12, scale: 2 }),
  isUnlimited: boolean("isUnlimited").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PolicyCoverage = typeof policyCoverages.$inferSelect;

// ─── POLICY SERVICES ──────────────────────────────────────────────────────────
export const policyServices = mysqlTable("policy_services", {
  id: int("id").autoincrement().primaryKey(),
  policyId: int("policyId").notNull(),
  tenantId: int("tenantId").notNull(),
  serviceName: varchar("serviceName", { length: 255 }).notNull(),
  serviceCode: varchar("serviceCode", { length: 50 }),
  description: text("description"),
  frequency: mysqlEnum("frequency", ["on_demand", "monthly", "quarterly", "biannual", "annual"]).default("on_demand"),
  isIncluded: boolean("isIncluded").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PolicyService = typeof policyServices.$inferSelect;

// ─── POLICY SLA RULES ─────────────────────────────────────────────────────────
export const policySlaRules = mysqlTable("policy_sla_rules", {
  id: int("id").autoincrement().primaryKey(),
  policyId: int("policyId").notNull(),
  tenantId: int("tenantId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  priority: mysqlEnum("priority", ["critical", "high", "medium", "low"]).notNull(),
  responseTimeHours: int("responseTimeHours").notNull(),
  resolutionTimeHours: int("resolutionTimeHours").notNull(),
  escalationTimeHours: int("escalationTimeHours"),
  penaltyPerHour: decimal("penaltyPerHour", { precision: 10, scale: 2 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PolicySlaRule = typeof policySlaRules.$inferSelect;

// ─── POLICY EXCLUSIONS ────────────────────────────────────────────────────────
export const policyExclusions = mysqlTable("policy_exclusions", {
  id: int("id").autoincrement().primaryKey(),
  policyId: int("policyId").notNull(),
  tenantId: int("tenantId").notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PolicyExclusion = typeof policyExclusions.$inferSelect;

// ─── POLICY OPERATIONAL RULES ─────────────────────────────────────────────────
export const policyOperationalRules = mysqlTable("policy_operational_rules", {
  id: int("id").autoincrement().primaryKey(),
  policyId: int("policyId").notNull(),
  tenantId: int("tenantId").notNull(),
  ruleType: varchar("ruleType", { length: 100 }).notNull(),
  description: text("description").notNull(),
  value: text("value"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PolicyOperationalRule = typeof policyOperationalRules.$inferSelect;

// ─── TICKETS ──────────────────────────────────────────────────────────────────
export const tickets = mysqlTable("tickets", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  branchId: int("branchId"),
  policyId: int("policyId"),
  ticketNumber: varchar("ticketNumber", { length: 50 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  // Estados operativos
  operationalStatus: mysqlEnum("operationalStatus", [
    "open", "assigned", "technician_on_route", "waiting_parts", "resolved"
  ]).default("open").notNull(),
  // Estados contractuales
  contractualStatus: mysqlEnum("contractualStatus", [
    "covered", "not_covered", "pending_approval", "outside_sla", "billable"
  ]).default("pending_approval").notNull(),
  priority: mysqlEnum("priority", ["critical", "high", "medium", "low"]).default("medium").notNull(),
  category: mysqlEnum("category", ["corrective", "preventive", "emergency", "installation", "inspection"]).default("corrective").notNull(),
  assignedUserId: int("assignedUserId"),
  reportedByUserId: int("reportedByUserId"),
  assetId: int("assetId"),
  slaRuleId: int("slaRuleId"),
  responseDeadline: timestamp("responseDeadline"),
  resolutionDeadline: timestamp("resolutionDeadline"),
  respondedAt: timestamp("respondedAt"),
  resolvedAt: timestamp("resolvedAt"),
  closedAt: timestamp("closedAt"),
  estimatedCost: decimal("estimatedCost", { precision: 12, scale: 2 }),
  actualCost: decimal("actualCost", { precision: 12, scale: 2 }),
  isBillable: boolean("isBillable").default(false),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = typeof tickets.$inferInsert;

// ─── TICKET COMMENTS ─────────────────────────────────────────────────────────
export const ticketComments = mysqlTable("ticket_comments", {
  id: int("id").autoincrement().primaryKey(),
  ticketId: int("ticketId").notNull(),
  tenantId: int("tenantId").notNull(),
  userId: int("userId").notNull(),
  comment: text("comment").notNull(),
  isInternal: boolean("isInternal").default(false),
  attachmentUrl: text("attachmentUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TicketComment = typeof ticketComments.$inferSelect;

// ─── TICKET HISTORY ───────────────────────────────────────────────────────────
export const ticketHistory = mysqlTable("ticket_history", {
  id: int("id").autoincrement().primaryKey(),
  ticketId: int("ticketId").notNull(),
  tenantId: int("tenantId").notNull(),
  userId: int("userId"),
  action: varchar("action", { length: 100 }).notNull(),
  fieldChanged: varchar("fieldChanged", { length: 100 }),
  oldValue: text("oldValue"),
  newValue: text("newValue"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TicketHistory = typeof ticketHistory.$inferSelect;

// ─── ASSETS (ACTIVOS / INVENTARIO) ────────────────────────────────────────────
export const assets = mysqlTable("assets", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  branchId: int("branchId"),
  policyId: int("policyId"),
  assetCode: varchar("assetCode", { length: 100 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: mysqlEnum("category", [
    "camera", "nvr_dvr", "access_control", "alarm", "sensor", "network", "server", "ups", "other"
  ]).default("other").notNull(),
  brand: varchar("brand", { length: 100 }),
  model: varchar("model", { length: 100 }),
  serialNumber: varchar("serialNumber", { length: 200 }),
  status: mysqlEnum("status", ["active", "inactive", "maintenance", "obsolete", "disposed"]).default("active").notNull(),
  criticality: mysqlEnum("criticality", ["critical", "high", "medium", "low"]).default("medium").notNull(),
  location: varchar("location", { length: 255 }),
  installDate: date("installDate"),
  warrantyExpiry: date("warrantyExpiry"),
  usefulLifeYears: int("usefulLifeYears"),
  purchaseCost: decimal("purchaseCost", { precision: 12, scale: 2 }),
  currentValue: decimal("currentValue", { precision: 12, scale: 2 }),
  depreciationRate: decimal("depreciationRate", { precision: 5, scale: 2 }),
  depreciationMethod: mysqlEnum("depreciationMethod", ["straight_line", "declining_balance", "sum_of_years"]).default("straight_line"),
  replacementCost: decimal("replacementCost", { precision: 12, scale: 2 }),
  maintenanceCostYearly: decimal("maintenanceCostYearly", { precision: 12, scale: 2 }),
  riskScore: int("riskScore").default(0),
  notes: text("notes"),
  imageUrl: text("imageUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Asset = typeof assets.$inferSelect;
export type InsertAsset = typeof assets.$inferInsert;

// ─── SLA MONITORING ───────────────────────────────────────────────────────────
export const slaMonitoring = mysqlTable("sla_monitoring", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  ticketId: int("ticketId").notNull(),
  slaRuleId: int("slaRuleId"),
  policyId: int("policyId"),
  responseDeadline: timestamp("responseDeadline"),
  resolutionDeadline: timestamp("resolutionDeadline"),
  respondedAt: timestamp("respondedAt"),
  resolvedAt: timestamp("resolvedAt"),
  responseBreached: boolean("responseBreached").default(false),
  resolutionBreached: boolean("resolutionBreached").default(false),
  responseBreachMinutes: int("responseBreachMinutes"),
  resolutionBreachMinutes: int("resolutionBreachMinutes"),
  penaltyAmount: decimal("penaltyAmount", { precision: 12, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SlaMonitoring = typeof slaMonitoring.$inferSelect;

// ─── MAINTENANCE PLANS ────────────────────────────────────────────────────────
export const maintenancePlans = mysqlTable("maintenance_plans", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  branchId: int("branchId"),
  policyId: int("policyId"),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: mysqlEnum("type", ["preventive", "corrective", "predictive"]).default("preventive").notNull(),
  frequency: mysqlEnum("frequency", ["weekly", "monthly", "quarterly", "biannual", "annual", "on_demand"]).default("monthly").notNull(),
  status: mysqlEnum("status", ["active", "paused", "completed", "cancelled"]).default("active").notNull(),
  assignedUserId: int("assignedUserId"),
  startDate: date("startDate"),
  endDate: date("endDate"),
  nextExecutionDate: date("nextExecutionDate"),
  estimatedDurationHours: decimal("estimatedDurationHours", { precision: 5, scale: 2 }),
  estimatedCost: decimal("estimatedCost", { precision: 12, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MaintenancePlan = typeof maintenancePlans.$inferSelect;
export type InsertMaintenancePlan = typeof maintenancePlans.$inferInsert;

// ─── MAINTENANCE TASKS ────────────────────────────────────────────────────────
export const maintenanceTasks = mysqlTable("maintenance_tasks", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  planId: int("planId").notNull(),
  assetId: int("assetId"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "cancelled", "rescheduled"]).default("pending").notNull(),
  assignedUserId: int("assignedUserId"),
  scheduledDate: date("scheduledDate"),
  completedDate: date("completedDate"),
  durationHours: decimal("durationHours", { precision: 5, scale: 2 }),
  actualCost: decimal("actualCost", { precision: 12, scale: 2 }),
  findings: text("findings"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MaintenanceTask = typeof maintenanceTasks.$inferSelect;

// ─── AUDIT LOGS ───────────────────────────────────────────────────────────────
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId"),
  userId: int("userId"),
  userName: varchar("userName", { length: 255 }),
  action: varchar("action", { length: 100 }).notNull(),
  module: varchar("module", { length: 100 }).notNull(),
  entityType: varchar("entityType", { length: 100 }),
  entityId: int("entityId"),
  description: text("description"),
  oldData: json("oldData"),
  newData: json("newData"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// ─── AI CHAT SESSIONS ─────────────────────────────────────────────────────────
export const aiChatSessions = mysqlTable("ai_chat_sessions", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AiChatSession = typeof aiChatSessions.$inferSelect;

// ─── AI CHAT MESSAGES ─────────────────────────────────────────────────────────
export const aiChatMessages = mysqlTable("ai_chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  tenantId: int("tenantId").notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AiChatMessage = typeof aiChatMessages.$inferSelect;
