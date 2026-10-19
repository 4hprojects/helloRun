# Platform-Aware OCR — Deployment, Rollout and Rollback

**Audience:** whoever deploys HelloRun to the Ubuntu host (PM2 → nginx → Cloudflare Tunnel; see
[../../operations/deployment-runbook.md](../../operations/deployment-runbook.md)).
**Status:** not deployed. Merge and deployment each need explicit owner approval.

Everything below is additive and behind flags that default off. Deploying the code with no new
environment variables changes nothing that runners, organisers or admins see, apart from the new
`/admin/ocr-training` pages, which are reachable but idle.

## 1. What the code adds to the database

No migration script and no destructive change. Mongoose creates the following on first boot
(`autoIndex` is on in this app):

| Collection | Purpose |
|---|---|
| `ocrjobs` | Extraction queue (lease/claim) |
| `ocrextractions` | Immutable server OCR results |
| `ocrprofilesettings` | Admin enable/disable of OCR profiles |
| `ocrauditevents` | Append-only OCR admin audit |
| `activityurlverifications` | Append-only reviewer link checks |
| `trainingsamples`, `datasetversions` | Ground truth and immutable dataset snapshots |
| `ocrsettings` | OCR Training Center settings (one document) |
| `trainingjobs`, `ocrmodelversions`, `ocrmodelregistries`, `ocrdeploymentevents`, `ocrtrainingworkerstatuses` | Training and model registry |
| `ocrnotificationevents` | Reminder delivery and dedupe |

New **optional** fields on `submissions` and `accumulatedactivitysubmissions`: `serverOcr`,
`proofDifferenceHash`, `activityUrl`, `activityUrlVerification`, `duplicateSignals`,
`ocrTrainingConsent`. Existing documents are untouched and read exactly as before.

New **partial indexes** on both submission collections (built in the background on boot):
`{activityUrl.provider, activityUrl.providerActivityId}`, `{eventId, proofDifferenceHash}`,
`{proofDifferenceHash}`. They only contain documents that have those fields, so they start empty.

Postgres/Supabase: **no change**. None of the new data is shadowed.

**Before deploying:** take the usual MongoDB backup. There is nothing to back-fill.

## 2. Environment variables

All flags accept `true`/`1`; anything else is off. Full list with defaults is in `.env.example`.

| Variable | Default | Effect |
|---|---|---|
| `OCR_SERVER_PIPELINE_ENABLED` | off | Queue and run server OCR on stored proofs |
| `OCR_SERVER_AUTO_APPROVAL_ENABLED` | off | OCR auto-approval uses only the server reading (needs the pipeline flag) |
| `ACTIVITY_URL_ENABLED` | off | Optional activity link field on run-proof submission |
| `OCR_TRAINING_CONSENT_PROMPT_ENABLED` | off | Opt-in checkbox for training use. **Publish privacy-policy wording first.** |
| `OCR_TRAINING_ENABLED` | off | Allow admins to queue training jobs (needs the training worker) |
| `OCR_REMINDERS_ENABLED` | off | OCR admin emails (admins must also enable them in Settings) |
| `OCR_WORKER_MODE` | `inline` | `separate` = run extraction in its own PM2 process |
| `OCR_R2_BUCKET` | `R2_BUCKET` | Bucket with no public domain for crops, models and logs (recommended) |
| `OCR_TESSTRAIN_DIR`, `OCR_TRAINING_TESSDATA_DIR`, `OCR_TRAINING_WORK_DIR` | `/opt/tesstrain`, `/opt/tessdata_best`, OS temp | Training host paths |
| `OCR_MODEL_CACHE_DIR` | OS temp | Local cache of activated, checksum-verified models |
| `OCR_*` limits | see `.env.example` | Pixel/byte limits, timeouts, recycle, lease, attempts |

## 3. Resource expectations (measured, synthetic cards, 8-core dev machine)

- Server OCR: **≈3.3–5.5 s wall, ≈3.4–7.6 s CPU per proof** (two passes), **peak RSS ≈ 350 MB**
  for a process holding the tesseract.js worker. The worker thread is recycled after 50 jobs and
  terminated after 5 idle minutes.
- With the defaults, at most 3 proofs per 15 s cycle → at most about one CPU core while a backlog
  drains. On the shared HelloDeploy host prefer `OCR_WORKER_MODE=separate` so OCR can be limited
  and restarted on its own, e.g.:

  ```bash
  OCR_WORKER_MODE=separate pm2 restart hellorun --update-env
  pm2 start npm --name hellorun-ocr --max-memory-restart 700M -- run ocr:worker
  ```
- Training is far heavier (hours of CPU) and only runs in `npm run ocr:training-worker` under
  systemd-run CPU/memory limits or prlimit, nice 19, ionice idle, with a timeout.

These are synthetic measurements, not production numbers. Re-measure on the Ubuntu host.

## 4. Staged rollout (recommended order)

Each step is reversible by turning its flag off and restarting (`pm2 restart hellorun --update-env`).

1. **Deploy code, all flags off.** Smoke check: `/healthz`, `/readyz`, a runner proof submission, an
   organiser approval, `/admin/ocr-training` loads for a full admin.
2. **Baseline with the owner's own screenshots, in the live admin** (decision 2026-10-18): open
   *Platforms › Test OCR* and upload each of your own Strava/COROS/Garmin screenshots (plus one or
   two from other apps). Test OCR needs no flag and stores nothing except an audit row. Note which
   ones were misread (platform or values) so the profiles/parser can be fixed with regression tests.
   Optionally add them through *Samples › Add your own screenshot* (basis "My own activity") so
   their line crops become the first approved ground truth. The local benchmark
   (`npm run ocr:benchmark`) remains available but is not required.
   Existing database entries are **not** used for evaluation or training: their runners did not
   consent to that use. Training data comes only from new submissions whose runner opted in.
