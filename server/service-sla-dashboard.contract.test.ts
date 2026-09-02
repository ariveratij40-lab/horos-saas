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

describe("canonical SLA dashboard cutover", () => {
  const procedures = appRouter._def.procedures;

  it("exposes canonical SLA overview and queue", () => {
    expect(
      procedures["serviceSlaDashboard.canonicalOverview"],
    ).toBeDefined();
    expect(
      procedures["serviceSlaDashboard.canonicalQueue"],
    ).toBeDefined();
  });

  it("derives compliance from immutable ticket snapshots and actual response timestamps", () => {
    const router = readProjectFile(
      "./routers/serviceSlaDashboard.ts",
    );

    expect(router).toContain(
      "FROM service_ticket_sla_snapshots",
    );
    expect(router).toContain(
      "responded_at",
    );
    expect(router).toContain(
      "resolved_at",
    );
    expect(router).toContain(
      "response_deadline",
    );
    expect(router).toContain(
      "resolution_deadline",
    );
    expect(router).not.toContain(
      "ctx.user.tenantId ?? 1",
    );
  });

  it("keeps the SLA and policy routes on canonical frontend pages", () => {
    const app = readProjectFile(
      "../client/src/App.tsx",
    );

    expect(app).toContain(
      'import Policies from "./pages/CanonicalPolicies"',
    );
    expect(app).toContain(
      'import PolicyDetail from "./pages/CanonicalPolicyDetail"',
    );
    expect(app).toContain(
      'import SLA from "./pages/CanonicalSLA"',
    );
    expect(app).toContain(
      "<TicketSlaRoutePanel />",
    );
  });

  it("does not use legacy SLA or ticket procedures in canonical SLA pages", () => {
    const page = readProjectFile(
      "../client/src/pages/CanonicalSLA.tsx",
    );
    const ticketPanel = readProjectFile(
      "../client/src/components/tickets/TicketSlaRoutePanel.tsx",
    );

    expect(page).toContain(
      "trpc.serviceSlaDashboard.canonicalOverview",
    );
    expect(page).toContain(
      "trpc.serviceSlaDashboard.canonicalQueue",
    );
    expect(ticketPanel).toContain(
      "trpc.servicePolicySla.canonicalCurrentForTicket",
    );
    expect(ticketPanel).toContain(
      "trpc.servicePolicySla.canonicalApplyToTicket",
    );

    for (const legacy of [
      "trpc.sla.",
      "trpc.tickets.list",
      "trpc.policies.list",
    ]) {
      expect(page).not.toContain(legacy);
      expect(ticketPanel).not.toContain(legacy);
    }
  });
});
