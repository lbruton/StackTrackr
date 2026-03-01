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

    expect(distances).toEqual({ apple: 0, eagle: 0, empty: 0 });
  });

  test('Single character differences (substitution)', async ({ page }) => {
    const distances = await page.evaluate(() => {
      return {
        apply: calculateLevenshteinDistance('apple', 'apply'),
        sitten: calculateLevenshteinDistance('kitten', 'sitten')
      };
    });

    expect(distances).toEqual({ apply: 1, sitten: 1 });
  });

  test('Single character differences (insertion/deletion)', async ({ page }) => {
    const distances = await page.evaluate(() => {
      return {
        apples: calculateLevenshteinDistance('apple', 'apples'),
        apple: calculateLevenshteinDistance('apples', 'apple'),
        siver: calculateLevenshteinDistance('silver', 'siver')
      };
    });

    expect(distances).toEqual({ apples: 1, apple: 1, siver: 1 });
  });

  test('Multiple edits', async ({ page }) => {
    const distances = await page.evaluate(() => {
      return {
        sitting: calculateLevenshteinDistance('kitten', 'sitting'), // 3 edits
        rosetta: calculateLevenshteinDistance('rosettacode', 'raisethysword'), // 8 edits
        sunday: calculateLevenshteinDistance('sunday', 'saturday') // 3 edits
      };
    });

    expect(distances).toEqual({ sitting: 3, rosetta: 8, sunday: 3 });
  });

  test('Empty strings', async ({ page }) => {
    const distances = await page.evaluate(() => {
      return {
        hello: calculateLevenshteinDistance('', 'hello'),
        world: calculateLevenshteinDistance('world', '')
      };
    });

    expect(distances).toEqual({ hello: 5, world: 5 });
  });

  test('Case sensitivity', async ({ page }) => {
    const distances = await page.evaluate(() => {
      return {
        apple: calculateLevenshteinDistance('Apple', 'apple'),
        silver: calculateLevenshteinDistance('SILVER', 'silver')
      };
    });

    expect(distances).toEqual({ apple: 1, silver: 6 });
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

    expect(distances).toEqual({ null1: 4, undef: 4, num: 3, null2: 0 });
  });
});
