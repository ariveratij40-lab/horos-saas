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
  passwordHash: varchar("passwordHash", { length: 255 }),
  authProvider: mysqlEnum("authProvider", ["manus", "local"]).default("manus").notNull(),
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
  postalCode: varchar("postalCode", { length: 20 }),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  notes: text("notes"),
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
  // CCTV SLA fields
  slaTier: mysqlEnum("slaTier", ["tier1", "tier2", "tier3"]),
  assetCategory: varchar("assetCategory", { length: 50 }),
  assetName: varchar("assetName", { length: 255 }),
  slaDeadlineHours: int("slaDeadlineHours"),
  evidenceImageUrl: text("evidenceImageUrl"),
  evidenceImageKey: varchar("evidenceImageKey", { length: 500 }),
  // Resolution report fields
  resolutionNotes: text("resolutionNotes"),
  resolutionEvidenceUrls: json("resolutionEvidenceUrls").$type<string[]>(),
  resolutionSignatureUrl: text("resolutionSignatureUrl"),
  resolutionReportUrl: text("resolutionReportUrl"),
  resolutionReportKey: varchar("resolutionReportKey", { length: 500 }),
  resolvedByName: varchar("resolvedByName", { length: 255 }),
  notificationSentAt: timestamp("notificationSentAt"),
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

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO INVENTARIO CCTV
// ═══════════════════════════════════════════════════════════════════════════════

