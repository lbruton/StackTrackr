# Requirements Document

## Introduction

Users currently must apply a Numista search result blindly from the lookup modal, which can cause wrong imports when multiple similar results exist (for example different weights/years/variants). This feature adds a per-result preview link so users can inspect the Numista catalog page before applying data to their item.

**Release target:** `v3.32.48` patch release.

## Alignment with Product Vision

This supports StakTrakr's "user-first, no-surprises" workflow by making data imports explicit and verifiable before writes occur. It reduces accidental metadata overwrites, improves trust in catalog integrations, and keeps the implementation lightweight within the existing zero-build vanilla JS architecture.

## Requirements

### Requirement 1: Add preview action on Numista search results

**User Story:** As a collector importing metadata, I want a direct preview link for each Numista result, so that I can confirm the exact listing before applying.

#### Acceptance Criteria

1. WHEN Numista search results are rendered in the modal THEN the system SHALL display a preview action for each result row.
2. WHEN a user clicks a result's preview action THEN the system SHALL open the corresponding Numista catalog page using the existing app preview/open pattern.
3. IF a result has no valid Numista URL or numeric id THEN the system SHALL disable or hide preview for that row without breaking rendering.

### Requirement 2: Keep current apply workflow unchanged

**User Story:** As a user, I want the existing "Apply" action to continue working exactly as before, so that adding preview does not regress import behavior.

#### Acceptance Criteria

1. WHEN preview is added to result rows THEN the system SHALL preserve existing Apply button behavior and payload mapping.
2. WHEN a user previews one or more results THEN the system SHALL still allow applying any row in the same modal session.
3. WHEN the modal is closed or refreshed THEN the system SHALL not persist preview-only state into inventory data.

### Requirement 3: Ensure safe and usable interaction

**User Story:** As a user, I want preview links to be clear and safe to use, so that I can confidently verify results on desktop and mobile.

#### Acceptance Criteria

1. WHEN preview controls are rendered THEN the system SHALL present a clear label/icon with tooltip or accessible text (for example "Preview on Numista").
2. WHEN preview is opened THEN the system SHALL prevent script injection by constructing destination URLs from trusted Numista identifiers/URLs only.
3. WHEN preview fails to open (popup blocked or invalid URL) THEN the system SHALL fail gracefully without crashing the modal.

## Non-Functional Requirements

### Code Architecture and Modularity

- Keep implementation within existing Numista modal/search modules; avoid introducing new global subsystems.
- Reuse existing modal/open-link helper patterns already used in app UI.
- Keep script load order unchanged unless a new dependency is strictly required.

### Performance

- Rendering preview controls SHALL not add noticeable delay to search result rendering.
- No additional network requests SHALL be made until user explicitly triggers preview.

### Security

- Preview URL generation SHALL be constrained to Numista domains/known path structure.
- No unsanitized user-provided HTML shall be inserted while rendering preview controls.

### Reliability

- Modal behavior SHALL remain stable when search returns zero, partial, or malformed rows.
- Apply/import behavior SHALL remain backward compatible.

### Usability

- Preview control SHALL be discoverable in each result row.
- Interaction SHALL be usable on desktop and mobile viewport sizes already supported by the modal.
