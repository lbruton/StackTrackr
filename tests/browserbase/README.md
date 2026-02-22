# StakTrakr Browserbase Tests

Comprehensive UI validation tests using Stagehand natural-language automation via Browserbase.

## Overview

These tests validate complete user journeys through the StakTrakr UI using AI-powered browser automation. Unlike our unit/integration tests (which run on every commit via browserless), these tests are designed for pre-release validation against the live production site.

## Test Suites

### `test-basic-ui-flow.ts`

Validates core UI navigation:

- Privacy notice acceptance
- Add item modal (basic item creation)
- Settings navigation through all tabs:
  - Storage
  - Inventory
  - Filters
  - Market
  - Goldback
  - API
  - Appearance

### `test-goldback-flow.ts`

Extended test including Goldback-specific features:

- Everything from basic flow, PLUS:
- Goldback item creation (1/2 Goldback denomination)
- Type dropdown interaction (Aurum selection)
- More complex form interactions

## Setup

1. **Install dependencies:**

   ```bash
   cd tests/browserbase
   npm install
   ```

2. **Configure environment:**

   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

   Required keys:
   - `BROWSERBASE_API_KEY` - From browserbase.com dashboard
   - `BROWSERBASE_PROJECT_ID` - Your Browserbase project ID
   - `GOOGLE_API_KEY` - Gemini API key for Stagehand

## Running Tests

```bash
# Run basic UI flow test
npm run test:basic

# Run Goldback flow test
npm run test:goldback

# Run all tests
npm run test:all
```

## When to Run These Tests

**DO run before:**

- Major releases (v3.x.0)
- Deploying significant UI changes
- Pre-production QA cycles

**DON'T run:**

- On every commit (use `tests/*.spec.js` smoke tests instead)
- In CI/CD pipelines (Browserbase costs money per session)
- For debugging individual features (use local browserless)

## Cost Considerations

Browserbase charges per session. Each test run = 1 session. Budget accordingly:

- Basic flow: ~30-60 seconds
- Goldback flow: ~60-90 seconds

## Troubleshooting

**Tests time out:**

- Check Browserbase session timeout in dashboard (default 10 min)
- Verify API keys are correct
- Check Gemini API quota

**Stagehand can't find elements:**

- UI may have changed - review error screenshots in Browserbase dashboard
- Natural language instructions may need rewording
- XPath hints in code are informational only

**Session closes immediately:**

- Verify `BROWSERBASE_API_KEY` and `BROWSERBASE_PROJECT_ID` are set
- Check Browserbase account has active subscription
