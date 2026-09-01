import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import {
  assets,
  branches,
  serviceTickets,
  systemsCatalog,
  tenantUsers,
  tenants,
} from "./schema";
import { servicePolicies } from "./schema.service-sla";

export const maintenanceOrders = pgTable(
  "maintenance_orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id").notNull(),
    policyId: uuid("policy_id"),
    serviceTicketId: uuid("service_ticket_id"),
    systemId: uuid("system_id").references(() => systemsCatalog.id, {
      onDelete: "restrict",
    }),
    orderNumber: varchar("order_number", { length: 64 }).notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),
    maintenanceType: varchar("maintenance_type", { length: 32 })
      .notNull()
      .default("preventive"),
    status: varchar("status", { length: 32 }).notNull().default("planned"),
    scheduledStart: timestamp("scheduled_start", { withTimezone: true, mode: "date" }),
    scheduledEnd: timestamp("scheduled_end", { withTimezone: true, mode: "date" }),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
    customerContactName: varchar("customer_contact_name", { length: 255 }),
    customerContactEmail: varchar("customer_contact_email", { length: 320 }),
    technicalSummary: text("technical_summary"),
    closureNotes: text("closure_notes"),
    actualCost: numeric("actual_cost", { precision: 14, scale: 2 }),
    currency: varchar("currency", { length: 3 }).notNull().default("MXN"),
    createdByUserId: uuid("created_by_user_id"),
    completedByUserId: uuid("completed_by_user_id"),
    createdByName: varchar("created_by_name", { length: 255 }),
    completedByName: varchar("completed_by_name", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  table => ({
    tenantIdIdUnique: unique("maintenance_orders_tenant_id_id_uq").on(
      table.tenantId,
      table.id,
    ),
    tenantNumberUnique: uniqueIndex("maintenance_orders_tenant_number_uq").on(
      table.tenantId,
      table.orderNumber,
    ),
    tenantStatusIdx: index("maintenance_orders_tenant_status_idx").on(
      table.tenantId,
      table.status,
      table.createdAt.desc(),
    ),
    branchIdx: index("maintenance_orders_branch_idx").on(
      table.tenantId,
      table.branchId,
      table.createdAt.desc(),
    ),
    tenantBranchFk: foreignKey({
      name: "maintenance_orders_tenant_branch_fk",
      columns: [table.tenantId, table.branchId],
      foreignColumns: [branches.tenantId, branches.id],
    }).onDelete("restrict"),
    tenantPolicyFk: foreignKey({
      name: "maintenance_orders_tenant_policy_fk",
      columns: [table.tenantId, table.policyId],
      foreignColumns: [servicePolicies.tenantId, servicePolicies.id],
    }).onDelete("restrict"),
    tenantTicketFk: foreignKey({
      name: "maintenance_orders_tenant_ticket_fk",
      columns: [table.tenantId, table.serviceTicketId],
      foreignColumns: [serviceTickets.tenantId, serviceTickets.id],
    }).onDelete("restrict"),
    createdByMembershipFk: foreignKey({
      name: "maintenance_orders_created_by_membership_fk",
      columns: [table.tenantId, table.createdByUserId],
      foreignColumns: [tenantUsers.tenantId, tenantUsers.userId],
    }).onDelete("restrict"),
    completedByMembershipFk: foreignKey({
      name: "maintenance_orders_completed_by_membership_fk",
      columns: [table.tenantId, table.completedByUserId],
      foreignColumns: [tenantUsers.tenantId, tenantUsers.userId],
    }).onDelete("restrict"),
    typeCheck: check(
      "maintenance_orders_type_ck",
      sql`${table.maintenanceType} in ('preventive','corrective','predictive','inspection')`,
    ),
    statusCheck: check(
      "maintenance_orders_status_ck",
      sql`${table.status} in ('planned','scheduled','in_progress','review','completed','cancelled')`,
    ),
  }),
);

