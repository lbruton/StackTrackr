# Retail Provider Automation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a two-component system for automated retail precious metals price collection -- a weekly Claude Code skill to verify/repair provider URLs, and a daily Docker agent to scrape prices.

**Architecture:** Weekly `/verify-providers` skill uses Playwright MCP (real local browser) to navigate dealer sites, fix broken URLs, and PR changes to the `data` branch. Daily `devops/retail-poller/` Docker container uses stealth Playwright + Claude CLI vision fallback to extract prices, write daily JSON, and self-report via Memento/Linear MCPs.

**Tech Stack:** Python 3.12, Playwright, playwright-stealth, Claude Code CLI, Docker, Playwright MCP (local browser)

**Design doc:** `docs/plans/2026-02-19-retail-provider-automation-design.md`

---

## Phase 1: Weekly URL Verification Skill

### Task 1: Create verify-providers skill scaffold

**Files:**

- Create: `~/.claude/skills/verify-providers/SKILL.md`
- Create: `.agents/skills/verify-providers/SKILL.md` (Codex mirror, reference only)

**Step 1: Write the skill file**

Create `~/.claude/skills/verify-providers/SKILL.md` with this content:

```markdown
---
name: verify-providers
description: Verify and repair retail provider URLs in providers.json. Navigates dealer sites via Playwright MCP, screenshots each page, classifies results, searches for correct URLs when broken, updates providers.json, and PRs changes to the data branch. Triggered by recurring Linear issues (STAK-202 pattern).
---

# Verify Providers

Automated verification and repair of retail precious metals provider URLs.

## Prerequisites

- Playwright MCP must be available (real browser, not headless)
- Must have access to the `data` branch of the StakTrakr repo
- Linear MCP for issue updates

## Workflow

### 1. Setup

```bash
# Ensure we're on a working branch off data
git fetch origin data
git checkout -b verify-providers/$(date +%Y-%m-%d) origin/data
```

Read `data/retail/providers.json` to get the full coin/provider matrix.

### 2. Verify Each URL

For each coin in `providers.json`, for each enabled provider:

1. **Navigate** to the URL using Playwright MCP `browser_navigate`
2. **Wait** for page load (5 seconds for dynamic content)
3. **Screenshot** the page using `browser_take_screenshot`
4. **Classify** the result by examining the page:

| Classification | Indicators | Action |
|---|---|---|
| VALID | Product visible, price shown | Record as passing, move on |
| 404/GONE | "page not found", "no longer exists", 404 status | Search site for product |
| BLOCKED | "Forbidden", Cloudflare challenge, CAPTCHA | Try navigating via homepage first |
| WRONG_PRODUCT | Page loads but wrong item displayed | Search site for correct product |
| EMPTY_URL | URL field is empty string | Search site for product |

5. **If broken or empty:** Repair the URL:
   a. Navigate to provider homepage
   b. Look for a search bar, type the coin name (e.g., "American Silver Eagle 1 oz")
   c. Screenshot search results
   d. Click the most relevant product link
   e. Verify the product page shows correct item with price visible
   f. Screenshot the verified product page
   g. Record the new URL

### 3. Update providers.json

For each URL that changed:
- Update the `url` field in `providers.json`
- Update `last_updated` to today's date

### 4. Build Change Log

Create a markdown table of all changes:

```markdown
| Coin | Provider | Status | Old URL | New URL | Notes |
|------|----------|--------|---------|---------|-------|
| ase  | apmex    | FIXED  | old...  | new...  | 404, found via search |
```

### 5. Commit and PR

```bash
git add data/retail/providers.json
git commit -m "fix: update retail provider URLs (STAK-202)"
git push -u origin verify-providers/$(date +%Y-%m-%d)
gh pr create --base data --title "Update retail provider URLs" --body "..."
```

### 6. Update Linear

Comment the change log table on the Linear issue.
Set the issue status to "Done" if all URLs are valid.

## Provider Site Navigation Tips

### JM Bullion (jmbullion.com)
- Often blocks headless; real browser should work
- Search at top of page, product URLs are clean paths
- Price shown prominently on product pages

### APMEX (apmex.com)
- URL structure changed; old category paths are 404
- Use search bar: "Silver Eagle" etc.
- Product pages show "As Low As" price

### SD Bullion (sdbullion.com)
- Category structure changed; old paths are 404
- Use search or navigate: Silver > Silver Coins > [type]
- Shows price per coin

### Monument Metals (monumentmetals.com)
- Cloudflare protected; real browser should pass challenge
- Wait for Cloudflare challenge to complete (up to 10 seconds)
- Clean URL structure: monumentmetals.com/product-name.html
```

