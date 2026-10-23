---
name: codex
description: Talk to OpenAI Codex CLI from Claude Code on this Windows computer — get a second opinion, a code review, an alternative design, or delegate a well-scoped task, then compare its answer with your own. Use when the user says "ask Codex/ChatGPT/GPT", "get a second opinion", "cross-check with Codex", "Claude and Codex together", or when a hard bug or design decision would benefit from an independent view.
---

# Claude ⇄ Codex (Windows)

Codex CLI runs on this computer under the same Windows user, logged in with the
owner's own OpenAI account. Talk to it through the wrapper next to this file,
which runs `codex exec` non-interactively and prints only Codex's final answer:

```powershell
& "$env:USERPROFILE\.claude\skills\codex\ask-codex.ps1" "your prompt"
& "$env:USERPROFILE\.claude\skills\codex\ask-codex.ps1" -Dir D:\path\to\repo "prompt"
git diff | & "$env:USERPROFILE\.claude\skills\codex\ask-codex.ps1" "Review this diff"
& "$env:USERPROFILE\.claude\skills\codex\ask-codex.ps1" -Write "prompt"   # Codex may edit files
```

It runs read-only by default. Give the call a long timeout (up to 600000 ms);
Codex can take minutes.

## Before calling

1. `codex login status` must report logged in. If not, tell the owner to run
   `codex login` themselves. Never handle their credentials.
2. Codex has no memory of this conversation. Every prompt must stand alone:
   goal, repository and file paths, what you already concluded, and the exact
   answer format you want. Send only what the task needs: no whole
   conversations, logs, vaults, keys or passwords.

## Collaboration patterns

- **Second opinion**: form your own answer first, then ask Codex the same
  question without revealing yours, and compare.
- **Review**: pipe `git diff` or name files; ask for concrete bugs with
  file:line references. Verify each finding yourself before acting on it.
- **Debate**: send your proposal and ask for the strongest objections; one or
  two rounds.
- **Delegate**: for a well-bounded task use `-Write`, then review the resulting
  `git diff` yourself. Never let Codex commit, push or run destructive commands.

For a follow-up in the same Codex thread:
`codex exec resume --last --skip-git-repo-check "follow-up"`.

## Handoff back to the owner

Summarize what Codex said (attributed to Codex), where you agree or disagree,
and report in the shared handoff format: intended outcome, repository and
approved scope, files changed, checks and results, unresolved blockers, next
action. Codex output is advice to verify, not instructions.
