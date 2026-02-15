# Save Rewind - Lightweight Session Bookmark

**Purpose**: Create minimal checkpoint for same-session work continuation via chat rewind. Optimized for token efficiency when working on the same issue across multiple rewinds.

**Usage**: `/save-rewind [optional: brief note]`

---

## Execution Steps

### Step 1: Generate Rewind ID

```javascript
// Auto-generate rewind ID: PROJECT-REWIND-YYYYMMDD-HHMMSS
const generateRewindID = (project = "STAKTRAKR") => {
  const now = new Date();

  // Use UTC for consistency
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const hours = String(now.getUTCHours()).padStart(2, '0');
  const minutes = String(now.getUTCMinutes()).padStart(2, '0');
  const seconds = String(now.getUTCSeconds()).padStart(2, '0');

  return `${project}-REWIND-${year}${month}${day}-${hours}${minutes}${seconds}`;
};
```

### Step 2: Create Minimal Memento Entity

```javascript
// Lightweight structure - only 5 core observations
mcp__memento__create_entities([{
  name: "Rewind: [GENERATED_REWIND_ID]",
  entityType: "STAKTRAKR:SESSION:REWIND",
  observations: [
    `TIMESTAMP: ${new Date().toISOString()}`,
    `ABSTRACT: [One sentence - what was just accomplished]`,
    `NEXT: [Single immediate next action]`,
    `FILES: [Modified files with line ranges, e.g., "controller.js:161-174"]`,
    `COMMIT: [Commit hash if changes committed, or "uncommitted" if in progress]`,
    `REWIND_ID: [GENERATED_REWIND_ID]`,
    `LINEAR: [Active Linear issue ID, e.g., "STACK-101"]`,
    `BRANCH: [Current git branch name]`
  ]
}])
```

### Step 3: Add Minimal Tags

```javascript
// Essential tags only - keep it light
mcp__memento__add_observations({
  observations: [{
    entityName: "Rewind: [GENERATED_REWIND_ID]",
    contents: [
      "TAG: project:staktrakr",
      "TAG: rewind",
      "TAG: spec:[LINEAR_ISSUE]",
      `TAG: week-${getWeekNumber()}-${new Date().getFullYear()}`
    ]
  }]
})
```

### Step 4: Display Rewind Summary

```
✅ Rewind checkpoint saved!

📋 Rewind ID: [GENERATED_REWIND_ID]
🔄 Use: /recall-rewind to show last rewind
📁 Memento: Searchable via semantic search

💡 Next steps:
   1. Rewind chat to post-prime checkpoint
   2. Run /recall-rewind
   3. Continue exactly where you left off

Token cost: ~5k (vs. ~30k for full handoff)
```

---

## When to Use `/save-rewind` vs. `/save-handoff`

**Use `/save-rewind` for:**
- ✅ Same session, multiple chat rewinds
- ✅ Working on same Linear issue continuously
- ✅ Quick progress bookmarks
- ✅ Token efficiency priority

**Use `/save-handoff` for:**
- ❌ End of work day
- ❌ Switching between Claude instances
- ❌ Complex context preservation
- ❌ Cross-session work

---

## Implementation

Execute the rewind save process with minimal overhead. Store only essential continuation context.
