import {
  foreignKey,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import {
  serviceTickets,
  tenants,
  users,
} from "./schema";

export const serviceTicketEvents = pgTable(
  "service_ticket_events",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, {
        onDelete: "cascade",
      }),

    serviceTicketId: uuid("service_ticket_id")
      .notNull(),

    eventType: varchar("event_type", {
      length: 48,
    }).notNull(),

    actorUserId: uuid("actor_user_id")
      .references(() => users.id, {
        onDelete: "set null",
      }),

    actorName: varchar("actor_name", {
      length: 255,
    }),

    message: text("message"),

    metadata: jsonb("metadata")
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
      "service_ticket_events_tenant_id_id_uq",
    ).on(
      table.tenantId,
      table.id,
    ),

    tenantTicketFk: foreignKey({
      name: "service_ticket_events_tenant_ticket_fk",
      columns: [
        table.tenantId,
        table.serviceTicketId,
      ],
      foreignColumns: [
        serviceTickets.tenantId,
        serviceTickets.id,
      ],
    }).onDelete("cascade"),

    ticketCreatedIdx: index(
      "service_ticket_events_ticket_created_idx",
    ).on(
      table.tenantId,
      table.serviceTicketId,
      table.createdAt,
    ),

    typeIdx: index(
      "service_ticket_events_type_idx",
    ).on(
      table.tenantId,
      table.eventType,
    ),
  }),
);
