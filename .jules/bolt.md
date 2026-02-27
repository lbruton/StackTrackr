# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-23 - [Initial Setup]
**Learning:** The journal file must exist for the process to be followed.
**Action:** Created this file.

## 2026-02-23 - [Filter Performance]
**Learning:** The `filterInventoryAdvanced` function in `js/filters.js` re-iterates through the entire `inventory` array for every active filter (using `forEach` then `filter`).
**Action:** Can combine filter predicates into a single pass over the inventory array to reduce iterations from O(N*M) to O(N), where M is the number of active filters.

## 2026-02-23 - [Filter Optimization Benchmark]
**Learning:** My initial "optimized" version was slower than the original.
**Insight:** JavaScript engines (V8) optimize simple array methods like `filter` extremely well. Iterating manually with a `for` loop inside `filter` might add overhead due to scope/closure or just less optimized paths than chained native methods for small datasets.
**Correction:** Instead of rewriting the loop logic inside JS, I should focus on reducing redundant work *within* the filter predicates. specifically, the intermediate array creation `result = result.filter(...)` inside a loop creates a new array for every active filter.

## 2026-02-23 - [Filter Benchmark V2]
**Learning:** Combining all filters into a single pass `filter()` call reduced execution time by ~34% (3.14s -> 2.07s) for 50k items and 3 active filters.
**Action:** Proceed with refactoring `filterInventoryAdvanced` in `js/filters.js` to use a single pass filter loop.

## 2026-02-23 - [Environment Issue - Playwright]
**Learning:** `npm test` fails because it tries to connect to a browser server at `ws://localhost:3000`. This suggests the tests expect a browser container running (Browserless/Browserbase).
**Action:** Since I cannot start a Docker container, I should rely on my benchmark script which tests the logic I changed directly in Node.js. The UI tests would likely fail regardless of my changes due to the missing browser infrastructure in this environment. I will rely on the benchmark verification for my specific optimization and lint checks.