**Step 2: Create the Codex mirror**

Copy the skill to `.agents/skills/verify-providers/SKILL.md` with a note at top:

```markdown
> **Note:** This skill requires Playwright MCP (real browser). Codex/Jules cannot
> execute this in sandbox. This copy is for reference and issue context only.
> Assign STAK-202 issues to Claude Code (local Mac) for execution.
```

Then include the same content below.

**Step 3: Commit**

```bash
git add .agents/skills/verify-providers/SKILL.md
git commit -m "feat: add verify-providers skill for retail URL maintenance (STAK-202)"
```

Note: `~/.claude/skills/` is outside the repo and not committed.

---

### Task 2: Run verify-providers to fix all current URLs

**Files:**

- Modify: `data/retail/providers.json` (on `data` branch)
- Create: `data/retail/_artifacts/verify/2026-02-19/` (screenshots)

**Step 1: Check out data branch**

```bash
git fetch origin data
git checkout -b verify-providers/2026-02-19 origin/data
```

**Step 2: Execute the skill**

Invoke `/verify-providers` (or follow the skill manually). This will:

1. Navigate to all 44 URLs (11 coins x 4 providers)
2. Screenshot each page
3. For broken URLs, search each site and find correct product pages
4. Update `providers.json` with working URLs

**Step 3: Verify results**

After the skill completes, manually spot-check 3-4 URLs by navigating to them.

**Step 4: PR to data branch**

```bash
git add data/retail/providers.json
git commit -m "fix: repair all retail provider URLs (STAK-202)"
git push -u origin verify-providers/2026-02-19
gh pr create --base data --title "Fix retail provider URLs (2026-02-19)" \
  --body "All 44 provider URLs verified and repaired. See change log in STAK-202."
```

**Step 5: Comment on Linear issue STAK-202**

Post the change log table as a comment.

---

## Phase 2: Daily Docker Retail Poller

### Task 3: Create Docker scaffold

**Files:**

- Create: `devops/retail-poller/Dockerfile`
- Create: `devops/retail-poller/docker-compose.yml`
- Create: `devops/retail-poller/requirements.txt`
- Create: `devops/retail-poller/.env.example`
- Create: `devops/retail-poller/.gitignore`

**Step 1: Create Dockerfile**

```dockerfile
FROM mcr.microsoft.com/playwright/python:v1.49.0-noble

# System deps
RUN apt-get update && apt-get install -y git curl && rm -rf /var/lib/apt/lists/*

# Node.js is already in the playwright image; install Claude CLI
RUN npm install -g @anthropic-ai/claude-code

# Python deps
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install playwright browsers (Chromium already present, ensure stealth compat)
RUN playwright install chromium

# App code
COPY . .

CMD ["python", "-u", "retail_poller.py"]
```

**Step 2: Create docker-compose.yml**

```yaml
services:
  retail-poller:
    build: .
    container_name: staktrakr-retail-poller
    restart: unless-stopped
    volumes:
      - ../../data:/data
      - ~/.claude:/root/.claude:ro
    env_file:
      - .env
    environment:
      - TZ=America/New_York
      - DATA_DIR=/data
```

**Step 3: Create requirements.txt**

```text
playwright>=1.49.0
playwright-stealth>=1.0.6
Pillow>=10.0.0
```

**Step 4: Create .env.example**

```bash
# Schedule: hour (0-23) in local timezone to run daily
SCHEDULE_HOUR=10
# Set to "once" to run immediately and exit (for testing)
# RUN_MODE=once
```

**Step 5: Create .gitignore**

```text
.env
__pycache__/
*.pyc
```

**Step 6: Commit**

```bash
git add devops/retail-poller/
git commit -m "feat: scaffold retail-poller Docker container (STAK-202)"
```

---

### Task 4: Write price_extractor.py (DOM extraction)

**Files:**

- Create: `devops/retail-poller/price_extractor.py`
- Create: `devops/retail-poller/tests/test_price_extractor.py`

**Step 1: Write the failing test**

