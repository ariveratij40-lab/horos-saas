import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
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
