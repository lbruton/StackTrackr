import { test, expect } from '@playwright/test';
import { dismissAckModal } from './test-utils.js';

test.describe('Levenshtein Distance Calculation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app to get the browser context with the function loaded
    await page.goto('/');
    await dismissAckModal(page);
  });

  test('Exact matches should return distance 0', async ({ page }) => {
    const distances = await page.evaluate(() => {
      return {
        apple: calculateLevenshteinDistance('apple', 'apple'),
        eagle: calculateLevenshteinDistance('American Silver Eagle', 'American Silver Eagle'),
        empty: calculateLevenshteinDistance('', '')
      };
    });

    expect(distances.apple).toBe(0);
    expect(distances.eagle).toBe(0);
    expect(distances.empty).toBe(0);
  });

  test('Single character differences (substitution)', async ({ page }) => {
    const distances = await page.evaluate(() => {
      return {
        apply: calculateLevenshteinDistance('apple', 'apply'),
        sitten: calculateLevenshteinDistance('kitten', 'sitten')
      };
    });

    expect(distances.apply).toBe(1);
    expect(distances.sitten).toBe(1);
  });

  test('Single character differences (insertion/deletion)', async ({ page }) => {
    const distances = await page.evaluate(() => {
      return {
        apples: calculateLevenshteinDistance('apple', 'apples'),
        apple: calculateLevenshteinDistance('apples', 'apple'),
        siver: calculateLevenshteinDistance('silver', 'siver')
      };
    });

    expect(distances.apples).toBe(1);
    expect(distances.apple).toBe(1);
    expect(distances.siver).toBe(1);
  });

  test('Multiple edits', async ({ page }) => {
    const distances = await page.evaluate(() => {
      return {
        sitting: calculateLevenshteinDistance('kitten', 'sitting'), // 3 edits
        rosetta: calculateLevenshteinDistance('rosettacode', 'raisethysword'), // 8 edits
        sunday: calculateLevenshteinDistance('sunday', 'saturday') // 3 edits
      };
    });

    expect(distances.sitting).toBe(3);
    expect(distances.rosetta).toBe(8);
    expect(distances.sunday).toBe(3);
  });

  test('Empty strings', async ({ page }) => {
    const distances = await page.evaluate(() => {
      return {
        hello: calculateLevenshteinDistance('', 'hello'),
        world: calculateLevenshteinDistance('world', '')
      };
    });

    expect(distances.hello).toBe(5);
    expect(distances.world).toBe(5);
  });

  test('Case sensitivity', async ({ page }) => {
    const distances = await page.evaluate(() => {
      return {
        apple: calculateLevenshteinDistance('Apple', 'apple'),
        silver: calculateLevenshteinDistance('SILVER', 'silver')
      };
    });

    expect(distances.apple).toBe(1);
    expect(distances.silver).toBe(6);
  });

  test('Non-string inputs', async ({ page }) => {
    const distances = await page.evaluate(() => {
      // The function casts input with 'typeof str === "string" ? str : ""'
      return {
        null1: calculateLevenshteinDistance(null, 'test'),
        undef: calculateLevenshteinDistance('test', undefined),
        num: calculateLevenshteinDistance(123, '123'), // 123 becomes "" so distance to "123" is 3
        null2: calculateLevenshteinDistance(null, undefined)
      };
    });

    expect(distances.null1).toBe(4);
    expect(distances.undef).toBe(4);
    expect(distances.num).toBe(3);
    expect(distances.null2).toBe(0);
  });
});
