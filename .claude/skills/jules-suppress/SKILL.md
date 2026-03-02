# jules-suppress

Manage the Jules suppressions file to prevent repeat false positives from nightly Bolt/Sentinel/Scribe PRs.

## Trigger

`/jules-suppress` or `/jules-suppress <command>` or "manage Jules suppressions"

## Suppressions File

**Location:** `.github/jules-suppressions.json`

```json
{
  "version": 1,
  "suppressions": [
    {
      "id": "JULES-S001",
      "type": "bolt|sentinel|scribe",
      "pattern": "regex or file:line pattern",
      "reason": "Why this is a false positive",
      "added": "YYYY-MM-DD",
      "addedBy": "claude|user"
    }
  ],
  "prompt_exclusions": [
    "Human-readable exclusion clause for pasting into Jules prompt settings"
  ]
}
```

## Commands

### `/jules-suppress list`

Display all active suppressions in a table:

| ID | Type | Pattern | Reason | Added |
|----|------|---------|--------|-------|

If no suppressions exist, show "No active suppressions."

### `/jules-suppress add <pattern> --type bolt|sentinel|scribe --reason "..."`

1. Load `.github/jules-suppressions.json` (create if missing)
2. Auto-generate next ID: `JULES-S{NNN}` (zero-padded, incrementing)
3. Add the new suppression entry
4. Write the updated file
5. Confirm addition with the assigned ID

### `/jules-suppress remove <id>`

1. Load suppressions file
2. Find and remove entry matching `id`
3. Write updated file
4. Confirm removal

### `/jules-suppress audit`

1. Load all suppression patterns
2. For each pattern, check if the referenced file/code still exists in the codebase
3. Report stale suppressions (patterns that no longer match anything)
4. Offer to remove stale entries

### `/jules-suppress prompt`

Generate copy-pasteable exclusion clauses for the Jules scheduled prompt settings.

1. Load suppressions and `prompt_exclusions`
2. Group by type (bolt/sentinel/scribe)
3. Output formatted text:

```
## Exclusion Clauses for Jules Prompt

Paste these into your Bolt/Sentinel/Scribe scheduled prompt settings:

### Bolt (Security) Exclusions
- Do not flag localStorage.getItem/setItem for scalar string preferences — this is intentional
- ...

### Sentinel (Performance) Exclusions
- Do not suggest lazy-loading for scripts in index.html — load order is critical
- ...

### Scribe (Documentation) Exclusions
- ...

### General Exclusions (all prompts)
- This is a vanilla JS single-page app with no build step — do not suggest framework migrations
- Do not modify constants.js version numbers — versioning is managed externally
- Do not add new files without updating sw.js CORE_ASSETS and index.html script order
```

4. Also include any entries from `prompt_exclusions` array verbatim

## Notes

- Jules reads `AGENTS.md` automatically on every run — this is the **primary** suppression mechanism. The "Jules Scheduled Scan Exclusions" section in `AGENTS.md` contains all active exclusions organized by agent type (Bolt/Sentinel/Scribe)
- Jules also writes `.jules/*.md` learning journals (sentinel.md, bolt.md, scribe.md) — these give Jules context about past findings but do NOT prevent re-flagging (they are write-only memory, not a skip list)
- The `.github/jules-suppressions.json` file is our **audit trail** — it tracks suppression IDs, reasons, and which PRs were closed. Jules does not read this file directly
- The `prompt_exclusions` array is for generating text to paste into the Jules dashboard scheduled task prompts — a secondary reinforcement layer on top of AGENTS.md
- `/jules-review` Phase 2 reads the suppressions file to auto-skip known false positives during PR review
- `/pr-resolve` Phase 2.5 automatically adds suppressions when closing Jules PRs as "Won't fix" or "False positive"

### Three-layer suppression architecture

| Layer | File | Who reads it | When |
|---|---|---|---|
| **Primary** | `AGENTS.md` (exclusions section) | Jules | Every scan run (automatic) |
| **Secondary** | Jules dashboard prompts (via `/jules-suppress prompt`) | Jules | Per scheduled task |
| **Audit trail** | `.github/jules-suppressions.json` | Claude (`/pr-resolve`, `/jules-review`) | During PR triage |
| **Context** | `.jules/bolt.md`, `.jules/sentinel.md`, `.jules/scribe.md` | Jules | Write-only learning journals |
