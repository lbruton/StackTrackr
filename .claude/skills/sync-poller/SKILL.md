---
name: sync-poller
description: >
  Sync home poller files from the VM to StakTrakrApi repo via PR. Use whenever you've edited
  files on the home poller (dashboard.js, provider-db.js, metrics-exporter.js, check-flyio.sh,
  run-home.sh, etc.) and need to preserve those changes in version control. Also use when the
  user says "sync poller", "push poller changes", "commit dashboard changes", "sync homepoller
  to repo", or after any session that modified files in /opt/poller/ via SSH. This skill ensures
  no work is lost — every VM edit gets a PR to the shared repo.
---

# Sync Poller — Home VM to StakTrakrApi

The home poller runs on an Ubuntu VM (`homepoller` / 192.168.1.81) at `/opt/poller/`. These files
are shared with the Fly.io container via the `StakTrakrApi` repo. After editing files on the VM,
this skill copies them to the local repo clone and creates (or updates) a PR to main.

## Why this matters

Files edited directly on the VM via SSH are not version-controlled. If the VM dies, or someone
pulls fresh from main, those changes are gone. This skill is the bridge — it copies live files
from the VM into the repo and opens a PR so the changes are reviewed and preserved.

## File mapping

Home poller files map to two directories in `StakTrakrApi`:

| VM path (`/opt/poller/`) | Repo path | Notes |
|---|---|---|
| `dashboard.js` | `devops/home-scraper/dashboard.js` | Home-only (not on Fly) |
| `metrics-exporter.js` | `devops/home-scraper/metrics-exporter.js` | Home-only |
| `check-flyio.sh` | `devops/home-scraper/check-flyio.sh` | Home-only |
| `run-home.sh` | `devops/home-scraper/run-home.sh` | Home-only entry point |
| `setup-lxc.sh` | `devops/home-scraper/setup-lxc.sh` | Provisioning script |
| `provider-db.js` | `devops/fly-poller/provider-db.js` AND `devops/home-scraper/provider-db.js` | Shared — copy to both |
| `db.js` | `devops/fly-poller/db.js` | Shared with Fly |
| `turso-client.js` | `devops/fly-poller/turso-client.js` | Shared with Fly |
| `price-extract.js` | `devops/fly-poller/price-extract.js` | Shared with Fly |
| `capture.js` | `devops/fly-poller/capture.js` | Shared with Fly |
| `spot-extract.js` | `devops/fly-poller/spot-extract.js` | Shared with Fly |
| `goldback-scraper.js` | `devops/fly-poller/goldback-scraper.js` | Shared with Fly |

**Rule of thumb:** If a file exists in `devops/fly-poller/`, it's shared — copy there. If it's
home-specific (dashboard, metrics, check-flyio), it goes in `devops/home-scraper/` only. Files
like `provider-db.js` that appear in both get copied to both locations.

## Workflow

### Step 1 — Identify changed files

Ask the user which files were modified, or detect from the current session's SSH commands.
Common sets:

- **Dashboard work:** `dashboard.js`, `provider-db.js`
- **Poller logic:** `price-extract.js`, `capture.js`, `db.js`
- **Spot pipeline:** `spot-extract.js`, `provider-db.js`
- **Infrastructure:** `run-home.sh`, `setup-lxc.sh`, `check-flyio.sh`

### Step 2 — Copy files from VM to local

```bash
# Create a temp staging area
mkdir -p /tmp/homepoller-snapshot

# Copy each changed file (adjust list as needed)
scp homepoller:/opt/poller/dashboard.js /tmp/homepoller-snapshot/
scp homepoller:/opt/poller/provider-db.js /tmp/homepoller-snapshot/
```

### Step 3 — Check for existing sync PR

```bash
cd /Volumes/DATA/GitHub/StakTrakrApi
gh pr list --state open --head sync/home-poller-files --json number,title
```

- **If PR exists:** Use it (reuse the branch).
- **If no PR:** Create branch `sync/home-poller-files` from main.

### Step 4 — Create or checkout worktree

```bash
cd /Volumes/DATA/GitHub/StakTrakrApi

# If worktree already exists, reuse it
git worktree list | grep sync-home && echo "Worktree exists" || \
  git worktree add .worktrees/sync-home sync/home-poller-files
```

If the branch doesn't exist yet:

```bash
git fetch origin
git worktree add .worktrees/sync-home -b sync/home-poller-files origin/main
```

### Step 5 — Copy files into worktree

Use the file mapping table above. For shared files, copy to both locations:

```bash
WT=/Volumes/DATA/GitHub/StakTrakrApi/.worktrees/sync-home

# Home-only files
cp /tmp/homepoller-snapshot/dashboard.js    "$WT/devops/home-scraper/dashboard.js"

# Shared files — copy to BOTH directories
cp /tmp/homepoller-snapshot/provider-db.js  "$WT/devops/fly-poller/provider-db.js"
cp /tmp/homepoller-snapshot/provider-db.js  "$WT/devops/home-scraper/provider-db.js"
```

Create the `devops/home-scraper/` directory if files don't exist there yet:

```bash
mkdir -p "$WT/devops/home-scraper"
```

### Step 6 — Commit and push

```bash
cd "$WT"
git add devops/home-scraper/ devops/fly-poller/
git diff --cached --stat  # Show what's changing

git commit -m "$(cat <<'EOF'
chore: sync home poller files — <brief description>

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"

git push origin sync/home-poller-files
```

Write a meaningful commit message describing what changed (not just "sync files").

### Step 7 — Create PR if needed

Only if no PR exists yet:

```bash
cd /Volumes/DATA/GitHub/StakTrakrApi
gh pr create \
  --head sync/home-poller-files \
  --base main \
  --title "chore: sync home poller files to repo" \
  --body "$(cat <<'EOF'
## Summary
- Syncs modified files from home poller VM to version control
- Files: <list changed files>

## Context
<Brief description of what was changed and why>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

### Step 8 — Clean up worktree

```bash
cd /Volumes/DATA/GitHub/StakTrakrApi
git worktree remove .worktrees/sync-home
```

### Step 9 — Report

Tell the user:
- Which files were synced
- PR number and URL
- Reminder to merge when ready

## Common mistakes

**Forgetting shared files need two copies.** `provider-db.js` must go to both `devops/fly-poller/`
and `devops/home-scraper/`. If you only copy to one, the other location goes stale.

**Committing from the wrong directory.** Always `cd` into the worktree before committing. If your
cwd is the main repo, you'll commit to the wrong branch.

**Force-pushing.** Never force-push `sync/home-poller-files`. The branch accumulates commits across
sessions — each sync adds a commit. The PR body can be updated when merging.

**Not verifying syntax first.** Before copying files, run `node --check` on the VM:
```bash
ssh -T homepoller 'node --check /opt/poller/dashboard.js && echo OK'
```

## Merging the PR

The sync PR stays open as a running collection of changes. Merge it when:
- A batch of related changes is complete
- Before a release that depends on the poller changes
- The user explicitly asks to merge

After merging, the home poller's "Updating Poller Code" flow (in the `homepoller-ssh` skill)
can pull from main to verify round-trip integrity.
