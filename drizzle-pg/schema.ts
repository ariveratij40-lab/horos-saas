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
  time,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const tenants = pgTable(
  "tenants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 64 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),

    legacyTenantId: integer("legacy_tenant_id"),

    status: varchar("status", { length: 32 })
      .notNull()
      .default("active"),

    isActive: boolean("is_active")
      .notNull()
      .default(true),

    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).notNull().defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    }).notNull().defaultNow(),
  },
  table => ({
    codeUnique: uniqueIndex("tenants_code_uq").on(table.code),

    legacyTenantIdUnique: uniqueIndex(
      "tenants_legacy_tenant_id_uq",
    ).on(table.legacyTenantId),

    statusIdx: index("tenants_status_idx").on(table.status),
  }),
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    externalSubject: varchar("external_subject", {
      length: 255,
    }),

    email: varchar("email", {
      length: 320,
    }),

    name: varchar("name", {
      length: 255,
    }),

    platformRole: varchar("platform_role", {
      length: 32,
    }).notNull().default("user"),

    isActive: boolean("is_active")
      .notNull()
      .default(true),

    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).notNull().defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    }).notNull().defaultNow(),
  },
  table => ({
    externalSubjectUnique: uniqueIndex(
      "users_external_subject_uq",
    ).on(table.externalSubject),

    emailIdx: index("users_email_idx").on(table.email),
  }),
);

export const tenantUsers = pgTable(
  "tenant_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, {
        onDelete: "cascade",
      }),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    role: varchar("role", {
      length: 32,
    }).notNull().default("member"),

    isActive: boolean("is_active")
      .notNull()
      .default(true),

    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).notNull().defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    }).notNull().defaultNow(),
  },
  table => ({
    tenantUserUnique: uniqueIndex(
      "tenant_users_tenant_user_uq",
    ).on(
      table.tenantId,
      table.userId,
    ),

    tenantIdx: index(
      "tenant_users_tenant_idx",
    ).on(table.tenantId),

    userIdx: index(
      "tenant_users_user_idx",
    ).on(table.userId),
  }),
);

/* ============================================================================
 * HOROS INFRA-001
 * Canonical physical infrastructure foundation
 * Tenant-safe referential integrity
 * ========================================================================== */

export const branches = pgTable(
  "branches",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, {
        onDelete: "cascade",
      }),

    code: varchar("code", { length: 64 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),

    countryCode: varchar("country_code", {
      length: 2,
    }),

    state: varchar("state", {
      length: 128,
    }),

    city: varchar("city", {
      length: 128,
    }),

    timezone: varchar("timezone", {
      length: 128,
    }).notNull(),

    address: text("address"),

    status: varchar("status", {
      length: 32,
    })
      .notNull()
      .default("active"),

    isActive: boolean("is_active")
      .notNull()
      .default(true),

    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  table => ({
    tenantCodeUnique: uniqueIndex(
      "branches_tenant_code_uq",
    ).on(
      table.tenantId,
      table.code,
    ),

    tenantIdIdUnique: unique(
      "branches_tenant_id_id_uq",
    ).on(
      table.tenantId,
      table.id,
    ),

    tenantIdx: index(
      "branches_tenant_idx",
    ).on(table.tenantId),
  }),
);

export const locations = pgTable(
  "locations",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, {
        onDelete: "cascade",
      }),

    branchId: uuid("branch_id").notNull(),

    parentLocationId: uuid("parent_location_id"),

    locationType: varchar("location_type", {
      length: 32,
    }).notNull(),

    code: varchar("code", {
      length: 64,
    }).notNull(),

    name: varchar("name", {
      length: 255,
    }).notNull(),

    status: varchar("status", {
      length: 32,
    })
      .notNull()
      .default("active"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  table => ({
    branchCodeUnique: uniqueIndex(
      "locations_branch_code_uq",
    ).on(
      table.branchId,
      table.code,
    ),

    tenantIdIdUnique: unique(
      "locations_tenant_id_id_uq",
    ).on(
      table.tenantId,
      table.id,
    ),

    tenantBranchIdUnique: unique(
      "locations_tenant_branch_id_uq",
    ).on(
      table.tenantId,
      table.branchId,
      table.id,
    ),

    tenantIdx: index(
      "locations_tenant_idx",
    ).on(table.tenantId),

    branchIdx: index(
      "locations_branch_idx",
    ).on(table.branchId),

    parentIdx: index(
      "locations_parent_idx",
    ).on(table.parentLocationId),

    branchTenantFk: foreignKey({
      name: "locations_tenant_branch_fk",
      columns: [
        table.tenantId,
        table.branchId,
      ],
      foreignColumns: [
        branches.tenantId,
        branches.id,
      ],
    })
      .onDelete("cascade"),

    parentTenantFk: foreignKey({
      name: "locations_tenant_parent_fk",
      columns: [
        table.tenantId,
        table.parentLocationId,
      ],
      foreignColumns: [
        table.tenantId,
        table.id,
      ],
    })
      .onDelete("restrict"),
  }),
);

export const telecomSpaces = pgTable(
  "telecom_spaces",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, {
        onDelete: "cascade",
      }),

    branchId: uuid("branch_id").notNull(),

    locationId: uuid("location_id").notNull(),

    code: varchar("code", {
      length: 64,
    }).notNull(),

    name: varchar("name", {
      length: 255,
    }).notNull(),

    spaceType: varchar("space_type", {
      length: 32,
    }).notNull(),

    status: varchar("status", {
      length: 32,
    })
      .notNull()
      .default("active"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  table => ({
    branchCodeUnique: uniqueIndex(
      "telecom_spaces_branch_code_uq",
    ).on(
      table.branchId,
      table.code,
    ),

    tenantIdIdUnique: unique(
      "telecom_spaces_tenant_id_id_uq",
    ).on(
      table.tenantId,
      table.id,
    ),

    tenantBranchIdUnique: unique(
      "telecom_spaces_tenant_branch_id_uq",
    ).on(
      table.tenantId,
      table.branchId,
      table.id,
    ),

    tenantIdx: index(
      "telecom_spaces_tenant_idx",
    ).on(table.tenantId),

    branchIdx: index(
      "telecom_spaces_branch_idx",
    ).on(table.branchId),

    locationIdx: index(
      "telecom_spaces_location_idx",
    ).on(table.locationId),

    branchTenantFk: foreignKey({
      name: "telecom_spaces_tenant_branch_fk",
      columns: [
        table.tenantId,
        table.branchId,
      ],
      foreignColumns: [
        branches.tenantId,
        branches.id,
      ],
    })
      .onDelete("cascade"),

    locationTenantFk: foreignKey({
      name: "telecom_spaces_tenant_location_fk",
      columns: [
        table.tenantId,
        table.branchId,
        table.locationId,
      ],
      foreignColumns: [
        locations.tenantId,
        locations.branchId,
        locations.id,
      ],
    })
      .onDelete("restrict"),
  }),
);

export const racks = pgTable(
  "racks",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, {
        onDelete: "cascade",
      }),

    branchId: uuid("branch_id").notNull(),

    telecomSpaceId: uuid("telecom_space_id")
      .notNull(),

    code: varchar("code", {
      length: 64,
    }).notNull(),

    name: varchar("name", {
      length: 255,
    }).notNull(),

    rackType: varchar("rack_type", {
      length: 32,
    })
      .notNull()
      .default("rack"),

    rackUnits: varchar("rack_units", {
      length: 8,
    }),

    status: varchar("status", {
      length: 32,
    })
      .notNull()
      .default("active"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  table => ({
    telecomSpaceCodeUnique: uniqueIndex(
      "racks_space_code_uq",
    ).on(
      table.telecomSpaceId,
      table.code,
    ),

    tenantIdIdUnique: unique(
      "racks_tenant_id_id_uq",
    ).on(
      table.tenantId,
      table.id,
    ),

    tenantBranchIdUnique: unique(
      "racks_tenant_branch_id_uq",
    ).on(
      table.tenantId,
      table.branchId,
      table.id,
    ),

    tenantIdx: index(
      "racks_tenant_idx",
    ).on(table.tenantId),

    branchIdx: index(
      "racks_branch_idx",
    ).on(table.branchId),

    telecomSpaceIdx: index(
      "racks_telecom_space_idx",
    ).on(table.telecomSpaceId),

    telecomSpaceTenantFk: foreignKey({
      name: "racks_tenant_space_fk",
      columns: [
        table.tenantId,
        table.branchId,
        table.telecomSpaceId,
      ],
      foreignColumns: [
        telecomSpaces.tenantId,
        telecomSpaces.branchId,
        telecomSpaces.id,
      ],
    })
      .onDelete("cascade"),
  }),
);

/* ============================================================================
 * HOROS CORE-001A
 * Platform catalogs: managed systems + canonical asset types
 * ========================================================================== */

