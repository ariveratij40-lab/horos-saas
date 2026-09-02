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
  it("diagnoses each continuity boundary and supports exact canonical-message fallback", () => {
    const router = source(
      "server/routers/serviceRequestSlaRecoveryJsonSafe.ts",
    );

    expect(router).toMatch(/pgProtectedProcedure/);
    expect(router).toMatch(/withTenantTransaction\(/);
    expect(router).toMatch(/service_request_ticket_links/);
    expect(router).toMatch(/relation_type = 'converted'/);
    expect(router).toMatch(/event_type = 'authorized'/);
    expect(router).toMatch(/metadata->>'policyId'/);
    expect(router).toMatch(/metadata->>'policyServiceId'/);
    expect(router).toMatch(/Cobertura aprobada por póliza/);
    expect(router).not.toMatch(/metadata->>'action' = 'policy_coverage_authorized'/);
    expect(router).toMatch(/service_policy_services/);
    expect(router).toMatch(/service_policy_sla_rules/);
    expect(router).toMatch(/priority = \$\{priority\}/);
    expect(router).toMatch(/service_ticket_sla_snapshots/);
    expect(router).toMatch(/response_deadline/);
    expect(router).toMatch(/resolution_deadline/);
    expect(router).toMatch(/estimated_cost = NULL/);
    expect(router).toMatch(/is_billable = false/);
    expect(router).toMatch(/'sla_applied'/);
    expect(router).toMatch(/sla_recovered_from_service_request_evidence/);
    expect(router).toMatch(/no_converted_origin/);
    expect(router).toMatch(/no_authorized_event/);
    expect(router).toMatch(/no_policy_reference/);
    expect(router).toMatch(/no_priority_sla_rule/);
  });

  it("is exposed through Service Intake context and surfaces development diagnostics", () => {
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
      /slaRecovery:\s*serviceRequestSlaRecoveryJsonSafeRouter/,
    );
    expect(panel).toMatch(
      /serviceRequestContext\.slaRecovery\.canonicalOriginCoverage/,
    );
    expect(panel).toMatch(
      /serviceRequestContext\.slaRecovery\.canonicalRecoverInherited/,
    );
    expect(panel).toMatch(/SLA contractual recuperable/);
    expect(panel).toMatch(/Heredar SLA de/);
    expect(panel).toMatch(/Diagnóstico de continuidad SLA/);
    expect(panel).toMatch(/no_policy_reference/);
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
