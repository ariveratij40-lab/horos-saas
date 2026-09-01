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

describe("canonical ticket assignment contract", () => {
  const procedures = appRouter._def.procedures;

  it("exposes tenant-safe assignment surfaces", () => {
    expect(
      procedures["ticketAssignment.canonicalCurrent"],
    ).toBeDefined();

    expect(
      procedures["ticketAssignment.canonicalCandidates"],
    ).toBeDefined();

    expect(
      procedures["ticketAssignment.canonicalAssign"],
    ).toBeDefined();
  });

  it("binds assignees to active memberships in the same tenant", () => {
    const migration = readProjectFile(
      "../drizzle-pg/migrations/0038_ticket_assignment.sql",
    );

    expect(migration).toContain(
      'ADD COLUMN "assigned_to_user_id" uuid',
    );
    expect(migration).toContain(
      'ADD COLUMN "assigned_at" timestamp with time zone',
    );
    expect(migration).toContain(
      'CONSTRAINT "service_tickets_tenant_assignee_fk"',
    );
    expect(migration).toContain(
      'REFERENCES "public"."tenant_users"',
    );
    expect(migration).toContain(
      '"tenant_id",\n  "user_id"',
    );
    expect(migration).toContain(
      'CONSTRAINT "service_tickets_assignment_coherence_ck"',
    );
    expect(migration).toContain(
      "'assignment_changed'",
    );
  });

  it("keeps assignment administrative and validates active canonical membership", () => {
    const assignmentRouter = readProjectFile(
      "./routers/ticketAssignment.ts",
    );

    expect(assignmentRouter).toContain(
      "requireAssignmentAdministrator",
    );
    expect(assignmentRouter).toContain(
      "tu.is_active = true",
    );
    expect(assignmentRouter).toContain(
      "u.is_active = true",
    );
    expect(assignmentRouter).toContain(
      "Assignee is not an active member of the canonical tenant",
    );
    expect(assignmentRouter).toContain(
      "'assignment_changed'",
    );
  });

  it("requires ownership before work can start", () => {
    const workflow = readProjectFile(
      "./routers/ticketWorkflow.ts",
    );

    expect(workflow).toContain(
      'assigned_to_user_id::text AS "assignedToUserId"',
    );
    expect(workflow).toContain(
      "Ticket must have a canonical assignee before work can start",
    );
    expect(workflow).toContain(
      '["assigned", "pending"]',
    );
    expect(workflow).not.toContain(
      '["open", "assigned", "pending"]',
    );
  });

  it("lets only the assigned canonical operator or tenant admin execute work", () => {
    const workflow = readProjectFile(
      "./routers/ticketWorkflow.ts",
    );

    expect(workflow).toContain(
      "async function requireTicketOperator",
    );
    expect(workflow).toContain(
      'u.external_subject = ${ctx.pgTenant.externalSubject}',
    );
    expect(workflow).toContain(
      "current.assignedToUserId",
    );
    expect(workflow).toContain(
      "Canonical ticket workflow requires the assigned operator or tenant administrator",
    );

    const operatorChecks =
      workflow.match(/await requireTicketOperator\(/g)
        ?.length ?? 0;

    expect(operatorChecks).toBe(2);
    expect(workflow).toContain(
      "requireTicketAdministrator(ctx.pgTenant.tenantRole);",
    );
  });
});