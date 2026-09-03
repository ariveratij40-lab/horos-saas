# Canonical nomenclature and aliases

HOROS identifies solutions and assets internally by UUID. A canonical code is
the stable, readable operational identifier; a display name is descriptive and
mutable. Aliases preserve alternate customer, field, import and historical
identifiers without changing either identity.

## Existing identifier inventory

| Field                                 | Classification        | Governance                                                                           |
| ------------------------------------- | --------------------- | ------------------------------------------------------------------------------------ |
| `system_solutions.id`, `assets.id`    | `TECHNICAL_ID`        | Internal UUID; never presented as a customer alias.                                  |
| `system_solutions.code`               | `CANONICAL_CODE`      | Immutable; unique per tenant and branch.                                             |
| `assets.asset_code`                   | `CANONICAL_CODE`      | Existing tenant-wide uniqueness is preserved; no automatic renumbering.              |
| `system_solutions.name`               | `DISPLAY_NAME`        | Mutable; never resolves identity by itself.                                          |
| `assets.asset_tag`                    | `PHYSICAL_LABEL`      | Retains its dedicated semantics and uniqueness.                                      |
| `assets.serial_number`                | `MANUFACTURER_SERIAL` | Searchable domain data, not a generic alias.                                         |
| `assets.rfid_epc`                     | `TRACKING_IDENTIFIER` | Dedicated globally unique tracking value, not an alias.                              |
| legacy numeric identifiers            | `LEGACY_IDENTIFIER`   | Remain in legacy stores; reviewed values may be adopted explicitly as `LEGACY_CODE`. |
| hostname, QR and external identifiers | `EXTERNAL_IDENTIFIER` | No canonical field exists yet; do not infer or import automatically.                 |

Tickets and maintenance reference asset UUIDs and display `asset_code`; those
relationships remain unchanged. Existing importers remain legacy-disabled and
do not generate aliases.

## Model and normalization

Specific `system_solution_aliases` and `asset_aliases` tables preserve real
composite foreign keys and tenant/branch RLS. Supported types are
`CUSTOMER_CODE`, `PHYSICAL_LABEL`, `LEGACY_CODE`, `IMPORT_IDENTIFIER`,
`COMMON_NAME`, and `PREVIOUS_NAME`.

PostgreSQL preserves `alias_value` and derives `normalized_value`: trim, lower
case, transliterate common Latin accents, collapse every run of spaces or
separators (including hyphens and slashes) to one hyphen, and trim boundary
hyphens. Empty normalized values and active equivalents in the same tenant and
branch are rejected. Historical aliases are deactivated, timestamped and never
physically deleted by runtime.

## Resolution order

Exact resolution is deterministic and branch-scoped: UUID, canonical code,
then active normalized alias. Canonical codes win over aliases with equivalent
text. No match fails closed; more than one match is reported as ambiguous.
Partial searches only return up to 50 candidates and never choose identity.

Mutations require tenant administrators, derive tenant authority from the
PostgreSQL session, ignore client tenant identifiers, and append audit events.
No existing code or entity is rewritten. A future controlled adoption phase
may reserve or generate new asset codes after business nomenclature is approved.
