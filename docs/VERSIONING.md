# Dynamic Version Management System

## Overview 

The StackTrackr now uses a dynamic version management system that automatically updates version numbers throughout the application from a single source of truth.

## How It Works

### Single Source of Truth
- Version is defined once in `js/constants.js` as `APP_VERSION = '3.3.00'`
- This is the ONLY place you need to update the version number

### Automatic Propagation
- **index.html**: JavaScript automatically updates the page title and heading
- **Browser Tab Title**: Dynamically updated with current version
- **Application Header**: Shows current version in the main app interface

### Utility Functions
Two helper functions are available in `js/utils.js`:
- `getVersionString(prefix)`: Returns formatted version (e.g., "v3.0.1")
- `getAppTitle(baseTitle)`: Returns full app title with version

## Updating the Version

To release a new version:

1. **Update ONLY the constants file:**
   ```javascript
   // In js/constants.js
   const APP_VERSION = '3.3.00';  // Change this line only
   ```

2. **All these will automatically update:**
   - Page title: "StackTrackr v3.3.00"
   - Page heading: "StackTrackr v3.3.00"
   - Browser tab title: "StackTrackr v3.3.00"
   - App header: "StackTrackr v3.3.00"

3. **Update changelog:** Add entry to `/docs/CHANGELOG.md` for documentation

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
Use semantic versioning: `MAJOR.MINOR.PATCH`
- **MAJOR**: Breaking changes or major new features
- **MINOR**: New features that are backwards compatible
- **PATCH**: Bug fixes and small improvements

### Numbering Guidelines
- **Major**: 1-x
- **Minor**: 1-9
- **Patch**: 1-x (aim for fewer than 100 patches before incrementing the minor version)

## Example Usage in Code
```javascript
// Get just the version number
const version = APP_VERSION; // "3.3.00"

// Get formatted version string
const versionString = getVersionString(); // "v3.3.00"
const customVersion = getVersionString('version '); // "version 3.3.00"

// Get full app title
const title = getAppTitle(); // "StackTrackr v3.3.00"
const customTitle = getAppTitle('My Custom Tool'); // "My Custom Tool v3.3.00"
```

This system ensures version consistency and makes maintenance much easier!
