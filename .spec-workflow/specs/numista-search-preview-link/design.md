# Design Document

## Overview

This design adds a per-result Numista preview action to the existing Numista results modal so users can inspect catalog pages before applying metadata. The implementation reuses the existing popup helper (`openNumistaModal`) and keeps the apply workflow unchanged.

**Release target:** `v3.32.48`.

## Steering Document Alignment

### Technical Standards (tech.md)

- Preserves zero-build vanilla JS architecture.
- Reuses existing globally loaded helpers and event wiring model.
- Avoids framework changes, new runtime dependencies, or module system changes.
- Keeps network behavior user-triggered (no prefetch on render).

### Project Structure (structure.md)

- Primary logic changes stay in existing Numista feature files:
  - `js/catalog-api.js` for modal rendering and click behavior.
  - `js/numista-modal.js` for safe popup URL handling if enhancement is needed.
  - `css/styles.css` for result-row preview control styling.
- No script load order changes required because these files already load in correct sequence (`numista-modal.js` before `catalog-api.js`).

## Code Reuse Analysis

### Existing Components to Leverage

- **`openNumistaModal(numistaId, coinName)`** (`js/numista-modal.js`): Existing popup opener that already handles Numista pages and popup-blocked feedback.
- **`renderNumistaResultCard(result, index)`** (`js/catalog-api.js`): Existing renderer where preview action can be added per card.
- **Delegated click handler on `#numistaResultsList`** (`js/catalog-api.js`): Existing event delegation for card selection; can be extended to handle preview clicks.
- **`escapeHtmlCatalog()`** (`js/catalog-api.js`): Existing sanitizer for HTML-inserted values.

### Integration Points

- **Numista result list UI**: Adds preview button/link inside each result card.
- **Results list click delegation**: Distinguishes preview click from card-select click.
- **URL/ID source**: Uses normalized `result.catalogId` from Numista provider output.

## Architecture

This is an additive UI behavior change in the existing search-results flow.

```mermaid
graph TD
    A[showNumistaResults] --> B[renderNumistaResultCard]
    B --> C[Preview control in each card]
    C --> D[Delegated click handler]
    D --> E[openNumistaModal(catalogId, name)]
    D --> F[Existing card select behavior]
```

### Modular Design Principles

- **Single File Responsibility**: Keep modal rendering/event logic in `catalog-api.js`.
- **Component Isolation**: Add small preview control markup and scoped CSS class only.
- **Service Layer Separation**: No API provider or data normalization changes.
- **Utility Modularity**: Reuse existing popup utility rather than duplicating URL builders.

## Components and Interfaces

### Component 1: Result Card Preview Control

- **Purpose:** Provide explicit "preview before apply" action on each search result.
- **Interfaces:** HTML data attributes (`data-action="preview"`, `data-result-index`).
- **Dependencies:** `renderNumistaResultCard`, `escapeHtmlCatalog`.
- **Reuses:** Existing result-card structure and styles.

### Component 2: Results Click Delegation Extension

- **Purpose:** Route preview clicks to popup helper while preserving card selection behavior.
- **Interfaces:** Event listener on `#numistaResultsList`.
- **Dependencies:** `openNumistaModal`, `list._numistaResults`.
- **Reuses:** Existing delegated click pattern in `catalog-api.js`.

## Data Models

### Numista Result Card Action Contract

```text
- resultIndex: number (index into list._numistaResults)
- action: "preview" | "select" (select is implicit card click)
- catalogId: string (from normalized result.catalogId)
- name: string (from normalized result.name)
```

No persistent storage schema changes are required.

## Error Handling

### Error Scenarios

1. **Missing/invalid catalogId for a row**
   - **Handling:** Hide or disable preview control for that row.
   - **User Impact:** User can still select/apply the result; no modal crash.

2. **Popup blocked by browser**
   - **Handling:** Keep `openNumistaModal` fallback alert with direct URL.
   - **User Impact:** User gets clear action to allow popups or open manually.

3. **Preview click also triggers row selection**
   - **Handling:** In delegated handler, detect preview target and `return` early.
   - **User Impact:** Preview opens without forcing transition to field picker.

## Testing Strategy

### Unit Testing

- Validate preview URL generation path from `catalogId` via existing helper behavior.
- Validate delegated handler branch logic (preview vs card select).

### Integration Testing

- Search Numista -> results list renders preview action per row.
- Click preview -> popup open path executes; apply flow remains available.

### End-to-End Testing

- Desktop and mobile viewport check:
  - Preview control visible and tappable.
  - Preview click does not break or close modal unexpectedly.
  - Row select still transitions to field picker and `Fill Fields` works as before.
