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
  status: mysqlEnum("status", ["active", "inactive", "maintenance", "retired"]).default("active").notNull(),
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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CctvIdf = typeof cctvIdfs.$inferSelect;
export type InsertCctvIdf = typeof cctvIdfs.$inferInsert;

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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CctvUps = typeof cctvUps.$inferSelect;
export type InsertCctvUps = typeof cctvUps.$inferInsert;
