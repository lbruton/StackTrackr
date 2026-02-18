---
name: sw-cache
description: Service worker cache management — CACHE_NAME format, pre-commit hook, stale cache prevention.
---

# Service Worker Cache — StakTrakr

Rules and automation for the service worker (`sw.js`) cache versioning system. Prevents stale asset issues caused by the SW serving old CSS/JS from its pre-cache.

## CACHE_NAME Format

```
staktrakr-v{APP_VERSION}-b{EPOCH}
```

- **APP_VERSION**: from `js/constants.js` (e.g. `3.30.08`)
- **EPOCH**: Unix timestamp in seconds at commit time (e.g. `1739836800`)
- **Full example**: `staktrakr-v3.30.08-b1739836800`

The version prefix groups caches by release. The build timestamp ensures every commit that touches cached assets gets a unique cache name, forcing the SW to evict stale assets on its next `activate` event.

## Pre-Commit Hook (Automatic)

A pre-commit hook at `devops/hooks/stamp-sw-cache.sh` automatically updates `CACHE_NAME` in `sw.js` whenever any cached asset is staged for commit.

### What it does

1. Checks if any file matching CORE_ASSETS patterns is staged (`css/`, `js/`, `index.html`, `data/`, `images/`, `manifest.json`, `sw.js`)
2. If yes: reads `APP_VERSION` from `constants.js`, generates a Unix timestamp, and writes the new `CACHE_NAME`
3. Re-stages `sw.js` so the updated cache name is included in the commit
4. If no cached assets are staged, the hook exits silently (no-op)

### Installation

The hook is installed as a symlink from `.git/hooks/pre-commit`:

```bash
ln -sf ../../devops/hooks/stamp-sw-cache.sh .git/hooks/pre-commit
```

This symlink is not tracked by git. New clones or CI environments need to run the symlink command. The `/start` skill or a setup script should handle this.

### Manual override

If the hook needs to be bypassed (rare):

```bash
git commit --no-verify -m "message"
```

## CORE_ASSETS List

When adding a new `.js` file to the project:

1. Add its `<script>` tag to `index.html` in the correct dependency order
2. Add it to the `CORE_ASSETS` array in `sw.js` (same order as `index.html`)
3. The pre-commit hook will auto-bump `CACHE_NAME` on the next commit

The CORE_ASSETS array in `sw.js` must match the scripts in `index.html`. If a script is in `index.html` but not in CORE_ASSETS, the SW won't pre-cache it and users may see stale-cache glitches on first load (exactly the bug that prompted this system).

## Interaction with /release

The `/release` skill bumps `APP_VERSION` in `constants.js` and historically also bumped `CACHE_NAME` manually. With this hook:

- `/release` still bumps `APP_VERSION` in `constants.js` (Phase 1, File 1)
- `/release` no longer needs to manually edit `CACHE_NAME` in `sw.js` (Phase 1, File 2) — the pre-commit hook handles it automatically using the new `APP_VERSION`
- The release commit will have a cache name like `staktrakr-v3.31.00-b1739900000`

**However**: the `/release` skill should still verify that `sw.js` CORE_ASSETS is up to date as a sanity check.

## Troubleshooting

### "CSS looks broken on first load but hard refresh fixes it"

This means the SW is serving a stale cached version of `styles.css` (or another asset). Causes:

1. **CACHE_NAME wasn't bumped** — the hook didn't run (not installed) or the commit didn't include cached assets
2. **New file missing from CORE_ASSETS** — the SW doesn't know to pre-cache it, so the browser fetches it fresh while other assets come from stale cache

Fix: ensure the hook is installed, add missing files to CORE_ASSETS, commit again.

### "Hook didn't run"

Check the symlink exists and points to the right place:

```bash
ls -la .git/hooks/pre-commit
# Should show: -> ../../devops/hooks/stamp-sw-cache.sh
```

If missing, re-install:

```bash
ln -sf ../../devops/hooks/stamp-sw-cache.sh .git/hooks/pre-commit
```

### Verifying the stamp worked

After committing, check the CACHE_NAME:

```bash
grep CACHE_NAME sw.js
# const CACHE_NAME = 'staktrakr-v3.30.08-b1739836800';
```

The `-b` suffix should be a recent Unix timestamp (within seconds of the commit).
