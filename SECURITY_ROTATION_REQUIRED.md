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
