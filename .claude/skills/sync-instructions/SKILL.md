---
name: sync-instructions
description: Synchronize instruction files and skills across Claude Code and Codex after codebase changes. Use when new JS files are added, globals change, patterns evolve, version info updates, or skills are modified.
user-invocable: true
---

# Sync Instructions & Skills

Keep instruction files and tracked skills aligned across Claude Code and Codex.

## Project Detection

```bash
gh repo view --json name,owner --jq '{owner: .owner.login, repo: .name}'
git rev-parse --show-toplevel
```

Use `REPO` and `PROJECT_PATH` where project-specific names appear below.

## When to Run

- After adding or removing JS files
- After adding new global functions or variables
- After adding new localStorage keys
- After changing critical patterns (DOM access, persistence, security)
- After major feature additions
- After changing the script loading order in `index.html`
- As part of a release workflow (post version bump)

## File Roles

| File | Audience | Git-tracked | Focus |
|------|----------|-------------|-------|
| `CLAUDE.md` | Claude Code (local Mac) | No | Full context + MCP servers + local skills/commands |
| `AGENTS.md` | Codex, Claude Code web, remote agents | Yes | Codebase context only, no local tooling |
| `.github/copilot-instructions.md` | GitHub Copilot PR reviews | Yes | PR review rules, globals list, ESLint/PMD, patterns to enforce |

## Sync Process

### Phase 1: Detect Changes

1. **Script count**: `grep -c 'src="js/' index.html` — compare against the script count claim in all three files
2. **New JS files**: `ls js/*.js | wc -l` — compare against file listings
3. **New globals**: Search for new top-level `const`/`let`/`function` declarations in recently modified files
4. **New localStorage keys**: Check `ALLOWED_STORAGE_KEYS` in `constants.js` for entries not mentioned in docs
5. **Version**: Check `APP_VERSION` in `constants.js` against version references in instruction files

### Phase 2: Identify Gaps

| Change Type | CLAUDE.md | AGENTS.md | copilot-instructions.md |
|-------------|-----------|-----------|------------------------|
| New JS file | Add to file listing + load order | Add to file listing + load order | Add globals if exported |
| New global | Add to relevant section | Add to globals table | Add to globals list (critical) |
| New localStorage key | Mention if significant | Mention if significant | Not needed |
| New pattern/convention | Add to Critical Patterns | Add to Critical Patterns | Add to Patterns to Enforce |
| Script order change | Update load order block | Update load order block | Mention if relevant |
| New feature module | Add to Feature Modules | Add to Feature Modules | Add globals + review focus |

### Phase 3: Apply Updates

For each file that needs changes:

