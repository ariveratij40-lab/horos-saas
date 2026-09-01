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
  it("recovers from canonical policy references when historical SLA JSON is incomplete", () => {
    const router = source(
      "server/routers/serviceRequestSlaRecoveryRobust.ts",
    );

    expect(router).toMatch(/pgProtectedProcedure/);
    expect(router).toMatch(/withTenantTransaction\(/);
    expect(router).toMatch(/service_request_ticket_links/);
    expect(router).toMatch(/relation_type = 'converted'/);
    expect(router).toMatch(/e\.event_type = 'authorized'/);
    expect(router).toMatch(/e\.metadata \? 'policyId'/);
    expect(router).toMatch(/e\.metadata \? 'policyServiceId'/);
    expect(router).not.toMatch(/metadata->>'action' = 'policy_coverage_authorized'/);
    expect(router).toMatch(/service_policy_services/);
    expect(router).toMatch(/service_policy_sla_rules/);
    expect(router).toMatch(/sr\.priority = \$\{priority\}/);
    expect(router).toMatch(/service_ticket_sla_snapshots/);
    expect(router).toMatch(/response_deadline/);
    expect(router).toMatch(/resolution_deadline/);
    expect(router).toMatch(/estimated_cost = NULL/);
    expect(router).toMatch(/is_billable = false/);
    expect(router).toMatch(/'sla_applied'/);
    expect(router).toMatch(/sla_recovered_from_service_request_reference/);
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
      /slaRecovery:\s*serviceRequestSlaRecoveryRobustRouter/,
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

  it("self-heals a covered conversion before navigating to the ticket", () => {
    const actions = source(
      "client/src/components/service-requests/AuthorizedFulfillmentActions.tsx",
    );

    expect(actions).toMatch(/if \(!result\.inheritedSla\)/);
    expect(actions).toMatch(
      /slaRecovery\.canonicalOriginCoverage\.fetch/,
    );
    expect(actions).toMatch(/if \(originCoverage\.recoverable\)/);
    expect(actions).toMatch(
      /slaRecovery\.canonicalRecoverInherited\.useMutation/,
    );
    expect(actions).toMatch(/mutateAsync\(/);
    expect(actions).toMatch(/creado con SLA contractual/);
    expect(actions).toMatch(/navigate\(`\/tickets\/\$\{result\.ticket\.id\}`\)/);
  });
});
