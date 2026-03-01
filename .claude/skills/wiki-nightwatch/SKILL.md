---
name: wiki-nightwatch
description: Nightly wiki accuracy patrol — picks ONE page per run, dispatches an adversarial agent to find a specific inaccuracy, logs the result. Runs via /goodnight hook or on-demand with /wiki-nightwatch.
allowed-tools: Bash, Read, Glob, Grep, Agent
---

# Wiki Nightwatch

Lightweight nightly patrol that picks ONE wiki page per run and dispatches a
focused agent to find a specific inaccuracy. Rotates through all content pages
over ~26 runs so every page gets checked regularly.

**Adversarial framing:** The agent is tasked with *finding* an inaccuracy, not
*verifying* accuracy. This forces deep reading instead of rubber-stamping.

---

## Two Tracks

| Track | Pages | Verification method |
|-------|-------|---------------------|
| **Frontend** (`owner: staktrakr`) | 11 pages | Read source files from `sourceFiles` frontmatter |
| **Infrastructure** (`owner: staktrakr-api`) | 15 pages | MCP tools: SSH, curl endpoints, read StakTrakrApi repo |

Frontend pages can also be checked by Jules via the nightly GHA workflow
(`.github/workflows/wiki-nightwatch.yml`). Infrastructure pages require
Claude Code with MCP access.

---

## Step 1: Read rotation state

```bash
ROOT=$(git rev-parse --show-toplevel)
LOG="$ROOT/wiki/.nightwatch-log.json"
```

If `$LOG` does not exist, create it with the default rotation:

```json
{
  "rotation": [
    "frontend-overview.md", "data-model.md", "storage-patterns.md",
    "dom-patterns.md", "sync-cloud.md", "backup-restore.md",
    "retail-modal.md", "api-consumption.md", "release-workflow.md",
    "service-worker.md", "image-pipeline.md",
    "architecture-overview.md", "rest-api-reference.md", "turso-schema.md",
    "cron-schedule.md", "retail-pipeline.md", "fly-container.md",
    "home-poller.md", "spot-pipeline.md", "goldback-pipeline.md",
    "provider-database.md", "providers.md", "secrets.md",
    "health.md", "poller-parity.md", "vendor-quirks.md"
  ],
  "nextIndex": 0,
  "history": []
}
```

Read `nextIndex` to determine which page to check this run.

---

## Step 2: Determine track

Read the target page's YAML frontmatter `owner` field:

- `owner: staktrakr` → **frontend track**
- `owner: staktrakr-api` → **infrastructure track**
- `owner: shared` or missing → treat as frontend track

---

## Step 3: Dispatch adversarial agent

Launch a background agent (via the Agent tool with `run_in_background: true`)
using the appropriate prompt below.

### Frontend track prompt

```
You are a wiki accuracy hunter. Your mission is to find ONE specific
inaccuracy in this wiki page by cross-checking it against the actual code.

Page: wiki/{PAGE}
Project root: {ROOT}

Instructions:
1. Read the wiki page at {ROOT}/wiki/{PAGE} completely — every section
2. Read the page's YAML frontmatter to get the sourceFiles list
3. Read EVERY source file listed in sourceFiles from {ROOT}/
4. Cross-check ALL factual claims in the wiki against the actual code:
   - Counts (e.g., "70 <script> tags" — count them: grep -c '<script' index.html)
   - Function names (do they still exist with that exact name and signature?)
   - Window globals / exports (does window.X still get assigned?)
   - Code patterns described (does the code still work this way?)
   - Related page links (do the referenced .md files exist in wiki/?)
   - Version numbers and dates
   - Storage key names, constant values, enum members
   - CSS class names or DOM element IDs referenced
5. Report your finding using EXACTLY one of these formats:

   INACCURACY FOUND:
   Page: {PAGE}
   Section: {which section heading}
   Wiki claims: "{exact quote from wiki}"
   Code shows: "{what the code actually says/does}"
   File: {source file where you confirmed this}

   OR:

   VERIFIED OK:
   Page: {PAGE}
   Confirmed claims:
   1. {specific claim} — verified in {file}:{line}
   2. {specific claim} — verified in {file}:{line}
   3. {specific claim} — verified in {file}:{line}

Be thorough. Read actual code line by line, don't skim. One real finding
is more valuable than a false "all clear."
```