1. Read the current file
2. Make targeted edits (don't rewrite the whole file)
3. Verify the file still parses correctly as markdown

### Phase 4: Report

```
Sync Instructions — Summary
=============================

Changes detected:
  - [list changes found]

Files updated:
  - CLAUDE.md: [what changed]
  - AGENTS.md: [what changed]
  - copilot-instructions.md: [what changed]

No changes needed: [list any files that were already current]
```

## Rules

- **Never strip local-only content from CLAUDE.md** — MCP servers, local skills, and commands belong there
- **Never add local-only content to AGENTS.md** — no MCP servers, no mem0, no Linear team IDs
- **Never remove the MCP or handoff protocol sections from AGENTS.md** — those are Codex-managed
- **copilot-instructions.md is the most detailed for globals** — Copilot needs explicit "do not flag" lists to avoid false positives
- **AGENTS.md is the most concise** — remote agents don't need ESLint rule tables or PMD config
- **Keep the script load order block identical** across CLAUDE.md and AGENTS.md
- **Update script count** whenever files are added/removed
- **Codacy instructions** are managed separately by Codacy — do not modify

## Phase 5: Skills Sync

Skills live in two tiers:

| Tier | Location | Audience |
|------|----------|----------|
| User-level | `~/.claude/skills/` | Claude Code (all projects) |
| Project-level | `.agents/skills/` | Codex (per-repo) |

Some skills exist in both (independent copies). Each agent may tune its copy.

### Step 1: Compare skill copies

For each skill that exists in both locations, diff them:

```bash
diff ~/.claude/skills/<name>/SKILL.md .agents/skills/<name>/SKILL.md
```

For project-only skills in `.agents/skills/`, check if they also exist in the project `.claude/skills/`.

### Step 2: Report drift

```text
Skill: remember
  ~/.claude/skills/:  180 lines, modified 2026-02-18
  .agents/skills/:    180 lines, modified 2026-02-18
  Drift: none

Skill: coding-standards
  .agents/skills/:    532 lines, modified 2026-02-18
  .claude/skills/:    528 lines, modified 2026-02-15
  Drift: 4 lines differ (description field)
  Direction: Codex is newer
```

### Step 3: Reconcile

For each skill with drift, present diffs and ask:

1. **Claude Code -> Codex**: Update `.agents/skills/`
2. **Codex -> Claude Code**: Update `~/.claude/skills/` or `.claude/skills/`
3. **Manual merge**: Show side-by-side
4. **Skip**: Intentional divergence

**Expected divergences** (do not flag):

- Path references: `~/.claude/skills/` vs `.agents/skills/`
- Tool names: Claude Code vs Codex tool names
- Invocation style: `/skillname` vs implicit activation
- Project detection sections (user-level skills detect via project.json; Codex copies may hardcode)

### Step 4: Verify utility scripts

If any skill has utility scripts (e.g., seed-sync `update-today.py`), check both copies are identical.

## Phase 5.5: MCP Server Sync (when `.mcp.json` changes)

When a new MCP server is added or removed, sync the change to all agent config files.
All three config files live **outside the repo** (never in git) — they contain real secrets.

### Config file locations

| File | Agent | Format | Location |
|------|-------|--------|----------|
| `.mcp.json` | Claude Code | JSON + keychain | `/path/to/StakTrakr/.mcp.json` (gitignored) |
| `settings.json` | Gemini CLI | JSON + keychain | `~/.gemini/settings.json` |
| `config.toml` | Codex CLI | TOML + keychain | `~/.codex/config.toml` |

All three use macOS keychain (`security find-generic-password -s HexTrackr -a KEY -w`) for secrets.
Servers without real secrets (e.g., `firecrawl-local`) use literal values directly.

### Rules

- **All three configs stay in sync** — if a server is in `.mcp.json`, it should be in the other two.
- **Keychain pattern** is consistent across all three: `bash -c "KEY=$(security ...) npx ..."`
- **Local-only servers**: Include with a comment noting the Docker prerequisite.
- **Claude-specific servers**: `chrome-devtools` and `code-graph-context` are fine in Codex/Gemini
  too if the user wants them; otherwise skip.
- **GEMINI.md MCP section**: Add a usage block when adding a new server (tools, when, prerequisites).
- **AGENTS.md MCP table**: Add a row to the "MCP Servers Available" table.
- **Back up all three** in the secrets tier after any change (see Phase 6 Tier 2).

### When a server is added — checklist

- [ ] `StakTrakr/.mcp.json` — Claude Code config (gitignored)
- [ ] `~/.gemini/settings.json` — Gemini CLI config
- [ ] `~/.codex/config.toml` — Codex CLI config
- [ ] `GEMINI.md` — add MCP usage block under `## MCP Server Usage`
- [ ] `AGENTS.md` — add row to MCP server table
- [ ] Refresh secrets backup: `zip -j ~/.claude/backups/staktrakr-secrets-$(date +%Y-%m-%d).zip StakTrakr/.mcp.json ~/.gemini/settings.json ~/.codex/config.toml`

## Phase 6: Backup — Two Tiers, Two Destinations

Backups split by sensitivity. Run both after any sync.

### Tier 1 — Non-secret config → `devops/claude-backup/` (tracked in git, syncs to GitHub)

Contains: CLAUDE.md + local-only skills. No secrets, safe to commit.

```bash
zip -r devops/claude-backup/claude-local-$(date +%Y-%m-%d).zip \
  CLAUDE.md \
  .claude/skills/bb-test/ \
  .claude/skills/smoke-test/ \
  .claude/skills/ui-mockup/
git add devops/claude-backup/
```

Include in the sync commit. `.gitignore` has a `!devops/claude-backup/` exception so this folder
is tracked in GitHub despite `devops/*` being ignored. Old dated zips can be kept or pruned.

### Tier 2 — Secrets → `~/.claude/backups/` (local only, never in git)

Contains: `.mcp.json` (API keys, tokens). Never commit this anywhere.

```bash
zip -j ~/.claude/backups/staktrakr-secrets-$(date +%Y-%m-%d).zip \
  /path/to/StakTrakr/.mcp.json
```

(`-j` strips the path so only the filename is stored in the zip.)

`~/.claude/backups/` lives outside the repo — git never sees it. Back it up via Time Machine or
your own encrypted offsite method. Do NOT put `.mcp.json` in `devops/claude-backup/`.
