Extract and save high-value insights to Memento with PROJECT:DOMAIN:TYPE classification: $ARGUMENTS

**Action**: Create a selective Memento entity focusing on the most valuable technical and workflow discoveries from current session.

**Target Insights:**
- Technical patterns and architectural decisions
- Workflow optimizations and process improvements  
- Code quality discoveries and best practices
- Tool configurations and integration patterns
- Performance optimizations and debugging techniques
- Security considerations and implementation approaches

**Entity Details:**
- **Classification**: Use PROJECT:DOMAIN:TYPE (e.g., SYSTEM:WORKFLOW:PATTERN, STACKTRACKR:PRICING:INSIGHT)
- **Name**: Specific, searchable title describing the core insight
- **Observations**: Concrete, actionable knowledge applicable to future projects
- **Relations**: Connect to relevant technologies, frameworks, or project patterns

**Insight ID Generation:**
```javascript
// Auto-generate insight ID: PROJECT-INSIGHT-YYYYMMDD-HHMMSS
const generateInsightID = (project = "STACKTRACKR") => {
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

  return `${project}-INSIGHT-${date}-${time}`;
};

// Example: "STACKTRACKR-INSIGHT-20251001-143045"
```

**Memory Tools:**
```javascript
// Step 1: Create the insight entity
mcp__memento__create_entities([{
  name: "Insight: [GENERATED_INSIGHT_ID]",
  entityType: "PROJECT:DOMAIN:TYPE",
  observations: [
    `TIMESTAMP: ${new Date().toISOString()}`,                    // ALWAYS FIRST
    `ABSTRACT: [One-line summary of the key insight]`,          // ALWAYS SECOND
    `SUMMARY: [Detailed description: what was discovered, why it matters, how to implement, and when to apply this knowledge]`, // ALWAYS THIRD
    "INSIGHT_ID: [GENERATED_INSIGHT_ID]",
    "actionable knowledge",
    "implementation details",
    "best practices"
  ]
}])

// Step 2: Add insight-specific tags per TAXONOMY.md (using add_observations with TAG: prefix)
mcp__memento__add_observations({
  observations: [{
    entityName: "Insight: [GENERATED_INSIGHT_ID]",
    contents: [
      "TAG: project:[PROJECT_NAME]",        // Required: Can be multiple for cross-project insights
      "TAG: spec:[SPEC_NUMBER]",            // If insight emerged from spec work
      "TAG: [CATEGORY]",                    // Domain: frontend, backend, testing, etc.
      "TAG: [LEARNING_TYPE]",               // Required: breakthrough, pattern, lesson-learned, best-practice
      "TAG: reusable",                      // Add if applicable across projects
      "TAG: [QUALITY_TAG]",                 // Optional: tech-debt, optimization, refactor
      `TAG: week-${getWeekNumber()}-${new Date().getFullYear()}`,  // Temporal tag
      "TAG: [IMPACT]"                       // Optional: performance, security-fix, etc.
    ]
  }]
})

// Step 3: Create relations if derived from other work
mcp__memento__create_relations([{
  from: "Insight: [GENERATED_INSIGHT_ID]",
  to: "Related Entity",
  relationType: "IMPLEMENTS" // or DEPENDS_ON, SOLVES, etc.
}])

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

**Selection Criteria**: Save only insights with broad applicability or significant project impact. Avoid session-specific details - focus on reusable knowledge.

**Instructions**:
1. **Generate Insight ID**: Create unique ID using PROJECT-INSIGHT-DATE-TIME format
2. **Extract Key Insight**: Identify the most valuable reusable knowledge from the session
3. **Apply Classification**: Use appropriate PROJECT:DOMAIN:TYPE entity type
4. **Include Insight ID**: Add insight ID as observation for easy recall
5. **Return Insight ID**: Display generated insight ID to user after saving

**Output After Saving:**
```
✅ Insight saved successfully!
📋 Insight ID: [GENERATED_INSIGHT_ID]
🔍 Use: /recall-insight id:[INSIGHT_ID] to retrieve this insight
```

If $ARGUMENTS provided, use as insight category or specific focus area. Create entity capturing the gems worth preserving for future development work.

Now identify and save the key insights from this session using proper classification.