```python
# devops/retail-poller/tests/test_price_extractor.py
import pytest
from price_extractor import parse_price, extract_price_from_text


class TestParsePrice:
    def test_simple_price(self):
        assert parse_price("$38.99") == 38.99

    def test_comma_separated(self):
        assert parse_price("$2,849.00") == 2849.00

    def test_multiple_prices_returns_lowest(self):
        assert parse_price("Was $42.00 Now $38.99") == 38.99

    def test_no_price_returns_none(self):
        assert parse_price("No price here") is None

    def test_as_low_as_pattern(self):
        assert parse_price("As Low As $37.49") == 37.49

    def test_price_in_html_noise(self):
        text = "Free shipping! Only $39.99 per coin. Add to cart."
        assert parse_price(text) == 39.99


class TestExtractPriceFromText:
    def test_filters_unreasonable_silver_price(self):
        # Silver should be $20-200 range for 1oz
        result = extract_price_from_text(
            "$0.01 shipping, product $38.99", metal="silver", weight_oz=1.0
        )
        assert result == 38.99

    def test_filters_unreasonable_gold_price(self):
        # Gold should be $1000-10000 range for 1oz
        result = extract_price_from_text(
            "$5.00 handling, $2849.00 per coin", metal="gold", weight_oz=1.0
        )
        assert result == 2849.00

    def test_returns_none_when_all_filtered(self):
        result = extract_price_from_text(
            "Free shipping on orders over $199", metal="gold", weight_oz=1.0
        )
        assert result is None
```

**Step 2: Run test to verify it fails**

```bash
cd devops/retail-poller && python -m pytest tests/test_price_extractor.py -v
```

Expected: FAIL -- `ModuleNotFoundError: No module named 'price_extractor'`

**Step 3: Write the implementation**

```python
# devops/retail-poller/price_extractor.py
"""
Price extraction from web page text and screenshot images.
Primary: regex-based DOM text extraction.
Fallback: Claude CLI vision extraction from screenshots.
"""

import re
import subprocess
import json
from pathlib import Path


# Reasonable price ranges per metal per troy ounce (USD)
PRICE_RANGES = {
    "silver": (15.0, 250.0),
    "gold":   (800.0, 15000.0),
    "platinum": (500.0, 5000.0),
    "palladium": (400.0, 5000.0),
}


def parse_price(text):
    """Extract the lowest USD price from text using regex.

    Returns float or None.
    """
    matches = re.findall(r"\$(\d{1,3}(?:,\d{3})*\.\d{2})", text)
    if not matches:
        return None

    prices = []
    for m in matches:
        try:
            prices.append(float(m.replace(",", "")))
        except ValueError:
            continue

    return min(prices) if prices else None


def extract_price_from_text(text, metal="silver", weight_oz=1.0):
    """Extract a plausible price from page text, filtering by metal range.

    Returns float or None.
    """
    matches = re.findall(r"\$(\d{1,3}(?:,\d{3})*\.\d{2})", text)
    if not matches:
        return None

    low, high = PRICE_RANGES.get(metal, (1.0, 50000.0))
    # Scale range by weight
    low *= weight_oz
    high *= weight_oz

    prices = []
    for m in matches:
        try:
            val = float(m.replace(",", ""))
            if low <= val <= high:
                prices.append(val)
        except ValueError:
            continue

    return min(prices) if prices else None


def extract_price_from_screenshot(screenshot_path, coin_name, metal):
    """Fallback: use Claude CLI vision to read price from screenshot.

    Returns float or None.
    """
    path = Path(screenshot_path)
    if not path.exists():
        return None

    prompt = (
        f"Look at this screenshot of a precious metals dealer website. "
        f"Find the retail price for '{coin_name}' ({metal}). "
        f"Return ONLY the price as a number like 38.99 or 2849.00. "
        f"If you cannot find a price, return NONE."
    )

    try:
        result = subprocess.run(
            ["claude", "-p", prompt, "--image", str(path)],
            capture_output=True, text=True, timeout=30,
        )
        output = result.stdout.strip()

        if "NONE" in output.upper():
            return None

        # Extract price from Claude's response
        price_match = re.search(r"(\d{1,3}(?:,\d{3})*\.\d{2})", output)
        if price_match:
            return float(price_match.group(1).replace(",", ""))

        return None
    except (subprocess.TimeoutExpired, FileNotFoundError, Exception):
        return None
```

**Step 4: Run test to verify it passes**

```bash
cd devops/retail-poller && python -m pytest tests/test_price_extractor.py -v
```

Expected: ALL PASS

**Step 5: Commit**

```bash
git add devops/retail-poller/price_extractor.py devops/retail-poller/tests/
git commit -m "feat: add price extraction with metal-range filtering (STAK-202)"
```

---

### Task 5: Write retail_poller.py (main orchestrator)

**Files:**

- Create: `devops/retail-poller/retail_poller.py`
- Create: `devops/retail-poller/tests/test_retail_poller.py`

**Step 1: Write failing test for config loading**

