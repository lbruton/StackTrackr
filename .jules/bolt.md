## 2025-05-20 - [Optimizing Render Loop Lookups]
**Learning:** Found an O(N^2) bottleneck in `renderTable` where `indexOf` was called inside a loop over the same collection. For large datasets (50k+ items), this caused massive slowdowns (500ms+).
**Action:** Always check for nested iterations where an inner lookup can be hoisted out into a `Map` or `Set` for O(1) access. Benchmarking proved a 14x speedup.
