# Deployment security checklist

For every future staging or production runtime:

- generate a new `JWT_SECRET` containing at least 32 characters;
- store it outside the repository in the approved secret store;
- keep all legacy feature flags `false` unless separately authorized;
- verify login, session validation and logout;
- verify cross-tenant requests are rejected;
- verify PostgreSQL RLS is enabled and forced for runtime tables;
- verify the runtime role does not own protected tables and lacks `BYPASSRLS`;
- run the repository secret scan and PostgreSQL migration validations.

No deployment secret was generated during SEC-CONTAIN-001 because no deployed
runtime exists.
