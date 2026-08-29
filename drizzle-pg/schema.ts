import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  boolean,
  integer,
  timestamp,
  uniqueIndex,
  unique,
  index,
  foreignKey,
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

    tenantIdx: index(
      "branch_systems_tenant_idx",
    ).on(table.tenantId),

    branchIdx: index(
      "branch_systems_branch_idx",
    ).on(table.branchId),

    systemIdx: index(
      "branch_systems_system_idx",
    ).on(table.systemId),

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
