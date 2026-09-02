# Legacy dependency quarantine

PostgreSQL is the canonical HOROS database. Legacy integrations are opt-in,
disabled by default, and cannot be enabled by the presence of credentials
alone. Production startup rejects an enabled integration whose required
configuration is incomplete.

## Activation map

| Dependency | Explicit flag | Router or service | Endpoint or consumer | Default behavior |
| --- | --- | --- | --- | --- |
| TiDB/MySQL data and local identity | `HOROS_ENABLE_LEGACY_TIDB` | `dashboard`, `tenants`, `branches`, `policies`, `tickets`, `assets`, `maintenance`, `sla`, `cctv`, `rfid`, floor-plan, access-control, cabling, paging, legacy `users`, legacy local auth | Corresponding `/api/trpc/*` procedures | Routers and email/password procedures are absent |
| Canonical PostgreSQL | none; canonical runtime | ticket workflow/assignment, service request/context/traceability/policy/SLA, canonical maintenance/evidence | Corresponding `/api/trpc/*` procedures | Registered; no TiDB fallback |
| Manus OAuth | `HOROS_ENABLE_LEGACY_OAUTH` and client mirror `VITE_HOROS_ENABLE_LEGACY_OAUTH` | OAuth callback and SDK exchange/user lookup | `/api/oauth/callback`; browser login redirect | Callback is absent and browser uses `/login` |
| Forge storage | `HOROS_ENABLE_MANUS_FORGE` | storage helper and proxy | `/manus-storage/*`; evidence upload consumers | Proxy is absent; helper reports unavailable |
| Forge AI and data APIs | `HOROS_ENABLE_MANUS_FORGE` | LLM, image generation, data API, heartbeat and notifications | Legacy router consumers | Legacy routers absent; helpers reject or return unavailable |
| Forge maps | `HOROS_ENABLE_MANUS_FORGE` and client mirror `VITE_HOROS_ENABLE_MANUS_FORGE` | server maps helper and browser map loader | Maps proxy consumers | No external script or request is initiated |
| Forge transcription | `HOROS_ENABLE_MANUS_FORGE` | voice transcription helper | Legacy feature consumer | Controlled `SERVICE_ERROR` response |

## Required configuration when enabled

- TiDB/MySQL: `DATABASE_URL`.
- Manus Forge: `BUILT_IN_FORGE_API_URL` and `BUILT_IN_FORGE_API_KEY`.
- Manus OAuth: `OAUTH_SERVER_URL` and `VITE_APP_ID`; browser redirect additionally
  requires `VITE_OAUTH_PORTAL_URL` and its explicit client flag.

These names identify configuration locations only. Values belong in an
approved external secret store and must never be committed.

## Canonical authentication boundary

The default runtime accepts the dedicated development identity only through
the localhost development route, then resolves tenant membership through
PostgreSQL at `pgProtectedProcedure`. Historical MySQL identity lookup and
Manus synchronization are reachable only when both applicable legacy flags
are explicitly enabled. There is no PostgreSQL-to-TiDB or local-to-Manus
fallback.
