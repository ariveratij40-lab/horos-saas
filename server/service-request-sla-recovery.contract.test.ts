import { readFileSync } from "node:fs";
import {
  describe,
  expect,
  it,
} from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("covered ticket inherited SLA recovery", () => {
  it("recovers from canonical Service Intake evidence without action-string coupling", () => {
    const router = source(
      "server/routers/serviceRequestSlaRecovery.ts",
    );

    expect(router).toMatch(/pgProtectedProcedure/);
    expect(router).toMatch(/withTenantTransaction\(/);
    expect(router).toMatch(/service_request_ticket_links/);
    expect(router).toMatch(/relation_type = 'converted'/);
    expect(router).toMatch(/se\.event_type = 'authorized'/);
    expect(router).toMatch(/se\.metadata \? 'policyId'/);
    expect(router).toMatch(/se\.metadata \? 'policyServiceId'/);
    expect(router).not.toMatch(/metadata->>'action' = 'policy_coverage_authorized'/);
    expect(router).toMatch(/asRecord\(slaRules\[priority\]\)/);
    expect(router).toMatch(/service_policy_services/);
    expect(router).toMatch(/service_policy_sla_rules/);
    expect(router).toMatch(/service_ticket_sla_snapshots/);
    expect(router).toMatch(/response_deadline/);
    expect(router).toMatch(/resolution_deadline/);
    expect(router).toMatch(/estimated_cost = NULL/);
    expect(router).toMatch(/is_billable = false/);
    expect(router).toMatch(/'sla_applied'/);
    expect(router).toMatch(/sla_recovered_from_service_request/);
  });

  it("is exposed through Service Intake context and mounted in ticket UX", () => {
    const context = source(
      "server/routers/serviceRequestContext.ts",
    );
    const panel = source(
      "client/src/components/tickets/TicketSlaRecoveryRoutePanel.tsx",
    );
    const app = source(
      "client/src/App.tsx",
    );

    expect(context).toMatch(
      /slaRecovery:\s*serviceRequestSlaRecoveryRouter/,
    );
    expect(panel).toMatch(
      /serviceRequestContext\.slaRecovery\.canonicalOriginCoverage/,
    );
    expect(panel).toMatch(
      /serviceRequestContext\.slaRecovery\.canonicalRecoverInherited/,
    );
    expect(panel).toMatch(/SLA contractual recuperable/);
    expect(panel).toMatch(/Heredar SLA de/);
    expect(app).toMatch(/<TicketSlaRecoveryRoutePanel \/>/);
  });
});
