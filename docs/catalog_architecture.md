# Catalog Architecture (Phase 1 → Phase 2)

## Current (Option A – Enhanced Mapping)
- Items store `numistaId` field (string)
- `CatalogManager` keeps serial→catalog mapping for fast lookup
- Backward compatible with v3.x data

## Target (Option C – Provider-Agnostic)
- Items store `catalogRefs: { [providerKey]: id }`
- UI uses provider registry to build links and validations
- Migration tool fills `catalogRefs.numista` from legacy `numistaId`

## Storage Notes
- Large JSON blobs saved via `saveData()` may be compressed (prefix `CMP1:`).
- `loadData()` auto-detects and decompresses.
