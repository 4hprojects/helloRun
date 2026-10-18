#!/usr/bin/env bash
# Read-only survey of a candidate OCR training host (docs/improvement-plan/ocr-platform-aware).
# Changes nothing. Paste the output into the review before approving install-training-tools.sh.
#
#   bash deploy/ocr-training/survey.sh [--check-scope]
#
# --check-scope additionally runs `systemd-run --user --scope -p MemoryMax=32M true`, a harmless
# probe of whether per-job CPU/memory limits will work for the current user.
set -uo pipefail

section() { printf '\n== %s\n' "$1"; }
have() { command -v "$1" >/dev/null 2>&1; }
version_of() { if have "$1"; then "$@" 2>&1 | head -n 1; else echo "not installed"; fi; }

section "System"
grep -E '^(PRETTY_NAME|VERSION_ID)=' /etc/os-release 2>/dev/null || echo "unknown OS"
uname -srm
echo "user: $(id -un) (uid $(id -u))"

section "CPU"
echo "cores: $(nproc)"
grep -m1 'model name' /proc/cpuinfo 2>/dev/null | sed 's/^model name\s*:\s*/model: /'
echo "load average: $(cut -d' ' -f1-3 /proc/loadavg)"

section "Memory (MB)"
free -m

section "Disk"
df -h / /opt /tmp 2>/dev/null | awk 'NR==1 || !seen[$0]++'

section "Top memory processes"
ps -eo pid,user,rss,pcpu,comm --sort=-rss | head -n 12 | awk 'NR==1 {print; next} {printf "%s %s %d MB %s%% %s\n", $1, $2, $3/1024, $4, $5}'

section "PM2 processes (current user)"
if have pm2; then pm2 jlist 2>/dev/null | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{for(const p of JSON.parse(s))console.log(p.name, p.pm2_env.status, Math.round((p.monit.memory||0)/1048576)+' MB', (p.monit.cpu||0)+'% cpu')}catch(e){console.log('pm2 present; could not parse list')}})" 2>/dev/null || pm2 ls; else echo "pm2 not on PATH for this user"; fi

section "Containers"
if have docker; then docker ps --format '{{.Names}} {{.Status}}' 2>/dev/null || echo "docker present; no access"; else echo "docker not installed"; fi

section "OCR training tools"
echo "tesseract:    $(version_of tesseract --version)"
echo "lstmtraining: $(version_of lstmtraining --version)"
echo "make:         $(version_of make --version)"
echo "python3:      $(version_of python3 --version)"
if have python3; then python3 -c 'import PIL; print("Pillow:       " + PIL.__version__)' 2>/dev/null || echo "Pillow:       not installed"; fi
echo "git:          $(version_of git --version)"
for dir in "${OCR_TESSTRAIN_DIR:-/opt/tesstrain}" "${OCR_TRAINING_TESSDATA_DIR:-/opt/tessdata_best}"; do
  if [ -e "$dir" ]; then echo "present: $dir"; else echo "absent:  $dir"; fi
done

section "Resource limiting"
echo "systemd-run: $(version_of systemd-run --version)"
echo "prlimit:     $(version_of prlimit --version)"
echo "nice/ionice: $(have nice && echo yes || echo no) / $(have ionice && echo yes || echo no)"
if have loginctl; then echo "linger for $(id -un): $(loginctl show-user "$(id -un)" -p Linger --value 2>/dev/null || echo unknown)"; fi
if [ "${1:-}" = "--check-scope" ]; then
  if systemd-run --user --scope --quiet -p MemoryMax=32M true 2>/dev/null; then
    echo "user scope probe: OK (CPUQuota/MemoryMax limits will work)"
  else
    echo "user scope probe: FAILED (the worker will fall back to prlimit, or enable linger)"
  fi
fi
echo
echo "Survey complete. Nothing was changed."
