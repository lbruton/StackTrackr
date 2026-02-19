# Git Hooks Developer Guide

StakTrakr uses Git hooks to automate repository maintenance tasks and ensure data integrity.

## Pre-commit: Service Worker Cache Stamping

The `devops/hooks/stamp-sw-cache.sh` script is the primary pre-commit hook.

### Purpose
The Service Worker (`sw.js`) uses a `CACHE_NAME` to manage the local asset cache. If the `CACHE_NAME` does not change, browsers may continue to serve old versions of JS or CSS files even after a deployment.

By updating the `CACHE_NAME` on every relevant commit, we ensure that:
1.  Clients detect a Service Worker update.
2.  Fresh assets are fetched and cached.
3.  The previous cache is purged.

### Logic Flow
1.  **Check Staged Files:** The hook uses `git diff --cached --name-only` to see what is being committed.
2.  **Match Patterns:** If any modified file matches `js/`, `css/`, `index.html`, etc., the stamping logic triggers.
3.  **Extract Version:** It reads `APP_VERSION` from `js/constants.js`.
4.  **Generate ID:** It creates a string like `staktrakr-v3.31.5-b1739952000` (version + Unix epoch).
5.  **Modify sw.js:** It uses `sed` to replace the `CACHE_NAME` constant in `sw.js`.
6.  **Re-stage:** It runs `git add sw.js` so the modification is included in the same commit.

### Portability
The script is designed to work on both macOS (BSD sed) and Linux (GNU sed) by detecting the available version of `sed`.

## Best Practices
*   **Always use the hook:** Ensure you have installed the hook via the symlink method described in the `setup.md`.
*   **Don't manually edit CACHE_NAME:** Let the hook handle it to avoid timestamp collisions.
*   **Test on file://:** After a commit, verify the app still loads correctly in a browser using the `file://` protocol.