export const systemsCatalog = pgTable(
  "systems_catalog",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    code: varchar("code", {
      length: 64,
    }).notNull(),

    name: varchar("name", {
      length: 255,
    }).notNull(),

    description: text("description"),

    status: varchar("status", {
      length: 32,
    })
      .notNull()
      .default("active"),

    sortOrder: integer("sort_order")
      .notNull()
      .default(0),

    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  table => ({
    codeUnique: unique(
      "systems_catalog_code_uq",
    ).on(table.code),
  }),
);

export const assetTypes = pgTable(
  "asset_types",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    code: varchar("code", {
      length: 64,
    }).notNull(),

    name: varchar("name", {
      length: 255,
    }).notNull(),

    category: varchar("category", {
      length: 64,
    }).notNull(),

    description: text("description"),

    isInfrastructure: boolean(
      "is_infrastructure",
    )
      .notNull()
      .default(false),

    isPhysical: boolean(
      "is_physical",
    )
      .notNull()
      .default(true),

    status: varchar("status", {
      length: 32,
    })
      .notNull()
      .default("active"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  table => ({
    codeUnique: unique(
      "asset_types_code_uq",
    ).on(table.code),

    categoryIdx: index(
      "asset_types_category_idx",
    ).on(table.category),

    infrastructureIdx: index(
      "asset_types_infrastructure_idx",
    ).on(table.isInfrastructure),
  }),
);

/* ============================================================================
 * HOROS CORE-001B
 * Subscription plans + tenant system entitlements
 * ========================================================================== */

export const subscriptionPlans = pgTable(
  "subscription_plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    code: varchar("code", {
      length: 64,
    }).notNull(),

    name: varchar("name", {
      length: 255,
    }).notNull(),

    description: text("description"),

    includedSystemCount: integer(
      "included_system_count",
    ).notNull(),

    billingPeriod: varchar(
      "billing_period",
      { length: 32 },
    )
      .notNull()
      .default("monthly"),

    status: varchar("status", {
      length: 32,
    })
      .notNull()
      .default("active"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).notNull().defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    }).notNull().defaultNow(),
  },
  table => ({
    codeUnique: unique(
      "subscription_plans_code_uq",
    ).on(table.code),
  }),
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, {
        onDelete: "cascade",
      }),

    planId: uuid("plan_id")
      .notNull()
      .references(() => subscriptionPlans.id, {
        onDelete: "restrict",
      }),

    status: varchar("status", {
      length: 32,
    })
      .notNull()
      .default("active"),

    billingCycle: varchar("billing_cycle", {
      length: 32,
    })
      .notNull()
      .default("monthly"),

    startDate: timestamp("start_date", {
      withTimezone: true,
      mode: "date",
    }).notNull(),

    currentPeriodStart: timestamp(
      "current_period_start",
      {
        withTimezone: true,
        mode: "date",
      },
    ),

    currentPeriodEnd: timestamp(
      "current_period_end",
      {
        withTimezone: true,
        mode: "date",
      },
    ),

    trialEndsAt: timestamp("trial_ends_at", {
      withTimezone: true,
      mode: "date",
    }),

    cancelledAt: timestamp("cancelled_at", {
      withTimezone: true,
      mode: "date",
    }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).notNull().defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    }).notNull().defaultNow(),
  },
  table => ({
    tenantIdIdUnique: unique(
      "subscriptions_tenant_id_id_uq",
    ).on(
      table.tenantId,
      table.id,
    ),

    tenantIdx: index(
      "subscriptions_tenant_idx",
    ).on(table.tenantId),

    planIdx: index(
      "subscriptions_plan_idx",
    ).on(table.planId),
  }),
);

export const tenantSystemEntitlements = pgTable(
  "tenant_system_entitlements",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, {
        onDelete: "cascade",
      }),

    subscriptionId: uuid(
      "subscription_id",
    ).notNull(),

    systemId: uuid("system_id")
      .notNull()
      .references(() => systemsCatalog.id, {
        onDelete: "restrict",
      }),

    status: varchar("status", {
      length: 32,
    })
      .notNull()
      .default("enabled"),

    enabledAt: timestamp("enabled_at", {
      withTimezone: true,
      mode: "date",
    }).notNull().defaultNow(),

    disabledAt: timestamp("disabled_at", {
      withTimezone: true,
      mode: "date",
    }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).notNull().defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    }).notNull().defaultNow(),
  },
  table => ({
    tenantSubscriptionSystemUnique: unique(
      "tenant_system_entitlements_tenant_subscription_system_uq",
    ).on(
      table.tenantId,
      table.subscriptionId,
      table.systemId,
    ),

    tenantIdx: index(
      "tenant_system_entitlements_tenant_idx",
    ).on(table.tenantId),

    systemIdx: index(
      "tenant_system_entitlements_system_idx",
    ).on(table.systemId),

    subscriptionTenantFk: foreignKey({
      name: "tenant_system_entitlements_subscription_tenant_fk",
      columns: [
        table.tenantId,
        table.subscriptionId,
      ],
      foreignColumns: [
        subscriptions.tenantId,
        subscriptions.id,
      ],
    })
      .onDelete("cascade"),
  }),
);

/* ============================================================================
 * HOROS CORE-001C
 * Operational system activation per branch
 * ========================================================================== */


export const departments = pgTable(
  "departments",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, {
        onDelete: "cascade",
      }),

    code: varchar("code", {
      length: 64,
    }).notNull(),

    name: varchar("name", {
      length: 255,
    }).notNull(),

    description: text("description"),

    status: varchar("status", {
      length: 32,
    })
      .notNull()
      .default("active"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  table => ({
    tenantCodeUnique: unique(
      "departments_tenant_code_uq",
    ).on(
      table.tenantId,
      table.code,
    ),

    tenantIdIdUnique: unique(
      "departments_tenant_id_id_uq",
    ).on(
      table.tenantId,
      table.id,
    ),

    tenantIdx: index(
      "departments_tenant_idx",
    ).on(table.tenantId),
  }),
);

export const branchSystems = pgTable(
  "branch_systems",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, {
        onDelete: "cascade",
      }),

    branchId: uuid("branch_id")
      .notNull(),

    systemId: uuid("system_id")
      .notNull()
      .references(() => systemsCatalog.id, {
        onDelete: "restrict",
      }),

    departmentId: uuid(
      "department_id",
    ),

    departmentCode: varchar(
      "department_code",
      { length: 128 },
    ),

    displayName: varchar(
      "display_name",
      { length: 255 },
    ),

    functionalStatus: varchar(
      "functional_status",
      { length: 32 },
    )
      .notNull()
      .default("unknown"),

    normativeStatus: varchar(
      "normative_status",
      { length: 32 },
    )
      .notNull()
      .default("pending_assessment"),

    documentationLevel: varchar(
      "documentation_level",
      { length: 32 },
    )
      .notNull()
      .default("basic"),

    status: varchar("status", {
      length: 32,
    })
      .notNull()
      .default("not_started"),

    onboardingStartedAt: timestamp(
      "onboarding_started_at",
      {
        withTimezone: true,
        mode: "date",
      },
    ),

    activatedAt: timestamp("activated_at", {
      withTimezone: true,
      mode: "date",
    }),

    notes: text("notes"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  table => ({
    tenantBranchSystemUnique: unique(
      "branch_systems_tenant_branch_system_uq",
    ).on(
      table.tenantId,
      table.branchId,
      table.systemId,
    ),

    tenantIdIdUnique: unique(
      "branch_systems_tenant_id_id_uq",
    ).on(
      table.tenantId,
      table.id,
    ),

    tenantBranchIdUnique: unique(
      "branch_systems_tenant_branch_id_uq",
    ).on(table.tenantId, table.branchId, table.id),

    tenantIdx: index(
      "branch_systems_tenant_idx",
    ).on(table.tenantId),

    branchIdx: index(
      "branch_systems_branch_idx",
    ).on(table.branchId),

    systemIdx: index(
      "branch_systems_system_idx",
    ).on(table.systemId),

    departmentTenantFk: foreignKey({
      name:
        "branch_systems_tenant_department_fk",
      columns: [
        table.tenantId,
        table.departmentId,
      ],
      foreignColumns: [
        departments.tenantId,
        departments.id,
      ],
    })
      .onDelete("restrict"),

    branchTenantFk: foreignKey({
      name: "branch_systems_tenant_branch_fk",
      columns: [
        table.tenantId,
        table.branchId,
      ],
      foreignColumns: [
        branches.tenantId,
        branches.id,
      ],
    })
      .onDelete("cascade"),
  }),
);

