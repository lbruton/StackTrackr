---
name: release
description: Release workflow — version bump, changelog, announcements, commit, and PR.
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, mcp__linear-server__*
---

# Release — StakTrakr

End-to-end release workflow: bump version across all 7 files, commit to dev, and create a PR to main.

## Arguments

$ARGUMENTS can be:
- `release` — bump RELEASE number (3.23.01 → 3.24.00)
- `patch` — bump PATCH number (3.23.01 → 3.23.02)
- `dry-run` — preview all changes without writing

If no argument provided, ask the user whether this is a `release` or `patch`.

## Phase 0: Gather Context

### Step 0 (prerequisite): Seed Data Sync

Before gathering release context, run the `/seed-sync` workflow to check for unstaged seed data from the Docker poller. The poller writes to `data/spot-history-*.json` continuously, but these changes are invisible in normal development — they only show up in `git status` if you look for them. Stage any new seed data now so it's included in the release commit.

### Step 1: Determine what's being released

1. `git log --oneline main..dev` — list all commits on dev that aren't on main yet
2. `git diff --stat main..dev` — summary of files changed
3. Check Linear for any **In Progress** or recently **Done** issues on the StakTrakr team (ID: `f876864d-ff80-4231-ae6c-a8e5cb69aca4`) that relate to commits on dev

### Step 2: Read current state

Read these files in parallel:
- `js/constants.js` — extract current `APP_VERSION`
- `CHANGELOG.md` — first 5 lines after `## [Unreleased]` to see format
- `docs/announcements.md` — first 3 lines to see format

### Step 3: Present the release plan

Ask the user to confirm or adjust:

```
Release Plan
============
Current version: 3.XX.YY
New version:     3.XX.YY (based on [release/patch] bump)

Commits since main:
- [commit list]

Proposed title: [inferred from commits/Linear issues]

Proposed changelog bullets:
- **Label**: Description (STAK-XX)
- ...

Proceed? [Adjust title / Adjust bullets / Go]
```

Wait for user confirmation before writing any files.

## Phase 1: Version Bump (5 files)

Update each file directly using the patterns below. There is no external script — this skill is the single source of truth for version bumps.

### File 1: `js/constants.js` — APP_VERSION

Find and replace the version string:
```javascript
const APP_VERSION = "3.XX.YY";  // ← old
const APP_VERSION = "3.XX.YY";  // ← new
```

### File 2: `sw.js` — CACHE_NAME (automatic)

**This is now handled automatically by the pre-commit hook** (`devops/hooks/stamp-sw-cache.sh`). When the commit is created, the hook detects that `js/constants.js` (with the new `APP_VERSION`) is staged, reads the version, generates a build timestamp, and writes:

```javascript
const CACHE_NAME = 'staktrakr-vNEW_VERSION-bTIMESTAMP';
```

You do NOT need to manually edit `sw.js` CACHE_NAME during releases. The hook handles it.

**Do verify** that `sw.js` CORE_ASSETS is up to date (any new `.js` files added since last release must be listed). See the `sw-cache` skill for details.

### File 3: `CHANGELOG.md` — New version section

Insert a new section **before** the first `## [x.y.z]` heading (after `## [Unreleased]` and its `---`):

```markdown
## [NEW_VERSION] - YYYY-MM-DD

### Added — TITLE

- **Label**: Description (STAK-XX)
- **Label**: Description
...

---

```

Format rules:
- Date is today's date in ISO format (YYYY-MM-DD)
- Section heading is `### Added — TITLE` (use the release title)
- Bullets use `**Label**: Description` format. Labels are typically `Added`, `Changed`, `Fixed`
- Each bullet is a single line (no wrapping)
- STAK-XX references go at the end of the bullet in parentheses

### Files 4 & 6: `docs/announcements.md` + `js/about.js` — MUST STAY IN SYNC

These two files serve the same content to different environments:
- **`docs/announcements.md`** → parsed via `fetch()` on HTTP servers (About modal + version splash)
- **`js/about.js`** → `getEmbeddedWhatsNew()` and `getEmbeddedRoadmap()` are the **`file://` fallback** when fetch fails

**CRITICAL: Both must contain the same entries in the same order.** If they drift, HTTP users see one thing and `file://` users see another.

#### announcements.md

**Step 1: Prepend** a single line after `## What's New\n\n`:

```markdown
- **TITLE (vNEW_VERSION)**: Summary sentence combining all bullets. Summary sentence for next group
```

Format rules:
- One line per release, no matter how many bullets
- Bullets are condensed into period-separated sentences

**Step 2: Trim stale entries.** After prepending, enforce these limits:

- **What's New**: Keep only the **3–5 most recent** entries (lines between `## What's New` and `## Development Roadmap`). Delete older entries beyond 5.
- **Development Roadmap**: Keep only the **3–4 most relevant** items. Remove completed items (anything shipped in this release or earlier). If the roadmap has grown beyond 4 items, trim the lowest-priority entries and note which were removed in the release plan output.

Read `ROADMAP.md` and Linear backlog if needed to determine which roadmap items are still relevant vs. completed.

#### about.js — `getEmbeddedWhatsNew()`

**Must mirror `announcements.md` What's New exactly.** After updating announcements.md:

1. **Replace** the entire contents of `getEmbeddedWhatsNew()` (between `return \`` and the closing `\`;`) with HTML `<li>` versions of the same 3–5 entries from announcements.md
2. Each entry format: `<li><strong>vVERSION &ndash; TITLE</strong>: Summary sentence</li>`
3. HTML-escape special characters: `&` → `&amp;`, `<` → `&lt;`, `>` → `&gt;`, `—` → `&mdash;`, `–` → `&ndash;`
4. **Delete all older entries** — the function should only contain 3–5 `<li>` items matching announcements.md