export const maintenanceOrderTechnicians = pgTable(
  "maintenance_order_technicians",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    maintenanceOrderId: uuid("maintenance_order_id").notNull(),
    userId: uuid("user_id").notNull(),
    role: varchar("role", { length: 32 }).notNull().default("technician"),
    assignedAt: timestamp("assigned_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  table => ({
    tenantIdIdUnique: unique("maintenance_order_technicians_tenant_id_id_uq").on(
      table.tenantId,
      table.id,
    ),
    orderUserUnique: uniqueIndex("maintenance_order_technicians_order_user_uq").on(
      table.tenantId,
      table.maintenanceOrderId,
      table.userId,
    ),
    tenantOrderFk: foreignKey({
      name: "maintenance_order_technicians_tenant_order_fk",
      columns: [table.tenantId, table.maintenanceOrderId],
      foreignColumns: [maintenanceOrders.tenantId, maintenanceOrders.id],
    }).onDelete("cascade"),
    membershipFk: foreignKey({
      name: "maintenance_order_technicians_membership_fk",
      columns: [table.tenantId, table.userId],
      foreignColumns: [tenantUsers.tenantId, tenantUsers.userId],
    }).onDelete("restrict"),
    roleCheck: check(
      "maintenance_order_technicians_role_ck",
      sql`${table.role} in ('lead','technician','observer')`,
    ),
  }),
);

export const maintenanceOrderAssets = pgTable(
  "maintenance_order_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    maintenanceOrderId: uuid("maintenance_order_id").notNull(),
    assetId: uuid("asset_id").notNull(),
    sequence: integer("sequence").notNull().default(0),
    scopeStatus: varchar("scope_status", { length: 32 }).notNull().default("planned"),
    assetCodeSnapshot: varchar("asset_code_snapshot", { length: 128 }).notNull(),
    assetTypeCodeSnapshot: varchar("asset_type_code_snapshot", { length: 64 }).notNull(),
    assetTypeNameSnapshot: varchar("asset_type_name_snapshot", { length: 255 }).notNull(),
    locationSnapshot: text("location_snapshot"),
    manufacturerSnapshot: varchar("manufacturer_snapshot", { length: 255 }),
    modelSnapshot: varchar("model_snapshot", { length: 255 }),
    serialNumberSnapshot: varchar("serial_number_snapshot", { length: 255 }),
    conditionBefore: text("condition_before"),
    conditionAfter: text("condition_after"),
    workSummary: text("work_summary"),
    notes: text("notes"),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  table => ({
    tenantIdIdUnique: unique("maintenance_order_assets_tenant_id_id_uq").on(
      table.tenantId,
      table.id,
    ),
    orderAssetUnique: uniqueIndex("maintenance_order_assets_order_asset_uq").on(
      table.tenantId,
      table.maintenanceOrderId,
      table.assetId,
    ),
    orderSequenceIdx: index("maintenance_order_assets_order_sequence_idx").on(
      table.tenantId,
      table.maintenanceOrderId,
      table.sequence,
      table.assetCodeSnapshot,
    ),
    tenantOrderFk: foreignKey({
      name: "maintenance_order_assets_tenant_order_fk",
      columns: [table.tenantId, table.maintenanceOrderId],
      foreignColumns: [maintenanceOrders.tenantId, maintenanceOrders.id],
    }).onDelete("cascade"),
    tenantAssetFk: foreignKey({
      name: "maintenance_order_assets_tenant_asset_fk",
      columns: [table.tenantId, table.assetId],
      foreignColumns: [assets.tenantId, assets.id],
    }).onDelete("restrict"),
    scopeStatusCheck: check(
      "maintenance_order_assets_scope_status_ck",
      sql`${table.scopeStatus} in ('planned','in_progress','completed','skipped','not_applicable')`,
    ),
  }),
);

