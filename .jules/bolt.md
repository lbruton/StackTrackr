## 2026-02-27 - filterInventoryAdvanced Optimization Review
**Finding:** Suggested single-pass optimization for `filterInventoryAdvanced` in `js/events.js`.
**Learning:** The function handles < 5,000 items in practice. The current multi-pass implementation prioritizes readability over micro-optimization. The iteration cost is negligible compared to DOM rendering that follows. Two separate PRs (#577, #595) proposed this optimization and both were closed as premature.
**Prevention:** Before suggesting performance optimizations, check dataset size constraints in the project context. Sub-millisecond operations on small datasets do not benefit from algorithmic optimization — the DOM rendering that follows dominates the cost.

## 2026-02-28 - Script Lazy-Loading Not Applicable
**Finding:** Suggested lazy-loading or dynamic import for scripts in `index.html`.
**Learning:** StakTrakr uses a 67-script global-scope dependency chain loaded via `defer` attributes. Scripts define globals consumed by scripts loaded after them. Dynamic import or lazy-loading would break the dependency chain and cause undefined variable errors. The `file://` protocol requirement also prevents ES module usage.
**Prevention:** Do not suggest lazy-loading, code splitting, or dynamic imports for this project. The script load order in `index.html` is a hard architectural constraint documented in AGENTS.md section 1.
