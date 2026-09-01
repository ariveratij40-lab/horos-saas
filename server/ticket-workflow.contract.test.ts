import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  describe,
  expect,
  it,
} from "vitest";

import { appRouter } from "./routers";

describe("canonical ticket workflow contract", () => {
  const procedures = appRouter._def.procedures;

  it("exposes UUID-native operational surfaces", () => {
    expect(
      procedures["ticketWorkflow.canonicalEvents"],
    ).toBeDefined();

    expect(
      procedures["ticketWorkflow.canonicalStartWork"],
    ).toBeDefined();

    expect(
      procedures["ticketWorkflow.canonicalAddComment"],
    ).toBeDefined();

    expect(
      procedures["ticketWorkflow.canonicalResolve"],
    ).toBeDefined();

    expect(
      procedures["ticketWorkflow.canonicalClose"],
    ).toBeDefined();
  });

  it("keeps the canonical event ledger append-only under forced RLS", () => {
    const migrationPath = fileURLToPath(
      new URL(
        "../drizzle-pg/migrations/0037_service_ticket_events.sql",
        import.meta.url,
      ),
    );

    const migration = readFileSync(
      migrationPath,
      "utf8",
    );

    expect(migration).toContain(
      'ALTER TABLE "service_ticket_events"\nFORCE ROW LEVEL SECURITY',
    );
    expect(migration).toContain(
      'CREATE POLICY "service_ticket_events_tenant_isolation"',
    );
    expect(migration).toContain(
      'GRANT SELECT, INSERT\nON TABLE "service_ticket_events"\nTO horos_runtime',
    );
    expect(migration).not.toContain(
      'GRANT SELECT, INSERT, UPDATE',
    );
    expect(migration).not.toContain(
      'GRANT UPDATE',
    );
    expect(migration).not.toContain(
      'GRANT DELETE',
    );
  });
});
