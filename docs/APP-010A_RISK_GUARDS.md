# APP-010A — Risk guards

- Tenant-owned maintenance data must be accessed only through canonical PostgreSQL tenant context.
- Evidence metadata must not store passwords, usernames, API secrets, or device credentials.
- Asset references must point to canonical `assets` rows in the same tenant.
- A maintenance order cannot close while required intervention records are incomplete.
- Generated technical-memory artifacts are outputs; canonical structured records are the source of truth.
