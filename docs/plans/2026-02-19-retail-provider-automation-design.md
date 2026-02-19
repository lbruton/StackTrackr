# Retail Provider URL Automation Design

**Date:** 2026-02-19
**Linear:** STAK-202
**Status:** Approved

## Problem

StakTrakr maintains a dataset of daily retail prices for 11 precious metal coins across 4 dealer sites (JM Bullion, APMEX, SD Bullion, Monument Metals). The current system (`daily_scraper.py`) uses headless Playwright to visit URLs in `providers.json` and extract prices from page text.

As of 2026-02-19, **100% of provider URLs are failing** due to:

- **Stale URLs** -- APMEX and SD Bullion return 404s (site restructured)
- **Bot detection** -- JM Bullion returns 403 Forbidden, Monument Metals shows Cloudflare challenge
- **Sandbox limitations** -- Jules and Codex cannot escape their sandboxes to run real browsers

## Solution: Two-Component System

### Component 1: Weekly URL Verification Skill

**What:** Claude Code skill (`/verify-providers`) triggered by recurring Linear issue.

**Where:** `~/.claude/skills/verify-providers.md` (user-level), mirrored to `.agents/skills/` for reference.

**Trigger:** Recurring Linear issue (STAK-202 pattern) assigned monthly. User invokes `/verify-providers` or Claude Code reads the issue context.

**Workflow:**

1. Check out `data` branch, read `providers.json`
2. For each coin x provider (44 URL combinations):
   a. Navigate to URL via Playwright MCP (real local browser)
   b. Screenshot the page
   c. Classify: VALID, 404/GONE, BLOCKED, WRONG_PRODUCT
   d. If broken: search the provider site for the correct product page
   e. Verify new URL shows the correct product with visible price
   f. Update `providers.json` with corrected URL
3. Commit changes, create PR to `data` branch
4. Comment change log on Linear issue with before/after URLs
5. Update Linear issue status

**Why real browser:** Playwright MCP on local Mac drives actual Chrome, bypassing bot detection that blocks headless browsers.

### Component 2: Daily Price Collection Docker Agent

**What:** Docker container running daily on local Mac, modeled after `devops/spot-poller/`.

**Where:** `devops/retail-poller/`

**Structure:**

```text
devops/retail-poller/
  Dockerfile              # Playwright + Claude CLI + Gemini CLI
  docker-compose.yml      # Auth volume mounts, schedule config
  requirements.txt        # playwright, playwright-stealth, etc.
  .env.example            # Schedule config (no API keys)
  retail_poller.py        # Main orchestrator
  price_extractor.py      # DOM extraction + vision fallback
  CLAUDE.md               # Agent instructions for Claude CLI
  README.md
```

**Base image:** `mcr.microsoft.com/playwright/python:v1.49.0-noble` (full Chromium, not alpine).

**Installed tools:**

- Playwright with `playwright-stealth` for anti-bot browser automation
- Claude Code CLI (`@anthropic-ai/claude-code`) -- vision fallback, Memento access, Linear access
- Gemini CLI (`google-genai`) -- alternative vision model
- Git -- commit daily data to `data` branch

**Docker Compose volumes:**

- `../../data:/data` -- data branch mount
- `~/.claude:/root/.claude:ro` -- Claude auth + MCP config
- `~/.config/google:/root/.config/google:ro` -- Gemini auth

**Daily workflow:**

1. Wake at scheduled time (default 10:00 AM ET)
2. Read `providers.json` from `/data/retail/`
3. Launch Chromium with stealth patches:
   - `playwright-stealth` (navigator props, WebGL, canvas fingerprint)
   - Persistent browser context (cookies accumulate across runs)
   - Random delays (2-8s between requests)
   - Randomized viewport sizes
4. For each coin x provider:
   a. Navigate to URL, wait for load
   b. Screenshot (always saved to `_artifacts/{date}/`)
   c. **Primary:** DOM text extraction (`parse_price` from body text)
   d. **Fallback:** If DOM fails, send screenshot to `claude -p` for vision price extraction
   e. Record result (price, extraction method, timestamp)
5. Aggregate per coin:
   - Average/median across providers
   - Write `{coin-slug}/{YYYY-MM-DD}.json`
6. Update `provider_candidates.json` for failed URLs
7. Log results to Memento via Claude CLI MCP
8. If provider fails 3+ consecutive days, create/comment Linear issue
9. Git commit + push to `data` branch

**Anti-bot strategy:**

- `playwright-stealth` patches browser fingerprints
- Persistent browser context with accumulated cookies
- Human-like random delays and viewport variance
- `headless: "new"` mode (less detectable than classic headless)
- Per-provider retry with exponential backoff
- If blocked after retries, flag for weekly review (do not retry endlessly)

## Data Schema

### providers.json (existing, unchanged)

Current schema works. Each coin has an array of providers with `id`, `name`, `enabled`, `url`.

### Daily price output: `{coin-slug}/{YYYY-MM-DD}.json`

```json
{
  "date": "2026-02-19",
  "generated_at_utc": "2026-02-19T15:00:00Z",
  "currency": "USD",
  "prices_by_site": {
    "jmbullion": 38.99,
    "apmex": 39.49,
    "sdbullion": 38.79
  },
  "extraction_methods": {
    "jmbullion": "dom",
    "apmex": "vision",
    "sdbullion": "dom"
  },
  "source_count": 3,
  "average_price": 39.09,
  "median_price": 38.99,
  "failed_sites": [],
  "urls_used": ["https://..."]
}
```

### provider_candidates.json (existing, enhanced)

Add `consecutive_failures` counter and `last_working_date` for smarter alerting.

## Coins Covered (11)

| Slug | Name | Metal |
|------|------|-------|
| ase | American Silver Eagle 1 oz | Silver |
| maple-silver | Canadian Silver Maple Leaf 1 oz | Silver |
| britannia-silver | British Silver Britannia 1 oz | Silver |
| krugerrand-silver | South African Silver Krugerrand 1 oz | Silver |
| generic-silver-round | Generic Silver Round 1 oz | Silver |
| generic-silver-bar-10oz | Generic Silver Bar 10 oz | Silver |
| age | American Gold Eagle 1 oz | Gold |
| buffalo | American Gold Buffalo 1 oz | Gold |
| maple-gold | Canadian Gold Maple Leaf 1 oz | Gold |
| krugerrand-gold | South African Gold Krugerrand 1 oz | Gold |
| ape | American Platinum Eagle 1 oz | Platinum |

## Providers (4)

| ID | Name | Known Issues |
|----|------|-------------|
| jmbullion | JM Bullion | 403 Forbidden (bot detection) |
| apmex | APMEX | 404 (stale URLs, site restructured) |
| sdbullion | SD Bullion | 404 (stale URLs) |
| monumentmetals | Monument Metals | Cloudflare challenge (bot protection) |

## Implementation Priority

1. **Fix URLs first** -- Build and run `/verify-providers` skill to get working URLs
2. **Build Docker poller** -- `devops/retail-poller/` with stealth Playwright
3. **Add vision fallback** -- Claude CLI integration for screenshot price extraction
4. **Add MCP connectivity** -- Memento logging, Linear self-reporting
5. **Schedule and stabilize** -- Daily schedule, consecutive failure alerting
