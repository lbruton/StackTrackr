import { test, expect } from '@playwright/test';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { fuzzyMatch } = require('../js/fuzzy-search.js');

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
