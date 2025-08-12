# Migration Roadmap (A → C)

1. **Introduce provider registry** (done – `js/catalog-providers.js`)
2. **Dual-write**: keep `numistaId` and add `catalogRefs.numista` (future)
3. **Read path prefers** `catalogRefs` with fallback to `numistaId`
4. **One-click migration** tool to populate `catalogRefs`
5. **(Optional) Remove** legacy fields in a major version after deprecation