export const systemSolutions = pgTable(
  "system_solutions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id").notNull(),
    branchSystemId: uuid("branch_system_id").notNull(),
    code: varchar("code", { length: 64 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    status: varchar("status", { length: 24 }).notNull().default("active"),
    commissionedAt: date("commissioned_at", { mode: "date" }),
    decommissionedAt: date("decommissioned_at", { mode: "date" }),
    createdBy: varchar("created_by", { length: 255 }),
    updatedBy: varchar("updated_by", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  table => ({
    tenantBranchCodeUnique: unique("system_solutions_tenant_branch_code_uq").on(table.tenantId, table.branchId, table.code),
    tenantIdIdUnique: unique("system_solutions_tenant_id_id_uq").on(table.tenantId, table.id),
    tenantBranchIdUnique: unique("system_solutions_tenant_branch_id_uq").on(table.tenantId, table.branchId, table.id),
    branchSystemIdx: index("system_solutions_branch_system_idx").on(table.tenantId, table.branchId, table.branchSystemId, table.status),
    branchTenantFk: foreignKey({
      name: "system_solutions_tenant_branch_fk",
      columns: [table.tenantId, table.branchId],
      foreignColumns: [branches.tenantId, branches.id],
    }).onDelete("restrict"),
    branchSystemTenantFk: foreignKey({
      name: "system_solutions_tenant_branch_system_fk",
      columns: [table.tenantId, table.branchId, table.branchSystemId],
      foreignColumns: [branchSystems.tenantId, branchSystems.branchId, branchSystems.id],
    }).onDelete("restrict"),
  }),
);

/* ============================================================================
 * HOROS CORE-001D
 * Canonical physical assets
 * ========================================================================== */

export const assets = pgTable(
  "assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, {
        onDelete: "cascade",
      }),

    branchId: uuid("branch_id")
      .notNull(),

    assetTypeId: uuid("asset_type_id")
      .notNull()
      .references(() => assetTypes.id, {
        onDelete: "restrict",
      }),

    locationId: uuid("location_id"),

    telecomSpaceId: uuid("telecom_space_id"),

    rackId: uuid("rack_id"),

    systemSolutionId: uuid("system_solution_id"),

    assetCode: varchar("asset_code", {
      length: 128,
    }).notNull(),

    assetTag: varchar("asset_tag", {
      length: 128,
    }),

    serialNumber: varchar("serial_number", {
      length: 255,
    }),

    manufacturer: varchar("manufacturer", {
      length: 255,
    }),

    model: varchar("model", {
      length: 255,
    }),

    rfidEpc: varchar("rfid_epc", {
      length: 255,
    }),

    lifecycleStatus: varchar(
      "lifecycle_status",
      { length: 32 },
    )
      .notNull()
      .default("active"),

    operationalStatus: varchar(
      "operational_status",
      { length: 32 },
    )
      .notNull()
      .default("unknown"),

    normativeStatus: varchar(
      "normative_status",
      { length: 32 },
    )
      .notNull()
      .default("pending_assessment"),

    source: varchar("source", {
      length: 32,
    })
      .notNull()
      .default("manual"),

    notes: text("notes"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  table => ({
    tenantAssetCodeUnique: unique(
      "assets_tenant_asset_code_uq",
    ).on(
      table.tenantId,
      table.assetCode,
    ),

    tenantIdIdUnique: unique(
      "assets_tenant_id_id_uq",
    ).on(
      table.tenantId,
      table.id,
    ),

    tenantBranchIdUnique: unique(
      "assets_tenant_branch_id_uq",
    ).on(
      table.tenantId,
      table.branchId,
      table.id,
    ),

    rfidUnique: unique(
      "assets_rfid_epc_uq",
    ).on(
      table.rfidEpc,
    ),

    tenantAssetTagUnique: unique(
      "assets_tenant_asset_tag_uq",
    ).on(
      table.tenantId,
      table.assetTag,
    ),

    tenantIdx: index(
      "assets_tenant_idx",
    ).on(table.tenantId),

    branchIdx: index(
      "assets_branch_idx",
    ).on(table.branchId),

    assetTypeIdx: index(
      "assets_asset_type_idx",
    ).on(table.assetTypeId),

    serialIdx: index(
      "assets_serial_number_idx",
    ).on(table.serialNumber),

    systemSolutionIdx: index("assets_system_solution_idx").on(
      table.tenantId,
      table.branchId,
      table.systemSolutionId,
    ),

    systemSolutionTenantFk: foreignKey({
      name: "assets_tenant_branch_solution_fk",
      columns: [table.tenantId, table.branchId, table.systemSolutionId],
      foreignColumns: [systemSolutions.tenantId, systemSolutions.branchId, systemSolutions.id],
    }).onDelete("restrict"),

    branchTenantFk: foreignKey({
      name: "assets_tenant_branch_fk",
      columns: [
        table.tenantId,
        table.branchId,
      ],
      foreignColumns: [
        branches.tenantId,
        branches.id,
      ],
    })
      .onDelete("cascade"),

    locationTenantFk: foreignKey({
      name: "assets_tenant_location_fk",
      columns: [
        table.tenantId,
        table.branchId,
        table.locationId,
      ],
      foreignColumns: [
        locations.tenantId,
        locations.branchId,
        locations.id,
      ],
    })
      .onDelete("restrict"),

    telecomSpaceTenantFk: foreignKey({
      name: "assets_tenant_telecom_space_fk",
      columns: [
        table.tenantId,
        table.branchId,
        table.telecomSpaceId,
      ],
      foreignColumns: [
        telecomSpaces.tenantId,
        telecomSpaces.branchId,
        telecomSpaces.id,
      ],
    })
      .onDelete("restrict"),

    rackTenantFk: foreignKey({
      name: "assets_tenant_rack_fk",
      columns: [
        table.tenantId,
        table.branchId,
        table.rackId,
      ],
      foreignColumns: [
        racks.tenantId,
        racks.branchId,
        racks.id,
      ],
    })
      .onDelete("restrict"),
  }),
);

export const systemSolutionAliases = pgTable(
  "system_solution_aliases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    branchId: uuid("branch_id").notNull(),
    systemSolutionId: uuid("system_solution_id").notNull(),
    aliasType: varchar("alias_type", { length: 32 }).notNull(),
    aliasValue: varchar("alias_value", { length: 255 }).notNull(),
    normalizedValue: varchar("normalized_value", { length: 255 })
      .generatedAlwaysAs(sql`horos_normalize_alias(alias_value)`),
    source: varchar("source", { length: 128 }).notNull(),
    active: boolean("active").notNull().default(true),
    validFrom: timestamp("valid_from", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    validUntil: timestamp("valid_until", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    createdBy: varchar("created_by", { length: 255 }),
    updatedBy: varchar("updated_by", { length: 255 }),
  },
  table => ({
    activeValueUnique: uniqueIndex(
      "system_solution_aliases_active_value_uq",
    ).on(
      table.tenantId,
      table.branchId,
      table.normalizedValue,
    ).where(sql`${table.active}`),
    entityIdx: index(
      "system_solution_aliases_entity_idx",
    ).on(
      table.tenantId,
      table.branchId,
      table.systemSolutionId,
      table.active,
    ),
    entityFk: foreignKey({
      name: "system_solution_aliases_entity_fk",
      columns: [
        table.tenantId,
        table.branchId,
        table.systemSolutionId,
      ],
      foreignColumns: [
        systemSolutions.tenantId,
        systemSolutions.branchId,
        systemSolutions.id,
      ],
    }).onDelete("restrict"),
    typeCheck: check(
      "system_solution_aliases_type_ck",
      sql`${table.aliasType} in ('CUSTOMER_CODE','PHYSICAL_LABEL','LEGACY_CODE','IMPORT_IDENTIFIER','COMMON_NAME','PREVIOUS_NAME')`,
    ),
    valueCheck: check(
      "system_solution_aliases_value_ck",
      sql`length(btrim(${table.aliasValue})) between 1 and 255 and length(horos_normalize_alias(${table.aliasValue})) between 1 and 255`,
    ),
    datesCheck: check(
      "system_solution_aliases_dates_ck",
      sql`${table.validUntil} is null or ${table.validUntil} >= ${table.validFrom}`,
    ),
  }),
);

export const assetAliases = pgTable(
  "asset_aliases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    branchId: uuid("branch_id").notNull(),
    assetId: uuid("asset_id").notNull(),
    aliasType: varchar("alias_type", { length: 32 }).notNull(),
    aliasValue: varchar("alias_value", { length: 255 }).notNull(),
    normalizedValue: varchar("normalized_value", { length: 255 })
      .generatedAlwaysAs(sql`horos_normalize_alias(alias_value)`),
    source: varchar("source", { length: 128 }).notNull(),
    active: boolean("active").notNull().default(true),
    validFrom: timestamp("valid_from", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    validUntil: timestamp("valid_until", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    createdBy: varchar("created_by", { length: 255 }),
    updatedBy: varchar("updated_by", { length: 255 }),
  },
  table => ({
    tenantIdIdUnique: unique(
      "asset_aliases_tenant_id_id_uq",
    ).on(
      table.tenantId,
      table.id,
    ),
    activeValueUnique: uniqueIndex(
      "asset_aliases_active_value_uq",
    ).on(
      table.tenantId,
      table.branchId,
      table.normalizedValue,
    ).where(sql`${table.active}`),
    entityIdx: index(
      "asset_aliases_entity_idx",
    ).on(
      table.tenantId,
      table.branchId,
      table.assetId,
      table.active,
    ),
    entityFk: foreignKey({
      name: "asset_aliases_entity_fk",
      columns: [
        table.tenantId,
        table.branchId,
        table.assetId,
      ],
      foreignColumns: [
        assets.tenantId,
        assets.branchId,
        assets.id,
      ],
    }).onDelete("restrict"),
    typeCheck: check(
      "asset_aliases_type_ck",
      sql`${table.aliasType} in ('CUSTOMER_CODE','PHYSICAL_LABEL','LEGACY_CODE','IMPORT_IDENTIFIER','COMMON_NAME','PREVIOUS_NAME')`,
    ),
    valueCheck: check(
      "asset_aliases_value_ck",
      sql`length(btrim(${table.aliasValue})) between 1 and 255 and length(horos_normalize_alias(${table.aliasValue})) between 1 and 255`,
    ),
    datesCheck: check(
      "asset_aliases_dates_ck",
      sql`${table.validUntil} is null or ${table.validUntil} >= ${table.validFrom}`,
    ),
  }),
);

export const assetAliasEvents = pgTable(
  "asset_alias_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    assetAliasId: uuid("asset_alias_id").notNull(),
    eventType: varchar("event_type", { length: 32 }).notNull(),
    actorExternalSubject: varchar("actor_external_subject", { length: 255 }),
    details: jsonb("details").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  table => ({
    aliasIdx: index(
      "asset_alias_events_alias_idx",
    ).on(
      table.tenantId,
      table.assetAliasId,
      table.createdAt.desc(),
    ),
    aliasFk: foreignKey({
      name: "asset_alias_events_alias_fk",
      columns: [
        table.tenantId,
        table.assetAliasId,
      ],
      foreignColumns: [
        assetAliases.tenantId,
        assetAliases.id,
      ],
    }).onDelete("restrict"),
    typeCheck: check(
      "asset_alias_events_type_ck",
      sql`${table.eventType} in ('alias_created','alias_updated','alias_deactivated','alias_reactivated')`,
    ),
  }),
);

export const assetPorts = pgTable(
  "asset_ports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    branchId: uuid("branch_id").notNull(),
    assetId: uuid("asset_id").notNull(),
    code: varchar("code", { length: 64 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    portType: varchar("port_type", { length: 32 }).notNull(),
    direction: varchar("direction", { length: 24 }).notNull().default("NOT_APPLICABLE"),
    medium: varchar("medium", { length: 24 }).notNull(),
    connectorType: varchar("connector_type", { length: 64 }),
    status: varchar("status", { length: 24 }).notNull().default("AVAILABLE"),
    sequence: integer("sequence"),
    description: text("description"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    createdBy: varchar("created_by", { length: 255 }),
    updatedBy: varchar("updated_by", { length: 255 }),
  },
  table => ({
    tenantBranchIdUnique: unique("asset_ports_tenant_branch_id_uq").on(table.tenantId, table.branchId, table.id),
    assetCodeUnique: unique("asset_ports_asset_code_uq").on(table.tenantId, table.branchId, table.assetId, table.code),
    assetIdx: index("asset_ports_asset_idx").on(table.tenantId, table.branchId, table.assetId, table.active),
    assetFk: foreignKey({ name: "asset_ports_asset_fk", columns: [table.tenantId, table.branchId, table.assetId], foreignColumns: [assets.tenantId, assets.branchId, assets.id] }).onDelete("restrict"),
    typeCheck: check("asset_ports_type_ck", sql`${table.portType} in ('ETHERNET','FIBER','POWER','RELAY_INPUT','RELAY_OUTPUT','ALARM_INPUT','AUDIO_INPUT','AUDIO_OUTPUT','SERIAL','WIRELESS','LOGICAL','OTHER')`),
    directionCheck: check("asset_ports_direction_ck", sql`${table.direction} in ('INPUT','OUTPUT','BIDIRECTIONAL','NOT_APPLICABLE')`),
    mediumCheck: check("asset_ports_medium_ck", sql`${table.medium} in ('COPPER','FIBER','WIRELESS','ELECTRICAL','AUDIO','LOGICAL','OTHER')`),
    statusCheck: check("asset_ports_status_ck", sql`${table.status} in ('AVAILABLE','CONNECTED','INACTIVE')`),
    codeCheck: check("asset_ports_code_ck", sql`length(btrim(${table.code})) between 1 and 64`),
    sequenceCheck: check("asset_ports_sequence_ck", sql`${table.sequence} is null or ${table.sequence} >= 0`),
  }),
);

export const assetLinks = pgTable(
  "asset_links",
  {
    id: uuid("id").defaultRandom().primaryKey(), tenantId: uuid("tenant_id").notNull(), branchId: uuid("branch_id").notNull(),
    code: varchar("code", { length: 64 }).notNull(), name: varchar("name", { length: 255 }).notNull(), linkType: varchar("link_type", { length: 24 }).notNull(),
    endpointAPortId: uuid("endpoint_a_port_id").notNull(), endpointBPortId: uuid("endpoint_b_port_id").notNull(), status: varchar("status", { length: 24 }).notNull().default("PLANNED"),
    medium: varchar("medium", { length: 24 }).notNull(), description: text("description"), installedAt: timestamp("installed_at", { withTimezone: true, mode: "date" }),
    decommissionedAt: timestamp("decommissioned_at", { withTimezone: true, mode: "date" }), active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    createdBy: varchar("created_by", { length: 255 }), updatedBy: varchar("updated_by", { length: 255 }),
  }, table => ({
    tenantBranchIdUnique: unique("asset_links_tenant_branch_id_uq").on(table.tenantId, table.branchId, table.id),
    codeUnique: unique("asset_links_code_uq").on(table.tenantId, table.branchId, table.code),
    endpointsIdx: index("asset_links_endpoints_idx").on(table.tenantId, table.branchId, table.endpointAPortId, table.endpointBPortId, table.active),
    endpointAFk: foreignKey({ name: "asset_links_endpoint_a_fk", columns: [table.tenantId, table.branchId, table.endpointAPortId], foreignColumns: [assetPorts.tenantId, assetPorts.branchId, assetPorts.id] }).onDelete("restrict"),
    endpointBFk: foreignKey({ name: "asset_links_endpoint_b_fk", columns: [table.tenantId, table.branchId, table.endpointBPortId], foreignColumns: [assetPorts.tenantId, assetPorts.branchId, assetPorts.id] }).onDelete("restrict"),
    distinctCheck: check("asset_links_distinct_endpoints_ck", sql`${table.endpointAPortId} <> ${table.endpointBPortId}`),
    typeCheck: check("asset_links_type_ck", sql`${table.linkType} in ('PHYSICAL','WIRELESS','LOGICAL')`),
    statusCheck: check("asset_links_status_ck", sql`${table.status} in ('PLANNED','INSTALLED','ACTIVE','DEGRADED','INACTIVE','DECOMMISSIONED')`),
    mediumCheck: check("asset_links_medium_ck", sql`${table.medium} in ('COPPER','FIBER','WIRELESS','ELECTRICAL','AUDIO','LOGICAL','OTHER')`),
    datesCheck: check("asset_links_dates_ck", sql`${table.decommissionedAt} is null or ${table.installedAt} is null or ${table.decommissionedAt} >= ${table.installedAt}`),
  }),
);

export const assetRelationships = pgTable(
  "asset_relationships",
  {
    id: uuid("id").defaultRandom().primaryKey(), tenantId: uuid("tenant_id").notNull(), branchId: uuid("branch_id").notNull(),
    sourceAssetId: uuid("source_asset_id").notNull(), targetAssetId: uuid("target_asset_id").notNull(), relationshipType: varchar("relationship_type", { length: 32 }).notNull(),
    status: varchar("status", { length: 24 }).notNull().default("ACTIVE"), description: text("description"), active: boolean("active").notNull().default(true),
    sourceSystemSolutionId: uuid("source_system_solution_id"), targetSystemSolutionId: uuid("target_system_solution_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    createdBy: varchar("created_by", { length: 255 }), updatedBy: varchar("updated_by", { length: 255 }),
  }, table => ({
    tenantBranchIdUnique: unique("asset_relationships_tenant_branch_id_uq").on(table.tenantId, table.branchId, table.id),
    sourceIdx: index("asset_relationships_source_idx").on(table.tenantId, table.branchId, table.sourceAssetId, table.active),
    targetIdx: index("asset_relationships_target_idx").on(table.tenantId, table.branchId, table.targetAssetId, table.active),
    sourceFk: foreignKey({ name: "asset_relationships_source_fk", columns: [table.tenantId, table.branchId, table.sourceAssetId], foreignColumns: [assets.tenantId, assets.branchId, assets.id] }).onDelete("restrict"),
    targetFk: foreignKey({ name: "asset_relationships_target_fk", columns: [table.tenantId, table.branchId, table.targetAssetId], foreignColumns: [assets.tenantId, assets.branchId, assets.id] }).onDelete("restrict"),
    sourceSolutionFk: foreignKey({ name: "asset_relationships_source_solution_fk", columns: [table.tenantId, table.branchId, table.sourceSystemSolutionId], foreignColumns: [systemSolutions.tenantId, systemSolutions.branchId, systemSolutions.id] }).onDelete("restrict"),
    targetSolutionFk: foreignKey({ name: "asset_relationships_target_solution_fk", columns: [table.tenantId, table.branchId, table.targetSystemSolutionId], foreignColumns: [systemSolutions.tenantId, systemSolutions.branchId, systemSolutions.id] }).onDelete("restrict"),
    distinctCheck: check("asset_relationships_distinct_assets_ck", sql`${table.sourceAssetId} <> ${table.targetAssetId}`),
    typeCheck: check("asset_relationships_type_ck", sql`${table.relationshipType} in ('POWERED_BY','CONTROLLED_BY','RECORDED_BY','MONITORED_BY','HOSTED_ON','DEPENDS_ON','SERVES','BACKED_UP_BY','PARENT_OF','CONNECTED_TO','OTHER')`),
    statusCheck: check("asset_relationships_status_ck", sql`${table.status} in ('PLANNED','ACTIVE','INACTIVE','DECOMMISSIONED')`),
  }),
);

export const assetTopologyEvents = pgTable(
  "asset_topology_events",
  { id: uuid("id").defaultRandom().primaryKey(), tenantId: uuid("tenant_id").notNull(), branchId: uuid("branch_id").notNull(), entityType: varchar("entity_type", { length: 24 }).notNull(), entityId: uuid("entity_id").notNull(), eventType: varchar("event_type", { length: 48 }).notNull(), actorExternalSubject: varchar("actor_external_subject", { length: 255 }), details: jsonb("details").notNull().default({}), createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow() },
  table => ({ entityIdx: index("asset_topology_events_entity_idx").on(table.tenantId, table.branchId, table.entityType, table.entityId, table.createdAt.desc()), typeCheck: check("asset_topology_events_type_ck", sql`${table.entityType} in ('PORT','LINK','RELATIONSHIP')`) }),
);

export const systemSolutionEvents = pgTable(
  "system_solution_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    systemSolutionId: uuid("system_solution_id").notNull(),
    eventType: varchar("event_type", { length: 32 }).notNull(),
    actorExternalSubject: varchar("actor_external_subject", { length: 255 }),
    details: jsonb("details").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  table => ({
    solutionIdx: index("system_solution_events_solution_idx").on(table.tenantId, table.systemSolutionId, table.createdAt),
    solutionTenantFk: foreignKey({
      name: "system_solution_events_tenant_solution_fk",
      columns: [table.tenantId, table.systemSolutionId],
      foreignColumns: [systemSolutions.tenantId, systemSolutions.id],
    }).onDelete("restrict"),
  }),
);


export const assetSystemMemberships = pgTable(
  "asset_system_memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, {
        onDelete: "cascade",
      }),

    assetId: uuid("asset_id")
      .notNull(),

    branchSystemId: uuid(
      "branch_system_id",
    ).notNull(),

    role: varchar("role", {
      length: 64,
    })
      .notNull()
      .default("member"),

    isPrimary: boolean("is_primary")
      .notNull()
      .default(false),

    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  table => ({
    tenantAssetSystemUnique: unique(
      "asset_system_memberships_tenant_asset_system_uq",
    ).on(
      table.tenantId,
      table.assetId,
      table.branchSystemId,
    ),

    tenantIdx: index(
      "asset_system_memberships_tenant_idx",
    ).on(table.tenantId),

    assetIdx: index(
      "asset_system_memberships_asset_idx",
    ).on(table.assetId),

    branchSystemIdx: index(
      "asset_system_memberships_branch_system_idx",
    ).on(table.branchSystemId),

    assetTenantFk: foreignKey({
      name: "asset_system_memberships_tenant_asset_fk",
      columns: [
        table.tenantId,
        table.assetId,
      ],
      foreignColumns: [
        assets.tenantId,
        assets.id,
      ],
    })
      .onDelete("cascade"),

    branchSystemTenantFk: foreignKey({
      name: "asset_system_memberships_tenant_branch_system_fk",
      columns: [
        table.tenantId,
        table.branchSystemId,
      ],
      foreignColumns: [
        branchSystems.tenantId,
        branchSystems.id,
      ],
    })
      .onDelete("cascade"),
  }),
);

/* ============================================================================
 * HOROS ONBOARD-001A
 * Shared staging layer for Wizard / Excel / PDF onboarding
 * ========================================================================== */


export const systemInfrastructureDependencies =
  pgTable(
    "system_infrastructure_dependencies",
    {
      id: uuid("id")
        .defaultRandom()
        .primaryKey(),

      tenantId: uuid("tenant_id")
        .notNull()
        .references(() => tenants.id, {
          onDelete: "cascade",
        }),

      branchSystemId: uuid(
        "branch_system_id",
      ).notNull(),

      locationId: uuid("location_id"),

      telecomSpaceId: uuid(
        "telecom_space_id",
      ),

      rackId: uuid("rack_id"),

      assetId: uuid("asset_id"),

      dependencyRole: varchar(
        "dependency_role",
        { length: 64 },
      )
        .notNull()
        .default("supporting"),

      isCritical: boolean(
        "is_critical",
      )
        .notNull()
        .default(false),

      notes: text("notes"),

      createdAt: timestamp(
        "created_at",
        {
          withTimezone: true,
          mode: "date",
        },
      )
        .notNull()
        .defaultNow(),
    },
    table => ({
      tenantIdIdUnique: unique(
        "system_infrastructure_dependencies_tenant_id_id_uq",
      ).on(
        table.tenantId,
        table.id,
      ),

      tenantIdx: index(
        "system_infrastructure_dependencies_tenant_idx",
      ).on(table.tenantId),

      branchSystemIdx: index(
        "system_infrastructure_dependencies_branch_system_idx",
      ).on(table.branchSystemId),

      branchSystemTenantFk: foreignKey({
        name:
          "system_infrastructure_dependencies_tenant_system_fk",
        columns: [
          table.tenantId,
          table.branchSystemId,
        ],
        foreignColumns: [
          branchSystems.tenantId,
          branchSystems.id,
        ],
      })
        .onDelete("cascade"),

      locationTenantFk: foreignKey({
        name:
          "system_infrastructure_dependencies_tenant_location_fk",
        columns: [
          table.tenantId,
          table.locationId,
        ],
        foreignColumns: [
          locations.tenantId,
          locations.id,
        ],
      })
        .onDelete("restrict"),

      telecomSpaceTenantFk: foreignKey({
        name:
          "system_infrastructure_dependencies_tenant_space_fk",
        columns: [
          table.tenantId,
          table.telecomSpaceId,
        ],
        foreignColumns: [
          telecomSpaces.tenantId,
          telecomSpaces.id,
        ],
      })
        .onDelete("restrict"),

      rackTenantFk: foreignKey({
        name:
          "system_infrastructure_dependencies_tenant_rack_fk",
        columns: [
          table.tenantId,
          table.rackId,
        ],
        foreignColumns: [
          racks.tenantId,
          racks.id,
        ],
      })
        .onDelete("restrict"),

      assetTenantFk: foreignKey({
        name:
          "system_infrastructure_dependencies_tenant_asset_fk",
        columns: [
          table.tenantId,
          table.assetId,
        ],
        foreignColumns: [
          assets.tenantId,
          assets.id,
        ],
      })
        .onDelete("restrict"),
    }),
  );


export const onboardingSessions = pgTable(
  "onboarding_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, {
        onDelete: "cascade",
      }),

    branchId: uuid("branch_id"),

    sourceType: varchar("source_type", {
      length: 32,
    }).notNull(),

    status: varchar("status", {
      length: 32,
    })
      .notNull()
      .default("draft"),

    originalFilename: varchar(
      "original_filename",
      { length: 512 },
    ),

    contentType: varchar(
      "content_type",
      { length: 128 },
    ),

    sourceChecksum: varchar(
      "source_checksum",
      { length: 128 },
    ),

    totalItems: integer("total_items")
      .notNull()
      .default(0),

    validItems: integer("valid_items")
      .notNull()
      .default(0),

    warningItems: integer("warning_items")
      .notNull()
      .default(0),

    errorItems: integer("error_items")
      .notNull()
      .default(0),

    createdByUserId: uuid(
      "created_by_user_id",
    ),

    committedByUserId: uuid(
      "committed_by_user_id",
    ),

    startedAt: timestamp("started_at", {
      withTimezone: true,
      mode: "date",
    }),

    validatedAt: timestamp(
      "validated_at",
      {
        withTimezone: true,
        mode: "date",
      },
    ),

    committedAt: timestamp(
      "committed_at",
      {
        withTimezone: true,
        mode: "date",
      },
    ),

    failedAt: timestamp("failed_at", {
      withTimezone: true,
      mode: "date",
    }),

    cancelledAt: timestamp(
      "cancelled_at",
      {
        withTimezone: true,
        mode: "date",
      },
    ),

    failureCode: varchar(
      "failure_code",
      { length: 64 },
    ),

    failureMessage: text(
      "failure_message",
    ),

    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),

    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  table => ({
    tenantIdIdUnique: unique(
      "onboarding_sessions_tenant_id_id_uq",
    ).on(
      table.tenantId,
      table.id,
    ),

    tenantIdx: index(
      "onboarding_sessions_tenant_idx",
    ).on(table.tenantId),

    tenantStatusIdx: index(
      "onboarding_sessions_tenant_status_idx",
    ).on(
      table.tenantId,
      table.status,
    ),

    sourceChecksumIdx: index(
      "onboarding_sessions_source_checksum_idx",
    ).on(table.sourceChecksum),

    branchTenantFk: foreignKey({
      name: "onboarding_sessions_tenant_branch_fk",
      columns: [
        table.tenantId,
        table.branchId,
      ],
      foreignColumns: [
        branches.tenantId,
        branches.id,
      ],
    })
      .onDelete("restrict"),
  }),
);


export const onboardingItems = pgTable(
  "onboarding_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, {
        onDelete: "cascade",
      }),

    sessionId: uuid("session_id")
      .notNull(),

    sequence: integer("sequence")
      .notNull(),

    entityType: varchar("entity_type", {
      length: 64,
    }).notNull(),

    operation: varchar("operation", {
      length: 32,
    })
      .notNull()
      .default("upsert"),

    status: varchar("status", {
      length: 32,
    })
      .notNull()
      .default("pending"),

    sourceSheet: varchar(
      "source_sheet",
      { length: 255 },
    ),

    sourcePage: integer("source_page"),

    sourceRow: integer("source_row"),

    rawPayload: jsonb("raw_payload")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),

    normalizedPayload: jsonb(
      "normalized_payload",
    )
      .$type<Record<string, unknown>>(),

    fingerprint: varchar(
      "fingerprint",
      { length: 128 },
    ),

    targetEntityId: uuid(
      "target_entity_id",
    ),

    committedAt: timestamp(
      "committed_at",
      {
        withTimezone: true,
        mode: "date",
      },
    ),

    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  table => ({
    tenantSessionSequenceUnique: unique(
      "onboarding_items_tenant_session_sequence_uq",
    ).on(
      table.tenantId,
      table.sessionId,
      table.sequence,
    ),

    tenantIdIdUnique: unique(
      "onboarding_items_tenant_id_id_uq",
    ).on(
      table.tenantId,
      table.id,
    ),

    tenantSessionIdx: index(
      "onboarding_items_tenant_session_idx",
    ).on(
      table.tenantId,
      table.sessionId,
    ),

    fingerprintIdx: index(
      "onboarding_items_fingerprint_idx",
    ).on(table.fingerprint),

    sessionTenantFk: foreignKey({
      name: "onboarding_items_tenant_session_fk",
      columns: [
        table.tenantId,
        table.sessionId,
      ],
      foreignColumns: [
        onboardingSessions.tenantId,
        onboardingSessions.id,
      ],
    })
      .onDelete("cascade"),
  }),
);


