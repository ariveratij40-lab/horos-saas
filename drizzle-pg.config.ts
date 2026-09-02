import { defineConfig } from "drizzle-kit";

const connectionString = process.env.HOROS_PG_DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "HOROS_PG_DATABASE_URL is required",
  );
}

export default defineConfig({
  schema: [
    "./drizzle-pg/schema.ts",
    "./drizzle-pg/schema.ticket-events.ts",
    "./drizzle-pg/schema.service-sla.ts",
  ],
  out: "./drizzle-pg/migrations",
  dialect: "postgresql",

  dbCredentials: {
    url: connectionString,
  },

  strict: true,
  verbose: true,
});
