#!/usr/bin/env bash
# Install pinned Tesseract training tools for the HelloRun OCR training worker.
# (docs/improvement-plan/ocr-platform-aware/DEPLOYMENT-AND-ROLLBACK.md §6)
#
# DRY RUN BY DEFAULT: prints every command and changes nothing. Add --apply to execute.
# Run on the training host as a sudo-capable user, after reviewing survey.sh output.
#
#   sudo TESSTRAIN_REF=<commit> TESSDATA_BEST_REF=<commit> \
#        bash deploy/ocr-training/install-training-tools.sh --user <pm2-user> [--apply]
#
# Required pins (full 40-character commit SHAs, chosen and reviewed by the owner):
#   TESSTRAIN_REF       commit of https://github.com/tesseract-ocr/tesstrain
#   TESSDATA_BEST_REF   commit of https://github.com/tesseract-ocr/tessdata_best
# Optional:
#   ENG_BEST_SHA256     expected SHA-256 of eng.traineddata; if unset the computed value is
#                       printed so it can be recorded and pinned on the next run.
#   TESSTRAIN_DIR (/opt/tesstrain), TESSDATA_DIR (/opt/tessdata_best),
#   WORK_DIR (/var/lib/hellorun-ocr-training)
#
# It installs OS packages, clones tesstrain, downloads one model file, creates directories owned
# by the PM2 user and enables systemd lingering for that user. It does NOT touch HelloRun, PM2,
# nginx, the database or any environment file, and it never pipes downloads into a shell.
set -euo pipefail

APPLY=0
SERVICE_USER=""
TESSTRAIN_DIR="${TESSTRAIN_DIR:-/opt/tesstrain}"
TESSDATA_DIR="${TESSDATA_DIR:-/opt/tessdata_best}"
WORK_DIR="${WORK_DIR:-/var/lib/hellorun-ocr-training}"
TESSTRAIN_REF="${TESSTRAIN_REF:-}"
TESSDATA_BEST_REF="${TESSDATA_BEST_REF:-}"
ENG_BEST_SHA256="${ENG_BEST_SHA256:-}"
APT_PACKAGES=(tesseract-ocr make python3 python3-pil bc git curl ca-certificates)
VERSIONS_FILE="/opt/hellorun-ocr-training-versions.txt"

usage() { sed -n '2,25p' "$0"; exit "${1:-0}"; }
die() { echo "ERROR: $*" >&2; exit 1; }
run() {
  printf '+ %s\n' "$*"
  if [ "$APPLY" -eq 1 ]; then "$@"; fi
}

while [ $# -gt 0 ]; do
  case "$1" in
    --apply) APPLY=1 ;;
    --user) SERVICE_USER="${2:-}"; shift ;;
    -h|--help) usage 0 ;;
    *) echo "Unknown argument: $1" >&2; usage 1 ;;
  esac
  shift
done

[ -n "$SERVICE_USER" ] || die "--user <pm2-user> is required (the account that runs PM2)."
id "$SERVICE_USER" >/dev/null 2>&1 || die "user '$SERVICE_USER' does not exist."
for ref_name in TESSTRAIN_REF TESSDATA_BEST_REF; do
  ref="${!ref_name}"
  [[ "$ref" =~ ^[0-9a-f]{40}$ ]] || die "$ref_name must be a full 40-character commit SHA (got '${ref:-unset}')."
done
for path in "$TESSTRAIN_DIR" "$TESSDATA_DIR" "$WORK_DIR"; do
  [[ "$path" =~ ^/[A-Za-z0-9_./-]+$ ]] || die "unsafe path: $path"
done
grep -qE '^ID=ubuntu' /etc/os-release || die "this script supports Ubuntu only."
if [ "$APPLY" -eq 1 ] && [ "$(id -u)" -ne 0 ]; then die "--apply must run as root (use sudo)."; fi

echo "Mode: $([ "$APPLY" -eq 1 ] && echo APPLY || echo 'DRY RUN (nothing will change; add --apply)')"
echo "Service user: $SERVICE_USER"