export const onboardingIssues = pgTable(
  "onboarding_issues",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, {
        onDelete: "cascade",
      }),

    sessionId: uuid("session_id")
      .notNull(),

    itemId: uuid("item_id"),

    severity: varchar("severity", {
      length: 16,
    }).notNull(),

    code: varchar("code", {
      length: 64,
    }).notNull(),

    field: varchar("field", {
      length: 128,
    }),

    message: text("message")
      .notNull(),

    details: jsonb("details")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),

    status: varchar("status", {
      length: 32,
    })
      .notNull()
      .default("open"),

    resolution: text("resolution"),

    resolvedAt: timestamp(
      "resolved_at",
      {
        withTimezone: true,
        mode: "date",
      },
    ),

    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  table => ({
    tenantIdx: index(
      "onboarding_issues_tenant_idx",
    ).on(table.tenantId),

    sessionIdx: index(
      "onboarding_issues_session_idx",
    ).on(
      table.tenantId,
      table.sessionId,
    ),

    itemIdx: index(
      "onboarding_issues_item_idx",
    ).on(
      table.tenantId,
      table.itemId,
    ),

    severityIdx: index(
      "onboarding_issues_severity_idx",
    ).on(table.severity),

    sessionTenantFk: foreignKey({
      name: "onboarding_issues_tenant_session_fk",
      columns: [
        table.tenantId,
        table.sessionId,
      ],
      foreignColumns: [
        onboardingSessions.tenantId,
        onboardingSessions.id,
      ],
    })
      .onDelete("cascade"),

    itemTenantFk: foreignKey({
      name: "onboarding_issues_tenant_item_fk",
      columns: [
        table.tenantId,
        table.itemId,
      ],
      foreignColumns: [
        onboardingItems.tenantId,
        onboardingItems.id,
      ],
    })
      .onDelete("cascade"),
  }),
);

