import { test, expect } from '@playwright/test';

test.describe('_bucketWindows', () => {
  test('empty input returns empty array', async ({ page }) => {
    await page.goto('/');
    const result = await page.evaluate(() => window._bucketWindows([]));
    expect(result).toEqual([]);
  });

  test('buckets two windows in same 30-min slot to one entry (most recent wins)', async ({ page }) => {
    await page.goto('/');
    const result = await page.evaluate(() => window._bucketWindows([
      { window: '2026-02-22T14:10:00Z', median: 100, low: 99, vendors: {} },
      { window: '2026-02-22T14:25:00Z', median: 101, low: 100, vendors: {} },
    ]));
    expect(result.length).toBe(1);
    expect(result[0].window).toBe('2026-02-22T14:00:00.000Z');
    expect(result[0].median).toBe(101);
  });

  test('windows at :31 go into :30 bucket', async ({ page }) => {
    await page.goto('/');
    const result = await page.evaluate(() => window._bucketWindows([
      { window: '2026-02-22T14:31:00Z', median: 100, low: 99, vendors: {} },
    ]));
    expect(result.length).toBe(1);
    expect(result[0].window).toBe('2026-02-22T14:30:00.000Z');
  });

  test('windows across two slots produce two entries in chronological order', async ({ page }) => {
    await page.goto('/');
    const result = await page.evaluate(() => window._bucketWindows([
      { window: '2026-02-22T14:00:00Z', median: 100, low: 99, vendors: {} },
      { window: '2026-02-22T14:30:00Z', median: 102, low: 101, vendors: {} },
    ]));
    expect(result.length).toBe(2);
    expect(result[0].window).toBe('2026-02-22T14:00:00.000Z');
    expect(result[1].window).toBe('2026-02-22T14:30:00.000Z');
  });
});
