#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Checkpoint.
#
#   bash scripts/checkpoint.sh "read-aloud working"
#
# Commits everything and tags it, so there is always a named point to come
# back to. Tags rather than plain commits because a tag survives rebasing and
# shows up in `git tag -l`, which is where you will look in three weeks when
# you cannot remember what the commit was called.
#
# It runs the suite FIRST and refuses to checkpoint a failing tree. A
# checkpoint you cannot trust is worse than no checkpoint: the whole point is
# to be able to return to it without checking whether it worked.
#
# Override with --force when you deliberately want to save a broken state
# before trying something drastic. That is a real use, but it should be a
# decision rather than an accident.
# ─────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

FORCE=0
LABEL=""
for arg in "$@"; do
  case "$arg" in
    --force) FORCE=1 ;;
    *) LABEL="$arg" ;;
  esac
done

if [ -z "$LABEL" ]; then
  echo "Usage: bash scripts/checkpoint.sh \"what this point is\" [--force]"
  echo
  echo "Recent checkpoints:"
  git tag -l 'checkpoint/*' --sort=-creatordate | head -10 | sed 's/^/  /'
  exit 1
fi

if [ ! -d .git ]; then
  echo "Not a git repository. Run: git init && git add -A && git commit -m 'baseline'"
  exit 1
fi

# ── Tests ────────────────────────────────────────────────────
if [ "$FORCE" -eq 1 ]; then
  echo "==> Skipping tests (--force)"
elif [ ! -f package.json ]; then
  echo "==> No package.json yet — skipping tests (run scripts/bootstrap.sh first)"
else
  echo "==> Running the suite"
  if ! npm test; then
    echo
    echo "Tests failed. Nothing has been committed."
    echo "To checkpoint anyway: bash scripts/checkpoint.sh \"$LABEL\" --force"
    exit 1
  fi
fi

# ── Commit ───────────────────────────────────────────────────
SLUG="$(echo "$LABEL" | tr '[:upper:] ' '[:lower:]-' | tr -cd 'a-z0-9-' | cut -c1-40)"
STAMP="$(date +%Y%m%d-%H%M)"
TAG="checkpoint/${STAMP}-${SLUG}"

git add -A
if git diff --cached --quiet; then
  echo "==> Nothing to commit — tagging the current HEAD instead"
else
  git commit -qm "checkpoint: ${LABEL}"
  echo "==> Committed"
fi

git tag -a "$TAG" -m "$LABEL${FORCE:+ (tests skipped)}"

cat <<DONE

Checkpoint saved.

  tag     $TAG
  commit  $(git rev-parse --short HEAD)

To come back here later:

  git checkout $TAG           # look at it
  git reset --hard $TAG       # throw away everything since (destructive)

To push it somewhere safe:

  git push origin HEAD --tags

DONE