/* ============================================================================
 * HOROS ONBOARD-002A
 * Canonical provisioning execution history
 * ========================================================================== */

export const onboardingProvisioningRuns = pgTable(
  "onboarding_provisioning_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, {
        onDelete: "cascade",
      }),

    sessionId: uuid("session_id")
      .notNull(),

    attemptNumber: integer(
      "attempt_number",
    ).notNull(),

    status: varchar("status", {
      length: 32,
    })
      .notNull()
      .default("pending"),

    totalItems: integer("total_items")
      .notNull()
      .default(0),

    processedItems: integer(
      "processed_items",
    )
      .notNull()
      .default(0),

    createdItems: integer(
      "created_items",
    )
      .notNull()
      .default(0),

    updatedItems: integer(
      "updated_items",
    )
      .notNull()
      .default(0),

    skippedItems: integer(
      "skipped_items",
    )
      .notNull()
      .default(0),

    failedItems: integer(
      "failed_items",
    )
      .notNull()
      .default(0),

    startedAt: timestamp("started_at", {
      withTimezone: true,
      mode: "date",
    }),

    finishedAt: timestamp("finished_at", {
      withTimezone: true,
      mode: "date",
    }),

    failureCode: varchar(
      "failure_code",
      { length: 64 },
    ),

    failureMessage: text(
      "failure_message",
    ),

    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),

    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  table => ({
    tenantIdIdUnique: unique(
      "onboarding_provisioning_runs_tenant_id_id_uq",
    ).on(
      table.tenantId,
      table.id,
    ),

    tenantSessionAttemptUnique: unique(
      "onboarding_provisioning_runs_tenant_session_attempt_uq",
    ).on(
      table.tenantId,
      table.sessionId,
      table.attemptNumber,
    ),

    tenantSessionIdx: index(
      "onboarding_provisioning_runs_tenant_session_idx",
    ).on(
      table.tenantId,
      table.sessionId,
    ),

    tenantStatusIdx: index(
      "onboarding_provisioning_runs_tenant_status_idx",
    ).on(
      table.tenantId,
      table.status,
    ),

    sessionTenantFk: foreignKey({
      name: "onboarding_provisioning_runs_tenant_session_fk",
      columns: [
        table.tenantId,
        table.sessionId,
      ],
      foreignColumns: [
        onboardingSessions.tenantId,
        onboardingSessions.id,
      ],
    })
      .onDelete("cascade"),
  }),
);

