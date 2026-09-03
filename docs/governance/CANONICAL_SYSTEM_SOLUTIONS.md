# Canonical system solutions

`system_solutions` represents one identifiable technical implementation of a
system inside a tenant branch. It sits between `branch_systems` and physical
assets; it is not a policy, contract, location, asset type, supplier or work
order.

## Ownership and identity

- PostgreSQL is authoritative.
- Identity is `(tenant_id, branch_id, code)`; codes are uppercase, stable and
  restricted to letters, numbers and hyphens.
- Names and descriptions are mutable and are not identifiers.
- `active` and `inactive` are the controlled lifecycle states. Deactivation is
  non-destructive.
- Assets retain `system_solution_id = NULL` until explicitly adopted.
- A solution assignment requires the asset to have a matching
  `asset_system_membership` for that solution's `branch_system`.

## Authority

Reads use the canonical PostgreSQL tenant session. Mutations require the
tenant `admin` role, ignore any client-provided tenant identifier, and record
append-only events for create, update, status, assignment and unassignment.
The runtime can select, insert and update solutions; it cannot physically
delete them and never owns the tables.

## Adoption plan

No production solution is inferred from asset names, types or historical
records. A later controlled adoption may create reviewed solutions per branch
and system, validate codes with owners, then assign compatible assets in
audited batches. GOV-001C may define asset nomenclature, but must not rewrite
the stable solution code contract.