// ─── CCTV: CÁMARAS ────────────────────────────────────────────────────────────
export const cctvCameras = mysqlTable("cctv_cameras", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  branchId: int("branchId"),
  // Identificación
  idCamera: varchar("idCamera", { length: 100 }),
  marca: varchar("marca", { length: 100 }),
  modelo: varchar("modelo", { length: 100 }),
  serie: varchar("serie", { length: 100 }),
  familia: varchar("familia", { length: 100 }),       // H4, H6, VALUE, etc.
  // Características técnicas
  resolucion: varchar("resolucion", { length: 50 }),  // 2MPX, 8MPX, etc.
  tipo: mysqlEnum("tipo", ["bala", "domo", "ptz", "fisheye", "panoramica", "otro"]).default("domo"),
  poe: boolean("poe").default(false),
  // Ubicación
  area: varchar("area", { length: 255 }),
  edificio: varchar("edificio", { length: 255 }),
  // Red
  ip: varchar("ip", { length: 45 }),
  mascara: varchar("mascara", { length: 45 }),
  gateway: varchar("gateway", { length: 45 }),
  mac: varchar("mac", { length: 30 }),
  internet: boolean("internet").default(false),
  conexion: varchar("conexion", { length: 100 }),     // IDF1, MDF, etc.
  switchId: int("switchId"),                          // FK a cctv_switches
  puertoSw: varchar("puertoSw", { length: 20 }),
  // Compra / Garantía
  proveedor: varchar("proveedor", { length: 255 }),
  fechaCompra: date("fechaCompra"),
  po: varchar("po", { length: 100 }),                 // Purchase Order
  tiempoUso: varchar("tiempoUso", { length: 50 }),
  garantiaExpiracion: date("garantiaExpiracion"),
  // Estado
  status: mysqlEnum("status", ["active", "inactive", "maintenance", "retired", "damaged", "warranty"]).default("active").notNull(),
  observaciones: text("observaciones"),
  fotoUrl: text("fotoUrl"),
  // Imagen de la escena que visualiza la cámara
  sceneImageUrl: text("sceneImageUrl"),
  sceneImageKey: text("sceneImageKey"),
  sceneDescription: varchar("sceneDescription", { length: 255 }),
    // Programa CTPAT (Customs Trade Partnership Against Terrorism)
  ctpat: boolean("ctpat").default(false),
  // Factura / Monto
  invoiceNumber: varchar("invoiceNumber", { length: 100 }),
  amount: decimal("amount", { precision: 12, scale: 2 }),
  // SLA Tier
  slaTier: varchar("slaTier", { length: 10 }),
  // RFID
  rfidTag: varchar("rfidTag", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CctvCamera = typeof cctvCameras.$inferSelect;
export type InsertCctvCamera = typeof cctvCameras.$inferInsert;

// ─── CCTV: IDF / MDF ─────────────────────────────────────────────────────────
export const cctvIdfs = mysqlTable("cctv_idfs", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  branchId: int("branchId"),
  idIdf: varchar("idIdf", { length: 100 }),
  nombre: varchar("nombre", { length: 255 }),
  ubicacion: varchar("ubicacion", { length: 255 }),
  tipo: mysqlEnum("tipo", ["IDF", "MDF", "gabinete"]).default("IDF").notNull(),
  // Racks y gabinetes
  numeroRacks: int("numeroRacks"),
  numGabinetes: int("numGabinetes"),
  capacidadRacks: int("capacidadRacks"),              // unidades U
  capacidadGabinetes: int("capacidadGabinetes"),
  // Fibra óptica
  fibraOptica: boolean("fibraOptica").default(false),
  tipoFibra: varchar("tipoFibra", { length: 100 }),   // OM4/6 HILOS, etc.
  // Compartido
  idfCompartido: boolean("idfCompartido").default(false),
  compartidoCon: varchar("compartidoCon", { length: 255 }),
  // Equipos instalados
  noSwitches: int("noSwitches"),
  noServidores: int("noServidores"),
  noUps: int("noUps"),
  // Condiciones
  refrigerado: boolean("refrigerado").default(false),
  controlAcceso: boolean("controlAcceso").default(false),
  tipoControlAcceso: varchar("tipoControlAcceso", { length: 100 }), // llave, CA, etc.
  comentarios: text("comentarios"),
  observaciones: text("observaciones"),
  fotoUrl: text("fotoUrl"),
  // Imagen del IDF/MDF (foto del rack/gabinete)
  idfImageUrl: text("idfImageUrl"),
    idfImageKey: text("idfImageKey"),
  status: mysqlEnum("status", ["active", "inactive", "maintenance"]).default("active").notNull(),
  // Factura / Monto
  invoiceNumber: varchar("invoiceNumber", { length: 100 }),
  amount: decimal("amount", { precision: 12, scale: 2 }),
  // SLA Tier
  slaTier: varchar("slaTier", { length: 10 }),
  // RFID
  rfidTag: varchar("rfidTag", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CctvIdf = typeof cctvIdfs.$inferSelect;
export type InsertCctvIdf = typeof cctvIdfs.$inferInsert;

// ─── CCTV: IDF IMAGES (galería múltiple) ─────────────────────────────────────────
export const cctvIdfImages = mysqlTable("cctv_idf_images", {
  id: int("id").autoincrement().primaryKey(),
  idfId: int("idfId").notNull(),
  tenantId: int("tenantId").notNull(),
  url: text("url").notNull(),
  key: text("key").notNull(),
  label: varchar("label", { length: 100 }).default("Frontal"),  // Frontal, Lateral, Cableado, Rack, Otro
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CctvIdfImage = typeof cctvIdfImages.$inferSelect;
export type InsertCctvIdfImage = typeof cctvIdfImages.$inferInsert;

// ─── CCTV: LICENCIAS ─────────────────────────────────────────────────────────
export const cctvLicenses = mysqlTable("cctv_licenses", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  branchId: int("branchId"),
  idLicencia: varchar("idLicencia", { length: 100 }),
  marca: varchar("marca", { length: 100 }),
  modelo: varchar("modelo", { length: 100 }),
  tipo: mysqlEnum("tipo", ["perpetua", "suscripcion", "trial", "otro"]).default("suscripcion").notNull(),
  noContrato: varchar("noContrato", { length: 100 }),
  fechaInicio: date("fechaInicio"),
  fechaExpiracion: date("fechaExpiracion"),
  equipoAsignado: varchar("equipoAsignado", { length: 255 }), // SERVER 1, etc.
  ubicacion: varchar("ubicacion", { length: 255 }),
  proveedor: varchar("proveedor", { length: 255 }),
  fechaCompra: date("fechaCompra"),
  ordenCompra: varchar("ordenCompra", { length: 100 }),
  tiempoUso: varchar("tiempoUso", { length: 50 }),
  otro: text("otro"),
  expirado: boolean("expirado").default(false),
  status: mysqlEnum("status", ["active", "expired", "cancelled", "pending_renewal"]).default("active").notNull(),
  observaciones: text("observaciones"),
  // Factura / Monto
    invoiceNumber: varchar("invoiceNumber", { length: 100 }),
  amount: decimal("amount", { precision: 12, scale: 2 }),
  // SLA Tier
  slaTier: varchar("slaTier", { length: 10 }),
  // RFID
  rfidTag: varchar("rfidTag", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CctvLicense = typeof cctvLicenses.$inferSelect;
export type InsertCctvLicense = typeof cctvLicenses.$inferInsert;

// ─── CCTV: MONITORES / PANTALLAS ─────────────────────────────────────────────
export const cctvMonitors = mysqlTable("cctv_monitors", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  branchId: int("branchId"),
  idMonitor: varchar("idMonitor", { length: 100 }),
  marca: varchar("marca", { length: 100 }),
  modelo: varchar("modelo", { length: 100 }),
  serie: varchar("serie", { length: 100 }),
  tipo: mysqlEnum("tipo", ["monitor", "pantalla", "videowall", "otro"]).default("monitor").notNull(),
  tamano: varchar("tamano", { length: 20 }),           // 24", 65", etc.
  resolucion: mysqlEnum("resolucion", ["HD 720p", "Full HD 1K", "QHD 2K", "UHD 4K", "8K", "otro"]).default("Full HD 1K"),
  tecnologia: mysqlEnum("tecnologia", ["LED", "QLED", "OLED", "LCD", "IPS", "otro"]).default("LED"),
  puerto: mysqlEnum("puerto", ["HDMI", "VGA", "DVI", "DisplayPort", "USB-C", "otro"]).default("HDMI"),
  ubicacion: varchar("ubicacion", { length: 255 }),
  proveedor: varchar("proveedor", { length: 255 }),
  fechaCompra: date("fechaCompra"),
  ordenCompra: varchar("ordenCompra", { length: 100 }),
  garantiaExpiracion: date("garantiaExpiracion"),
  tiempoUso: varchar("tiempoUso", { length: 50 }),
  ups: boolean("ups").default(false),                  // conectado a UPS
  conexion: varchar("conexion", { length: 100 }),      // WORKSTATION1, APPLIANCE1, etc.
  status: mysqlEnum("status", ["active", "inactive", "maintenance", "retired"]).default("active").notNull(),
  observaciones: text("observaciones"),
  fotoUrl: text("fotoUrl"),
  // Factura / Monto
    invoiceNumber: varchar("invoiceNumber", { length: 100 }),
  amount: decimal("amount", { precision: 12, scale: 2 }),
  // SLA Tier
  slaTier: varchar("slaTier", { length: 10 }),
  // RFID
  rfidTag: varchar("rfidTag", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CctvMonitor = typeof cctvMonitors.$inferSelect;
export type InsertCctvMonitor = typeof cctvMonitors.$inferInsert;

// ─── CCTV: SERVIDORES / NVR / WORKSTATIONS ───────────────────────────────────
export const cctvServers = mysqlTable("cctv_servers", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  branchId: int("branchId"),
  idServer: varchar("idServer", { length: 100 }),
  marca: varchar("marca", { length: 100 }),
  modelo: varchar("modelo", { length: 100 }),
  serie: varchar("serie", { length: 100 }),
  tipo: mysqlEnum("tipo", ["nvr", "workstation", "appliance", "servidor", "otro"]).default("nvr").notNull(),
  // VMS
  versionVms: varchar("versionVms", { length: 100 }),  // UNITY, ALTA, ACC7, etc.
  licencias: int("licencias"),
  licenciasLibres: int("licenciasLibres"),
  versionLic: varchar("versionLic", { length: 100 }),  // ENTERPRISE, PROFESIONAL, etc.
  numCamaras: int("numCamaras"),
  // Sistema operativo y hardware
  so: varchar("so", { length: 100 }),                  // WINDOWS, LINUX, etc.
  memoria: varchar("memoria", { length: 50 }),
  procesador: varchar("procesador", { length: 100 }),
  storage: varchar("storage", { length: 100 }),
  // Red
  ip: varchar("ip", { length: 45 }),
  mascara: varchar("mascara", { length: 45 }),
  gateway: varchar("gateway", { length: 45 }),
  dns: varchar("dns", { length: 45 }),
  nic: varchar("nic", { length: 50 }),                 // 1GB, 10GB, etc.
  mac: varchar("mac", { length: 30 }),
  // Ubicación y acceso
  ubicacion: varchar("ubicacion", { length: 255 }),
  usuario: varchar("usuario", { length: 100 }),
  contrasena: varchar("contrasena", { length: 255 }),  // cifrada en producción
  // Compra / Garantía
  proveedor: varchar("proveedor", { length: 255 }),
  fechaCompra: date("fechaCompra"),
  ordenCompra: varchar("ordenCompra", { length: 100 }),
  garantiaExpiracion: date("garantiaExpiracion"),
  tiempoUso: varchar("tiempoUso", { length: 50 }),
  status: mysqlEnum("status", ["active", "inactive", "maintenance", "retired"]).default("active").notNull(),
  observaciones: text("observaciones"),
  fotoUrl: text("fotoUrl"),
    // Factura / Monto
  invoiceNumber: varchar("invoiceNumber", { length: 100 }),
  amount: decimal("amount", { precision: 12, scale: 2 }),
  // SLA Tier
  slaTier: varchar("slaTier", { length: 10 }),
  // RFID
  rfidTag: varchar("rfidTag", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CctvServer = typeof cctvServers.$inferSelect;
export type InsertCctvServer = typeof cctvServers.$inferInsert;

// ─── CCTV: SWITCHES ──────────────────────────────────────────────────────────
export const cctvSwitches = mysqlTable("cctv_switches", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  branchId: int("branchId"),
  idfId: int("idfId"),                                 // FK a cctv_idfs
  idSwitch: varchar("idSwitch", { length: 100 }),
  marca: varchar("marca", { length: 100 }),
  modelo: varchar("modelo", { length: 100 }),
  serie: varchar("serie", { length: 100 }),
  tipo: mysqlEnum("tipo", ["poe", "standard", "appliance", "core", "acceso", "otro"]).default("poe").notNull(),
  firmware: varchar("firmware", { length: 100 }),
  // Puertos
  puertos: int("puertos"),
  puertosPoe: int("puertosPoe"),
  capacidadPto: varchar("capacidadPto", { length: 50 }), // 1GB, 10GB, etc.
  numCamaras: int("numCamaras"),
  puertosLibres: int("puertosLibres"),
  // Red
  ip: varchar("ip", { length: 45 }),
  ubicacion: varchar("ubicacion", { length: 255 }),
  usuario: varchar("usuario", { length: 100 }),
  contrasena: varchar("contrasena", { length: 255 }),
  // Compra / Garantía
  proveedor: varchar("proveedor", { length: 255 }),
  fechaCompra: date("fechaCompra"),
  ordenCompra: varchar("ordenCompra", { length: 100 }),
  garantiaExpiracion: date("garantiaExpiracion"),
  tiempoUso: varchar("tiempoUso", { length: 50 }),
  status: mysqlEnum("status", ["active", "inactive", "maintenance", "retired"]).default("active").notNull(),
  observaciones: text("observaciones"),
  fotoUrl: text("fotoUrl"),
    // Factura / Monto
  invoiceNumber: varchar("invoiceNumber", { length: 100 }),
  amount: decimal("amount", { precision: 12, scale: 2 }),
  // SLA Tier
  slaTier: varchar("slaTier", { length: 10 }),
  // RFID
  rfidTag: varchar("rfidTag", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CctvSwitch = typeof cctvSwitches.$inferSelect;
export type InsertCctvSwitch = typeof cctvSwitches.$inferInsert;

// ─── CCTV: UPS ───────────────────────────────────────────────────────────────
export const cctvUps = mysqlTable("cctv_ups", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  branchId: int("branchId"),
  idfId: int("idfId"),                                 // FK a cctv_idfs
  idUps: varchar("idUps", { length: 100 }),
  marca: varchar("marca", { length: 100 }),
  modelo: varchar("modelo", { length: 100 }),
  serie: varchar("serie", { length: 100 }),
  tipo: mysqlEnum("tipo", ["torre", "rack", "online", "interactivo", "otro"]).default("rack").notNull(),
  capacidad: varchar("capacidad", { length: 50 }),     // 3 KVAs, 2Kvas, etc.
  autonomia: varchar("autonomia", { length: 50 }),     // 5 MIN, 30 MIN, etc.
  equiposConectados: int("equiposConectados"),
  consumoActual: varchar("consumoActual", { length: 50 }), // 2.8 KVAS, etc.
  tarjetaRed: boolean("tarjetaRed").default(false),
  ip: varchar("ip", { length: 45 }),
  ubicacion: varchar("ubicacion", { length: 255 }),
  // Compra / Garantía
  proveedor: varchar("proveedor", { length: 255 }),
  fechaCompra: date("fechaCompra"),
  ordenCompra: varchar("ordenCompra", { length: 100 }),
  garantiaExpiracion: date("garantiaExpiracion"),
  tiempoUso: varchar("tiempoUso", { length: 50 }),
  status: mysqlEnum("status", ["active", "inactive", "maintenance", "retired"]).default("active").notNull(),
  observaciones: text("observaciones"),
  fotoUrl: text("fotoUrl"),
  // Factura / Monto
    invoiceNumber: varchar("invoiceNumber", { length: 100 }),
  amount: decimal("amount", { precision: 12, scale: 2 }),
  // SLA Tier
  slaTier: varchar("slaTier", { length: 10 }),
  // RFID
  rfidTag: varchar("rfidTag", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CctvUps = typeof cctvUps.$inferSelect;
export type InsertCctvUps = typeof cctvUps.$inferInsert;

// ─── RFID Registry ────────────────────────────────────────────────────────────
// Registro centralizado de todos los tags RFID asignados a equipos CCTV
export const rfidRegistry = mysqlTable("rfid_registry", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  rfidTag: varchar("rfidTag", { length: 50 }).notNull(),
  category: mysqlEnum("category", ["cameras", "idfs", "licenses", "monitors", "servers", "switches", "ups"]).notNull(),
  itemId: int("itemId").notNull(),
  // Datos del equipo en el momento de generación (snapshot para lectura offline)
  itemName: varchar("itemName", { length: 255 }),
  itemBrand: varchar("itemBrand", { length: 100 }),
  itemModel: varchar("itemModel", { length: 100 }),
  itemSerial: varchar("itemSerial", { length: 100 }),
  itemLocation: varchar("itemLocation", { length: 255 }),
  itemStatus: varchar("itemStatus", { length: 50 }),
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type RfidRegistry = typeof rfidRegistry.$inferSelect;
export type InsertRfidRegistry = typeof rfidRegistry.$inferInsert;

// ─── CCTV Maintenance Log ─────────────────────────────────────────────────────
// Bitácora de mantenimiento específica por equipo CCTV (cualquier categoría)
export const cctvMaintenanceLog = mysqlTable("cctv_maintenance_log", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  // Referencia al equipo
  category: mysqlEnum("category", ["cameras", "idfs", "licenses", "monitors", "servers", "switches", "ups"]).notNull(),
  itemId: int("itemId").notNull(),
  itemName: varchar("itemName", { length: 255 }), // snapshot del nombre
  // Datos del mantenimiento
  type: mysqlEnum("type", ["preventive", "corrective", "predictive", "inspection", "replacement", "upgrade", "other"]).default("preventive").notNull(),
  status: mysqlEnum("status", ["scheduled", "in_progress", "completed", "cancelled"]).default("completed").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  findings: text("findings"),         // Hallazgos
  actions: text("actions"),           // Acciones realizadas
  technician: varchar("technician", { length: 255 }), // Técnico responsable
  scheduledDate: date("scheduledDate"),
  executedDate: date("executedDate"),
  durationHours: decimal("durationHours", { precision: 5, scale: 2 }),
  cost: decimal("cost", { precision: 12, scale: 2 }),
  nextMaintenanceDate: date("nextMaintenanceDate"),
  attachmentUrl: text("attachmentUrl"),
  // Fotos antes/después y firma del cliente
  beforePhotoUrl: text("beforePhotoUrl"),
  beforePhotoKey: varchar("beforePhotoKey", { length: 500 }),
  afterPhotoUrl: text("afterPhotoUrl"),
  afterPhotoKey: varchar("afterPhotoKey", { length: 500 }),
  clientSignatureUrl: text("clientSignatureUrl"),
  clientSignatureKey: varchar("clientSignatureKey", { length: 500 }),
  clientName: varchar("clientName", { length: 255 }),   // Nombre del firmante
  reportGenerated: boolean("reportGenerated").default(false),
  // Vinculación a póliza y programa
  policyId: int("policyId"),
  programId: int("programId"),
  createdByUserId: int("createdByUserId"),
  createdByUserName: varchar("createdByUserName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CctvMaintenanceLog = typeof cctvMaintenanceLog.$inferSelect;
export type InsertCctvMaintenanceLog = typeof cctvMaintenanceLog.$inferInsert;

// ─── CCTV Maintenance Programs ────────────────────────────────────────────────
// Programa de mantenimiento generado a partir de una póliza
export const cctvMaintenancePrograms = mysqlTable("cctv_maintenance_programs", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  policyId: int("policyId"),                     // Póliza vinculada (opcional)
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  // Cobertura de la póliza
  totalVisits: int("totalVisits").notNull(),      // Total de visitas cubiertas por la póliza
  completedVisits: int("completedVisits").default(0).notNull(),
  frequency: mysqlEnum("frequency", ["monthly", "bimonthly", "quarterly", "biannual", "annual", "custom"]).default("quarterly").notNull(),
  startDate: date("startDate").notNull(),
  endDate: date("endDate").notNull(),
  technician: varchar("technician", { length: 255 }),
  schedule: varchar("schedule", { length: 100 }),    // Horario ej: "8:00AM - 5:00 PM"
  visitWeekStart: date("visitWeekStart"),             // Inicio de la semana de visita actual
  programMonth: varchar("programMonth", { length: 20 }), // Mes del programa ej: "may-26"
  programYear: varchar("programYear", { length: 10 }),   // Año del programa ej: "2026"
  status: mysqlEnum("status", ["active", "completed", "cancelled"]).default("active").notNull(),
  createdByUserId: int("createdByUserId"),
  createdByUserName: varchar("createdByUserName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CctvMaintenanceProgram = typeof cctvMaintenancePrograms.$inferSelect;
export type InsertCctvMaintenanceProgram = typeof cctvMaintenancePrograms.$inferInsert;

// ─── CCTV Maintenance Program Items ──────────────────────────────────────────
// Equipos incluidos en un programa de mantenimiento
export const cctvMaintenanceProgramItems = mysqlTable("cctv_maintenance_program_items", {
  id: int("id").autoincrement().primaryKey(),
  programId: int("programId").notNull(),
  tenantId: int("tenantId").notNull(),
  category: mysqlEnum("category", ["cameras", "idfs", "licenses", "monitors", "servers", "switches", "ups"]).notNull(),
  itemId: int("itemId").notNull(),
  itemName: varchar("itemName", { length: 255 }),
  itemLocation: varchar("itemLocation", { length: 255 }),
  area: varchar("area", { length: 255 }),            // Área/zona del equipo
  requiresLift: boolean("requiresLift").default(false), // Carrito elevador
  noTechnicians: int("noTechnicians").default(1),    // Número de técnicos
  observations: text("observations"),               // Observaciones
  sortOrder: int("sortOrder").default(0),            // Orden en la tabla
  scheduledDays: varchar("scheduledDays", { length: 50 }), // Días asignados ej: "1,3,5" (0=dom,1=lun...6=sab)
  scheduledDates: text("scheduledDates"), // Fechas exactas seleccionadas ej: "2026-05-11,2026-05-13"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CctvMaintenanceProgramItem = typeof cctvMaintenanceProgramItems.$inferSelect;
export type InsertCctvMaintenanceProgramItem = typeof cctvMaintenanceProgramItems.$inferInsert;

// ─── PASSWORD RESET TOKENS ───────────────────────────────────────────────────
export const passwordResetTokens = mysqlTable("password_reset_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;

// ─── FLOOR PLANS ─────────────────────────────────────────────────────────────
export const floorPlans = mysqlTable("floor_plans", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  building: varchar("building", { length: 255 }),
  floor: varchar("floor", { length: 100 }),
  format: mysqlEnum("format", ["pdf", "dwg", "dxf", "png", "jpg"]).default("pdf"),
  dimensions: varchar("dimensions", { length: 100 }),
  scale: varchar("scale", { length: 50 }).default("1:100"),
  calibration: varchar("calibration", { length: 200 }), // JSON: { metersPerPixel, refPxLen, refMeters, containerW, containerH }
  status: mysqlEnum("status", ["active", "inactive", "draft"]).default("active"),
  fileKey: varchar("fileKey", { length: 500 }),
  fileUrl: varchar("fileUrl", { length: 1000 }),
  fileSize: int("fileSize"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type FloorPlan = typeof floorPlans.$inferSelect;
export type InsertFloorPlan = typeof floorPlans.$inferInsert;

// ─── FLOOR PLAN LAYERS ───────────────────────────────────────────────────────
export const floorPlanLayers = mysqlTable("floor_plan_layers", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  color: varchar("color", { length: 20 }).default("#3b82f6"),
  icon: varchar("icon", { length: 10 }).default("📍"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type FloorPlanLayer = typeof floorPlanLayers.$inferSelect;
export type InsertFloorPlanLayer = typeof floorPlanLayers.$inferInsert;

// ─── FLOOR PLAN ANNOTATIONS ──────────────────────────────────────────────────
export const floorPlanAnnotations = mysqlTable("floor_plan_annotations", {
  id: int("id").autoincrement().primaryKey(),
  planId: int("planId").notNull(),
  tenantId: int("tenantId").notNull(),
  layerId: int("layerId"),
  type: varchar("type", { length: 50 }).default("marker"),
  x: varchar("x", { length: 20 }).notNull(),
  y: varchar("y", { length: 20 }).notNull(),
  label: varchar("label", { length: 255 }),
  color: varchar("color", { length: 20 }),
  icon: varchar("icon", { length: 10 }),
  data: text("data"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type FloorPlanAnnotation = typeof floorPlanAnnotations.$inferSelect;
export type InsertFloorPlanAnnotation = typeof floorPlanAnnotations.$inferInsert;

// ─── FLOOR PLAN VERSIONS ─────────────────────────────────────────────────────
export const floorPlanVersions = mysqlTable("floor_plan_versions", {
  id: int("id").autoincrement().primaryKey(),
  planId: int("planId").notNull(),
  tenantId: int("tenantId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),          // nombre de la versión
  description: text("description"),                           // notas opcionales
  layers: text("layers").notNull(),                           // JSON: array de tipos de capa incluidos
  annotationsSnapshot: text("annotationsSnapshot").notNull(), // JSON: snapshot de anotaciones
  createdBy: int("createdBy"),                                // userId
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type FloorPlanVersion = typeof floorPlanVersions.$inferSelect;
export type InsertFloorPlanVersion = typeof floorPlanVersions.$inferInsert;

// ─── FLOOR PLAN SHARES ───────────────────────────────────────────────────────
export const floorPlanShares = mysqlTable("floor_plan_shares", {
  id: int("id").autoincrement().primaryKey(),
  planId: int("planId").notNull(),
  tenantId: int("tenantId").notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(), // token público
  name: varchar("name", { length: 255 }),                    // nombre del share
  layers: text("layers"),                                     // JSON: capas visibles (null = todas)
  expiresAt: timestamp("expiresAt"),                          // null = no expira
  viewCount: int("viewCount").default(0),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type FloorPlanShare = typeof floorPlanShares.$inferSelect;
export type InsertFloorPlanShare = typeof floorPlanShares.$inferInsert;

// ═══════════════════════════════════════════════════════════════════════════════
// CONTROL DE ACCESO
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Lectores de acceso ───────────────────────────────────────────────────────
export const acReaders = mysqlTable("ac_readers", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  branchId: int("branchId"),
  idReader: varchar("idReader", { length: 100 }),
  marca: varchar("marca", { length: 100 }),
  modelo: varchar("modelo", { length: 100 }),
  serie: varchar("serie", { length: 100 }),
  tipo: mysqlEnum("tipo", ["hid", "biometrico", "tarjeta", "pin", "facial", "rfid", "otro"]).default("tarjeta"),
  tecnologia: varchar("tecnologia", { length: 100 }), // Wiegand, OSDP, RS485
  area: varchar("area", { length: 255 }),
  edificio: varchar("edificio", { length: 255 }),
  puerta: varchar("puerta", { length: 255 }),          // Puerta asociada
  ip: varchar("ip", { length: 45 }),
  mac: varchar("mac", { length: 30 }),
  controladoraId: int("controladoraId"),               // FK a ac_controllers
  proveedor: varchar("proveedor", { length: 255 }),
  fechaCompra: date("fechaCompra"),
  garantiaExpiracion: date("garantiaExpiracion"),
  po: varchar("po", { length: 100 }),
  invoiceNumber: varchar("invoiceNumber", { length: 100 }),
  amount: decimal("amount", { precision: 12, scale: 2 }),
  slaTier: varchar("slaTier", { length: 10 }),
  rfidTag: varchar("rfidTag", { length: 50 }),
  status: mysqlEnum("status", ["active", "inactive", "maintenance", "retired", "damaged", "warranty"]).default("active").notNull(),
  observaciones: text("observaciones"),
  fotoUrl: text("fotoUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AcReader = typeof acReaders.$inferSelect;
export type InsertAcReader = typeof acReaders.$inferInsert;

// ─── Controladoras de acceso ──────────────────────────────────────────────────
export const acControllers = mysqlTable("ac_controllers", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  branchId: int("branchId"),
  idController: varchar("idController", { length: 100 }),
  marca: varchar("marca", { length: 100 }),
  modelo: varchar("modelo", { length: 100 }),
  serie: varchar("serie", { length: 100 }),
  tipo: mysqlEnum("tipo", ["standalone", "networked", "cloud", "otro"]).default("networked"),
  puertas: int("puertas").default(1),                  // Número de puertas que controla
  ip: varchar("ip", { length: 45 }),
  mac: varchar("mac", { length: 30 }),
  firmware: varchar("firmware", { length: 100 }),
  area: varchar("area", { length: 255 }),
  edificio: varchar("edificio", { length: 255 }),
  proveedor: varchar("proveedor", { length: 255 }),
  fechaCompra: date("fechaCompra"),
  garantiaExpiracion: date("garantiaExpiracion"),
  po: varchar("po", { length: 100 }),
  invoiceNumber: varchar("invoiceNumber", { length: 100 }),
  amount: decimal("amount", { precision: 12, scale: 2 }),
  slaTier: varchar("slaTier", { length: 10 }),
  rfidTag: varchar("rfidTag", { length: 50 }),
  status: mysqlEnum("status", ["active", "inactive", "maintenance", "retired", "damaged", "warranty"]).default("active").notNull(),
  observaciones: text("observaciones"),
  fotoUrl: text("fotoUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AcController = typeof acControllers.$inferSelect;
export type InsertAcController = typeof acControllers.$inferInsert;

// ─── Puertas controladas ──────────────────────────────────────────────────────
export const acDoors = mysqlTable("ac_doors", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  branchId: int("branchId"),
  idDoor: varchar("idDoor", { length: 100 }),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  tipo: mysqlEnum("tipo", ["entrada", "salida", "bidireccional", "emergencia", "otro"]).default("bidireccional"),
  material: varchar("material", { length: 100 }),      // Madera, Metal, Vidrio
  cerradura: varchar("cerradura", { length: 100 }),    // Electromagnética, Electromecánica
  area: varchar("area", { length: 255 }),
  edificio: varchar("edificio", { length: 255 }),
  controladoraId: int("controladoraId"),
  lectoresIds: text("lectoresIds"),                    // JSON array de IDs de lectores
  status: mysqlEnum("status", ["active", "inactive", "maintenance", "retired", "damaged"]).default("active").notNull(),
  observaciones: text("observaciones"),
  fotoUrl: text("fotoUrl"),
  slaTier: varchar("slaTier", { length: 10 }),
  rfidTag: varchar("rfidTag", { length: 50 }),
  amount: decimal("amount", { precision: 12, scale: 2 }),
  proveedor: varchar("proveedor", { length: 255 }),
  fechaCompra: date("fechaCompra"),
  garantiaExpiracion: date("garantiaExpiracion"),
  po: varchar("po", { length: 100 }),
  invoiceNumber: varchar("invoiceNumber", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AcDoor = typeof acDoors.$inferSelect;
export type InsertAcDoor = typeof acDoors.$inferInsert;

// ─── Registro de mantenimiento — Control de Acceso ───────────────────────────
export const acMaintenanceLog = mysqlTable("ac_maintenance_log", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  category: mysqlEnum("category", ["readers", "controllers", "doors"]).notNull(),
  itemId: int("itemId").notNull(),
  itemName: varchar("itemName", { length: 255 }),
  type: mysqlEnum("type", ["preventive", "corrective", "predictive", "inspection", "replacement", "upgrade", "other"]).default("preventive").notNull(),
  status: mysqlEnum("status", ["scheduled", "in_progress", "completed", "cancelled"]).default("completed").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  findings: text("findings"),
  actions: text("actions"),
  technician: varchar("technician", { length: 255 }),
  scheduledDate: date("scheduledDate"),
  executedDate: date("executedDate"),
  durationHours: decimal("durationHours", { precision: 5, scale: 2 }),
  cost: decimal("cost", { precision: 12, scale: 2 }),
  nextMaintenanceDate: date("nextMaintenanceDate"),
  beforePhotoUrl: text("beforePhotoUrl"),
  beforePhotoKey: varchar("beforePhotoKey", { length: 500 }),
  afterPhotoUrl: text("afterPhotoUrl"),
  afterPhotoKey: varchar("afterPhotoKey", { length: 500 }),
  clientSignatureUrl: text("clientSignatureUrl"),
  clientSignatureKey: varchar("clientSignatureKey", { length: 500 }),
  clientName: varchar("clientName", { length: 255 }),
  reportGenerated: boolean("reportGenerated").default(false),
  policyId: int("policyId"),
  programId: int("programId"),
  createdByUserId: int("createdByUserId"),
  createdByUserName: varchar("createdByUserName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AcMaintenanceLog = typeof acMaintenanceLog.$inferSelect;
export type InsertAcMaintenanceLog = typeof acMaintenanceLog.$inferInsert;

// ─── Programas de mantenimiento — Control de Acceso ──────────────────────────
export const acMaintenancePrograms = mysqlTable("ac_maintenance_programs", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  policyId: int("policyId"),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  totalVisits: int("totalVisits").notNull(),
  completedVisits: int("completedVisits").default(0).notNull(),
  frequency: mysqlEnum("frequency", ["monthly", "bimonthly", "quarterly", "biannual", "annual", "custom"]).default("quarterly").notNull(),
  startDate: date("startDate").notNull(),
  endDate: date("endDate").notNull(),
  technician: varchar("technician", { length: 255 }),
  schedule: varchar("schedule", { length: 100 }),
  visitWeekStart: date("visitWeekStart"),
  programMonth: varchar("programMonth", { length: 20 }),
  programYear: varchar("programYear", { length: 10 }),
  status: mysqlEnum("status", ["active", "completed", "cancelled"]).default("active").notNull(),
  createdByUserId: int("createdByUserId"),
  createdByUserName: varchar("createdByUserName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AcMaintenanceProgram = typeof acMaintenancePrograms.$inferSelect;
export type InsertAcMaintenanceProgram = typeof acMaintenancePrograms.$inferInsert;

export const acMaintenanceProgramItems = mysqlTable("ac_maintenance_program_items", {
  id: int("id").autoincrement().primaryKey(),
  programId: int("programId").notNull(),
  tenantId: int("tenantId").notNull(),
  category: mysqlEnum("category", ["readers", "controllers", "doors"]).notNull(),
  itemId: int("itemId").notNull(),
  itemName: varchar("itemName", { length: 255 }),
  itemLocation: varchar("itemLocation", { length: 255 }),
  area: varchar("area", { length: 255 }),
  requiresLift: boolean("requiresLift").default(false),
  noTechnicians: int("noTechnicians").default(1),
  observations: text("observations"),
  sortOrder: int("sortOrder").default(0),
  scheduledDays: varchar("scheduledDays", { length: 50 }),
  scheduledDates: text("scheduledDates"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AcMaintenanceProgramItem = typeof acMaintenanceProgramItems.$inferSelect;
export type InsertAcMaintenanceProgramItem = typeof acMaintenanceProgramItems.$inferInsert;

// ═══════════════════════════════════════════════════════════════════════════════
// CABLEADO ESTRUCTURADO
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Switches / Routers ───────────────────────────────────────────────────────
export const cabledSwitches = mysqlTable("cabled_switches", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  branchId: int("branchId"),
  idSwitch: varchar("idSwitch", { length: 100 }),
  marca: varchar("marca", { length: 100 }),
  modelo: varchar("modelo", { length: 100 }),
  serie: varchar("serie", { length: 100 }),
  tipo: mysqlEnum("tipo", ["switch_l2", "switch_l3", "router", "core", "distribucion", "acceso", "otro"]).default("switch_l2"),
  puertos: int("puertos").default(24),
  puertosPoE: int("puertosPoE").default(0),
  velocidad: varchar("velocidad", { length: 50 }),     // 1Gbps, 10Gbps
  administrable: boolean("administrable").default(true),
  ip: varchar("ip", { length: 45 }),
  mac: varchar("mac", { length: 30 }),
  vlan: varchar("vlan", { length: 255 }),
  firmware: varchar("firmware", { length: 100 }),
  rack: varchar("rack", { length: 100 }),
  unidadRack: varchar("unidadRack", { length: 20 }),   // U1, U2...
  area: varchar("area", { length: 255 }),
  edificio: varchar("edificio", { length: 255 }),
  proveedor: varchar("proveedor", { length: 255 }),
  fechaCompra: date("fechaCompra"),
  garantiaExpiracion: date("garantiaExpiracion"),
  po: varchar("po", { length: 100 }),
  invoiceNumber: varchar("invoiceNumber", { length: 100 }),
  amount: decimal("amount", { precision: 12, scale: 2 }),
  slaTier: varchar("slaTier", { length: 10 }),
  rfidTag: varchar("rfidTag", { length: 50 }),
  status: mysqlEnum("status", ["active", "inactive", "maintenance", "retired", "damaged", "warranty"]).default("active").notNull(),
  observaciones: text("observaciones"),
  fotoUrl: text("fotoUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CabledSwitch = typeof cabledSwitches.$inferSelect;
export type InsertCabledSwitch = typeof cabledSwitches.$inferInsert;

// ─── Patch Panels ─────────────────────────────────────────────────────────────
export const cabledPatchPanels = mysqlTable("cabled_patch_panels", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  branchId: int("branchId"),
  idPanel: varchar("idPanel", { length: 100 }),
  marca: varchar("marca", { length: 100 }),
  modelo: varchar("modelo", { length: 100 }),
  serie: varchar("serie", { length: 100 }),
  puertos: int("puertos").default(24),
  categoria: mysqlEnum("categoria", ["cat5e", "cat6", "cat6a", "cat7", "fibra", "otro"]).default("cat6"),
  rack: varchar("rack", { length: 100 }),
  unidadRack: varchar("unidadRack", { length: 20 }),
  area: varchar("area", { length: 255 }),
  edificio: varchar("edificio", { length: 255 }),
  proveedor: varchar("proveedor", { length: 255 }),
  fechaCompra: date("fechaCompra"),
  garantiaExpiracion: date("garantiaExpiracion"),
  po: varchar("po", { length: 100 }),
  invoiceNumber: varchar("invoiceNumber", { length: 100 }),
  amount: decimal("amount", { precision: 12, scale: 2 }),
  slaTier: varchar("slaTier", { length: 10 }),
  rfidTag: varchar("rfidTag", { length: 50 }),
  status: mysqlEnum("status", ["active", "inactive", "maintenance", "retired", "damaged"]).default("active").notNull(),
  observaciones: text("observaciones"),
  fotoUrl: text("fotoUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CabledPatchPanel = typeof cabledPatchPanels.$inferSelect;
export type InsertCabledPatchPanel = typeof cabledPatchPanels.$inferInsert;

// ─── Rosetas / Tomas de red ───────────────────────────────────────────────────
export const cabledOutlets = mysqlTable("cabled_outlets", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  branchId: int("branchId"),
  idOutlet: varchar("idOutlet", { length: 100 }),
  marca: varchar("marca", { length: 100 }),
  modelo: varchar("modelo", { length: 100 }),
  puertos: int("puertos").default(2),
  categoria: mysqlEnum("categoria", ["cat5e", "cat6", "cat6a", "cat7", "fibra", "otro"]).default("cat6"),
  area: varchar("area", { length: 255 }),
  edificio: varchar("edificio", { length: 255 }),
  patchPanelId: int("patchPanelId"),
  puertoPanel: varchar("puertoPanel", { length: 20 }),
  switchId: int("switchId"),
  puertoSwitch: varchar("puertoSwitch", { length: 20 }),
  proveedor: varchar("proveedor", { length: 255 }),
  fechaCompra: date("fechaCompra"),
  po: varchar("po", { length: 100 }),
  invoiceNumber: varchar("invoiceNumber", { length: 100 }),
  amount: decimal("amount", { precision: 12, scale: 2 }),
  slaTier: varchar("slaTier", { length: 10 }),
  rfidTag: varchar("rfidTag", { length: 50 }),
  status: mysqlEnum("status", ["active", "inactive", "maintenance", "retired", "damaged"]).default("active").notNull(),
  observaciones: text("observaciones"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CabledOutlet = typeof cabledOutlets.$inferSelect;
export type InsertCabledOutlet = typeof cabledOutlets.$inferInsert;

// ─── Canaletas / Ductos ───────────────────────────────────────────────────────
export const cabledDucts = mysqlTable("cabled_ducts", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  branchId: int("branchId"),
  idDuct: varchar("idDuct", { length: 100 }),
  tipo: mysqlEnum("tipo", ["canaleta", "bandeja", "tuberia", "charola", "otro"]).default("canaleta"),
  material: varchar("material", { length: 100 }),      // PVC, Metálica, Aluminio
  dimensiones: varchar("dimensiones", { length: 100 }), // 40x25mm
  longitud: decimal("longitud", { precision: 8, scale: 2 }), // metros
  area: varchar("area", { length: 255 }),
  edificio: varchar("edificio", { length: 255 }),
  proveedor: varchar("proveedor", { length: 255 }),
  fechaCompra: date("fechaCompra"),
  po: varchar("po", { length: 100 }),
  invoiceNumber: varchar("invoiceNumber", { length: 100 }),
  amount: decimal("amount", { precision: 12, scale: 2 }),
  slaTier: varchar("slaTier", { length: 10 }),
  rfidTag: varchar("rfidTag", { length: 50 }),
  status: mysqlEnum("status", ["active", "inactive", "maintenance", "retired", "damaged"]).default("active").notNull(),
  observaciones: text("observaciones"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CabledDuct = typeof cabledDucts.$inferSelect;
export type InsertCabledDuct = typeof cabledDucts.$inferInsert;

// ─── Registro de mantenimiento — Cableado Estructurado ───────────────────────
export const cabledMaintenanceLog = mysqlTable("cabled_maintenance_log", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  category: mysqlEnum("category", ["switches", "patch_panels", "outlets", "ducts"]).notNull(),
  itemId: int("itemId").notNull(),
  itemName: varchar("itemName", { length: 255 }),
  type: mysqlEnum("type", ["preventive", "corrective", "predictive", "inspection", "replacement", "upgrade", "other"]).default("preventive").notNull(),
  status: mysqlEnum("status", ["scheduled", "in_progress", "completed", "cancelled"]).default("completed").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  findings: text("findings"),
  actions: text("actions"),
  technician: varchar("technician", { length: 255 }),
  scheduledDate: date("scheduledDate"),
  executedDate: date("executedDate"),
  durationHours: decimal("durationHours", { precision: 5, scale: 2 }),
  cost: decimal("cost", { precision: 12, scale: 2 }),
  nextMaintenanceDate: date("nextMaintenanceDate"),
  beforePhotoUrl: text("beforePhotoUrl"),
  beforePhotoKey: varchar("beforePhotoKey", { length: 500 }),
  afterPhotoUrl: text("afterPhotoUrl"),
  afterPhotoKey: varchar("afterPhotoKey", { length: 500 }),
  clientSignatureUrl: text("clientSignatureUrl"),
  clientSignatureKey: varchar("clientSignatureKey", { length: 500 }),
  clientName: varchar("clientName", { length: 255 }),
  reportGenerated: boolean("reportGenerated").default(false),
  policyId: int("policyId"),
  programId: int("programId"),
  createdByUserId: int("createdByUserId"),
  createdByUserName: varchar("createdByUserName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CabledMaintenanceLog = typeof cabledMaintenanceLog.$inferSelect;
export type InsertCabledMaintenanceLog = typeof cabledMaintenanceLog.$inferInsert;

export const cabledMaintenancePrograms = mysqlTable("cabled_maintenance_programs", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  policyId: int("policyId"),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  totalVisits: int("totalVisits").notNull(),
  completedVisits: int("completedVisits").default(0).notNull(),
  frequency: mysqlEnum("frequency", ["monthly", "bimonthly", "quarterly", "biannual", "annual", "custom"]).default("quarterly").notNull(),
  startDate: date("startDate").notNull(),
  endDate: date("endDate").notNull(),
  technician: varchar("technician", { length: 255 }),
  schedule: varchar("schedule", { length: 100 }),
  visitWeekStart: date("visitWeekStart"),
  programMonth: varchar("programMonth", { length: 20 }),
  programYear: varchar("programYear", { length: 10 }),
  status: mysqlEnum("status", ["active", "completed", "cancelled"]).default("active").notNull(),
  createdByUserId: int("createdByUserId"),
  createdByUserName: varchar("createdByUserName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CabledMaintenanceProgram = typeof cabledMaintenancePrograms.$inferSelect;
export type InsertCabledMaintenanceProgram = typeof cabledMaintenancePrograms.$inferInsert;

export const cabledMaintenanceProgramItems = mysqlTable("cabled_maintenance_program_items", {
  id: int("id").autoincrement().primaryKey(),
  programId: int("programId").notNull(),
  tenantId: int("tenantId").notNull(),
  category: mysqlEnum("category", ["switches", "patch_panels", "outlets", "ducts"]).notNull(),
  itemId: int("itemId").notNull(),
  itemName: varchar("itemName", { length: 255 }),
  itemLocation: varchar("itemLocation", { length: 255 }),
  area: varchar("area", { length: 255 }),
  requiresLift: boolean("requiresLift").default(false),
  noTechnicians: int("noTechnicians").default(1),
  observations: text("observations"),
  sortOrder: int("sortOrder").default(0),
  scheduledDays: varchar("scheduledDays", { length: 50 }),
  scheduledDates: text("scheduledDates"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CabledMaintenanceProgramItem = typeof cabledMaintenanceProgramItems.$inferSelect;
export type InsertCabledMaintenanceProgramItem = typeof cabledMaintenanceProgramItems.$inferInsert;

// ═══════════════════════════════════════════════════════════════════════════════
// VOCEO (Sistema de Voceo / Paging)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Amplificadores ───────────────────────────────────────────────────────────
export const pagingAmplifiers = mysqlTable("paging_amplifiers", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  branchId: int("branchId"),
  idAmplifier: varchar("idAmplifier", { length: 100 }),
  marca: varchar("marca", { length: 100 }),
  modelo: varchar("modelo", { length: 100 }),
  serie: varchar("serie", { length: 100 }),
  tipo: mysqlEnum("tipo", ["monocanal", "multicanal", "matricial", "ip", "otro"]).default("monocanal"),
  potencia: varchar("potencia", { length: 50 }),       // 100W, 500W
  canales: int("canales").default(1),
  zonas: int("zonas").default(1),
  ip: varchar("ip", { length: 45 }),
  rack: varchar("rack", { length: 100 }),
  unidadRack: varchar("unidadRack", { length: 20 }),
  area: varchar("area", { length: 255 }),
  edificio: varchar("edificio", { length: 255 }),
  proveedor: varchar("proveedor", { length: 255 }),
  fechaCompra: date("fechaCompra"),
  garantiaExpiracion: date("garantiaExpiracion"),
  po: varchar("po", { length: 100 }),
  invoiceNumber: varchar("invoiceNumber", { length: 100 }),
  amount: decimal("amount", { precision: 12, scale: 2 }),
  slaTier: varchar("slaTier", { length: 10 }),
  rfidTag: varchar("rfidTag", { length: 50 }),
  status: mysqlEnum("status", ["active", "inactive", "maintenance", "retired", "damaged", "warranty"]).default("active").notNull(),
  observaciones: text("observaciones"),
  fotoUrl: text("fotoUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PagingAmplifier = typeof pagingAmplifiers.$inferSelect;
export type InsertPagingAmplifier = typeof pagingAmplifiers.$inferInsert;

// ─── Bocinas / Altavoces ──────────────────────────────────────────────────────
export const pagingSpeakers = mysqlTable("paging_speakers", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  branchId: int("branchId"),
  idSpeaker: varchar("idSpeaker", { length: 100 }),
  marca: varchar("marca", { length: 100 }),
  modelo: varchar("modelo", { length: 100 }),
  serie: varchar("serie", { length: 100 }),
  tipo: mysqlEnum("tipo", ["techo", "pared", "columna", "cuerno", "subwoofer", "otro"]).default("techo"),
  potencia: varchar("potencia", { length: 50 }),       // 6W, 10W
  impedancia: varchar("impedancia", { length: 50 }),   // 8 Ohm, 100V
  zona: varchar("zona", { length: 100 }),
  amplificadorId: int("amplificadorId"),
  area: varchar("area", { length: 255 }),
  edificio: varchar("edificio", { length: 255 }),
  proveedor: varchar("proveedor", { length: 255 }),
  fechaCompra: date("fechaCompra"),
  garantiaExpiracion: date("garantiaExpiracion"),
  po: varchar("po", { length: 100 }),
  invoiceNumber: varchar("invoiceNumber", { length: 100 }),
  amount: decimal("amount", { precision: 12, scale: 2 }),
  slaTier: varchar("slaTier", { length: 10 }),
  rfidTag: varchar("rfidTag", { length: 50 }),
  status: mysqlEnum("status", ["active", "inactive", "maintenance", "retired", "damaged", "warranty"]).default("active").notNull(),
  observaciones: text("observaciones"),
  fotoUrl: text("fotoUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PagingSpeaker = typeof pagingSpeakers.$inferSelect;
export type InsertPagingSpeaker = typeof pagingSpeakers.$inferInsert;

// ─── Consolas / Micrófonos de voceo ──────────────────────────────────────────
export const pagingConsoles = mysqlTable("paging_consoles", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  branchId: int("branchId"),
  idConsole: varchar("idConsole", { length: 100 }),
  marca: varchar("marca", { length: 100 }),
  modelo: varchar("modelo", { length: 100 }),
  serie: varchar("serie", { length: 100 }),
  tipo: mysqlEnum("tipo", ["microfono_paging", "consola_ip", "telefono_paging", "panel_control", "otro"]).default("microfono_paging"),
  zonas: int("zonas").default(1),
  ip: varchar("ip", { length: 45 }),
  area: varchar("area", { length: 255 }),
  edificio: varchar("edificio", { length: 255 }),
  amplificadorId: int("amplificadorId"),
  proveedor: varchar("proveedor", { length: 255 }),
  fechaCompra: date("fechaCompra"),
  garantiaExpiracion: date("garantiaExpiracion"),
  po: varchar("po", { length: 100 }),
  invoiceNumber: varchar("invoiceNumber", { length: 100 }),
  amount: decimal("amount", { precision: 12, scale: 2 }),
  slaTier: varchar("slaTier", { length: 10 }),
  rfidTag: varchar("rfidTag", { length: 50 }),
  status: mysqlEnum("status", ["active", "inactive", "maintenance", "retired", "damaged", "warranty"]).default("active").notNull(),
  observaciones: text("observaciones"),
  fotoUrl: text("fotoUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PagingConsole = typeof pagingConsoles.$inferSelect;
export type InsertPagingConsole = typeof pagingConsoles.$inferInsert;

// ─── Fuentes de poder / UPS Voceo ─────────────────────────────────────────────
export const pagingPowerSupplies = mysqlTable("paging_power_supplies", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  branchId: int("branchId"),
  idPower: varchar("idPower", { length: 100 }),
  marca: varchar("marca", { length: 100 }),
  modelo: varchar("modelo", { length: 100 }),
  serie: varchar("serie", { length: 100 }),
  tipo: mysqlEnum("tipo", ["ups", "fuente_regulada", "bateria_respaldo", "otro"]).default("ups"),
  capacidad: varchar("capacidad", { length: 50 }),     // 1000VA, 500W
  area: varchar("area", { length: 255 }),
  edificio: varchar("edificio", { length: 255 }),
  proveedor: varchar("proveedor", { length: 255 }),
  fechaCompra: date("fechaCompra"),
  garantiaExpiracion: date("garantiaExpiracion"),
  po: varchar("po", { length: 100 }),
  invoiceNumber: varchar("invoiceNumber", { length: 100 }),
  amount: decimal("amount", { precision: 12, scale: 2 }),
  slaTier: varchar("slaTier", { length: 10 }),
  rfidTag: varchar("rfidTag", { length: 50 }),
  status: mysqlEnum("status", ["active", "inactive", "maintenance", "retired", "damaged", "warranty"]).default("active").notNull(),
  observaciones: text("observaciones"),
  fotoUrl: text("fotoUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PagingPowerSupply = typeof pagingPowerSupplies.$inferSelect;
export type InsertPagingPowerSupply = typeof pagingPowerSupplies.$inferInsert;

// ─── Registro de mantenimiento — Voceo ───────────────────────────────────────
export const pagingMaintenanceLog = mysqlTable("paging_maintenance_log", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  category: mysqlEnum("category", ["amplifiers", "speakers", "consoles", "power_supplies"]).notNull(),
  itemId: int("itemId").notNull(),
  itemName: varchar("itemName", { length: 255 }),
  type: mysqlEnum("type", ["preventive", "corrective", "predictive", "inspection", "replacement", "upgrade", "other"]).default("preventive").notNull(),
  status: mysqlEnum("status", ["scheduled", "in_progress", "completed", "cancelled"]).default("completed").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  findings: text("findings"),
  actions: text("actions"),
  technician: varchar("technician", { length: 255 }),
  scheduledDate: date("scheduledDate"),
  executedDate: date("executedDate"),
  durationHours: decimal("durationHours", { precision: 5, scale: 2 }),
  cost: decimal("cost", { precision: 12, scale: 2 }),
  nextMaintenanceDate: date("nextMaintenanceDate"),
  beforePhotoUrl: text("beforePhotoUrl"),
  beforePhotoKey: varchar("beforePhotoKey", { length: 500 }),
  afterPhotoUrl: text("afterPhotoUrl"),
  afterPhotoKey: varchar("afterPhotoKey", { length: 500 }),
  clientSignatureUrl: text("clientSignatureUrl"),
  clientSignatureKey: varchar("clientSignatureKey", { length: 500 }),
  clientName: varchar("clientName", { length: 255 }),
  reportGenerated: boolean("reportGenerated").default(false),
  policyId: int("policyId"),
  programId: int("programId"),
  createdByUserId: int("createdByUserId"),
  createdByUserName: varchar("createdByUserName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PagingMaintenanceLog = typeof pagingMaintenanceLog.$inferSelect;
export type InsertPagingMaintenanceLog = typeof pagingMaintenanceLog.$inferInsert;

export const pagingMaintenancePrograms = mysqlTable("paging_maintenance_programs", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  policyId: int("policyId"),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  totalVisits: int("totalVisits").notNull(),
  completedVisits: int("completedVisits").default(0).notNull(),
  frequency: mysqlEnum("frequency", ["monthly", "bimonthly", "quarterly", "biannual", "annual", "custom"]).default("quarterly").notNull(),
  startDate: date("startDate").notNull(),
  endDate: date("endDate").notNull(),
  technician: varchar("technician", { length: 255 }),
  schedule: varchar("schedule", { length: 100 }),
  visitWeekStart: date("visitWeekStart"),
  programMonth: varchar("programMonth", { length: 20 }),
  programYear: varchar("programYear", { length: 10 }),
  status: mysqlEnum("status", ["active", "completed", "cancelled"]).default("active").notNull(),
  createdByUserId: int("createdByUserId"),
  createdByUserName: varchar("createdByUserName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PagingMaintenanceProgram = typeof pagingMaintenancePrograms.$inferSelect;
export type InsertPagingMaintenanceProgram = typeof pagingMaintenancePrograms.$inferInsert;

export const pagingMaintenanceProgramItems = mysqlTable("paging_maintenance_program_items", {
  id: int("id").autoincrement().primaryKey(),
  programId: int("programId").notNull(),
  tenantId: int("tenantId").notNull(),
  category: mysqlEnum("category", ["amplifiers", "speakers", "consoles", "power_supplies"]).notNull(),
  itemId: int("itemId").notNull(),
  itemName: varchar("itemName", { length: 255 }),
  itemLocation: varchar("itemLocation", { length: 255 }),
  area: varchar("area", { length: 255 }),
  requiresLift: boolean("requiresLift").default(false),
  noTechnicians: int("noTechnicians").default(1),
  observations: text("observations"),
  sortOrder: int("sortOrder").default(0),
  scheduledDays: varchar("scheduledDays", { length: 50 }),
  scheduledDates: text("scheduledDates"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PagingMaintenanceProgramItem = typeof pagingMaintenanceProgramItems.$inferSelect;
export type InsertPagingMaintenanceProgramItem = typeof pagingMaintenanceProgramItems.$inferInsert;