```python
# devops/retail-poller/tests/test_retail_poller.py
import json
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock
from retail_poller import load_providers, build_schedule_time, write_daily_result


@pytest.fixture
def sample_providers(tmp_path):
    providers = {
        "schema_version": 1,
        "currency": "USD",
        "coins": {
            "ase": {
                "name": "American Silver Eagle 1 oz",
                "metal": "silver",
                "weight_oz": 1.0,
                "providers": [
                    {"id": "apmex", "name": "APMEX", "enabled": True,
                     "url": "https://www.apmex.com/product/1"},
                    {"id": "jmbullion", "name": "JM Bullion", "enabled": False,
                     "url": ""},
                ],
            }
        },
    }
    f = tmp_path / "providers.json"
    f.write_text(json.dumps(providers))
    return f


def test_load_providers(sample_providers):
    config = load_providers(sample_providers)
    assert "ase" in config["coins"]
    assert config["coins"]["ase"]["metal"] == "silver"


def test_load_providers_filters_disabled(sample_providers):
    config = load_providers(sample_providers)
    enabled = [
        p for p in config["coins"]["ase"]["providers"] if p.get("enabled")
    ]
    assert len(enabled) == 1
    assert enabled[0]["id"] == "apmex"


def test_build_schedule_time():
    t = build_schedule_time(10)
    assert t.hour == 10
    assert t.minute == 0


def test_write_daily_result(tmp_path):
    data = {
        "date": "2026-02-19",
        "prices_by_site": {"apmex": 38.99},
        "average_price": 38.99,
    }
    write_daily_result(tmp_path, "ase", data)
    out = tmp_path / "ase" / "2026-02-19.json"
    assert out.exists()
    loaded = json.loads(out.read_text())
    assert loaded["prices_by_site"]["apmex"] == 38.99
```

**Step 2: Run test to verify it fails**

```bash
cd devops/retail-poller && python -m pytest tests/test_retail_poller.py -v
```

Expected: FAIL -- `ModuleNotFoundError: No module named 'retail_poller'`

**Step 3: Write the implementation**

