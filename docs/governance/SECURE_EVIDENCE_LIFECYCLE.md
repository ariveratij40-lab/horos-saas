# Secure operational evidence

GOV-001F hardens the existing `maintenance_evidence` aggregate. It does not create a second general evidence model or a second finding model. Existing rows are preserved as `LEGACY_UNVERIFIED`; no hash, detected MIME, or availability claim is invented for historical objects that cannot be verified.

New uploads use an authenticated tenant-and-branch context and opaque server-generated keys. The local development adapter writes outside the repository and public web root with exclusive creation and restrictive permissions. Forge/Manus remains disabled. Production storage can implement the same private adapter contract without exposing keys or permanent URLs.

The lifecycle is `PENDING_UPLOAD` → `PROCESSING` → `AVAILABLE`, or `REJECTED`/`QUARANTINED`. Replacement creates a distinct verified object and then marks the prior record `SUPERSEDED`; neither metadata nor bytes are overwritten. Runtime physical deletion is forbidden.

SHA-256, byte size, and MIME signature are calculated from received bytes. Client hashes, sizes, paths, storage keys, and MIME assertions are not authoritative. JPEG, PNG, WebP, PDF, plain text, and CSV are the initial allowlist; active HTML, SVG, executables, archives, and unknown binary formats are rejected.

Order, finding, inspection, result, asset, and component associations are protected by composite foreign keys and trigger checks. A PHOTO_REQUIRED result is satisfied only by an AVAILABLE PHOTO or SCREENSHOT linked to that exact result. Legacy, pending, processing, rejected, quarantined, or cross-context evidence never satisfies it.

Metadata responses omit storage keys and server paths. Ordinary preview is image-only; quarantined content is inaccessible. Downloads are authenticated and use `nosniff`, private no-store caching, and sanitized Content-Disposition metadata. Evidence lifecycle events contain identifiers and controlled metadata only—never bytes, secrets, local paths, or storage keys.
