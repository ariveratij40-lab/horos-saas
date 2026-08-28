import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  uniqueIndex,
  index,
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
