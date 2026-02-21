# Testing Handoff — StakTrakr

## Overview
A comprehensive Playwright test suite has been established to validate StakTrakr's core functionalities. The tests are designed to run against a local instance (default `http://localhost:8765`) using Browserless.

## Test Structure (`tests/`)
- **`smoke.spec.js`**: Basic visibility and navigation checks for all major sections and modals.
- **`crud.spec.js`**: Full lifecycle (Add, Edit, Delete) for inventory items.
- **`calculations.spec.js`**: Validates melt value math, purity logic, and unit conversions (oz/g/gb).
- **`backup-restore.spec.js`**: Tests data portability via CSV, JSON, and encrypted `.stvault` files.
- **`api-integrations.spec.js`**: **[PENDING]** Skeleton for credentialed features (Dropbox, Numista, PCGS).

## Next Steps for Claude/Codex
The primary remaining task is **1Password Integration** for API testing:

1.  **Configure 1Password CLI**: Ensure `op` is available in the environment.
2.  **Retrieve Keys**: Update `tests/api-integrations.spec.js` to fetch credentials for:
    - Dropbox (OAuth flow or test token)
    - Numista API Key
    - PCGS API Key
    - Metals.dev / MetalPriceAPI keys
3.  **Enable Tests**: Unskip the tests in `api-integrations.spec.js` once keys are available via environment variables or `op read`.

## Execution
Run all passing tests:
```bash
npx playwright test
```

## Documentation
- `docs/UI-MAP.md`: Detailed map of selectors and UI components.
- `playwright.config.js`: Configuration for Browserless and local server.