echo
echo "# 1. OS packages"
run apt-get update
run env DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends "${APT_PACKAGES[@]}"
if [ "$APPLY" -eq 1 ]; then
  command -v lstmtraining >/dev/null 2>&1 || die "lstmtraining is not provided by this Ubuntu's tesseract-ocr package. Stop here and decide on a source (distribution backport or a reviewed source build); do not continue with an unvetted PPA."
  tesseract --version 2>&1 | head -n 1
  lstmtraining --version 2>&1 | head -n 1
fi

echo
echo "# 2. tesstrain at the pinned commit"
if [ -d "$TESSTRAIN_DIR/.git" ]; then
  run git -C "$TESSTRAIN_DIR" fetch --quiet origin
else
  run git clone --quiet https://github.com/tesseract-ocr/tesstrain.git "$TESSTRAIN_DIR"
fi
run git -C "$TESSTRAIN_DIR" -c advice.detachedHead=false checkout --quiet "$TESSTRAIN_REF"
if [ "$APPLY" -eq 1 ]; then
  [ "$(git -C "$TESSTRAIN_DIR" rev-parse HEAD)" = "$TESSTRAIN_REF" ] || die "tesstrain is not at $TESSTRAIN_REF"
  [ -f "$TESSTRAIN_DIR/Makefile" ] || die "tesstrain Makefile missing"
fi

echo
echo "# 3. Base model (tessdata_best eng) at the pinned commit"
run mkdir -p "$TESSDATA_DIR"
MODEL_URL="https://raw.githubusercontent.com/tesseract-ocr/tessdata_best/${TESSDATA_BEST_REF}/eng.traineddata"
run curl --fail --location --proto '=https' --tlsv1.2 --silent --show-error -o "$TESSDATA_DIR/eng.traineddata.download" "$MODEL_URL"
if [ "$APPLY" -eq 1 ]; then
  actual="$(sha256sum "$TESSDATA_DIR/eng.traineddata.download" | cut -d' ' -f1)"
  if [ -n "$ENG_BEST_SHA256" ] && [ "$actual" != "$ENG_BEST_SHA256" ]; then
    rm -f "$TESSDATA_DIR/eng.traineddata.download"
    die "eng.traineddata checksum mismatch (expected $ENG_BEST_SHA256, got $actual)"
  fi
  mv "$TESSDATA_DIR/eng.traineddata.download" "$TESSDATA_DIR/eng.traineddata"
  echo "eng.traineddata sha256: $actual"
  [ -n "$ENG_BEST_SHA256" ] || echo "Record this checksum and pass ENG_BEST_SHA256 on future runs."
else
  echo "+ verify sha256 of eng.traineddata${ENG_BEST_SHA256:+ against $ENG_BEST_SHA256}, then move into place"
fi

echo
echo "# 4. Work directory and ownership"
run mkdir -p "$WORK_DIR"
run chown -R "$SERVICE_USER": "$TESSTRAIN_DIR" "$WORK_DIR"
run chmod 0750 "$WORK_DIR"

echo
echo "# 5. Allow per-job CPU/memory limits (systemd user scopes need lingering)"
run loginctl enable-linger "$SERVICE_USER"

echo
echo "# 6. Record versions for the review"
if [ "$APPLY" -eq 1 ]; then
  {
    echo "recorded_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "tesseract=$(tesseract --version 2>&1 | head -n 1)"
    echo "lstmtraining=$(lstmtraining --version 2>&1 | head -n 1)"
    echo "tesstrain_ref=$TESSTRAIN_REF"
    echo "tessdata_best_ref=$TESSDATA_BEST_REF"
    echo "eng_traineddata_sha256=$(sha256sum "$TESSDATA_DIR/eng.traineddata" | cut -d' ' -f1)"
  } > "$VERSIONS_FILE"
  cat "$VERSIONS_FILE"
else
  echo "+ write $VERSIONS_FILE"
fi

cat <<NEXT

Next (as $SERVICE_USER, not root):
  OCR_TESSTRAIN_DIR=$TESSTRAIN_DIR OCR_TRAINING_TESSDATA_DIR=$TESSDATA_DIR OCR_TRAINING_WORK_DIR=$WORK_DIR \\
    pm2 start npm --name hellorun-ocr-training -- run ocr:training-worker
Then open /admin/ocr-training/jobs: the worker should be online with a passing preflight.
Training stays off until OCR_TRAINING_ENABLED=true is set on the web app.
NEXT
