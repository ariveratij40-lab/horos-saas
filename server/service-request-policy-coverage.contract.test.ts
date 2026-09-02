import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("service request policy coverage contract", () => {
  it("stays canonical and tenant-safe", () => {
    const router = source(
      "server/routers/serviceRequestCoverage.ts",
    );
    const context = source(
      "server/routers/serviceRequestContext.ts",
    );
    const panel = source(
      "client/src/components/service-requests/ServiceRequestPolicyCoverageRoutePanel.tsx",
    );
    const app = source("client/src/App.tsx");

    assert.match(router, /pgProtectedProcedure/);
    assert.match(router, /withTenantTransaction\(/);
    assert.match(router, /p\.status = 'active'/);
    assert.match(
      router,
      /CURRENT_DATE BETWEEN p\.start_date AND p\.end_date/,
    );
    assert.match(router, /ps\.is_included = true/);
    assert.match(
      router,
      /p\.branch_id IS NULL\s+OR p\.branch_id = \$\{request\.branchId\}::uuid/,
    );
    assert.match(router, /request\.status !== "under_review"/);
    assert.match(
      router,
      /request\.commercialStatus !== "not_required"/,
    );
    assert.match(router, /commercial_status = 'authorized'/);
    assert.match(router, /policy_coverage_authorized/);
    assert.match(router, /service_policy_sla_rules/);
    assert.match(router, /ruleRows\.length !== 4/);
    assert.match(router, /slaRules,/);
    assert.match(
      router,
      /policyServiceId: coverage\.policyServiceId/,
    );
    assert.match(
      context,
      /coverage:\s*serviceRequestCoverageRouter/,
    );
    assert.match(
      panel,
      /serviceRequestContext\.coverage\.canonicalOptions/,
    );
    assert.match(
      panel,
      /serviceRequestContext\.coverage\.canonicalAuthorize/,
    );
    assert.match(panel, /Cobertura contractual disponible/);
    assert.match(
      app,
      /<ServiceRequestPolicyCoverageRoutePanel \/>/,
    );
  });

  it("inherits immutable SLA snapshot on covered ticket conversion", () => {
    const fulfillment = source(
      "server/routers/serviceRequestFulfillment.ts",
    );

    assert.match(
      fulfillment,
      /metadata->>'action' = 'policy_coverage_authorized'/,
    );
    assert.match(
      fulfillment,
      /metadata->'slaRules'->\$\{input\.priority\}/,
    );
    assert.match(
      fulfillment,
      /Policy-covered request has an incomplete SLA authorization snapshot/,
    );
    assert.match(
      fulfillment,
      /\$\{coveredByPolicy \? null : request\.estimatedAmount\}::numeric/,
    );
    assert.match(
      fulfillment,
      /\$\{!coveredByPolicy\}/,
    );
    assert.match(
      fulfillment,
      /ticket\.createdAt\.getTime\(\)/,
    );
    assert.match(
      fulfillment,
      /INSERT INTO service_ticket_sla_snapshots/,
    );
    assert.match(
      fulfillment,
      /'sla_applied'/,
    );
    assert.match(
      fulfillment,
      /sla_inherited_from_service_request/,
    );
    assert.match(
      fulfillment,
      /source:\s*"service_request_policy_coverage"/,
    );
    assert.match(
      fulfillment,
      /inheritedPolicyNumber/,
    );
  });
});
