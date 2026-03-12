## 2026-02-27 - filterInventoryAdvanced Optimization Review
**Finding:** Suggested single-pass optimization for `filterInventoryAdvanced` in `js/events.js`.
**Learning:** The function handles < 5,000 items in practice. The current multi-pass implementation prioritizes readability over micro-optimization. The iteration cost is negligible compared to DOM rendering that follows. Two separate PRs (#577, #595) proposed this optimization and both were closed as premature.
**Prevention:** Before suggesting performance optimizations, check dataset size constraints in the project context. Sub-millisecond operations on small datasets do not benefit from algorithmic optimization — the DOM rendering that follows dominates the cost.

## 2026-02-28 - Script Lazy-Loading Not Applicable
**Finding:** Suggested lazy-loading or dynamic import for scripts in `index.html`.
**Learning:** StakTrakr uses a 67-script global-scope dependency chain loaded via `defer` attributes. Scripts define globals consumed by scripts loaded after them. Dynamic import or lazy-loading would break the dependency chain and cause undefined variable errors. The `file://` protocol requirement also prevents ES module usage.
**Prevention:** Do not suggest lazy-loading, code splitting, or dynamic imports for this project. The script load order in `index.html` is a hard architectural constraint documented in AGENTS.md section 1.

## 2026-03-01 - Hoisting Regex Compilation in Loops
**Learning:** In text-heavy search filtering functions like `filterInventoryAdvanced`, compiling regular expressions (`new RegExp(...)`) inside the `filter` loop creates significant O(N*M) recompilation overhead. Hoisting the Regex compilation outside the loop and passing pre-compiled objects reduces parsing overhead without sacrificing readability.
**Action:** When filtering or searching items using Regex, always look for opportunities to pre-calculate and pre-compile regular expressions outside of the iteration loop, passing the compiled arrays/objects to the evaluation function.

## 2026-03-02 - Intl.NumberFormat Instantiation Overhead
**Finding:** Instantiating `Intl.NumberFormat` in formatting loops (e.g. `formatCurrency` repeatedly called within `renderTable`) causes severe performance degradation, blocking the main thread during large DOM renders.
**Learning:** `new Intl.NumberFormat()` is a known heavy operation. When formatting lists/tables or doing batch operations, instantiations must be cached and reused.
**Action:** `Intl.NumberFormat` instances in `formatCurrency` and `getCurrencySymbol` have been memoized into a `Map` cache grouped by locale and currency code. Any future locale-based formatting functions should use similar memoization to avoid blocking the main thread.
