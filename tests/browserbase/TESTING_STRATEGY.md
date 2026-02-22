# StakTrakr Testing Strategy

## Three-Tier Testing Approach

### Tier 1: Local Smoke Tests (Browserless)

**Location:** `tests/*.spec.js`
**Runs:** On every commit, CI/CD pipeline
**Tool:** Playwright via local browserless Docker
**Cost:** Free (self-hosted)

**What we test:**

- Page loads correctly
- Core modals open/close
- Basic DOM element visibility
- Fast regression checks

**Selector strategy:** ID-based (`#settingsBtn`, `#itemModal`)

### Tier 2: Comprehensive UI Tests (Browserbase + Stagehand)

**Location:** `tests/browserbase/*.ts`
**Runs:** Pre-release QA, before major deploys
**Tool:** Stagehand natural-language automation via Browserbase
**Cost:** Paid per session (~$0.10-0.20 per test)

**What we test:**

- Complete user journeys
- All Settings tabs navigation
- Form interactions (Add Item)
- Goldback-specific features
- Cross-browser compatibility

**Selector strategy:** Natural language (`click the "Add Item" button"`)

### Tier 3: Manual QA

**When:** Major releases, visual changes, new features
**Who:** Human testers
**Focus:** UX, accessibility, edge cases, mobile

---

## When to Use Which Tests

### Every Commit (Automated - Tier 1)

```bash
npm test  # Runs all Playwright smoke tests via browserless
```

- Fast (< 30 seconds)
- Free
- Catches breaking changes immediately

### Before Release (Manual - Tier 2)

```bash
cd tests/browserbase
./run-tests.sh all
```

- Comprehensive (2-3 minutes)
- Costs real money
- Validates full user experience against production

### Before Major Release (Manual - Tier 3)

- Walk through critical paths manually
- Test on multiple devices/browsers
- Verify accessibility
- Check visual polish

---

## Test Coverage Matrix

| Feature Area | Tier 1 (Smoke) | Tier 2 (Browserbase) | Tier 3 (Manual) |
|--------------|----------------|----------------------|-----------------|
| Page Load | Yes | Yes | Yes |
| Add Item Modal | Yes (open/close) | Yes (full flow) | Yes (edge cases) |
| Settings Tabs | Yes (modal opens) | Yes (all tabs) | Yes (all settings) |
| Goldback Pricing | No | Yes | Yes |
| Filter Chips | No | Yes | Yes |
| Export Functions | No | Yes | Yes |
| Mobile Layout | No | No | Yes |
| Accessibility | No | No | Yes |

---

## Browserbase vs Browserless Decision Tree

```text
Is this a fast regression check?
  ├─ YES -> Use browserless (Tier 1)
  └─ NO  -> Does it require natural language interaction?
            ├─ YES -> Use Browserbase (Tier 2)
            └─ NO  -> Can you write it with ID selectors?
                      ├─ YES -> Use browserless (Tier 1)
                      └─ NO  -> Use Browserbase (Tier 2)
```

**Examples:**

| Test Scenario | Tool | Why |
|---------------|------|-----|
| "Verify Settings modal opens" | Browserless | Simple ID selector check |
| "Navigate through all Settings tabs and verify content" | Browserbase | Complex journey, natural language clearer |
| "Add item with price $100" | Browserless | Known form fields, ID selectors work |
| "Add Goldback item and verify pricing updates" | Browserbase | Multi-step flow, dynamic price validation |
| "Click 5th filter chip and verify results" | Browserbase | Dynamic DOM, unclear IDs |

---

## Cost Optimization

**Browserless (Free):**

- Run unlimited
- Add more tests freely
- Perfect for CI/CD

**Browserbase (Paid):**

- Budget: ~10-20 runs/month
- Reserve for pre-release validation
- Consider session timeout settings
- Review session recordings for value

**Cost per test run (estimated):**

- Basic UI flow: $0.10 (30-60 sec)
- Goldback flow: $0.15 (60-90 sec)
- Monthly budget (20 runs): ~$5-10

---

## Adding New Tests

### When to add to Tier 1 (Browserless)

- New modal/page that should always be accessible
- Critical path that must never break
- Fast checks you want on every commit

### When to add to Tier 2 (Browserbase)

- Complex user journeys
- Multi-step interactions
- Features with dynamic/variable content
- Cross-environment validation

### How to decide

1. Can you write it with stable ID selectors? -> Tier 1
2. Does it need to verify user experience? -> Tier 2
3. Does it need human judgment? -> Tier 3

---

## Integration with Development Workflow

```text
Developer workflow:
  Write code
    |
  npm test (Tier 1 - browserless)
    |
  Fix any failures
    |
  Commit & push
    |
  CI runs Tier 1 tests
    |
  Merge to dev
    |
  Before release:
    |
  Run ./tests/browserbase/run-tests.sh all (Tier 2)
    |
  Manual QA (Tier 3)
    |
  Merge to main
    |
  Deploy to production
```

**Key principle:** Fast feedback (Tier 1) catches most issues. Comprehensive validation (Tier 2 + 3) catches the rest before users see it.
