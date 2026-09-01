import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(path, "utf8");
}

test("service request policy coverage stays canonical and tenant-safe", () => {
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

  assert.match(
    router,
    /pgProtectedProcedure/,
  );
  assert.match(
    router,
    /withTenantTransaction\(/,
  );
  assert.match(
    router,
    /p\.status = 'active'/,
  );
  assert.match(
    router,
    /CURRENT_DATE BETWEEN p\.start_date AND p\.end_date/,
  );
  assert.match(
    router,
    /ps\.is_included = true/,
  );
  assert.match(
    router,
    /p\.branch_id IS NULL\s+OR p\.branch_id = \$\{request\.branchId\}::uuid/,
  );
  assert.match(
    router,
    /request\.status !== "under_review"/,
  );
  assert.match(
    router,
    /request\.commercialStatus !== "not_required"/,
  );
  assert.match(
    router,
    /commercial_status = 'authorized'/,
  );
  assert.match(
    router,
    /'authorized'/,
  );
  assert.match(
    router,
    /policy_coverage_authorized/,
  );
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
  assert.match(
    panel,
    /Cobertura contractual disponible/,
  );
  assert.match(
    app,
    /<ServiceRequestPolicyCoverageRoutePanel \/>/,
  );
});
