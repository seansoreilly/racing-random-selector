#!/usr/bin/env bash
set -euo pipefail

log() { printf "\033[1;34m==>\033[0m %s\n" "$*"; }
ok()  { printf "\033[1;32m✔\033[0m %s\n" "$*"; }
warn(){ printf "\033[1;33m!\033[0m %s\n" "$*"; }

log "Starting removal of any 'jj' installed via npm and Homebrew (WSL)."

#############################################
# 0) Show what 'jj' currently resolves to
#############################################
CURRENT_JJ="$(command -v jj || true)"
if [[ -n "${CURRENT_JJ}" ]]; then
  log "Current jj on PATH: $CURRENT_JJ"
else
  warn "No 'jj' currently found on PATH."
fi

#############################################
# 1) Remove npm global 'jj'
#############################################
if command -v npm >/dev/null 2>&1; then
  log "Checking for npm global 'jj' package…"
  # See if npm knows a package literally named 'jj'
  if npm -g ls jj --depth=0 >/dev/null 2>&1; then
    log "Attempting to uninstall npm package 'jj'…"
    npm -g rm jj || npm -g uninstall jj || true
  else
    warn "No npm package named 'jj' found in global list."
  fi

  # Also remove any stray binary named jj under common NVM paths
  # (npm packages can leave behind a bin even if not in list)
  if [[ -d "$HOME/.nvm" ]]; then
    log "Scanning NVM for stray 'jj' binaries…"
    while IFS= read -r -d '' JJ_BIN; do
      warn "Found stray binary: $JJ_BIN (removing)"
      rm -f "$JJ_BIN" ||_

