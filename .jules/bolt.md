## Bolt's Journal

## 2024-03-12 - Advanced Filter Performance Bottleneck
**Learning:** Found an $O(N \times M)$ performance bottleneck in `filterInventoryAdvanced` and $O(N \times W)$ regex recompilation overhead. Array map methods and `new RegExp` constructions were placed inside nested `.filter` and `.some`/`.every` loops instead of being hoisted and pre-calculated. Combining these operations via a pre-calculated predicate list and hoisting the Regex instantiations outside the loop drastically drops the overhead of text searching and filtering on large inventory sets.
**Action:** Always inspect the contents of `.filter` iterations. Pre-compile constraints, lists, and RegExes into intermediate state objects or Sets prior to iterating over large item arrays to prevent GC churn and repeated calculations.
