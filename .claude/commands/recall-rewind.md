# Recall Rewind - Load Last Session Checkpoint

**Purpose**: Retrieve the most recent rewind checkpoint after chat rollback. Displays minimal context needed to continue work seamlessly.

**Usage**: `/recall-rewind [optional: specific rewind ID]`

---

## Execution Steps

### Step 1: Search for Recent Rewind

```javascript
// If no ID provided, find most recent rewind from today
mcp__memento__semantic_search({
  query: `HEXTRACKR REWIND week-${getWeekNumber()}-${new Date().getFullYear()}`,
  limit: 5,
  min_similarity: 0.5,
  hybrid_search: true
})

// Helper for week number
const getWeekNumber = () => {
  const d = new Date();
  const onejan = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
};
```

### Step 2: Display Rewind Context

```
🔄 Most Recent Rewind Checkpoint
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Rewind ID: [REWIND_ID]
⏰ Created: [TIMESTAMP]

✅ Completed:
[ABSTRACT - what was accomplished]

🎯 Next Action:
[NEXT - immediate next step]

📁 Modified Files:
[FILES - with line ranges]

💾 Git Status:
Branch: [BRANCH]
Commit: [COMMIT or "uncommitted"]

🔗 Linear: [LINEAR_ISSUE]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 3: Verify Context Freshness

```javascript
// Check if rewind is from today
const rewindDate = new Date(rewind.timestamp);
const now = new Date();
const hoursSince = (now - rewindDate) / (1000 * 60 * 60);

if (hoursSince > 24) {
  console.warn(`⚠️  Warning: Rewind is ${Math.round(hoursSince)} hours old`);
  console.log(`Consider using /recall-handoff for older context`);
}
```

### Step 4: Optional - Show Multiple Rewinds

```
📚 Recent Rewinds (if multiple found):

1. [REWIND_ID_1] - [TIME] ago - [ABSTRACT]
2. [REWIND_ID_2] - [TIME] ago - [ABSTRACT]
3. [REWIND_ID_3] - [TIME] ago - [ABSTRACT]

Use /recall-rewind id:[REWIND_ID] to load specific checkpoint
```

---

## Search Strategy

If no rewind found with semantic search, try:

1. **Today's rewinds**: Search for `week-${currentWeek}-${year} rewind`
2. **Yesterday's rewinds**: Search for `week-${currentWeek}-${year} rewind` with expanded time range
3. **By Linear issue**: Search for `spec:[ISSUE] rewind`
4. **Fallback**: List all rewinds and let user choose

---

## Smart Context Display

Based on what's found in the rewind entity:

**If COMMIT exists:**
- Show commit hash with link to view: `git show [hash]`
- Indicate files are committed and safe

**If COMMIT = "uncommitted":**
- Warn: "⚠️  Changes uncommitted - verify working tree"
- Suggest: `git status` to check current state

**If FILES has line numbers:**
- Display as clickable references: `controller.js:161-174`
- Enable quick navigation to exact locations

**If NEXT has multiple steps:**
- Parse and display as checklist
- Ready for immediate /todo creation if needed

---

## Implementation

Execute semantic search for most recent rewind, display minimal context, verify freshness, and provide immediate next action.