/*
 * Asset lifecycle facts.
 *
 * Kept separate from the canonical technical asset identity.
 * One optional profile per asset.
 */
export const assetLifecycleProfiles = pgTable(
  "asset_lifecycle_profiles",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, {
        onDelete: "cascade",
      }),

    assetId: uuid("asset_id")
      .notNull(),

    criticality: varchar(
      "criticality",
      { length: 16 },
    ),

    installDate: date(
      "install_date",
    ),

    warrantyExpiry: date(
      "warranty_expiry",
    ),

    usefulLifeYears: integer(
      "useful_life_years",
    ),

    createdAt: timestamp(
      "created_at",
      {
        withTimezone: true,
        mode: "date",
      },
    )
      .notNull()
      .defaultNow(),

    updatedAt: timestamp(
      "updated_at",
      {
        withTimezone: true,
        mode: "date",
      },
    )
      .notNull()
      .defaultNow(),
  },

  table => ({
    tenantAssetUnique: unique(
      "asset_lifecycle_profiles_tenant_asset_uq",
    ).on(
      table.tenantId,
      table.assetId,
    ),

    tenantIdx: index(
      "asset_lifecycle_profiles_tenant_idx",
    ).on(
      table.tenantId,
    ),

    assetIdx: index(
      "asset_lifecycle_profiles_asset_idx",
    ).on(
      table.assetId,
    ),

    tenantAssetFk: foreignKey({
      columns: [
        table.tenantId,
        table.assetId,
      ],
      foreignColumns: [
        assets.tenantId,
        assets.id,
      ],
      name:
        "asset_lifecycle_profiles_tenant_asset_fk",
    }).onDelete("cascade"),
  }),
);


/*
 * Asset financial facts.
 *
 * Monetary inputs are stored here rather than on the
 * technical asset identity. Derived values remain outside
 * this table.
 */