export const maintenanceFindings = pgTable(
  "maintenance_findings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    maintenanceOrderId: uuid("maintenance_order_id").notNull(),
    maintenanceOrderAssetId: uuid("maintenance_order_asset_id"),
    category: varchar("category", { length: 64 }).notNull().default("other"),
    severity: varchar("severity", { length: 16 }).notNull().default("medium"),
    status: varchar("status", { length: 32 }).notNull().default("open"),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description").notNull(),
    rootCause: text("root_cause"),
    recommendation: text("recommendation"),
    requiresFollowUp: boolean("requires_follow_up").notNull().default(false),
    followUpDueAt: timestamp("follow_up_due_at", { withTimezone: true, mode: "date" }),
    createdByUserId: uuid("created_by_user_id"),
    createdByName: varchar("created_by_name", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  table => ({
    tenantIdIdUnique: unique("maintenance_findings_tenant_id_id_uq").on(
      table.tenantId,
      table.id,
    ),
    orderIdx: index("maintenance_findings_order_idx").on(
      table.tenantId,
      table.maintenanceOrderId,
      table.severity,
      table.createdAt,
    ),
    tenantOrderFk: foreignKey({
      name: "maintenance_findings_tenant_order_fk",
      columns: [table.tenantId, table.maintenanceOrderId],
      foreignColumns: [maintenanceOrders.tenantId, maintenanceOrders.id],
    }).onDelete("cascade"),
    tenantOrderAssetFk: foreignKey({
      name: "maintenance_findings_tenant_order_asset_fk",
      columns: [table.tenantId, table.maintenanceOrderAssetId],
      foreignColumns: [maintenanceOrderAssets.tenantId, maintenanceOrderAssets.id],
    }).onDelete("cascade"),
    createdByMembershipFk: foreignKey({
      name: "maintenance_findings_created_by_membership_fk",
      columns: [table.tenantId, table.createdByUserId],
      foreignColumns: [tenantUsers.tenantId, tenantUsers.userId],
    }).onDelete("restrict"),
    categoryCheck: check(
      "maintenance_findings_category_ck",
      sql`${table.category} in ('damage','misalignment','connectivity','configuration','cabling','environmental','wear','end_of_life','other')`,
    ),
    severityCheck: check(
      "maintenance_findings_severity_ck",
      sql`${table.severity} in ('info','low','medium','high','critical')`,
    ),
    statusCheck: check(
      "maintenance_findings_status_ck",
      sql`${table.status} in ('open','corrected','monitor','recommendation','accepted_risk')`,
    ),
  }),
);

export const maintenanceActions = pgTable(
  "maintenance_actions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    maintenanceOrderId: uuid("maintenance_order_id").notNull(),
    findingId: uuid("finding_id").notNull(),
    actionType: varchar("action_type", { length: 32 }).notNull().default("other"),
    status: varchar("status", { length: 32 }).notNull().default("planned"),
    description: text("description").notNull(),
    outcome: text("outcome"),
    performedByUserId: uuid("performed_by_user_id"),
    performedByName: varchar("performed_by_name", { length: 255 }),
    performedAt: timestamp("performed_at", { withTimezone: true, mode: "date" }),
    laborMinutes: integer("labor_minutes"),
    materialCost: numeric("material_cost", { precision: 14, scale: 2 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  table => ({
    tenantIdIdUnique: unique("maintenance_actions_tenant_id_id_uq").on(
      table.tenantId,
      table.id,
    ),
    findingIdx: index("maintenance_actions_finding_idx").on(
      table.tenantId,
      table.findingId,
      table.createdAt,
    ),
    tenantOrderFk: foreignKey({
      name: "maintenance_actions_tenant_order_fk",
      columns: [table.tenantId, table.maintenanceOrderId],
      foreignColumns: [maintenanceOrders.tenantId, maintenanceOrders.id],
    }).onDelete("cascade"),
    tenantFindingFk: foreignKey({
      name: "maintenance_actions_tenant_finding_fk",
      columns: [table.tenantId, table.findingId],
      foreignColumns: [maintenanceFindings.tenantId, maintenanceFindings.id],
    }).onDelete("cascade"),
    performedByMembershipFk: foreignKey({
      name: "maintenance_actions_performed_by_membership_fk",
      columns: [table.tenantId, table.performedByUserId],
      foreignColumns: [tenantUsers.tenantId, tenantUsers.userId],
    }).onDelete("restrict"),
    typeCheck: check(
      "maintenance_actions_type_ck",
      sql`${table.actionType} in ('inspection','cleaning','adjustment','repair','replacement','configuration','cabling','testing','migration','recommendation','other')`,
    ),
    statusCheck: check(
      "maintenance_actions_status_ck",
      sql`${table.status} in ('planned','in_progress','completed','not_required')`,
    ),
  }),
);

export const maintenanceEvidence = pgTable(
  "maintenance_evidence",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    maintenanceOrderId: uuid("maintenance_order_id").notNull(),
    maintenanceOrderAssetId: uuid("maintenance_order_asset_id"),
    findingId: uuid("finding_id"),
    actionId: uuid("action_id"),
    stage: varchar("stage", { length: 16 }).notNull(),
    evidenceType: varchar("evidence_type", { length: 32 }).notNull().default("photo"),
    storageKey: varchar("storage_key", { length: 1000 }),
    fileUrl: text("file_url"),
    fileName: varchar("file_name", { length: 500 }),
    mimeType: varchar("mime_type", { length: 255 }),
    fileSha256: varchar("file_sha256", { length: 64 }),
    caption: text("caption"),
    capturedAt: timestamp("captured_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    capturedByUserId: uuid("captured_by_user_id"),
    capturedByName: varchar("captured_by_name", { length: 255 }),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  table => ({
    tenantIdIdUnique: unique("maintenance_evidence_tenant_id_id_uq").on(
      table.tenantId,
      table.id,
    ),
    orderAssetStageIdx: index("maintenance_evidence_order_asset_stage_idx").on(
      table.tenantId,
      table.maintenanceOrderId,
      table.maintenanceOrderAssetId,
      table.stage,
      table.capturedAt,
    ),
    tenantOrderFk: foreignKey({
      name: "maintenance_evidence_tenant_order_fk",
      columns: [table.tenantId, table.maintenanceOrderId],
      foreignColumns: [maintenanceOrders.tenantId, maintenanceOrders.id],
    }).onDelete("cascade"),
    tenantOrderAssetFk: foreignKey({
      name: "maintenance_evidence_tenant_order_asset_fk",
      columns: [table.tenantId, table.maintenanceOrderAssetId],
      foreignColumns: [maintenanceOrderAssets.tenantId, maintenanceOrderAssets.id],
    }).onDelete("cascade"),
    tenantFindingFk: foreignKey({
      name: "maintenance_evidence_tenant_finding_fk",
      columns: [table.tenantId, table.findingId],
      foreignColumns: [maintenanceFindings.tenantId, maintenanceFindings.id],
    }).onDelete("cascade"),
    tenantActionFk: foreignKey({
      name: "maintenance_evidence_tenant_action_fk",
      columns: [table.tenantId, table.actionId],
      foreignColumns: [maintenanceActions.tenantId, maintenanceActions.id],
    }).onDelete("cascade"),
    capturedByMembershipFk: foreignKey({
      name: "maintenance_evidence_captured_by_membership_fk",
      columns: [table.tenantId, table.capturedByUserId],
      foreignColumns: [tenantUsers.tenantId, tenantUsers.userId],
    }).onDelete("restrict"),
    stageCheck: check(
      "maintenance_evidence_stage_ck",
      sql`${table.stage} in ('before','during','after','supporting')`,
    ),
    typeCheck: check(
      "maintenance_evidence_type_ck",
      sql`${table.evidenceType} in ('photo','document','measurement','signature','other')`,
    ),
  }),
);

export const maintenanceOrderEvents = pgTable(
  "maintenance_order_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    maintenanceOrderId: uuid("maintenance_order_id").notNull(),
    eventType: varchar("event_type", { length: 64 }).notNull(),
    message: text("message"),
    actorUserId: uuid("actor_user_id"),
    actorName: varchar("actor_name", { length: 255 }),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  table => ({
    tenantIdIdUnique: unique("maintenance_order_events_tenant_id_id_uq").on(
      table.tenantId,
      table.id,
    ),
    orderCreatedIdx: index("maintenance_order_events_order_created_idx").on(
      table.tenantId,
      table.maintenanceOrderId,
      table.createdAt,
      table.id,
    ),
    tenantOrderFk: foreignKey({
      name: "maintenance_order_events_tenant_order_fk",
      columns: [table.tenantId, table.maintenanceOrderId],
      foreignColumns: [maintenanceOrders.tenantId, maintenanceOrders.id],
    }).onDelete("cascade"),
    actorMembershipFk: foreignKey({
      name: "maintenance_order_events_actor_membership_fk",
      columns: [table.tenantId, table.actorUserId],
      foreignColumns: [tenantUsers.tenantId, tenantUsers.userId],
    }).onDelete("restrict"),
    typeCheck: check(
      "maintenance_order_events_type_ck",
      sql`${table.eventType} in ('created','status_changed','technician_added','asset_added','asset_status_changed','finding_added','finding_updated','action_added','action_completed','evidence_added','comment_added','completed','reopened','cancelled')`,
    ),
  }),
);
