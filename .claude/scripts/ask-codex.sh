#!/bin/bash
# Send a prompt to the Codex CLI and print only its final answer.
#
# Usage:
#   ask-codex.sh [--write] [--model MODEL] "prompt"
#   git diff | ask-codex.sh "review this diff"
#
# By default Codex runs read-only in the repo root; --write lets it edit files.
set -uo pipefail

sandbox="read-only"
model_args=()
while [ $# -gt 0 ]; do
  case "$1" in
    --write) sandbox="workspace-write"; shift ;;
    --model) model_args=(-m "$2"); shift 2 ;;
    *) break ;;
  esac
done

if [ $# -eq 0 ]; then
  echo "usage: ask-codex.sh [--write] [--model MODEL] \"prompt\"" >&2
  exit 2
fi

if ! command -v codex >/dev/null 2>&1; then
  echo "codex is not installed; run .claude/hooks/install-codex.sh" >&2
  exit 1
fi

root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
out="$(mktemp)"
trap 'rm -f "$out" "$out.log"' EXIT

# Piped stdin is appended to the prompt by codex; otherwise give it no stdin.
if [ -t 0 ]; then exec 0</dev/null; fi

# Codex's progress log goes to stderr; keep only the final message.
codex exec --skip-git-repo-check --sandbox "$sandbox" -C "$root" \
  ${model_args[@]+"${model_args[@]}"} -o "$out" "$*" >/dev/null 2>"$out.log"
status=$?

if [ "$status" -ne 0 ] || [ ! -s "$out" ]; then
  echo "codex exec failed (exit $status):" >&2
  tail -20 "$out.log" >&2
  exit $(( status == 0 ? 1 : status ))
fi
cat "$out"
