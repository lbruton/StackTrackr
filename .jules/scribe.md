## 2026-02-27 - False Positive: MAX_LOCAL_FILE_SIZE Removal
**Finding:** Flagged `MAX_LOCAL_FILE_SIZE` assignment as redundant in `js/constants.js`.
**Learning:** Constants in `constants.js` are consumed across multiple files via global scope. A constant that appears unused in its defining file may be referenced in any of the 67 scripts loaded after it. The global-scope architecture means static analysis cannot determine usage from a single file.
**Prevention:** Before flagging unused constants or functions, trace usage across ALL files in the script load order. Use the 67-script dependency chain in AGENTS.md to identify potential consumers. `no-undef` is intentionally OFF because of this architecture.

## 2026-02-28 - False Positive: openStorageReportPopup Removal
**Finding:** Flagged `openStorageReportPopup` as unused in `js/utils.js`.
**Learning:** Functions in `utils.js` are globally available to all 67 scripts. `openStorageReportPopup` is called from `js/settings-listeners.js` which loads later in the dependency chain. Single-file dead code analysis produces false positives in this architecture.
**Prevention:** Same as above — always check the full script chain before flagging dead code. The function may be called from event handlers, dynamic button clicks, or modal setup code in downstream files.