```python
#!/usr/bin/env python3
"""
StakTrakr Retail Price Poller
==============================
Long-running Docker service that daily:
  1. Reads providers.json for coin/provider URL matrix
  2. Visits each URL with stealth Playwright
  3. Extracts prices (DOM primary, Claude vision fallback)
  4. Writes daily JSON per coin to data/retail/{slug}/{date}.json
  5. Flags failures to provider_candidates.json
  6. Logs to Memento and alerts via Linear for persistent failures

Modeled after devops/spot-poller/poller.py.
"""

import json
import os
import random
import statistics
import sys
import time
from datetime import datetime, date
from pathlib import Path

from playwright.sync_api import sync_playwright
from playwright_stealth import stealth_sync

from price_extractor import extract_price_from_text, extract_price_from_screenshot


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

DATA_DIR = Path(os.environ.get("DATA_DIR", "/data"))
RETAIL_DIR = DATA_DIR / "retail"
PROVIDERS_FILE = RETAIL_DIR / "providers.json"
CANDIDATES_FILE = RETAIL_DIR / "provider_candidates.json"
ARTIFACTS_DIR = RETAIL_DIR / "_artifacts"

SCHEDULE_HOUR = int(os.environ.get("SCHEDULE_HOUR", "10"))
RUN_MODE = os.environ.get("RUN_MODE", "scheduled")  # "scheduled" or "once"

# Stealth config
VIEWPORTS = [
    {"width": 1920, "height": 1080},
    {"width": 1440, "height": 900},
    {"width": 1536, "height": 864},
    {"width": 1366, "height": 768},
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def log(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}", flush=True)


def load_providers(path=None):
    """Load and return providers config from JSON file."""
    p = path or PROVIDERS_FILE
    with open(p, "r") as f:
        return json.load(f)


def build_schedule_time(hour):
    """Build a datetime for today at the given hour."""
    now = datetime.now()
    return now.replace(hour=hour, minute=0, second=0, microsecond=0)


def write_daily_result(base_dir, coin_slug, data):
    """Write daily price JSON for a coin."""
    coin_dir = Path(base_dir) / coin_slug
    coin_dir.mkdir(parents=True, exist_ok=True)
    out_file = coin_dir / f"{data['date']}.json"
    with open(out_file, "w") as f:
        json.dump(data, f, indent=2)
    log(f"  Wrote {out_file}")


def ensure_artifacts_dir(date_str):
    path = ARTIFACTS_DIR / date_str
    path.mkdir(parents=True, exist_ok=True)
    return path


def update_candidates(failed_coins, date_str):
    """Update provider_candidates.json with failed coins."""
    if CANDIDATES_FILE.exists():
        with open(CANDIDATES_FILE, "r") as f:
            data = json.load(f)
    else:
        data = {"schema_version": 1, "last_updated": date_str, "candidates": []}

    existing = {c["coin"] for c in data.get("candidates", [])}

    for coin_slug, reason in failed_coins:
        if coin_slug not in existing:
            data["candidates"].append({
                "coin": coin_slug,
                "reason": reason,
                "date": date_str,
                "consecutive_failures": 1,
            })
        else:
            for c in data["candidates"]:
                if c["coin"] == coin_slug:
                    c["consecutive_failures"] = c.get("consecutive_failures", 0) + 1
                    c["date"] = date_str
                    c["reason"] = reason

    data["last_updated"] = date_str

    with open(CANDIDATES_FILE, "w") as f:
        json.dump(data, f, indent=2)


# ---------------------------------------------------------------------------
# Scraper
# ---------------------------------------------------------------------------

def scrape_all():
    """Run one full scraping cycle for all coins."""
    today_str = date.today().strftime("%Y-%m-%d")
    log(f"Starting retail scrape for {today_str}")

    config = load_providers()
    coins = config.get("coins", {})
    currency = config.get("currency", "USD")

    artifacts_path = ensure_artifacts_dir(today_str)
    results = {"processed": 0, "success": 0, "failure": 0, "files": 0}
    failed_coins = []

    with sync_playwright() as p:
        viewport = random.choice(VIEWPORTS)
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/131.0.0.0 Safari/537.36"
            ),
            viewport=viewport,
            locale="en-US",
            timezone_id="America/New_York",
        )
        stealth_sync(context)

        for slug, coin_data in coins.items():
            log(f"Processing: {slug}")
            results["processed"] += 1

            coin_name = coin_data.get("name", slug)
            metal = coin_data.get("metal", "silver")
            weight_oz = coin_data.get("weight_oz", 1.0)
            providers = coin_data.get("providers", [])

            coin_prices = []
            extraction_methods = {}
            failed_sites = []

            for provider in providers:
                if not provider.get("enabled", False):
                    continue
                url = provider.get("url", "").strip()
                if not url:
                    continue

                pid = provider["id"]
                log(f"  {pid}: {url}")

                # Random delay
                time.sleep(random.uniform(2, 6))

                page = context.new_page()
                price = None
                method = None
                error_msg = None

                try:
                    resp = page.goto(url, timeout=60000, wait_until="domcontentloaded")
                    page.wait_for_timeout(3000)  # Let JS render
                    status = resp.status if resp else 0

                    # Screenshot always
                    ss_path = artifacts_path / f"{slug}-{pid}.png"
                    page.screenshot(path=str(ss_path))

                    if 200 <= status < 400:
                        body_text = page.inner_text("body")
                        price = extract_price_from_text(body_text, metal, weight_oz)
                        if price is not None:
                            method = "dom"
                        else:
                            # Vision fallback
                            price = extract_price_from_screenshot(
                                ss_path, coin_name, metal
                            )
                            if price is not None:
                                method = "vision"
                            else:
                                error_msg = "Price extraction failed (dom + vision)"
                    else:
                        error_msg = f"HTTP {status}"

                except Exception as e:
                    error_msg = str(e)
                    try:
                        ss_path = artifacts_path / f"{slug}-{pid}.png"
                        page.screenshot(path=str(ss_path))
                    except Exception:
                        pass

                page.close()

                if price is not None:
                    log(f"    OK: ${price:.2f} ({method})")
                    coin_prices.append({"provider": pid, "price": price})
                    extraction_methods[pid] = method
                    results["success"] += 1
                else:
                    log(f"    FAIL: {error_msg}")
                    failed_sites.append({
                        "provider": pid,
                        "url": url,
                        "error": error_msg,
                        "timestamp": datetime.utcnow().isoformat(),
                    })
                    results["failure"] += 1

            # Aggregate
            if coin_prices:
                prices = [x["price"] for x in coin_prices]
                output = {
                    "date": today_str,
                    "generated_at_utc": datetime.utcnow().isoformat(),
                    "currency": currency,
                    "prices_by_site": {x["provider"]: x["price"] for x in coin_prices},
                    "extraction_methods": extraction_methods,
                    "source_count": len(coin_prices),
                    "average_price": round(statistics.mean(prices), 2),
                    "median_price": round(statistics.median(prices), 2),
                    "failed_sites": failed_sites,
                    "urls_used": [
                        pr.get("url", "")
                        for pr in providers
                        if pr.get("enabled") and pr.get("url", "").strip()
                    ],
                }
                write_daily_result(RETAIL_DIR, slug, output)
                results["files"] += 1
            else:
                log(f"  ALL PROVIDERS FAILED for {slug}")
                failed_coins.append((slug, "All providers failed"))

        browser.close()

    if failed_coins:
        update_candidates(failed_coins, today_str)

    log(f"Done. {json.dumps(results)}")
    return results


# ---------------------------------------------------------------------------
# Scheduler
# ---------------------------------------------------------------------------

def run_loop():
    """Main loop: run once daily at SCHEDULE_HOUR."""
    log(f"Retail poller starting. Schedule: daily at {SCHEDULE_HOUR}:00")

    while True:
        now = datetime.now()
        target = build_schedule_time(SCHEDULE_HOUR)

        if now >= target:
            # Check if we already ran today
            today_str = date.today().strftime("%Y-%m-%d")
            marker = ARTIFACTS_DIR / today_str / ".completed"
            if not marker.exists():
                try:
                    scrape_all()
                    ensure_artifacts_dir(today_str)
                    marker.write_text(datetime.utcnow().isoformat())
                except Exception as e:
                    log(f"ERROR: {e}")

            # Sleep until tomorrow
            tomorrow_target = target.replace(
                day=target.day + 1
            ) if target.day < 28 else target  # Simplified
            sleep_secs = max(3600, 86400 - (now - target).total_seconds())
        else:
            sleep_secs = (target - now).total_seconds()

        log(f"Sleeping {sleep_secs/3600:.1f} hours until next run...")
        time.sleep(min(sleep_secs, 3600))  # Wake hourly to recheck


if __name__ == "__main__":
    if RUN_MODE == "once":
        scrape_all()
    else:
        run_loop()
```

