#!/bin/bash
# SessionStart hook: makes sure the OpenAI Codex CLI (ChatGPT CLI) is installed
# and authenticated in every Claude Code session for this repo.
set -uo pipefail

log() { echo "[codex-setup] $*" >&2; }

if ! command -v codex >/dev/null 2>&1; then
  log "installing @openai/codex..."
  if ! npm install -g @openai/codex >/dev/null 2>&1; then
    log "npm install failed; Codex CLI is unavailable in this session"
    exit 0
  fi
fi

# Log in with the API key from the environment (never stored in the repo).
if [ -n "${OPENAI_API_KEY:-}" ] && ! codex login status >/dev/null 2>&1; then
  printenv OPENAI_API_KEY | codex login --with-api-key >/dev/null 2>&1 \
    && log "logged in with OPENAI_API_KEY" \
    || log "codex login failed"
fi

if codex login status >/dev/null 2>&1; then
  echo "Codex CLI $(codex --version 2>/dev/null) is installed and logged in. Use the 'codex' skill to consult it."
else
  echo "Codex CLI $(codex --version 2>/dev/null) is installed but NOT logged in (set OPENAI_API_KEY in the environment settings)."
fi
exit 0