3. **`OCR_SERVER_PIPELINE_ENABLED=true`** (auto-approval still off). Watch *Overview* and
   *Analytics* for failures, latency and server-vs-entry disagreement for a week. Reviewers now see
   the server reading. Enable profiles only after their regression check (*Platforms*).
4. **`OCR_SERVER_AUTO_APPROVAL_ENABLED=true`.** Auto-approval now relies on the server reading.
   Expect entries to wait seconds to minutes as "Server OCR pending". Watch the auto-approval count.
5. **`ACTIVITY_URL_ENABLED=true`.** Optional link + duplicate signals.
6. **Training material from all entries (owner decision 2026-10-18), in this order:**
   1. Legal review of using past and future screenshots under legitimate interest with a right to object.
   2. Publish the revised wording (`privacy-policy.md` §2.5.1, `data-usage-policy.md` §7):
      `npm run privacy:prepare-draft`, `npm run data-usage:prepare-draft`, then publish from the admin
      policy pages. Publishing sends the existing policy-update notice to users.
   3. In *Settings › Which entries may be used for training*: choose *Notice and objection*, enter the
      publication date and policy version, type CHANGE BASIS. The backfill date is held at least 30 days later.
   4. New submissions now produce candidates for runners who have not objected. After the 30 days, in
      *Jobs › Backfill past entries*: run the dry run, then type START BACKFILL. It runs in the background
      after normal submissions, within the daily cap (default 500/day). Pause, resume or cancel there.
   Rollback: switch the basis back to *Opt-in only*. A running backfill pauses itself; already created
   samples stay for review or exclusion. Runners object under *Profile › Screenshot reader improvement*.
7. **`OCR_REMINDERS_ENABLED=true`**, then tick *Send OCR reminders* in *Settings* (the weekly digest defaults to Friday 16:00 Asia/Manila).
8. **Training (needs separate owner approval for host changes):** see section 6.

## 5. Rollback

| Problem | Action | Effect |
|---|---|---|
| Server OCR misbehaving or too heavy | `OCR_SERVER_PIPELINE_ENABLED=false` (+ restart). If running separately: `pm2 stop hellorun-ocr` | No new jobs. With auto-approval also off, behaviour returns to the browser-OCR path exactly. Queued jobs stay in `ocrjobs` and can be left or deleted. |
| Too many entries waiting for review | `OCR_SERVER_AUTO_APPROVAL_ENABLED=false` | Auto-approval returns to the previous rule. Note: that rule trusts browser-posted OCR values (Phase 0 finding C1). |
| Activity link problems | `ACTIVITY_URL_ENABLED=false` | Field disappears; stored links stay for reviewers. |
| Bad email volume | `OCR_REMINDERS_ENABLED=false` | All OCR emails stop immediately. |
| Bad activated model | *Models › Roll back* (full admin, reason, typed confirmation) | Registry points to the previous or base model; workers switch within about a minute. Any model load failure already falls back to the base model automatically. |
| Code problem | `git revert` the feature merge, redeploy | New collections and fields are ignored by the old code. Nothing to undo in Postgres. |

Record the active model id (*Models* page) before any activation, as doc 05 requires.

## 6. Training host setup (NOT done — needs owner approval)

The training worker's preflight checks every requirement. On the chosen host (owner decision: the
Ubuntu production host, separate PM2 process):

1. Survey resources (read-only, changes nothing), as the PM2 user:
   `bash deploy/ocr-training/survey.sh --check-scope`. Review the output (cores, free memory, disk,
   other PM2 apps and containers, whether training tools and user scopes are available).
2. Choose and review two pins: a tesstrain commit and a tessdata_best commit (full SHAs). Then
   preview, which prints every command and changes nothing:
   `sudo TESSTRAIN_REF=<sha> TESSDATA_BEST_REF=<sha> bash deploy/ocr-training/install-training-tools.sh --user <pm2-user>`
3. With approval, run the same command with `--apply`. It installs `tesseract-ocr`, `make`,
   `python3`, `python3-pil`, `bc`, `git`, `curl`; stops if Ubuntu's package lacks `lstmtraining`
   (choose a vetted source then, no unreviewed PPA); clones tesstrain at the pinned commit;
   downloads `eng.traineddata` at the pinned commit and prints its SHA-256 (pin it next time with
   `ENG_BEST_SHA256`); creates `/var/lib/hellorun-ocr-training` owned by the PM2 user; enables
   lingering so CPU/memory scopes work; writes `/opt/hellorun-ocr-training-versions.txt`. It does
   not touch HelloRun, PM2, nginx, the database or env files.
4. `pm2 start npm --name hellorun-ocr-training -- run ocr:training-worker`, then check *Jobs*: the
   worker should show **online** and a **passing** preflight.
5. Set training limits in *Settings*, then `OCR_TRAINING_ENABLED=true` on the web app.

## 7. Monitoring

- *Overview*: queue counts, recent jobs. *Analytics*: failures by error code, latency median/p95,
  disagreement and correction rates. *Models*: model load failures in this process.
- Logs: `[ocr-extraction-worker]`, `[server-ocr]`, `[ocr-engine]`, `[model-registry]`,
  `[ocr-maintenance-worker]`, `[ocr-training-worker]` in the PM2 logs. No screenshot content or OCR
  text is logged.
- Health: `/healthz` and `/readyz` are unchanged; OCR problems never take the app down.