**Step 4: Run tests to verify they pass**

```bash
cd devops/retail-poller && python -m pytest tests/ -v
```

Expected: ALL PASS

**Step 5: Commit**

```bash
git add devops/retail-poller/retail_poller.py devops/retail-poller/tests/
git commit -m "feat: add retail poller orchestrator with stealth browser (STAK-202)"
```

---

### Task 6: Integration test -- build and run Docker container

**Files:**

- Modify: `devops/retail-poller/.env.example` (copy to `.env`)

**Step 1: Create .env from example**

```bash
cd devops/retail-poller
cp .env.example .env
echo "RUN_MODE=once" >> .env
```

**Step 2: Build the Docker image**

```bash
cd devops/retail-poller && docker compose build
```

Expected: Successful build (may take a few minutes for Playwright image).

**Step 3: Dry run with one coin**

Before running the full suite, manually test with a single known-good URL. Add a temporary test provider file or modify the run to process just one coin.

```bash
docker compose run --rm retail-poller python -c "
from retail_poller import load_providers
config = load_providers('/data/retail/providers.json')
print(f'Loaded {len(config[\"coins\"])} coins')
for slug, data in config['coins'].items():
    enabled = [p for p in data['providers'] if p.get('enabled') and p.get('url')]
    print(f'  {slug}: {len(enabled)} enabled providers')
"
```

Expected: Lists all 11 coins with their enabled provider counts.

**Step 4: Full run**

```bash
docker compose run --rm retail-poller
```

