import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  describe,
  expect,
  it,
} from "vitest";

import { appRouter } from "./routers";

function readProjectFile(relativePath: string) {
  return readFileSync(
    fileURLToPath(
      new URL(relativePath, import.meta.url),
    ),
    "utf8",
  );
}

describe("canonical service policy SLA contract", () => {
  const procedures = appRouter._def.procedures;

  it("exposes canonical policy and ticket SLA surfaces", () => {
    for (const name of [
      "servicePolicySla.canonicalList",
      "servicePolicySla.canonicalGet",
      "servicePolicySla.canonicalCreate",
      "servicePolicySla.canonicalActivate",
      "servicePolicySla.canonicalApplyToTicket",
      "servicePolicySla.canonicalCurrentForTicket",
    ]) {
      expect(procedures[name]).toBeDefined();
    }
  });

  it("forces tenant RLS and keeps ticket SLA snapshots append-only", () => {
    const migration = readProjectFile(
      "../drizzle-pg/migrations/0039_service_policy_sla.sql",
    );

    for (const table of [
      "service_policies",
      "service_policy_services",
      "service_policy_sla_rules",
      "service_ticket_sla_snapshots",
    ]) {
      expect(migration).toContain(
        `ALTER TABLE \"${table}\"\nFORCE ROW LEVEL SECURITY`,
      );
      expect(migration).toContain(
        `CREATE POLICY \"${table}_tenant_isolation\"`,
      );
    }

    expect(migration).toContain(
      'GRANT SELECT, INSERT\nON TABLE "service_ticket_sla_snapshots"',
    );
    expect(migration).not.toContain(
      'GRANT SELECT, INSERT, UPDATE, DELETE\nON TABLE "service_ticket_sla_snapshots"',
    );
  });

  it("preserves tenant-safe policy, rule and ticket relationships", () => {
    const migration = readProjectFile(
      "../drizzle-pg/migrations/0039_service_policy_sla.sql",
    );

    expect(migration).toContain(
      'CONSTRAINT "service_policies_tenant_branch_fk"',
    );
    expect(migration).toContain(
      'CONSTRAINT "service_policy_services_tenant_policy_fk"',
    );
    expect(migration).toContain(
      'CONSTRAINT "service_policy_sla_rules_tenant_policy_fk"',
    );
    expect(migration).toContain(
      'CONSTRAINT "service_ticket_sla_snapshots_tenant_ticket_fk"',
    );
    expect(migration).toContain(
      'CONSTRAINT "service_ticket_sla_snapshots_tenant_policy_rule_fk"',
    );
  });

  it("requires complete SLA coverage before policy activation", () => {
    const router = readProjectFile(
      "./routers/servicePolicySla.ts",
    );

    expect(router).toContain(
      "Policy requires at least one included service before activation",
    );

    for (const priority of [
      "critical",
      "high",
      "medium",
      "low",
    ]) {
      expect(router).toContain(`\"${priority}\"`);
    }

    expect(router).toContain(
      "Policy requires an active ${required} SLA rule before activation",
    );
  });

  it("anchors SLA deadlines to ticket creation and writes an immutable snapshot plus ledger event", () => {
    const router = readProjectFile(
      "./routers/servicePolicySla.ts",
    );

    expect(router).toContain(
      "ticket.createdAt.getTime()",
    );
    expect(router).toContain(
      "INSERT INTO service_ticket_sla_snapshots",
    );
    expect(router).toContain(
      "UPDATE service_tickets",
    );
    expect(router).toContain(
      "'sla_applied'",
    );
    expect(router).toContain(
      "withTenantTransaction",
    );
    expect(router).not.toContain(
      "ctx.user.tenantId ?? 1",
    );
  });
});
