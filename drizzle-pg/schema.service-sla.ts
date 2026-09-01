import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
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
  branches,
  serviceTickets,
  tenants,
} from "./schema";

export const servicePolicies = pgTable(
  "service_policies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id"),
    policyNumber: varchar("policy_number", { length: 100 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    status: varchar("status", { length: 32 }).notNull().default("draft"),
    policyType: varchar("policy_type", { length: 32 }).notNull().default("maintenance"),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    renewalDate: date("renewal_date"),
    monthlyValue: numeric("monthly_value", { precision: 14, scale: 2 }),
    annualValue: numeric("annual_value", { precision: 14, scale: 2 }),
    currency: varchar("currency", { length: 3 }).notNull().default("MXN"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  table => ({
    tenantIdIdUnique: unique("service_policies_tenant_id_id_uq").on(
      table.tenantId,
      table.id,
    ),
    tenantNumberUnique: uniqueIndex("service_policies_tenant_number_uq").on(
      table.tenantId,
      table.policyNumber,
    ),
    tenantStatusIdx: index("service_policies_tenant_status_idx").on(
      table.tenantId,
      table.status,
    ),
    tenantBranchIdx: index("service_policies_tenant_branch_idx").on(
      table.tenantId,
      table.branchId,
    ),
    tenantBranchFk: foreignKey({
      name: "service_policies_tenant_branch_fk",
      columns: [table.tenantId, table.branchId],
      foreignColumns: [branches.tenantId, branches.id],
    }).onDelete("restrict"),
    statusCheck: check(
      "service_policies_status_ck",
      sql`${table.status} in ('draft','active','suspended','expired','cancelled')`,
    ),
    typeCheck: check(
      "service_policies_type_ck",
      sql`${table.policyType} in ('maintenance','warranty','support','comprehensive')`,
    ),
    datesCheck: check(
      "service_policies_dates_ck",
      sql`${table.endDate} >= ${table.startDate}`,
    ),
    renewalCheck: check(
      "service_policies_renewal_ck",
      sql`${table.renewalDate} is null or ${table.renewalDate} >= ${table.startDate}`,
    ),
    valuesCheck: check(
      "service_policies_values_ck",
      sql`(${table.monthlyValue} is null or ${table.monthlyValue} >= 0) and (${table.annualValue} is null or ${table.annualValue} >= 0)`,
    ),
  }),
);

export const servicePolicyServices = pgTable(
  "service_policy_services",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    policyId: uuid("policy_id").notNull(),
    serviceCode: varchar("service_code", { length: 64 }),
    serviceName: varchar("service_name", { length: 255 }).notNull(),
    description: text("description"),
    frequency: varchar("frequency", { length: 32 }).notNull().default("on_demand"),
    isIncluded: boolean("is_included").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  table => ({
    tenantIdIdUnique: unique("service_policy_services_tenant_id_id_uq").on(
      table.tenantId,
      table.id,
    ),
    policyIdx: index("service_policy_services_policy_idx").on(
      table.tenantId,
      table.policyId,
    ),
    policyCodeUnique: uniqueIndex("service_policy_services_policy_code_uq")
      .on(table.tenantId, table.policyId, table.serviceCode)
      .where(sql`${table.serviceCode} is not null`),
    tenantPolicyFk: foreignKey({
      name: "service_policy_services_tenant_policy_fk",
      columns: [table.tenantId, table.policyId],
      foreignColumns: [servicePolicies.tenantId, servicePolicies.id],
    }).onDelete("cascade"),
    frequencyCheck: check(
      "service_policy_services_frequency_ck",
      sql`${table.frequency} in ('on_demand','monthly','quarterly','biannual','annual')`,
    ),
  }),
);

export const servicePolicySlaRules = pgTable(
  "service_policy_sla_rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    policyId: uuid("policy_id").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    priority: varchar("priority", { length: 16 }).notNull(),
    responseTargetMinutes: integer("response_target_minutes").notNull(),
    resolutionTargetMinutes: integer("resolution_target_minutes").notNull(),
    escalationTargetMinutes: integer("escalation_target_minutes"),
    penaltyPerHour: numeric("penalty_per_hour", { precision: 14, scale: 2 }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  table => ({
    tenantIdIdUnique: unique("service_policy_sla_rules_tenant_id_id_uq").on(
      table.tenantId,
      table.id,
    ),
    tenantPolicyIdUnique: unique("service_policy_sla_rules_tenant_policy_id_uq").on(
      table.tenantId,
      table.policyId,
      table.id,
    ),
    policyPriorityUnique: uniqueIndex("service_policy_sla_rules_policy_priority_uq").on(
      table.tenantId,
      table.policyId,
      table.priority,
    ),
    activeIdx: index("service_policy_sla_rules_active_idx").on(
      table.tenantId,
      table.policyId,
      table.isActive,
    ),
    tenantPolicyFk: foreignKey({
      name: "service_policy_sla_rules_tenant_policy_fk",
      columns: [table.tenantId, table.policyId],
      foreignColumns: [servicePolicies.tenantId, servicePolicies.id],
    }).onDelete("cascade"),
    priorityCheck: check(
      "service_policy_sla_rules_priority_ck",
      sql`${table.priority} in ('critical','high','medium','low')`,
    ),
    targetsCheck: check(
      "service_policy_sla_rules_targets_ck",
      sql`${table.responseTargetMinutes} > 0 and ${table.resolutionTargetMinutes} > 0 and ${table.resolutionTargetMinutes} >= ${table.responseTargetMinutes} and (${table.escalationTargetMinutes} is null or ${table.escalationTargetMinutes} > 0) and (${table.penaltyPerHour} is null or ${table.penaltyPerHour} >= 0)`,
    ),
  }),
);

export const serviceTicketSlaSnapshots = pgTable(
  "service_ticket_sla_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    serviceTicketId: uuid("service_ticket_id").notNull(),
    policyId: uuid("policy_id").notNull(),
    slaRuleId: uuid("sla_rule_id").notNull(),
    policyNumberSnapshot: varchar("policy_number_snapshot", { length: 100 }).notNull(),
    policyNameSnapshot: varchar("policy_name_snapshot", { length: 255 }).notNull(),
    ruleNameSnapshot: varchar("rule_name_snapshot", { length: 255 }).notNull(),
    prioritySnapshot: varchar("priority_snapshot", { length: 16 }).notNull(),
    responseTargetMinutes: integer("response_target_minutes").notNull(),
    resolutionTargetMinutes: integer("resolution_target_minutes").notNull(),
    escalationTargetMinutes: integer("escalation_target_minutes"),
    slaStartedAt: timestamp("sla_started_at", { withTimezone: true, mode: "date" }).notNull(),
    responseDeadline: timestamp("response_deadline", { withTimezone: true, mode: "date" }).notNull(),
    resolutionDeadline: timestamp("resolution_deadline", { withTimezone: true, mode: "date" }).notNull(),
    source: varchar("source", { length: 32 }).notNull().default("policy"),
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
    tenantIdIdUnique: unique("service_ticket_sla_snapshots_tenant_id_id_uq").on(
      table.tenantId,
      table.id,
    ),
    ticketCreatedIdx: index("service_ticket_sla_snapshots_ticket_created_idx").on(
      table.tenantId,
      table.serviceTicketId,
      table.createdAt.desc(),
      table.id.desc(),
    ),
    policyIdx: index("service_ticket_sla_snapshots_policy_idx").on(
      table.tenantId,
      table.policyId,
      table.createdAt.desc(),
    ),
    tenantTicketFk: foreignKey({
      name: "service_ticket_sla_snapshots_tenant_ticket_fk",
      columns: [table.tenantId, table.serviceTicketId],
      foreignColumns: [serviceTickets.tenantId, serviceTickets.id],
    }).onDelete("cascade"),
    tenantPolicyRuleFk: foreignKey({
      name: "service_ticket_sla_snapshots_tenant_policy_rule_fk",
      columns: [table.tenantId, table.policyId, table.slaRuleId],
      foreignColumns: [
        servicePolicySlaRules.tenantId,
        servicePolicySlaRules.policyId,
        servicePolicySlaRules.id,
      ],
    }).onDelete("restrict"),
    priorityCheck: check(
      "service_ticket_sla_snapshots_priority_ck",
      sql`${table.prioritySnapshot} in ('critical','high','medium','low')`,
    ),
    targetsCheck: check(
      "service_ticket_sla_snapshots_targets_ck",
      sql`${table.responseTargetMinutes} > 0 and ${table.resolutionTargetMinutes} > 0 and ${table.resolutionTargetMinutes} >= ${table.responseTargetMinutes} and (${table.escalationTargetMinutes} is null or ${table.escalationTargetMinutes} > 0)`,
    ),
    deadlinesCheck: check(
      "service_ticket_sla_snapshots_deadlines_ck",
      sql`${table.responseDeadline} >= ${table.slaStartedAt} and ${table.resolutionDeadline} >= ${table.responseDeadline}`,
    ),
    sourceCheck: check(
      "service_ticket_sla_snapshots_source_ck",
      sql`${table.source} in ('policy','manual_override')`,
    ),
  }),
);