### Infrastructure track prompt

```
You are a wiki accuracy hunter. Your mission is to find ONE specific
inaccuracy in this infrastructure wiki page.

Page: wiki/{PAGE}
Project root: {ROOT}

This is an infrastructure page — its source code lives in StakTrakrApi,
not this repo. Verify claims using these methods:

1. Read the wiki page at {ROOT}/wiki/{PAGE} completely
2. For API endpoints mentioned: curl -s the URLs, verify they respond
   and return the documented structure
3. For StakTrakrApi code references: read files at
   /Volumes/DATA/GitHub/StakTrakrApi/ to verify function names, schemas,
   cron entries
4. For health thresholds: run the health check commands from the page
   and compare actual output against documented expectations
5. For cron schedules: compare documented times against actual crontab
   entries in StakTrakrApi source
6. For Turso schema: read the migration files or schema definitions
   in StakTrakrApi
7. For home poller details: SSH to homepoller and verify (only if the
   page documents VM-specific configuration)

Cross-check every factual claim you can verify. Report using EXACTLY
one of these formats:

   INACCURACY FOUND:
   Page: {PAGE}
   Section: {which section heading}
   Wiki claims: "{exact quote from wiki}"
   Reality: "{what the system/code actually shows}"
   Verified via: {how you confirmed — curl output, file read, SSH, etc.}

   OR:

   VERIFIED OK:
   Page: {PAGE}
   Confirmed claims:
   1. {specific claim} — verified via {method}
   2. {specific claim} — verified via {method}
   3. {specific claim} — verified via {method}

Be thorough. Curl real endpoints. Read real source files. One real
finding is more valuable than a false "all clear."
```

---

## Step 4: Log the result

After the agent reports back, update `wiki/.nightwatch-log.json`:

1. Parse the agent's output to extract status and finding
2. Append to `history`:

```json
{
  "date": "YYYY-MM-DD",
  "page": "frontend-overview.md",
  "track": "frontend",
  "status": "inaccuracy_found",
  "finding": "Claims 70 <script> tags but index.html has 72",
  "verified": []
}
```

Or for a clean page:

```json
{
  "date": "YYYY-MM-DD",
  "page": "data-model.md",
  "track": "frontend",
  "status": "verified_ok",
  "finding": null,
  "verified": [
    "ALLOWED_STORAGE_KEYS count matches — 42 keys in constants.js",
    "saveData validates against ALLOWED_STORAGE_KEYS",
    "loadData returns null for unknown keys"
  ]
}
```

3. Increment `nextIndex` (wrap to 0 at end of rotation array)
4. Trim `history` to last 30 entries if needed
5. Write the updated JSON back to `wiki/.nightwatch-log.json`

---

## Step 5: Output summary

Print a one-line result for the user:

```
Nightwatch [frontend-overview.md]: INACCURACY — Claims 70 <script> tags, actual count is 72
```

Or:

```
Nightwatch [data-model.md]: VERIFIED OK — 3 claims confirmed
```

If an inaccuracy was found, suggest the fix:

```
Fix: Edit wiki/frontend-overview.md line 28 — change "70" to "72"
```

---

## On-demand usage

Run `/wiki-nightwatch` at any time. It picks the next page in rotation,
runs the check, and reports. Each invocation advances the rotation by one.

To check a SPECIFIC page (skip rotation):

```
/wiki-nightwatch frontend-overview.md
```

When a page name is passed as an argument, check that page without
advancing `nextIndex`.

---

## Goodnight integration

The `goodnight` skill dispatches this as a background agent after the
user's save choice. The user sees which page is being checked but does
not wait for the result.

---

## Edge cases

- **Log file missing:** Create with default rotation and `nextIndex: 0`
- **Page in rotation no longer exists:** Skip it, log `status: "skipped"`,
  advance to next
- **Agent can't find any inaccuracy after thorough check:** That's fine —
  log as `verified_ok`. The adversarial framing ensures deep reading even
  when the page is accurate.
- **Multiple inaccuracies found:** Report the most impactful one. Note
  others in the `finding` field: "Also found: ..."
- **StakTrakrApi repo not available locally:** Skip infrastructure pages,
  log `status: "skipped"` with reason "StakTrakrApi repo not found"
