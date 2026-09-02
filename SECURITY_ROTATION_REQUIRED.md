# Security rotation required

STAB-001 found credentials in the Git history of `.project-config.json`. The
file is no longer tracked, is ignored by `.gitignore`, and its committed
replacement contains placeholders only. Removing a file from the current tree
does not invalidate credentials that were committed previously.

## Required external action

Owners of the affected systems must rotate or revoke the historical values
outside this repository. STAB-001 deliberately does not perform external
rotation and does not reproduce any credential value.

Credential classes requiring review and rotation:

- database connection credentials;
- Git remote access credentials and temporary session credentials;
- application signing/authentication secrets;
- Forge service API credentials;
- OAuth application identifiers or secrets where the provider treats them as
  confidential.

After rotation, verify that deployments and developer environments obtain the
replacement values from their approved secret store. Do not commit rotation
evidence containing values to this repository.

## Repository containment

- `.project-config.json` must remain ignored and untracked.
- `.project-config.example.json` must contain placeholders only.
- CI scans the checked-out repository for secrets and redacts findings.
- Historical exposure remains an incident-response concern even when the
  current-tree scan passes.

## SEC-ROT-001 execution status

| Category | Provider identified | Date UTC | Status | Test executed | Result | Non-sensitive evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Historical remote session | Managed legacy Git repository | 2026-09-01 | BLOCKED | Expiration metadata review | Provider confirmation unavailable | Historical timestamp is past; no current local reference |
| Historical remote access key | Managed legacy Git repository | 2026-09-01 | BLOCKED | Current consumer inventory | Owner and external consumers remain unidentified | No current repository configuration reference |
| Forge backend API credential | Manus Forge | 2026-09-01 | BLOCKED | Provider console access | Authentication to the provider console is unavailable | Active Forge capabilities remain referenced by the application |
| Historical database credential | TiDB Cloud (MySQL protocol) | 2026-09-01 | BLOCKED | Provider and protocol classification | Outside the PostgreSQL-only rotation authorization | Current local database configuration differs from the historical value |
| JWT session-signing secret | HOROS runtime | 2026-09-01 | BLOCKED | User-presence count | Users are present; a maintenance window is required | No user identities or secret values were inspected or recorded |

## SEC-ROT-001 continuation status

| Category | Provider identified | Date UTC | Status | Test executed | Result | Non-sensitive evidence |
| --- | --- | --- | --- | --- | --- | --- |
| JWT session-signing secret | HOROS runtime | 2026-09-02 | BLOCKED_RUNTIME_ACCESS | Signing-secret rotation contract | Previous-key session rejected and replacement-key test session accepted | Deployed runtime and secret store are not accessible from this environment |
| Existing test sessions | HOROS runtime | 2026-09-02 | BLOCKED | Runtime access preflight | No deployed session store or runtime restart control available | Owner confirmed that existing users are test-only |
| Forge and Manus OAuth | Manus | 2026-09-02 | ACCOUNT_ACCESS_UNAVAILABLE | Runtime dependency audit | OAuth is an active alternative; Forge-backed storage, evidence, AI, maps, and notifications remain callable features | References retained to avoid removing active functionality |
| Legacy database runtime | TiDB Cloud (MySQL protocol) | 2026-09-02 | ACTIVE_DEPENDENCY | Import and registered-router audit | Local authentication and registered legacy routers still use the MySQL data layer | Connection reference retained; no connection or provider mutation performed |
| Legacy remote repository access | Managed legacy Git repository | 2026-09-02 | UNREVOKED_EXTERNAL_RESIDUAL_RISK | Current runtime and configuration search | No current runtime, example, or local configuration consumer found | External owner and automation remain unverified without Manus account access |

## SEC-CONTAIN-001 residual risk acceptance

The canonical HOROS runtime does not use inaccessible historical credentials.
This containment does not assert that either provider credential was revoked.

```text
MANUS_HISTORICAL_CREDENTIAL=UNREVOKED_ACCOUNT_ACCESS_UNAVAILABLE
TIDB_HISTORICAL_CREDENTIAL=UNREVOKED_ACCOUNT_ACCESS_UNAVAILABLE
CURRENT_RUNTIME_EXPOSURE=NONE_NO_DEPLOYED_RUNTIME
LEGACY_FEATURE_DEFAULT_STATE=DISABLED
LEGACY_REMOTE_ACCESS_CURRENT_CONSUMER=NONE_IDENTIFIED
RISK_ACCEPTANCE_SCOPE=DEVELOPMENT_CONTINUITY_ONLY
JWT_RUNTIME_ROTATION=NOT_APPLICABLE_NO_DEPLOYED_RUNTIME
```

Generating a new signing secret remains mandatory when staging or production
is created. The future deployment procedure is recorded in
`docs/security/DEPLOYMENT_SECURITY_CHECKLIST.md`.
