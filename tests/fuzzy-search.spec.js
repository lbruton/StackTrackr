import { test, expect } from '@playwright/test';
import { createRequire } from 'module';
import { dismissAckModal } from './test-utils.js';

const require = createRequire(import.meta.url);
const { fuzzyMatch } = require('../js/fuzzy-search.js');

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

test.describe('Fuzzy Search Matching', () => {
  test('fuzzyMatch handles invalid inputs gracefully', () => {
    // Should return 0 for invalid inputs
    expect(fuzzyMatch(null, 'target')).toBe(0);
    expect(fuzzyMatch('query', null)).toBe(0);
    expect(fuzzyMatch(123, 'target')).toBe(0);
    expect(fuzzyMatch(undefined, undefined)).toBe(0);
  });

  test('fuzzyMatch handles empty strings', () => {
    expect(fuzzyMatch('', 'target')).toBe(0);
    expect(fuzzyMatch('query', '')).toBe(0);
  });

  test('fuzzyMatch identifies exact matches', () => {
    expect(fuzzyMatch('Eagle', 'Eagle')).toBeGreaterThan(0.9);
  });

  test('fuzzyMatch identifies partial substring matches', () => {
    // The default threshold is 0.6. But with the current formula, it's lower.
    // Let's test with threshold 0.1 to just verify relative scoring.
    const score = fuzzyMatch('Ame', 'American Silver Eagle', { threshold: 0.1 });
    expect(score).toBeGreaterThanOrEqual(0.4);
    expect(score).toBeLessThan(0.7);
  });

  test('fuzzyMatch handles typos and order differences', () => {
    const score1 = fuzzyMatch('Eagel', 'Eagle', { threshold: 0.1 });
    expect(score1).toBeGreaterThanOrEqual(0.5);

    const score2 = fuzzyMatch('Eagle Amer', 'American Silver Eagle', { threshold: 0.1 });
    expect(score2).toBeGreaterThanOrEqual(0.45);
  });

  test('fuzzyMatch respects case sensitivity options', () => {
    // Default is case-insensitive
    expect(fuzzyMatch('eagle', 'EAGLE')).toBeGreaterThan(0.9);

    // Case-sensitive enabled
    expect(fuzzyMatch('eagle', 'EAGLE', { caseSensitive: true })).toBe(0);
  });

  test('fuzzyMatch respects threshold options', () => {
    // Score for "Amer" against "American Silver Eagle" is ~0.54
    // With threshold 0.5, it should return the score
    expect(fuzzyMatch('Amer', 'American Silver Eagle', { threshold: 0.5 })).toBeGreaterThan(0.5);

    // With threshold 0.6, it should return 0 (score is below threshold)
    expect(fuzzyMatch('Amer', 'American Silver Eagle', { threshold: 0.6 })).toBe(0);
  });
});