#### about.js — `getEmbeddedRoadmap()`

**Must mirror `announcements.md` Development Roadmap exactly.** Replace the entire contents with HTML `<li>` versions of the same 3–4 roadmap items.

### File 5: `version.json` — Remote version check endpoint

Update the version and release date at the project root:

```json
{
  "version": "NEW_VERSION",
  "releaseDate": "YYYY-MM-DD",
  "releaseUrl": "https://github.com/lbruton/StakTrakr/releases/latest"
}
```

Format rules:
- `version` matches `APP_VERSION` exactly (no `v` prefix)
- `releaseDate` is today's date in ISO format
- `releaseUrl` always points to `/releases/latest` (GitHub redirects to the correct tag)

## Phase 2: Verify

Run the equivalent of `/verify full`:
1. Confirm all 7 files were updated (grep for the new version string in each)
2. Check that the `CHANGELOG.md` section is well-formed
3. Check that `announcements.md` has 3–5 What's New entries and 3–4 Roadmap items (no stale bloat)
4. **Sync check**: Verify `getEmbeddedWhatsNew()` in `about.js` contains the same entries as `announcements.md` What's New, and `getEmbeddedRoadmap()` matches the Roadmap section. Flag any drift.
5. Check that `version.json` has the correct version and today's date
6. Check for updated seed data: `git diff --stat data/` — if the Docker poller has been running, these files will have new entries. Confirm they'll be included in the commit.
7. `git diff --stat` — confirm version files + seed data files changed (6 version files + any updated spot-history-*.json)

Report any issues before proceeding.

## Phase 3: Commit

Stage and commit to dev:

```bash
git add js/constants.js sw.js CHANGELOG.md docs/announcements.md js/about.js version.json data/spot-history-*.json
git commit -m "vNEW_VERSION — TITLE"
```

Commit message format: `vNEW_VERSION — TITLE`
- Use em dash (`—`), not hyphen
- Include STAK-XX references if applicable: `v3.24.00 — STAK-55: Feature name`
- Match the pattern from existing commits: `v3.23.01 — STAK-52: Goldback real-time estimation, Settings reorganization`

If there are other uncommitted changes beyond the 5 version files, ask the user whether to include them in this commit or leave them staged separately.

## Phase 4: Push & PR

1. Push dev to remote:
   ```bash
   git push origin dev
   ```

2. Create PR from dev → main:
   ```bash
   gh pr create --base main --head dev --label "codacy-review" --title "vNEW_VERSION — TITLE" --body "$(cat <<'EOF'
   ## Summary

   - [bullet points from changelog, condensed]

   ## Files Updated

   - `js/constants.js` — APP_VERSION → NEW_VERSION
   - `sw.js` — CACHE_NAME → NEW_VERSION
   - `CHANGELOG.md` — new section
   - `docs/announcements.md` — new What's New entry
   - `js/about.js` — embedded What's New fallback
   - `version.json` — remote version check endpoint
   - `data/spot-history-*.json` — accumulated seed price data from Docker poller
   [- any other files changed on dev since last merge]

   ## Linear Issues

   - [STAK-XX: title — link] (if applicable)

   🤖 Generated with [Claude Code](https://claude.com/claude-code)
   EOF
   )"
   ```

3. If Linear issues are referenced, update their status to **Done**.

## Phase 5: GitHub Release & Tag

**CRITICAL: This step creates the actual GitHub Release that users see.** Without it, `version.json`'s `releaseUrl` (pointing to `/releases/latest`) resolves to a stale version.

### Option A: PR already merged (preferred)

If the user has already merged the PR (or merges it now), create the release targeting main:

```bash
# Tag the merge commit on main
git fetch origin main
gh release create vNEW_VERSION \
  --target main \
  --title "vNEW_VERSION — TITLE" \
  --latest \
  --notes "$(cat <<'EOF'
## TITLE

- [changelog bullets from Phase 1, verbatim]
EOF
)"
```

### Option B: PR not yet merged

If the PR hasn't been merged yet, create the release targeting the version commit on dev. After the PR merges, the tag will already exist and GitHub will associate it correctly:

```bash
# Get the commit hash of the version bump commit
VERSION_SHA=$(git rev-parse HEAD)
gh release create vNEW_VERSION \
  --target "$VERSION_SHA" \
  --title "vNEW_VERSION — TITLE" \
  --latest \
  --notes "$(cat <<'EOF'
## TITLE

- [changelog bullets from Phase 1, verbatim]
EOF
)"
```

### Release notes format

- Use the changelog section heading as the `## TITLE`
- Copy changelog bullets verbatim (they're already formatted correctly)
- Do NOT include file update lists or Linear references — those belong in the PR body, not the release

### Verify

After creating the release:
```bash
gh release list --limit 3
```
Confirm the new version shows as `Latest`.

## Phase 6: Confirm

```
Release complete!

Version:  vNEW_VERSION
Commit:   [hash] [message]
PR:       #XX — [url]
Release:  https://github.com/lbruton/StakTrakr/releases/tag/vNEW_VERSION
Linear:   STAK-XX → Done (if applicable)

Next: merge the PR on GitHub when ready (release tag already created).
```

## Dry Run Mode

If the argument is `dry-run`:
- Complete Phase 0 (gather context, present plan)
- Show exactly what would be written to each file (diffs or excerpts)
- Show the `gh release create` command that would be run
- Do NOT write any files, commit, push, create PR, or create release
- End with: `Dry run complete — no files modified.`
