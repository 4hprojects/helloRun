# Security, privacy, deployment and resource control

## Upload controls

- Accept only approved image content types verified from file bytes; enforce file and pixel-count limits.
- Decode safely; reject decompression bombs, corrupt images and unsupported files; remove EXIF where appropriate while preserving evidence required for verification.
- Store originals and crops privately, with separate access rules, signed links/short-lived access, encryption according to existing app standards.
- Log asset IDs and diagnostics, never screenshot contents, OAuth tokens, location traces or raw personally identifying content.

## Optional URL: prevent SSRF

- Only recognize explicit HTTPS provider domains and permitted routes; reject userinfo, malformed encoding, lookalike hosts and unsupported schemes.
- Do not request arbitrary user URLs, even for metadata or link previews.
- For any allowed provider fetch: validate DNS and every resolved address against loopback, link-local, private, multicast, metadata and reserved ranges; control redirects and revalidate every hop; impose request timeout, max response bytes and limited redirects. Prefer provider APIs over page scraping.
- If URL requires authorization, display `inaccessible` or use explicitly consented OAuth with minimum scope; never ask users to make their private activity public.
- Treat returned external text/HTML as untrusted content and do not execute it.

## Permissions

- Map to existing RBAC with server-side event scoping.
- Participant may edit own URL only while submission state permits; reviewer sees only assigned event submissions; OCR admin manages samples/jobs/profiles; designated deploying admin activates or rolls back model.
- Require clear confirmations on deployment, rollback, exclusion, cancellation and retention changes.
- Consider step-up auth for model activation if existing auth supports it.

## Training and supply chain

- Sandbox training worker, run as unprivileged account/container, read-only inputs, limited egress, CPU/RAM/disk quotas, timeouts, and one active training job per worker.
- Keep OCR inference on separate priority queue/worker. Prefer fail-safe scheduling over exhausting the HelloDeploy host.
- Pin verified model, training-tool and dependency versions, record checksums, quarantine unknown model binaries, and use signed/controlled artifacts where available.
- Never load arbitrary paths or shell commands from admin form. Job API selects bounded validated config options.
- Restore previous production model atomically if activation fails. Test rollback in staging.

## Retention and research

- Distinguish event evidence retention from OCR sample retention; document purposes and access for each.
- Inform submitters about optional use for model improvement and set an approved legal basis/consent procedure.
- Minimize GPS, participant names, contacts, profile photos and routes when creating text-line crops.
- Support sample exclusion on retention expiry, withdrawal or authorized removal; block inclusion in future dataset snapshots.
- Assess existing trained models separately if deletion obligations extend to learned influence; do not claim that deleting a row untrains a model.
- Use anonymized or aggregated research exports with participant/activity grouping and data minimization.

## Operations and monitoring

Monitor OCR queue latency, failed jobs, worker memory, CPU, disk headroom, dataset disk growth, model load failures, reminder delivery failures, and per-platform recognition regression. Implement health checks and clean-up of expired temporary artifacts. Preserve event audit records without secret payloads.

## Rollout checklist

- DB backups and schema migration test completed.
- Staging instance uses nonproduction recipients, data, keys and model registry.
- Feature flag supports rapid disabling of new OCR/URL verification without disabling proof submissions.
- Start with lowest-risk manual review, no automated rejection, and no unapproved source scraping.
- Record active model ID and previous ID before deployment; document exact rollback.
