# Dynamic Version Management System

> **Latest release: v3.04.56**

## Overview 

The StackrTrackr now uses a dynamic version management system that automatically updates version numbers throughout the application from a single source of truth.

## How It Works

### Single Source of Truth
 - Version is defined once in `js/constants.js` as `APP_VERSION = '3.04.42'`
  - This is the ONLY place you need to update the version number

### Automatic Propagation
- **index.html**: JavaScript automatically updates the page title and heading
- **Browser Tab Title**: Dynamically updated with current version
- **Application Header**: Shows current version in the main app interface

### Utility Functions
- `js/constants.js` provides:
 - `getVersionString(prefix)`: Returns formatted version (e.g., "v3.04.42")
  - `injectVersionString(elementId, prefix)`: Inserts formatted version into a target element
- `js/utils.js` provides:
  - `getAppTitle(baseTitle)`: Returns full app title with version

## Updating the Version

To release a new version:

1. **Update ONLY the constants file:**
   ```javascript
   // In js/constants.js
    const APP_VERSION = '3.04.42';  // Change this line only
   ```

2. **All these will automatically update:**
  - Page title: "StackrTrackr v3.04.42"
  - Page heading: "StackrTrackr v3.04.42"
  - Browser tab title: "StackrTrackr v3.04.42"
  - App header: "StackrTrackr v3.04.42"

3. **Update changelog:** Add entry to `/docs/changelog.md` for documentation

## Technical Implementation

### index.html
```javascript
// Loads js/constants.js and utils.js
// Updates title, header, and other references via DOM manipulation
document.title = getAppTitle();
const appHeader = document.querySelector('.app-header h1');
appHeader.textContent = getAppTitle();
```

### Benefits
- **No more manual updates** in multiple HTML files
- **Consistent versioning** across the entire application
- **Reduced errors** from forgetting to update version in some places
- **Easy maintenance** - single point of change
- **Future-proof** - any new features can easily access current version

## Version Format
StackrTrackr versions follow the `BRANCH.RELEASE.PATCH.state` pattern where the
state code is appended directly to the patch number:

- **BRANCH** – Major development branch (e.g., `3`)
- **RELEASE** – Two-digit feature release number (e.g., `03`)
- **PATCH** – Two-digit patch number for fixes (e.g., `02`)
- **state** – Optional pre-release code appended without a dot:
  - `a` = alpha (unstable, internal testing)
  - `b` = beta (feature complete, broader testing)
  - `rc` = release candidate (final verification)
  - *(omit for stable builds)*

Example: `3.03.07b` → branch 3, release 03, patch 07, beta build

### Branching Policy
- Each major **BRANCH** corresponds to a long-lived Git branch
- New **RELEASE** and **PATCH** iterations occur within that branch
- Pre-release builds (`a`, `b`, `rc`) remain on that branch until stable
- Stable releases drop the state code and merge back into `main`
- Release branches are named `release_v<version>` when preparing a release

## Example Usage in Code
```javascript
// Get just the version number
const version = APP_VERSION; // "3.03.07b"

// Get formatted version string
const versionString = getVersionString(); // "v3.03.07b"
const customVersion = getVersionString('version '); // "version 3.03.07b"

// Get full app title
const title = getAppTitle(); // "StackrTrackr v3.03.07b"
const customTitle = getAppTitle('My Custom Tool'); // "My Custom Tool v3.03.07b"
```

This system ensures version consistency and makes maintenance much easier!
