# Inventory Search Algorithm Conflict Analysis Prompt

## Context
I have a precious metals inventory management application with a search filter system. I recently fixed an issue where searching "Silver Eagle" was incorrectly matching "American Gold Eagle" items, but I want to ensure there are no other similar conflicts in my dataset.

## Current Search Logic
The search algorithm works as follows:
1. **Exact phrase matching**: If the search term appears exactly in the item text, it matches
2. **Word boundary matching**: All search words must exist as complete words in the item
3. **Eagle-specific logic**: 
   - "American Eagle" only matches items without metals between "American" and "Eagle"
   - "Silver Eagle" only matches items containing the exact phrase "silver eagle"
   - "Gold Eagle" only matches items containing the exact phrase "gold eagle"

## Request
Please analyze my inventory data (attached JSON file) and identify:

### 1. Potential Search Conflicts
Look for cases where a search term might incorrectly match unintended items, such as:
- Cross-metal contamination (e.g., "Silver X" matching "Gold X" items)
- Partial name matches that should be more specific
- Common words that appear in multiple unrelated item types

### 2. Ambiguous Search Terms
Identify search terms that could legitimately match multiple different item types and suggest how to handle them:
- Generic terms that appear across different metals/types
- Abbreviated names that could match multiple full names
- Year or denomination conflicts

### 3. Missing Precision Rules
Suggest additional logic similar to the Eagle rules for other common patterns:
- Maple Leaf coins (Canadian vs other)
- Britannia coins (British vs other)
- Krugerrand variations
- Bar vs Coin vs Round distinctions

### 4. Edge Cases
Find unusual item names or patterns that might break the current logic:
- Items with special characters or formatting
- Very long or very short names
- Items with similar but not identical naming patterns

## Data Analysis Tasks

1. **Extract all unique 2-word and 3-word combinations** from item names
2. **Test each combination** against all items to find false positives
3. **Group similar items** to identify naming patterns that need special handling
4. **Create a conflict matrix** showing which search terms incorrectly match which items

## Output Format
Please provide:

```
## Search Conflict Analysis Results

### High Priority Conflicts (False Positives)
- Search: "term" → Incorrectly matches: [list of items that shouldn't match]

### Medium Priority Ambiguities
- Search: "term" → Could match multiple legitimate categories: [explanation]

### Suggested Additional Rules
- Pattern: [describe pattern] → Suggested logic: [specific rule]

### Recommended Test Cases
- [List of search terms that should be tested to ensure they work correctly]

### Data Quality Issues
- [Any item naming inconsistencies or issues found]
```

## Additional Context
My inventory contains primarily:
- American Eagles (Gold, Silver, Platinum, Palladium)
- Canadian Maple Leafs
- Australian coins (Kangaroo, Kookaburra, etc.)
- Bars and rounds from various mints
- Collectible and commemorative items

The search needs to be precise enough for collectors who know exactly what they're looking for, while still being flexible enough for casual browsing.
