# Canonical components and inspections

GOV-001E introduces technical parts installed inside an asset, reusable versioned inspection templates, and immutable executed checklists. It does not move topology endpoints away from assets and does not represent independently operating equipment as components.

## Component lifecycle

`asset_components` is scoped by tenant, branch, and owning asset. Codes are unique inside that asset. Parent and replacement references must remain on the same asset; a recursive guard rejects hierarchy cycles. Deactivation preserves history. Replacement closes the prior record and creates a new one linked through `replaces_component_id`.

## Template lifecycle

Templates are `DRAFT`, `PUBLISHED`, or `RETIRED`. Only drafts and their ordered items are editable. Publication is transactional and requires at least one active item. A published definition is immutable; changes require a new version linked to its predecessor. Retirement preserves history and prevents new executions.

Templates may target one branch system, solution, asset type, or asset, or remain explicitly branch-general. Mutually incompatible simultaneous targets are rejected.

## Executed inspections

An inspection can only originate from a published template. Creation snapshots every active item, including response type, options, required/N/A rules, expected value, severity, and sequence. The API validates answers against this stored snapshot rather than a client-provided type.

Completion is serialized and rejects missing required responses or unsatisfied photo requirements. Completed inspections and answers are immutable. A later link from a failed result to an existing canonical `maintenance_findings` record is allowed only when tenant, branch, and work order agree and is written to the append-only inspection ledger.

A failed result without a work order is retained as `NEEDS_FINDING_WORKFLOW`; GOV-001E never creates an order or finding automatically. `maintenance_findings` remains the sole anomaly model.

## Authority and database security

All six new tables have RLS and FORCE RLS. Tenant and branch context are transaction-local and derived from the canonical session. The runtime is not an owner, has no BYPASSRLS, receives no DELETE grant, and has column-level UPDATE grants. Trigger functions use a hardened search path and are not executable by `PUBLIC`.

Published templates and completed inspections are guarded in PostgreSQL, not merely in the UI. The migration is additive and leaves migrations 0000–0044 unchanged.
