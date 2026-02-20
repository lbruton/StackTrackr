import { test, expect } from '@playwright/test';

const setup = async (page) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const ackModal = page.locator('#ackModal');
  if (await ackModal.isVisible()) {
    await page.locator('#ackAcceptBtn').click();
    await expect(ackModal).not.toBeVisible();
  }
};

test.describe('UI State Checks', () => {
  test.beforeEach(async ({ page }) => {
    await setup(page);
  });

  test('Spot price cards show dollar values for all 4 metals', async ({ page }) => {
    for (const metal of ['Silver', 'Gold', 'Platinum', 'Palladium']) {
      const display = page.locator(`#spotPriceDisplay${metal}`);
      // spot-history-bundle.js populates these from seed data on init
      await expect(display).toContainText('$', { timeout: 5000 });
    }
  });

  test('Summary section shows 5 metal total cards', async ({ page }) => {
    await expect(page.locator('.total-card')).toHaveCount(5);
    await expect(page.locator('.total-card.silver')).toBeVisible();
    await expect(page.locator('.total-card.total-card-all')).toBeVisible();
  });

  test('Seed inventory loads 8 items on fresh start', async ({ page }) => {
    await expect(page.locator('article')).toHaveCount(8);
  });

  test('Filter chips narrow and restore inventory', async ({ page }) => {
    // Chips render inside #activeFilters after inventory loads
    const goldChip = page.locator('#activeFilters .filter-chip', { hasText: 'Gold' }).first();
    await expect(goldChip).toBeVisible({ timeout: 5000 });
    await goldChip.click();

    const filteredCount = await page.locator('article').count();
    expect(filteredCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThan(8);

    // Clear All appears in #activeFilters when filters are active
    await page.locator('.filter-clear-btn').click();
    await expect(page.locator('article')).toHaveCount(8);
  });

  test('Search narrows results and clears', async ({ page }) => {
    await page.fill('#searchInput', 'silver');
    await page.waitForTimeout(400); // debounce
    const searchedCount = await page.locator('article').count();
    expect(searchedCount).toBeGreaterThan(0);
    expect(searchedCount).toBeLessThan(8);

    await page.locator('#clearBtn').click();
    await expect(page.locator('article')).toHaveCount(8);
  });

  test('Card view styles B, C, D all render without crash', async ({ page }) => {
    for (const style of ['B', 'C', 'D']) {
      await page.locator(`button[data-style="${style}"]`).first().click();
      if (style === 'D') {
        await expect(page.locator('#inventoryTable')).toBeVisible();
      } else {
        await expect(page.locator('article').first()).toBeVisible();
      }
    }
    // Restore default (A)
    await page.locator('button[data-style="A"]').first().click();
  });

  test('Activity log shows entries after adding an item', async ({ page }) => {
    await page.locator('#newItemBtn').click();
    await page.fill('#itemModal #itemName', 'Log Check Item');
    await page.fill('#itemQty', '1');
    await page.fill('#itemWeight', '1');
    await page.locator('#itemModalSubmit').click();

    // #changeLogBtn opens the Settings modal at the changelog tab
    await page.locator('#changeLogBtn').click();
    await expect(page.locator('#settingsModal')).toBeVisible();
    const rows = page.locator('#settingsChangeLogTable tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 3000 });
    expect(await rows.count()).toBeGreaterThan(0);

    await page.keyboard.press('Escape');
    await expect(page.locator('#settingsModal')).not.toBeVisible();
  });
});

// =============================================================================
// STAK-222: API Pipeline UI checks
// =============================================================================

const dismissAck = async (page) => {
  const ackModal = page.locator('#ackModal');
  if (await ackModal.isVisible()) {
    await page.locator('#ackAcceptBtn').click();
    await expect(ackModal).not.toBeVisible();
  }
};

test('STAK-222: auto-refresh toggle renders for STAKTRAKR provider', async ({ page }) => {
  await page.goto('/');
  await dismissAck(page);
  await page.locator('#settingsBtn').click();
  // Navigate to API section then click STAKTRAKR provider tab
  await page.locator('.settings-nav-item[data-section="api"]').click();
  await page.locator('.settings-provider-tab[data-provider="STAKTRAKR"]').click();
  const toggle = page.locator('#autoRefresh_STAKTRAKR');
  await expect(toggle).toBeVisible();
  // StakTrakr defaults to checked
  await expect(toggle).toBeChecked();
});

test('STAK-222: Numista cache stat row and clear button render', async ({ page }) => {
  await page.goto('/');
  await dismissAck(page);
  await page.locator('#settingsBtn').click();
  await page.locator('.settings-nav-item[data-section="api"]').click();
  // Stat row
  const statRow = page.locator('#numistaResponseCacheStat');
  await expect(statRow).toBeVisible();
  // Clear button
  const clearBtn = page.locator('#clearNumistaCacheBtn');
  await expect(clearBtn).toBeVisible();
});

test('STAK-222: cached entries show muted badge in history log', async ({ page }) => {
  await page.goto('/');
  await dismissAck(page);
  // Inject a cached entry into spotHistory
  await page.evaluate(() => {
    window.spotHistory.push({
      spot: 32.00,
      metal: 'Silver',
      source: 'cached',
      provider: 'StakTrakr',
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
    });
  });
  await page.locator('#settingsBtn').click();
  await page.locator('.settings-nav-item[data-section="api"]').click();
  // The history table should contain a "Cached" badge
  const cachedBadge = page.locator('.api-history-cached-badge').first();
  await expect(cachedBadge).toBeVisible();
});
