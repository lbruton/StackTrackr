Recall a specific development handoff by ID: $ARGUMENTS

**Action**: Retrieve and display a previously saved development handoff with all session details and continuation context.

**Usage Patterns:**
```bash
/recall-handoff id:STAKTRAKR-HANDOFF-20251001-143045    # Full handoff ID with timestamp
/recall-handoff id:12                                   # Shorthand ID lookup
/recall-handoff recent                                  # Most recent handoff
/recall-handoff date:2025-09-07                         # Handoffs from specific date
```

**Memory Tools:**
```javascript
// Primary recall by handoff ID (use search_nodes for exact ID)
mcp__memento__search_nodes({
  query: "HANDOFF_ID: ${handoffId}"  // Exact ID match
})

// Fallback: Semantic search for handoff content
mcp__memento__semantic_search({
  query: "handoff ${keyword} PROJECT:DEVELOPMENT:HANDOFF",
  limit: 5,
  min_similarity: 0.6,
  hybrid_search: true    // Hybrid for mixed ID/concept search
})

// Get detailed handoff entity
mcp__memento__open_nodes({
  names: ["Found Handoff Entity Name"]
})

// Check for JSON file if needed
// Look for .claude/.handoff/[HANDOFF_ID].json
```

**Search Strategies:**
1. **Direct ID Match**: Search for exact handoff ID in observations
2. **Tag-Based Search**: Use tags for precise filtering (spec:XXX, in-progress, blocked)
3. **Recent Lookup**: Find most recent DEVELOPMENT:HANDOFF entity
4. **Date Filter**: Search handoffs from specific time period
5. **Project Filter**: Filter by project classification

**Tag-Based Search Examples (optimal search method):**
- `"handoff spec:001"` - All handoffs for specification 001 (search_nodes - exact tag)
- `"handoff blocked"` - Handoffs with blocking issues (search_nodes - exact tag)
- `"handoff project:staktrakr in-progress"` - Active StakTrakr handoffs (search_nodes - tags)
- `"handoff week-38-2025"` - This week's handoffs (search_nodes - temporal tag)
- `"backend architecture decisions"` - Backend design handoffs (semantic_search - concepts)

**Tag Reference**: See `/home/lbruton/StackrTrackr/TAXONOMY.md`

**Output Format:**
```
📋 Development Handoff Details:

🆔 Handoff ID: [HANDOFF_ID]
📅 Created: [DATE_TIME]
🎯 Project: [PROJECT_NAME]
📄 Context: [SESSION_CONTEXT]

📂 Active Files:
  - [file1:line] - [description]
  - [file2:line] - [description]

✅ Key Decisions Made:
  - [decision 1]
  - [decision 2]

⏭️ Next Steps:
  - [step 1]
  - [step 2]

🔧 Tools Used: [tool1, tool2, tool3]

💡 Notes: [Additional context and important details]

📁 JSON File: .claude/.handoff/[HANDOFF_ID].json (if available)
```

**Continuation Workflow:**
After displaying handoff details:
1. **Set Context**: Use handoff info to understand current state
2. **Resume Tasks**: Continue with identified next steps
3. **Validate State**: Confirm active files and decisions are still current
4. **Update Progress**: Use /save-handoff to create new handoff when appropriate

**Instructions**: Parse $ARGUMENTS for handoff ID or search criteria. Search memory for matching handoff entity. Display structured summary with all session details for seamless continuation.

Now search for and retrieve the requested handoff details.