# Tasks Document

- [x] 1. Fix glassmorphic select dropdown visibility (STAK-353)
  - File: `css/styles.css`
  - Add solid `background` and `color` to `#inventoryForm select option` after the existing glass-style input block (~line 8313)
  - Also add dark-theme override in the `[data-theme="dark"] #inventoryForm` block
  - Purpose: Make dropdown options readable in OS-native popups
  - _Leverage: Existing CSS custom properties `--bg-primary`, `--text-primary`_
  - _Requirements: 1.1, 1.2, 1.3_
  - _Prompt: Implement the task for spec beta-tester-bugfix-batch-353-355, first run spec-workflow-guide to get the workflow guide then implement the task: Role: CSS Developer specializing in cross-browser styling | Task: Add an explicit `#inventoryForm select option` rule with solid `background: var(--bg-primary)` and `color: var(--text-primary)` after the glass-style input block at css/styles.css:8313. The existing rule at line 8303 applies translucent rgba() to select elements which breaks OS-native dropdown popups. Do NOT modify the existing select rule — only add a new option rule. | Restrictions: Do not change the glassmorphic styling on the select element itself. Do not add JavaScript. Only touch css/styles.css. | Success: All select dropdowns in add/edit modal show readable options in both light and dark themes without hovering. Mark task as [-] in tasks.md before starting, log implementation with log-implementation tool after completion, then mark as [x]._

- [x] 2. Filter blacklisted tags from autocomplete suggestions (STAK-354)
  - File: `js/tags.js`
  - In `showTagInput()` (~line 346), filter `getAllUniqueTags()` output through `window.isBlacklisted()` before building autocomplete
  - Purpose: Respect user's tag blacklist in edit modal autocomplete
  - _Leverage: `isBlacklisted()` from `js/filters.js:263`, `getAllUniqueTags()` from `js/tags.js:139`_
  - _Requirements: 2.1, 2.2, 2.3_
  - _Prompt: Implement the task for spec beta-tester-bugfix-batch-353-355, first run spec-workflow-guide to get the workflow guide then implement the task: Role: JavaScript Developer | Task: In js/tags.js showTagInput() function (~line 346), filter the result of getAllUniqueTags() through window.isBlacklisted() before using it to build autocomplete suggestions. The change is approximately: `const allTags = getAllUniqueTags().filter(t => typeof window.isBlacklisted === 'function' ? !window.isBlacklisted(t) : true);` Do NOT filter tags that are physically stored on the item — only filter autocomplete suggestions. | Restrictions: Only touch js/tags.js. Do not modify getAllUniqueTags() itself. Add a typeof guard for isBlacklisted in case of load-order issues. | Success: Blacklisted tags no longer appear in autocomplete suggestions. Tags already on an item still display as chips. Removing a tag from the blacklist makes it reappear in suggestions. Mark task as [-] in tasks.md before starting, log implementation with log-implementation tool after completion, then mark as [x]._

- [x] 3. Add kg/lb support to inline cell editor (STAK-355)
  - File: `js/inventory.js`
  - Extend the weight unit handling in the inline cell editor (~lines 1223-1258) to include `kg` and `lb` cases
  - Purpose: Make inline editing work for all five weight units
  - _Leverage: `KG_TO_OZT` and `LB_TO_OZT` constants from `js/constants.js:535-539`, existing `g`/`oz` pattern in the inline editor_
  - _Requirements: 3.1, 3.2, 3.3_
  - _Prompt: Implement the task for spec beta-tester-bugfix-batch-353-355, first run spec-workflow-guide to get the workflow guide then implement the task: Role: JavaScript Developer familiar with StakTrakr inventory module | Task: In js/inventory.js inline cell editor (~lines 1223-1258), find the existing weight unit switch/case or if/else chain that handles 'g' and 'oz' via dataset.unit. Add cases for 'kg' (using KG_TO_OZT from constants.js) and 'lb' (using LB_TO_OZT) following the same conversion pattern as 'g' (which uses G_TO_OZT). Both display and save paths must handle the new units. | Restrictions: Only touch js/inventory.js. Do not modify constants.js. Follow the existing code pattern exactly. | Success: Items with weightUnit 'kg' or 'lb' display correct values in inline edit and save correctly. Mark task as [-] in tasks.md before starting, log implementation with log-implementation tool after completion, then mark as [x]._

- [x] 4. Add swap obverse/reverse button to image editor (STAK-341)
  - Files: `index.html`, `js/events.js`
  - Add a swap button between obverse and reverse image upload slots in the edit form in index.html
  - Wire click handler in events.js to swap blobs via imageCache API
  - Show button only when both images are populated; hide otherwise
  - Purpose: Let users fix mis-assigned image sides without re-uploading
  - _Leverage: `imageCache.getUserImage()` and `imageCache.cacheUserImage()` from `js/imageCache.js`, `safeGetElement()` from `js/utils.js`_
  - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - _Prompt: Implement the task for spec beta-tester-bugfix-batch-353-355, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer familiar with StakTrakr image pipeline | Task: (1) In index.html, find the obverse and reverse image upload slots in the edit form and add a swap button between them. (2) In js/events.js, wire a click handler using safeGetElement('swapImagesBtn') that reads the current image record via imageCache.getUserImage(uuid), swaps obverse/reverse, writes back via imageCache.cacheUserImage(uuid, rec.reverse, rec.obverse), then re-renders the image previews. (3) In the editItem() flow, add visibility logic: show the button when both rec.obverse and rec.reverse exist, hide (add d-none) otherwise. | Restrictions: Only touch index.html and js/events.js (and inventory.js if editItem image rendering is there). Use existing imageCache API. Use safeGetElement, not raw getElementById. | Success: Swap button appears only when both images are uploaded. Clicking it swaps the images immediately. Button is hidden when only one side has an image. Mark task as [-] in tasks.md before starting, log implementation with log-implementation tool after completion, then mark as [x]._