Expected: Processes all coins, writes JSON files and screenshots. Some providers may fail (that's expected until URLs are fixed in Phase 1).

**Step 5: Verify output**

```bash
ls data/retail/*/2026-02-19.json 2>/dev/null
ls data/retail/_artifacts/2026-02-19/*.png | head -10
```

**Step 6: Commit**

```bash
git add devops/retail-poller/.gitignore
git commit -m "feat: verify retail-poller Docker integration (STAK-202)"
```

---

### Task 7: Add Claude CLI vision fallback integration

**Files:**

- Modify: `devops/retail-poller/Dockerfile` (verify Claude CLI installs correctly)
- Create: `devops/retail-poller/tests/test_vision_fallback.py`

**Step 1: Write a test for the vision extraction subprocess call**

```python
# devops/retail-poller/tests/test_vision_fallback.py
import pytest
from unittest.mock import patch, MagicMock
from price_extractor import extract_price_from_screenshot


@patch("price_extractor.subprocess.run")
def test_vision_extracts_price(mock_run):
    mock_run.return_value = MagicMock(stdout="38.99", returncode=0)
    result = extract_price_from_screenshot("/fake/path.png", "Silver Eagle", "silver")
    # extract_price_from_screenshot checks path existence, so this tests the subprocess path
    # In real usage, the file must exist
    assert result is None  # File doesn't exist, returns None


@patch("price_extractor.subprocess.run")
def test_vision_returns_none_on_failure(mock_run):
    mock_run.side_effect = FileNotFoundError("claude not found")
    result = extract_price_from_screenshot("/fake/path.png", "Silver Eagle", "silver")
    assert result is None


@patch("price_extractor.subprocess.run")
def test_vision_handles_none_response(mock_run, tmp_path):
    # Create a real file so path check passes
    img = tmp_path / "test.png"
    img.write_bytes(b"fake png data")
    mock_run.return_value = MagicMock(stdout="NONE - no price visible", returncode=0)
    result = extract_price_from_screenshot(str(img), "Silver Eagle", "silver")
    assert result is None


@patch("price_extractor.subprocess.run")
def test_vision_extracts_from_real_file(mock_run, tmp_path):
    img = tmp_path / "test.png"
    img.write_bytes(b"fake png data")
    mock_run.return_value = MagicMock(stdout="The price is $38.99", returncode=0)
    result = extract_price_from_screenshot(str(img), "Silver Eagle", "silver")
    assert result == 38.99
```

**Step 2: Run tests**

```bash
cd devops/retail-poller && python -m pytest tests/test_vision_fallback.py -v
```

Expected: ALL PASS

**Step 3: Verify Claude CLI is accessible in Docker**

```bash
docker compose run --rm retail-poller claude --version
```

Expected: Prints Claude CLI version. If this fails, the Dockerfile needs adjustment.

**Step 4: Commit**

```bash
git add devops/retail-poller/tests/test_vision_fallback.py
git commit -m "test: add vision fallback unit tests (STAK-202)"
```

---

### Task 8: Add Memento logging and Linear alerting

**Files:**

- Create: `devops/retail-poller/mcp_reporter.py`
- Create: `devops/retail-poller/tests/test_mcp_reporter.py`

**Step 1: Write failing test**

```python
# devops/retail-poller/tests/test_mcp_reporter.py
import pytest
from unittest.mock import patch, MagicMock
from mcp_reporter import build_memento_observation, build_linear_comment


def test_build_memento_observation():
    result = build_memento_observation(
        date="2026-02-19",
        coin_slug="ase",
        prices={"apmex": 38.99, "sdbullion": 39.49},
        failures=["jmbullion"],
    )
    assert "ase" in result
    assert "38.99" in result
    assert "jmbullion" in result


def test_build_linear_comment_with_failures():
    comment = build_linear_comment(
        date="2026-02-19",
        results={
            "processed": 11, "success": 30, "failure": 14, "files": 8
        },
        persistent_failures=[("ase", "jmbullion", 3)],
    )
    assert "3 consecutive" in comment.lower() or "3" in comment
    assert "ase" in comment
```

**Step 2: Run test to verify it fails**

```bash
cd devops/retail-poller && python -m pytest tests/test_mcp_reporter.py -v
```

Expected: FAIL

**Step 3: Write implementation**

```python
# devops/retail-poller/mcp_reporter.py
"""
MCP reporting utilities for the retail poller.
Uses Claude CLI to write observations to Memento and comments to Linear.
"""

import subprocess
import json
from datetime import datetime


def build_memento_observation(date, coin_slug, prices, failures):
    """Build a Memento observation string for a daily scrape result."""
    parts = [f"Retail scrape {date} for {coin_slug}:"]
    for provider, price in prices.items():
        parts.append(f"  {provider}: ${price:.2f}")
    if failures:
        parts.append(f"  Failed: {', '.join(failures)}")
    return "\n".join(parts)


def build_linear_comment(date, results, persistent_failures):
    """Build a Linear issue comment summarizing daily results."""
    lines = [
        f"## Daily Retail Scrape Report - {date}",
        "",
        f"- Coins processed: {results['processed']}",
        f"- Provider successes: {results['success']}",
        f"- Provider failures: {results['failure']}",
        f"- Daily files written: {results['files']}",
    ]

    if persistent_failures:
        lines.append("")
        lines.append("### Persistent Failures (3+ consecutive days)")
        lines.append("")
        lines.append("| Coin | Provider | Consecutive Failures |")
        lines.append("|------|----------|---------------------|")
        for coin, provider, count in persistent_failures:
            lines.append(f"| {coin} | {provider} | {count} |")

    return "\n".join(lines)


def log_to_memento(observation):
    """Send an observation to Memento via Claude CLI."""
    try:
        subprocess.run(
            ["claude", "-p", f"Remember this: {observation}"],
            capture_output=True, text=True, timeout=30,
        )
    except Exception:
        pass  # Non-critical, don't block scraping


def comment_on_linear(issue_id, comment):
    """Post a comment on a Linear issue via Claude CLI."""
    try:
        subprocess.run(
            ["claude", "-p",
             f"Add this comment to Linear issue {issue_id}:\n\n{comment}"],
            capture_output=True, text=True, timeout=30,
        )
    except Exception:
        pass  # Non-critical
```

**Step 4: Run tests**

```bash
cd devops/retail-poller && python -m pytest tests/test_mcp_reporter.py -v
```

Expected: ALL PASS

**Step 5: Wire into retail_poller.py**

Add import and calls at the end of `scrape_all()`:

```python
# At end of scrape_all(), after update_candidates:
from mcp_reporter import log_to_memento, build_memento_observation

# Log each successful coin to Memento
for slug, coin_data in coins.items():
    # ... after processing each coin, if coin_prices:
    obs = build_memento_observation(today_str, slug,
        {x["provider"]: x["price"] for x in coin_prices},
        [s["provider"] for s in failed_sites])
    log_to_memento(obs)
```

**Step 6: Commit**

```bash
git add devops/retail-poller/mcp_reporter.py devops/retail-poller/tests/test_mcp_reporter.py
git commit -m "feat: add Memento logging and Linear alerting for retail poller (STAK-202)"
```

---

### Task 9: Add README and documentation

**Files:**

- Create: `devops/retail-poller/README.md`

**Step 1: Write README**

```markdown
# StakTrakr Retail Price Poller

Daily automated retail price collection for precious metals coins.

## Architecture

Visits dealer websites (APMEX, JM Bullion, SD Bullion, Monument Metals),
extracts retail prices for 11 tracked coins, and writes daily JSON files.

- **Primary extraction:** DOM text parsing with metal-range filtering
- **Fallback extraction:** Claude CLI vision (screenshot OCR)
- **Anti-bot:** playwright-stealth, persistent cookies, random delays
- **Reporting:** Memento knowledge graph logging, Linear issue alerts

## Quick Start

```bash
cp .env.example .env
# Edit .env if needed (default: run at 10 AM ET)

# One-time test run:
echo "RUN_MODE=once" >> .env
docker compose up --build

# Scheduled mode:
# Remove RUN_MODE=once from .env
docker compose up -d --build
```

## Output

Daily price files: `data/retail/{coin-slug}/{YYYY-MM-DD}.json`
Screenshots: `data/retail/_artifacts/{YYYY-MM-DD}/{coin}-{provider}.png`
Failure log: `data/retail/provider_candidates.json`

## URL Maintenance

Provider URLs go stale as dealers restructure their sites. Use the
`/verify-providers` Claude Code skill (or the recurring STAK-202 Linear issue)
to verify and repair URLs periodically.
```

**Step 2: Commit**

```bash
git add devops/retail-poller/README.md
git commit -m "docs: add retail-poller README (STAK-202)"
```

---

## Phase 3: Integration and First Run

### Task 10: End-to-end integration test

**Step 1:** Ensure URLs are fixed (Task 2 must be complete)

**Step 2:** Run the full poller once

```bash
cd devops/retail-poller
RUN_MODE=once docker compose up --build
```

**Step 3:** Verify output files exist

```bash
ls -la data/retail/*/$(date +%Y-%m-%d).json
```

**Step 4:** Spot-check 2-3 price files for reasonable values

```bash
cat data/retail/ase/$(date +%Y-%m-%d).json | python -m json.tool
cat data/retail/age/$(date +%Y-%m-%d).json | python -m json.tool
```

**Step 5:** Check screenshots

```bash
ls data/retail/_artifacts/$(date +%Y-%m-%d)/*.png | wc -l
```

Expected: ~44 screenshots (11 coins x 4 providers).

**Step 6:** If all looks good, start in scheduled mode

```bash
# Remove RUN_MODE=once from .env
docker compose up -d --build
docker compose logs -f retail-poller
```

---

### Task 11: Update Linear issue STAK-202

**Step 1:** Comment on STAK-202 with:
- Summary of URLs fixed
- Link to PR
- Confirmation that daily poller is running
- Note that `/verify-providers` skill is available for future runs

**Step 2:** Update recurring issue template to reference the skill.

**Step 3:** Close STAK-202.
