# Release Process Guide

This document outlines the standardized procedure for bumping the application version, updating the changelog, and creating release announcements. All contributors and agents must follow this process to ensure consistency.

## 1. Triggering a Release

A release cycle is initiated **only** when a user gives an explicit command. The command should specify the type of version bump required:

- **For a Patch release:** `"Finalize and bump patch release"`
- **For a Minor release:** `"Finalize and bump minor release"`
- **For a Major release:** `"Finalize and bump major release"`

The agent will then determine the next version number based on the current version in `js/constants.js` and the type of release requested.

**Example:**
- If the current version is `v3.4.2` and the command is to bump a **patch** release, the new version will be `v3.4.3`.
- If the current version is `v3.4.2` and the command is to bump a **minor** release, the new version will be `v3.5.0`.
- If the current version is `v3.4.2` and the command is to bump a **major** release, the new version will be `v4.0.0`.

## 2. Release Procedure

Upon receiving the trigger command, the agent must perform the following steps in order.

### Step 2.1: Update the Changelog

Navigate to `docs/changelog.md` and add a new entry for the release. The entry must follow this format:

````markdown
## vA.B.C - YYYY-MM-DD

### Added
- Feature 1: A brief, user-friendly description.
- Feature 2: A brief, user-friendly description.

### Fixed
- Bug 1: A clear, concise summary of the fix.

### Changed
- A description of the modification or improvement.
````

- Use the current date for `YYYY-MM-DD`.
- Group changes under `### Added`, `### Fixed`, or `### Changed`.
- If a section has no items, omit it.

### Step 2.2: Update the Announcements

Navigate to `docs/announcements.md`. This file is displayed on the application's UI, so the message should be welcoming and highlight the key benefits of the update.

- Prepend a new announcement to the top of the file.
- The announcement must follow this format:

````markdown
---
### New Update! (vA.B.C)
**Posted: YYYY-MM-DD**

We've just rolled out some exciting new features and improvements! Now you can [Benefit 1] and [Benefit 2]. We also fixed the issue with [Bug Fix Summary].

Check out the full [changelog](changelog.md) for more details.
````

- Use a friendly, non-technical tone.
- Summarize the most impactful changes.
- Always link to the `changelog.md` for users who want more detail.

### Step 2.3: Update the Application Version

The final step is to update the application's internal version number. This is managed in a single location to ensure consistency.

1.  Open `js/constants.js`.
2.  Locate the `APP_VERSION` constant.
3.  Update its value to the new version number (`A.B.C`).

```javascript
// js/constants.js

// ...
export const APP_VERSION = 'A.B.C'; // Update this value
// ...
```

## 3. Post-Release

After completing these steps, the agent should confirm with the user that the release process is complete and all relevant files have been updated.
