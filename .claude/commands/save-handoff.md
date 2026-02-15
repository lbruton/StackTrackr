Create comprehensive handoff package with unique handoff ID: $ARGUMENTS

**Action**: Generate standardized handoff with session ID, searchable knowledge (Memento), and session state for seamless workflow transitions.

**Step 1: Generate Handoff ID**
```javascript
// Auto-generate handoff ID: PROJECT-HANDOFF-YYYYMMDD-HHMMSS
const generateHandoffID = (project = "STACKTRACKR") => {
  const now = new Date();

  // DATE VERIFICATION: Ensure we're using correct current date
  console.log(`Current UTC time: ${now.toISOString()}`);
  console.log(`Current local time: ${now.toString()}`);

  // Use UTC to ensure consistent timestamps
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const hours = String(now.getUTCHours()).padStart(2, '0');
  const minutes = String(now.getUTCMinutes()).padStart(2, '0');
  const seconds = String(now.getUTCSeconds()).padStart(2, '0');

  const date = `${year}${month}${day}`;
  const time = `${hours}${minutes}${seconds}`;

  // Verify the date is reasonable (not in far future or past)
  if (year < 2024 || year > 2026) {
    console.warn(`WARNING: Unusual year detected: ${year}. Please verify system date.`);
  }

  return `${project}-HANDOFF-${date}-${time}`;
};
// Example: "STACKTRACKR-HANDOFF-20251001-143045"
```

**Step 2: Save to Memento with ID**
```javascript
// Create the handoff entity
mcp__memento__create_entities([{
  name: "Handoff: [GENERATED_HANDOFF_ID]",
  entityType: "PROJECT:DEVELOPMENT:HANDOFF",
  observations: [
    `TIMESTAMP: ${new Date().toISOString()}`,                    // ALWAYS FIRST
    `ABSTRACT: [One-line summary of handoff context and purpose]`, // ALWAYS SECOND
    `SUMMARY: [Detailed handoff description: current task status, key decisions made, active work areas, next steps required, and any critical context for continuation]`, // ALWAYS THIRD
    "HANDOFF_ID: [GENERATED_HANDOFF_ID]",
    "Session context and current task status",
    "Key decisions made during session",
    "Next steps and outstanding tasks",
    "Active files and their current state"
  ]
}])

// Add handoff-specific tags per TAXONOMY.md (using add_observations with TAG: prefix)
mcp__memento__add_observations({
  observations: [{
    entityName: "Handoff: [GENERATED_HANDOFF_ID]",
    contents: [
      "TAG: project:[PROJECT_NAME]",        // Required: project:stacktrackr, project:zen, etc.
      "TAG: handoff",                       // Always include for handoffs
      "TAG: spec:[ACTIVE_SPEC]",           // Current spec being worked on
      "TAG: [CATEGORY]",                    // Work area: frontend, backend, database, etc.
      "TAG: in-progress",                   // Handoffs are typically for in-progress work
      `TAG: week-${getWeekNumber()}-${new Date().getFullYear()}`,  // Temporal tag
      "TAG: v[CURRENT_VERSION]",            // Current version
      "TAG: [BLOCKED_TAG]"                  // Optional: "blocked" if waiting on something
    ]
  }]
})

// Helper function for week number with date verification
const getWeekNumber = () => {
  const d = new Date();

  // DATE VERIFICATION
  const year = d.getFullYear();
  if (year < 2024 || year > 2026) {
    console.warn(`WARNING: Unusual year in week calculation: ${year}`);
  }

  const onejan = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil((((d.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);

  // Verify week number is reasonable (1-53)
  if (weekNum < 1 || weekNum > 53) {
    console.warn(`WARNING: Unusual week number calculated: ${weekNum}`);
  }

  return weekNum;
};
```

**Step 3: Create Local Handoff File (Optional)**
- Ensure `.claude/.handoff/` directory exists in project root
- Generate ID-based JSON file: `[HANDOFF_ID].json`
- Include session state data:
  - Handoff ID for cross-reference
  - Current task context and objectives
  - Active files and their locations (with line numbers if relevant)
  - Key decisions made during session
  - Next steps and outstanding tasks
  - Tool configurations and commands used
  - Any temporary state or work-in-progress details

**JSON Structure:**
```json
{
  "handoff_id": "STACKTRACKR-HANDOFF-20251001-143045",
  "timestamp": "2025-10-01T14:30:45Z",
  "project": "StackTrackr", 
  "session_context": "Brief description",
  "active_files": ["path:line", "path:line"],
  "key_decisions": ["decision 1", "decision 2"],
  "next_steps": ["step 1", "step 2"],
  "tools_used": ["tool1", "tool2"],
  "notes": "Additional context"
}
```

**Output After Creation:**
```
✅ Handoff package created successfully!
📋 Handoff ID: [GENERATED_HANDOFF_ID]
🔍 Use: /recall-handoff id:[HANDOFF_ID] to retrieve this handoff
📁 JSON file: .claude/.handoff/[HANDOFF_ID].json (if created)
```

**Instructions**: If $ARGUMENTS provided, use as handoff focus or recipient context. Generate handoff ID, create Memento entity with standardized format, and optionally create JSON file for detailed session state.

Now execute the standardized handoff creation process.