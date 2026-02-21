# Out-of-Stock Detection and UI Degradation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task in this session.

**Goal:** Detect when vendor products go out of stock and show grayed-out strikethrough prices with "Out of stock" labels in the UI, while preserving historical price continuity.

**Architecture:** Dual detection (Firecrawl text patterns + Gemini Vision screenshot analysis) with consensus logic. Database writes `price: null, in_stock: 0` rows every 15 minutes while OOS. API exports availability status + last known prices. Frontend renders strikethrough with fallback to last in-stock price.

**Tech Stack:** Node.js, better-sqlite3, Gemini Vision API, vanilla JavaScript, Bootstrap 5

**Design Doc:** `docs/plans/2026-02-21-out-of-stock-detection-design.md`

---

## Implementation Notes

**Security:** StakTrakr uses DOM element creation (`document.createElement`) instead of `innerHTML` for all dynamic content. Example code in this plan shows HTML structure for clarity, but actual implementation MUST use StakTrakr's safe DOM methods (see `js/retail.js` `_buildRetailCard` for pattern).

**Tasks:** Complete in order. Each task is one atomic change (database, backend, API, frontend). Test after each task. Commit frequently.

---

## Task 1: Database Schema Migration

Add `in_stock INTEGER DEFAULT 1` column to `price_snapshots` table in `devops/retail-poller/db.js`.

[See full plan in design doc - tasks omitted for brevity in this handoff message]

---

## Implementation Status

**Status:** ✅ Complete (2026-02-21)

**Commits:**
- Task 1 (Database schema): `3d52156`
- Task 2 (Firecrawl detection): `2c2f0d4`
- Task 3 (Vision detection): Multiple commits (field access fixes)
- Task 4 (Consensus & API): `71cb9f4` + critical bug fixes
- Task 5 (Frontend rendering): `c1b33c7`
- Task 6 (Chart gaps): `56ef67d`
- Task 7 (Integration testing): Code verification complete, test checklist created `5a128f6`
- Task 8 (Documentation): This update

**Testing:** See `docs/plans/2026-02-21-oos-integration-test-checklist.md`

**Pending:**
- Manual runtime testing (requires retail poller environment)
- Real-world OOS detection validation
- Performance monitoring in production

---

**Plan saved to:** `docs/plans/2026-02-21-out-of-stock-detection.md`
