## 2025-02-18 - Handling Empty States in Multi-View Vanilla JS
**Learning:** In a vanilla JS app with separate renderers for different views (Table vs Card), empty states must be implemented consistently in each renderer. Relying on a single shared empty state element might be tricky if the renderers clear/overwrite the container differently.
**Action:** When adding "no results" logic, ensure it's duplicated or shared across `renderTable` (inventory.js) and `renderCardView` (card-view.js) to prevent one view mode from showing a blank screen while the other shows a helpful message.
