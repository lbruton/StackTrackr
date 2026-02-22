# Version Lock Protocol — StakTrakr

## Why This Exists

Multiple agents (Claude, Gemini, Codex) work concurrently on the same local git repo. Without
coordination, two agents can both compute "next version is 3.32.08" at the same time, commit
independently, and produce duplicate or skipped version tags.

This file documents the protocol. The actual lock state lives in `devops/version.lock` (gitignored).

---

## Protocol

### Before starting any release/version bump:

1. **Check the lock file:**
   ```bash
   cat devops/version.lock 2>/dev/null || echo "UNLOCKED"
   ```

2. **If unlocked (or expired):** claim it by writing:
   ```
   locked_by: <agent name & session hint>
   locked_at: <ISO timestamp>
   next_version: <X.Y.Z>
   expires_at: <locked_at + 30 minutes>
   ```

3. **If locked and not expired:** stop. Do not bump. Either wait, or ask the human if the
   lock is stale (agent may have crashed). Announce the conflict in mem0 or Linear.

4. **If locked but expired:** take it over — write a new lock with your details.
   Log a mem0 entry noting you took over an expired lock.

5. **After committing the version bump:** delete the lock file:
   ```bash
   rm devops/version.lock
   ```

### Lock file format

```
locked_by: Claude Code (session abc123)
locked_at: 2026-02-22T18:42:00Z
next_version: 3.32.08
expires_at: 2026-02-22T19:12:00Z
```

### TTL rule

- Lock expires **30 minutes** after `locked_at`.
- Any agent may take over an expired lock, but must log the takeover.
- Healthy agents should always release (delete) the lock before 30 minutes.

---

## Integration with /release skill

The `/release` skill (`.claude/skills/release/SKILL.md`) checks this file in Phase 0
before reading version state. The check is:

1. Read `devops/version.lock`
2. If present and not expired → abort with a clear message showing who has the lock
3. If absent or expired → write lock, then proceed with version bump
4. After commit → delete lock

---

## Version anchor concept

Each version tag becomes an **anchor** for a batch of work:

- The version number is claimed before any code is written
- All Linear notes, changelog bullets, and mem0 handoffs reference that version
- The git tag (`v3.32.08`) is the permanent breadcrumb
- The PR body is assembled from all the patch tags between the last release and now

This means the version number is the *first* thing decided, not the last.

---

*Protocol established: 2026-02-22*