export const assetFinancialProfiles = pgTable(
  "asset_financial_profiles",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, {
        onDelete: "cascade",
      }),

    assetId: uuid("asset_id")
      .notNull(),

    purchaseDate: date(
      "purchase_date",
    ),

    purchaseCost: numeric(
      "purchase_cost",
      {
        precision: 14,
        scale: 2,
      },
    ),

    currentValue: numeric(
      "current_value",
      {
        precision: 14,
        scale: 2,
      },
    ),

    depreciationRate: numeric(
      "depreciation_rate",
      {
        precision: 7,
        scale: 4,
      },
    ),

    depreciationMethod: varchar(
      "depreciation_method",
      { length: 32 },
    ),

    replacementCost: numeric(
      "replacement_cost",
      {
        precision: 14,
        scale: 2,
      },
    ),

    maintenanceCostYearly: numeric(
      "maintenance_cost_yearly",
      {
        precision: 14,
        scale: 2,
      },
    ),

    createdAt: timestamp(
      "created_at",
      {
        withTimezone: true,
        mode: "date",
      },
    )
      .notNull()
      .defaultNow(),

    updatedAt: timestamp(
      "updated_at",
      {
        withTimezone: true,
        mode: "date",
      },
    )
      .notNull()
      .defaultNow(),
  },

  table => ({
    tenantAssetUnique: unique(
      "asset_financial_profiles_tenant_asset_uq",
    ).on(
      table.tenantId,
      table.assetId,
    ),

    tenantIdx: index(
      "asset_financial_profiles_tenant_idx",
    ).on(
      table.tenantId,
    ),

    assetIdx: index(
      "asset_financial_profiles_asset_idx",
    ).on(
      table.assetId,
    ),

    tenantAssetFk: foreignKey({
      columns: [
        table.tenantId,
        table.assetId,
      ],
      foreignColumns: [
        assets.tenantId,
        assets.id,
      ],
      name:
        "asset_financial_profiles_tenant_asset_fk",
    }).onDelete("cascade"),
  }),
);

/**
 * Canonical PostgreSQL service tickets.
 *
 * UUID-native identity.
 * No legacy numeric asset identity is stored.
 */
export const serviceTickets = pgTable(
  "service_tickets",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    tenantId: uuid("tenant_id")
      .notNull()
      .references(
        () => tenants.id,
        { onDelete: "cascade" },
      ),

    branchId: uuid("branch_id")
      .notNull(),

    assetId: uuid("asset_id"),

    ticketNumber: varchar(
      "ticket_number",
      { length: 64 },
    ).notNull(),

    title: varchar(
      "title",
      { length: 500 },
    ).notNull(),

    description: text("description"),

    operationalStatus: varchar(
      "operational_status",
      { length: 32 },
    )
      .notNull()
      .default("open"),

    contractualStatus: varchar(
      "contractual_status",
      { length: 32 },
    )
      .notNull()
      .default("pending_approval"),

    priority: varchar(
      "priority",
      { length: 16 },
    )
      .notNull()
      .default("medium"),

    category: varchar(
      "category",
      { length: 32 },
    )
      .notNull()
      .default("corrective"),

    responseDeadline: timestamp(
      "response_deadline",
      {
        withTimezone: true,
        mode: "date",
      },
    ),

    resolutionDeadline: timestamp(
      "resolution_deadline",
      {
        withTimezone: true,
        mode: "date",
      },
    ),

    respondedAt: timestamp(
      "responded_at",
      {
        withTimezone: true,
        mode: "date",
      },
    ),

    resolvedAt: timestamp(
      "resolved_at",
      {
        withTimezone: true,
        mode: "date",
      },
    ),

    closedAt: timestamp(
      "closed_at",
      {
        withTimezone: true,
        mode: "date",
      },
    ),

    estimatedCost: numeric(
      "estimated_cost",
      {
        precision: 14,
        scale: 2,
      },
    ),

    actualCost: numeric(
      "actual_cost",
      {
        precision: 14,
        scale: 2,
      },
    ),

    isBillable: boolean(
      "is_billable",
    )
      .notNull()
      .default(false),

    notes: text("notes"),

    slaTier: varchar(
      "sla_tier",
      { length: 16 },
    ),

    slaDeadlineHours: integer(
      "sla_deadline_hours",
    ),

    evidenceImageUrl: text(
      "evidence_image_url",
    ),

    evidenceImageKey: varchar(
      "evidence_image_key",
      { length: 500 },
    ),

    resolutionNotes: text(
      "resolution_notes",
    ),

    resolutionEvidenceUrls: jsonb(
      "resolution_evidence_urls",
    ).$type<string[]>(),

    resolutionSignatureUrl: text(
      "resolution_signature_url",
    ),

    resolutionReportUrl: text(
      "resolution_report_url",
    ),

    resolutionReportKey: varchar(
      "resolution_report_key",
      { length: 500 },
    ),

    resolvedByName: varchar(
      "resolved_by_name",
      { length: 255 },
    ),

    notificationSentAt: timestamp(
      "notification_sent_at",
      {
        withTimezone: true,
        mode: "date",
      },
    ),

    createdAt: timestamp(
      "created_at",
      {
        withTimezone: true,
        mode: "date",
      },
    )
      .notNull()
      .defaultNow(),

    updatedAt: timestamp(
      "updated_at",
      {
        withTimezone: true,
        mode: "date",
      },
    )
      .notNull()
      .defaultNow(),
  },
  table => ({
    tenantTicketNumberUnique:
      uniqueIndex(
        "service_tickets_tenant_ticket_number_uq",
      ).on(
        table.tenantId,
        table.ticketNumber,
      ),

    tenantIdIdUnique:
      unique(
        "service_tickets_tenant_id_id_uq",
      ).on(
        table.tenantId,
        table.id,
      ),

    tenantBranchFk:
      foreignKey({
        name:
          "service_tickets_tenant_branch_fk",
        columns: [
          table.tenantId,
          table.branchId,
        ],
        foreignColumns: [
          branches.tenantId,
          branches.id,
        ],
      }).onDelete("cascade"),

    tenantAssetFk:
      foreignKey({
        name:
          "service_tickets_tenant_asset_fk",
        columns: [
          table.tenantId,
          table.assetId,
        ],
        foreignColumns: [
          assets.tenantId,
          assets.id,
        ],
      }).onDelete("restrict"),

    tenantIdx: index(
      "service_tickets_tenant_idx",
    ).on(table.tenantId),

    branchIdx: index(
      "service_tickets_branch_idx",
    ).on(table.branchId),

    assetIdx: index(
      "service_tickets_asset_idx",
    ).on(table.assetId),

    statusIdx: index(
      "service_tickets_operational_status_idx",
    ).on(table.operationalStatus),

    createdAtIdx: index(
      "service_tickets_created_at_idx",
    ).on(table.createdAt),
  }),
);

// ============================================================================
// APP-007D — Canonical Service Intake
// ============================================================================

