const { fuzzySearch } = require('../js/fuzzy-search');

// Sample inventory data
const inventory = [
  "2024 American Silver Eagle",
  "2024 American Gold Eagle 1 oz",
  "2024 American Platinum Eagle 1 oz",
  "2023 Canada Maple Leaf",
  "2023 Australia Kangaroo",
  "2024 Germania Round",
  "2023 Lunar Dragon Bar",
  "2022 Fiji Coca-Cola Bottle Cap",
];

// Test cases
const testCases = [
  { query: "Eagle", expected: ["2024 American Silver Eagle", "2024 American Gold Eagle 1 oz", "2024 American Platinum Eagle 1 oz"] },
  { query: "Silver Eagle", expected: ["2024 American Silver Eagle"] },
  { query: "Gold Eagle", expected: ["2024 American Gold Eagle 1 oz"] },
  { query: "Platinum Eagle", expected: ["2024 American Platinum Eagle 1 oz"] },
];

// Run tests
console.log("Running fuzzy search tests...");
testCases.forEach(({ query, expected }, index) => {
  const results = fuzzySearch(query, inventory, { threshold: 0.5 });
  const matched = results.map(r => r.text);
  console.log(`Test ${index + 1}: Query = "${query}"`);
  console.log("Expected:", expected);
  console.log("Matched:", matched);
  console.log("Pass:", JSON.stringify(matched) === JSON.stringify(expected));
});
