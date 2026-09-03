# Canonical asset topology

GOV-001D separates connection points (`asset_ports`), concrete point-to-point
connections (`asset_links`) and directed functional dependencies
(`asset_relationships`). A link never creates a relationship implicitly.

All records are scoped by tenant and branch. PostgreSQL validates composite
foreign keys, endpoint medium, active-port exclusivity and same-asset links.
`CONNECTED_TO` is symmetric for duplicate detection; other relationship types
remain directed. Only `PARENT_OF` is acyclic. `DEPENDS_ON` may contain cycles
because mutual operational dependency can be legitimate.

Assets may have no topology and may participate without a system solution.
Relationships may cross solutions only inside one branch. The migration does
not infer ports, links, or relationships and preserves existing assets and
`system_infrastructure_dependencies` unchanged.

RLS requires both canonical session settings, fails closed when either is
missing, and is forced on all four topology tables. The runtime role is not an
owner, has no `BYPASSRLS`, cannot delete rows, and can update only approved
metadata/status columns. Deactivation is the historical retention mechanism.

Expression-based partial indexes, validation triggers, RLS policies, ownership
and grants are managed by migration SQL and protected by the PostgreSQL
topology integrity test.
