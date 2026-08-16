#!/usr/bin/env bash
# Overnight polish loop for the Pepstack app.
#
# Runs one queue item per Claude invocation rather than one long session,
# because headless mode does not auto-compact: a single all-night session dies
# on context overflow and does not recover. Short invocations also mean a bad
# iteration costs you one commit, not the night.
#
# Every iteration must end green. If it doesn't, the work is thrown away and
# the loop moves on. You wake up to a branch where every commit builds.
#
# Usage:  bash nightly.sh
# Stop:   Ctrl+C, or   touch STOP

set -uo pipefail

REPO="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO"

# ── preflight ─────────────────────────────────────────────────────────────
command -v claude >/dev/null 2>&1 || {
  echo "'claude' is not on PATH in this shell."
  echo "Open the shell you normally run Claude Code in, or add it to PATH, then retry."
  exit 1
}

# Only *tracked* modifications block. Untracked files are fine — the queue, the
# specs and this script itself arrive untracked, and the loop commits with
# `git add -A` anyway.
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "Tracked files are modified. Commit or stash first — the loop branches"
  echo "from HEAD and cannot tell your changes from its own."
  git status --short --untracked-files=no | head -20
  exit 1
fi

# the files the loop actually needs
for f in CLAUDE.md NIGHT_QUEUE.md PROMPT_PERSONALISATION.md CATALOG_BRANDED_176.md; do
  [ -f "$f" ] || { echo "missing $f — copy it into this directory first"; exit 1; }
done

# a fresh worktree has no node_modules, and the baseline build would fail
if [ ! -d node_modules ]; then
  echo "no node_modules here — installing (this takes a few minutes)..."
  npm install || { echo "npm install failed"; exit 1; }
fi

BRANCH="night/$(date +%Y%m%d-%H%M)"
LOG_DIR="$REPO/.night/$(date +%Y%m%d-%H%M)"
mkdir -p "$LOG_DIR"

# retry indefinitely through transient 429s instead of dying at 3am
export CLAUDE_CODE_RETRY_WATCHDOG=1

# ── the gate every iteration has to pass ──────────────────────────────────
# `npm run build` is `tsc -b && vite build`, so this already typechecks.
# There is no `test` script yet — `--if-present` exits 0 — which means until
# queue item 0.1 lands, this gate only proves the code compiles.
GREEN='npm run build && npm test --if-present'

echo "branch  $BRANCH"
echo "logs    $LOG_DIR"
git checkout -b "$BRANCH" || { echo "could not create branch"; exit 1; }

# baseline: refuse to start from a broken tree
echo "checking the tree is green before starting..."
if ! eval "$GREEN" > "$LOG_DIR/00-baseline.log" 2>&1; then
  echo "the tree is already red — fix it before starting the loop"
  tail -40 "$LOG_DIR/00-baseline.log"
  git checkout - >/dev/null 2>&1
  git branch -D "$BRANCH" >/dev/null 2>&1
  exit 1
fi
echo "baseline green."
git commit -qm "night: green baseline" --allow-empty

i=0
while true; do
  [ -f STOP ] && { echo "STOP file present — finishing"; break; }

  i=$((i+1))
  SAFE=$(git rev-parse HEAD)
  echo ""
  echo "── iteration $i ($(date +%H:%M)) ──────────────────────────────"

  claude -p "/goal Take the single highest-priority unchecked item from NIGHT_QUEUE.md, do it completely, and stop. The goal is met when: that one item is done, \`$GREEN\` passes, the item is ticked off in NIGHT_QUEUE.md with a one-line note on what changed, a line has been appended to NIGHT_REPORT.md, and the work is committed. Do not start a second item. If the item turns out to be impossible or already done, tick it with a note saying so and stop rather than inventing work." \
    --permission-mode auto \
    --output-format stream-json \
    --verbose \
    > "$LOG_DIR/$(printf '%02d' $i).jsonl" 2>&1

  # the gate. Claude's own claim that it passed is not the check.
  if eval "$GREEN" > "$LOG_DIR/$(printf '%02d' $i)-verify.log" 2>&1; then
    git add -A
    git commit -qm "night $i: see NIGHT_QUEUE.md" --allow-empty
    echo "green — kept"
  else
    echo "RED — reverting iteration $i"
    git reset --hard "$SAFE" -q
    git clean -fd -q
    # leave a breadcrumb so the next iteration doesn't retry the same wall
    printf '\n- iteration %d failed the build gate and was reverted (%s)\n' \
      "$i" "$(date +%H:%M)" >> NIGHT_FAILURES.md
    git add NIGHT_FAILURES.md && git commit -qm "night $i: reverted, see NIGHT_FAILURES.md"
  fi

  # nothing left to do
  if ! grep -q '^- \[ \]' NIGHT_QUEUE.md; then
    echo "queue empty — stopping"
    break
  fi

  sleep 5
done

echo ""
echo "done. $i iterations on $BRANCH"
git --no-pager log --oneline "$BRANCH" | head -40
