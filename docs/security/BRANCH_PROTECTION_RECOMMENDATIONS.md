# Branch protection recommendations

These settings are recommendations for repository administrators. STAB-001
does not change `main`, repository settings, or pull request state.

## `main`

- Require a pull request before merging.
- Require at least one approval and dismiss stale approvals after new commits.
- Require review from code owners when a CODEOWNERS policy is introduced.
- Require all three CI jobs: `secret-scan`, `validate`, and
  `postgres-migrations`.
- Require branches to be current before merging.
- Block force pushes and branch deletion.
- Apply the rules to administrators, allowing narrowly controlled emergency
  bypass only when the repository owner documents the incident.
- Require conversation resolution and signed commits if the organization has
  a reliable signing workflow.

## Integration branches

- Block force pushes and deletion while an integration pull request is open.
- Require `secret-scan`, `validate`, and `postgres-migrations` before promotion.
- Keep migration review explicit: immutable applied migrations and complete,
  ordered Drizzle journal metadata.

## Secret response

- Treat any secret-scan failure as blocking.
- Keep findings redacted in logs and artifacts.
- Rotate affected credentials externally; never resolve an incident only by
  deleting the current-tree file.
