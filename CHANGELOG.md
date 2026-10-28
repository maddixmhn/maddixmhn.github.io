# Changelog

Auto-generated from conventional commits.

### 2026-10-28

Fix Codex connection: clear proxy, add reset script
- setup.ps1: clear HTTP_PROXY/HTTPS_PROXY at start (unless -Proxy given)
  and set NO_PROXY=*.openai.com so traffic goes direct by default
- reset-codex.ps1: new one-shot reset script that clears all proxy env
  vars, wipes Codex auth cache, reinstalls the npm package, re-runs
  login, and does a live round-trip test
- README: add "اگر Codex وصل نمی‌شود" section with reset instructions


Claude-Session: https://claude.ai/code/session_01N4JPuEw51vHb9DHSSYwx6q

Co-authored-by: Claude <noreply@anthropic.com>
### 2026-10-28

chore: update CI status

### 2026-10-28

chore: update CI status

### 2026-10-28

chore: update repo stats

### 2026-10-28

generated: profile-3d-contrib [skip ci]

### 2026-10-27

chore: update CI status

### 2026-10-27

chore: update repo stats

### 2026-10-27

generated: profile-3d-contrib [skip ci]

### 2026-10-26

chore: update CI status

### 2026-10-26

chore: update repo stats

### 2026-10-26

generated: profile-3d-contrib [skip ci]

### 2026-10-25

chore: update CI status

### 2026-10-25

chore: update repo stats

### 2026-10-25

generated: profile-3d-contrib [skip ci]

### 2026-10-24

chore: update CI status

### 2026-10-24

chore: update repo stats

### 2026-10-24

generated: profile-3d-contrib [skip ci]

### 2026-10-23

chore: update CI status

### 2026-10-23

chore: update repo stats

### 2026-10-23

chore: update CI status

### 2026-10-23

chore: update CI status

### 2026-10-23

chore: update changelog

### 2026-10-23

Connect Claude Code and Codex CLI (cloud hook + Windows setup kit)
* Add Codex CLI setup hook, ask-codex wrapper and codex skill

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01N4JPuEw51vHb9DHSSYwx6q

* Add Windows setup kit connecting Claude Code and Codex

setup.ps1 installs Codex CLI, turns on ssh-agent, signs Codex in to the
owner's own account, installs the codex skill and a shared working
agreement for both agents, then health-tests both with a real answer.
No credentials are read, copied or stored.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01N4JPuEw51vHb9DHSSYwx6q

---------

Co-authored-by: Claude <noreply@anthropic.com>
### 2026-10-23

generated: profile-3d-contrib [skip ci]

### 2026-10-22

chore: update CI status

### 2026-10-22

chore: update repo stats

### 2026-10-22

generated: profile-3d-contrib [skip ci]

### 2026-10-21

chore: update CI status

### 2026-10-21

chore: update repo stats

### 2026-10-21

generated: profile-3d-contrib [skip ci]

### 2026-10-20

chore: update CI status

### 2026-10-20

chore: update repo stats

### 2026-10-20

generated: profile-3d-contrib [skip ci]

### 2026-10-19

chore: update CI status

### 2026-10-19

chore: update repo stats

### 2026-10-19

generated: profile-3d-contrib [skip ci]

### 2026-10-18

chore: update CI status

### 2026-10-18

chore: update repo stats

### 2026-10-18

generated: profile-3d-contrib [skip ci]

### 2026-10-17

chore: update CI status

### 2026-10-17

chore: update repo stats

### 2026-10-17

generated: profile-3d-contrib [skip ci]

### 2026-10-17

chore: update CI status

### 2026-10-16