export const serviceRequests = pgTable(
  "service_requests",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    tenantId: uuid("tenant_id")
      .notNull()
      .references(
        () => tenants.id,
        { onDelete: "cascade" },
      ),

    requestNumber: varchar(
      "request_number",
      { length: 64 },
    ).notNull(),

    requestType: varchar(
      "request_type",
      { length: 40 },
    ).notNull(),

    status: varchar(
      "status",
      { length: 32 },
    )
      .notNull()
      .default("draft"),

    requestedByUserId: uuid(
      "requested_by_user_id",
    ).references(
      () => users.id,
      { onDelete: "set null" },
    ),

    requesterName: varchar(
      "requester_name",
      { length: 255 },
    ).notNull(),

    requesterEmail: varchar(
      "requester_email",
      { length: 320 },
    ),

    requesterPhone: varchar(
      "requester_phone",
      { length: 64 },
    ),

    branchId: uuid(
      "branch_id",
    ),

    branchSystemId: uuid(
      "branch_system_id",
    ),

    assetId: uuid(
      "asset_id",
    ),

    departmentId: uuid(
      "department_id",
    ),

    title: varchar(
      "title",
      { length: 255 },
    ).notNull(),

    description: text(
      "description",
    ),

    desiredDate: date(
      "desired_date",
    ),

    desiredStartTime: time(
      "desired_start_time",
    ),

    desiredEndTime: time(
      "desired_end_time",
    ),

    remoteAllowed: boolean(
      "remote_allowed",
    ),

    accessRequirements: text(
      "access_requirements",
    ),

    safetyRequirements: text(
      "safety_requirements",
    ),

    personnelRequirements: text(
      "personnel_requirements",
    ),

    certificationRequirements: text(
      "certification_requirements",
    ),

    equipmentRequirements: text(
      "equipment_requirements",
    ),

    toolRequirements: text(
      "tool_requirements",
    ),

    clarityStatus: varchar(
      "clarity_status",
      { length: 32 },
    )
      .notNull()
      .default("not_evaluated"),

    clarityScore: integer(
      "clarity_score",
    ),

    claritySummary: text(
      "clarity_summary",
    ),

    missingInformation: jsonb(
      "missing_information",
    )
      .$type<string[]>()
      .notNull()
      .default([]),

    requesterConfirmedAt:
      timestamp(
        "requester_confirmed_at",
        {
          withTimezone: true,
          mode: "date",
        },
      ),

    commercialStatus: varchar(
      "commercial_status",
      { length: 32 },
    )
      .notNull()
      .default("not_required"),

    estimatedAmount: numeric(
      "estimated_amount",
      {
        precision: 14,
        scale: 2,
      },
    ),

    quotedAt: timestamp(
      "quoted_at",
      {
        withTimezone: true,
        mode: "date",
      },
    ),

    authorizedAt: timestamp(
      "authorized_at",
      {
        withTimezone: true,
        mode: "date",
      },
    ),

    rejectedAt: timestamp(
      "rejected_at",
      {
        withTimezone: true,
        mode: "date",
      },
    ),

    rejectionReason: text(
      "rejection_reason",
    ),

    submittedAt: timestamp(
      "submitted_at",
      {
        withTimezone: true,
        mode: "date",
      },
    ),

    completedAt: timestamp(
      "completed_at",
      {
        withTimezone: true,
        mode: "date",
      },
    ),

    cancelledAt: timestamp(
      "cancelled_at",
      {
        withTimezone: true,
        mode: "date",
      },
    ),

    createdAt: timestamp(
      "created_at",
      {
        withTimezone: true,
        mode: "date",
      },
    )
      .notNull()
      .defaultNow(),

    updatedAt: timestamp(
      "updated_at",
      {
        withTimezone: true,
        mode: "date",
      },
    )
      .notNull()
      .defaultNow(),
  },
  table => ({
    tenantRequestNumberUnique:
      uniqueIndex(
        "service_requests_tenant_number_uq",
      ).on(
        table.tenantId,
        table.requestNumber,
      ),

    tenantIdIdUnique:
      unique(
        "service_requests_tenant_id_id_uq",
      ).on(
        table.tenantId,
        table.id,
      ),

    tenantBranchFk:
      foreignKey({
        name:
          "service_requests_tenant_branch_fk",
        columns: [
          table.tenantId,
          table.branchId,
        ],
        foreignColumns: [
          branches.tenantId,
          branches.id,
        ],
      }).onDelete("restrict"),

    tenantSystemFk:
      foreignKey({
        name:
          "service_requests_tenant_system_fk",
        columns: [
          table.tenantId,
          table.branchSystemId,
        ],
        foreignColumns: [
          branchSystems.tenantId,
          branchSystems.id,
        ],
      }).onDelete("restrict"),

    tenantAssetFk:
      foreignKey({
        name:
          "service_requests_tenant_asset_fk",
        columns: [
          table.tenantId,
          table.assetId,
        ],
        foreignColumns: [
          assets.tenantId,
          assets.id,
        ],
      }).onDelete("restrict"),

    tenantDepartmentFk:
      foreignKey({
        name:
          "service_requests_tenant_department_fk",
        columns: [
          table.tenantId,
          table.departmentId,
        ],
        foreignColumns: [
          departments.tenantId,
          departments.id,
        ],
      }).onDelete("restrict"),

    tenantStatusIdx: index(
      "service_requests_tenant_status_idx",
    ).on(
      table.tenantId,
      table.status,
    ),

    tenantTypeIdx: index(
      "service_requests_tenant_type_idx",
    ).on(
      table.tenantId,
      table.requestType,
    ),

    tenantBranchIdx: index(
      "service_requests_tenant_branch_idx",
    ).on(
      table.tenantId,
      table.branchId,
    ),

    createdAtIdx: index(
      "service_requests_created_at_idx",
    ).on(
      table.tenantId,
      table.createdAt,
    ),
  }),
);

export const serviceRequestAttachments =
  pgTable(
    "service_request_attachments",
    {
      id: uuid("id")
        .defaultRandom()
        .primaryKey(),

      tenantId: uuid("tenant_id")
        .notNull()
        .references(
          () => tenants.id,
          { onDelete: "cascade" },
        ),

      serviceRequestId: uuid(
        "service_request_id",
      ).notNull(),

      attachmentType: varchar(
        "attachment_type",
        { length: 32 },
      )
        .notNull()
        .default("document"),

      fileName: varchar(
        "file_name",
        { length: 255 },
      ).notNull(),

      mimeType: varchar(
        "mime_type",
        { length: 128 },
      ),

      fileSize: integer(
        "file_size",
      ),

      storageKey: varchar(
        "storage_key",
        { length: 1024 },
      ).notNull(),

      fileUrl: text(
        "file_url",
      ),

      description: text(
        "description",
      ),

      uploadedByUserId: uuid(
        "uploaded_by_user_id",
      ).references(
        () => users.id,
        { onDelete: "set null" },
      ),

      createdAt: timestamp(
        "created_at",
        {
          withTimezone: true,
          mode: "date",
        },
      )
        .notNull()
        .defaultNow(),
    },
    table => ({
      requestIdx: index(
        "service_request_attachments_request_idx",
      ).on(
        table.tenantId,
        table.serviceRequestId,
      ),

      tenantRequestFk:
        foreignKey({
          name:
            "service_request_attachments_tenant_request_fk",
          columns: [
            table.tenantId,
            table.serviceRequestId,
          ],
          foreignColumns: [
            serviceRequests.tenantId,
            serviceRequests.id,
          ],
        }).onDelete("cascade"),
    }),
  );

export const serviceRequestEvents =
  pgTable(
    "service_request_events",
    {
      id: uuid("id")
        .defaultRandom()
        .primaryKey(),

      tenantId: uuid("tenant_id")
        .notNull()
        .references(
          () => tenants.id,
          { onDelete: "cascade" },
        ),

      serviceRequestId: uuid(
        "service_request_id",
      ).notNull(),

      eventType: varchar(
        "event_type",
        { length: 48 },
      ).notNull(),

      actorUserId: uuid(
        "actor_user_id",
      ).references(
        () => users.id,
        { onDelete: "set null" },
      ),

      actorName: varchar(
        "actor_name",
        { length: 255 },
      ),

      message: text(
        "message",
      ),

      metadata: jsonb(
        "metadata",
      )
        .$type<Record<string, unknown>>()
        .notNull()
        .default({}),

      createdAt: timestamp(
        "created_at",
        {
          withTimezone: true,
          mode: "date",
        },
      )
        .notNull()
        .defaultNow(),
    },
    table => ({
      requestCreatedIdx: index(
        "service_request_events_request_created_idx",
      ).on(
        table.tenantId,
        table.serviceRequestId,
        table.createdAt,
      ),

      eventTypeIdx: index(
        "service_request_events_type_idx",
      ).on(
        table.tenantId,
        table.eventType,
      ),

      tenantRequestFk:
        foreignKey({
          name:
            "service_request_events_tenant_request_fk",
          columns: [
            table.tenantId,
            table.serviceRequestId,
          ],
          foreignColumns: [
            serviceRequests.tenantId,
            serviceRequests.id,
          ],
        }).onDelete("cascade"),
    }),
  );

export const serviceRequestTicketLinks =
  pgTable(
    "service_request_ticket_links",
    {
      id: uuid("id")
        .defaultRandom()
        .primaryKey(),

      tenantId: uuid("tenant_id")
        .notNull()
        .references(
          () => tenants.id,
          { onDelete: "cascade" },
        ),

      serviceRequestId: uuid(
        "service_request_id",
      ).notNull(),

      serviceTicketId: uuid(
        "service_ticket_id",
      ).notNull(),

      relationType: varchar(
        "relation_type",
        { length: 32 },
      )
        .notNull()
        .default("converted"),

      createdByUserId: uuid(
        "created_by_user_id",
      ).references(
        () => users.id,
        { onDelete: "set null" },
      ),

      createdAt: timestamp(
        "created_at",
        {
          withTimezone: true,
          mode: "date",
        },
      )
        .notNull()
        .defaultNow(),
    },
    table => ({
      tenantRequestTicketUnique:
        uniqueIndex(
          "service_request_ticket_links_request_ticket_uq",
        ).on(
          table.tenantId,
          table.serviceRequestId,
          table.serviceTicketId,
        ),

      requestIdx: index(
        "service_request_ticket_links_request_idx",
      ).on(
        table.tenantId,
        table.serviceRequestId,
      ),

      ticketIdx: index(
        "service_request_ticket_links_ticket_idx",
      ).on(
        table.tenantId,
        table.serviceTicketId,
      ),

      tenantRequestFk:
        foreignKey({
          name:
            "service_request_ticket_links_tenant_request_fk",
          columns: [
            table.tenantId,
            table.serviceRequestId,
          ],
          foreignColumns: [
            serviceRequests.tenantId,
            serviceRequests.id,
          ],
        }).onDelete("cascade"),

      tenantTicketFk:
        foreignKey({
          name:
            "service_request_ticket_links_tenant_ticket_fk",
          columns: [
            table.tenantId,
            table.serviceTicketId,
          ],
          foreignColumns: [
            serviceTickets.tenantId,
            serviceTickets.id,
          ],
        }).onDelete("restrict"),
    }),
  );
