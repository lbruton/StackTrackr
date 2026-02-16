Save end-of-session notes to Memento: $ARGUMENTS

Follow the `session-management` skill for all rules, naming, and tag conventions.

## Steps

1. **Generate Session ID**: `STAKTRAKR-{THEME}-{YYYYMMDD}-{HHMMSS}` (UTC). Derive THEME from the session's primary focus, or use $ARGUMENTS if provided.

2. **Review chat history** and extract:
   - What was accomplished (3-5 bullet points)
   - Technical insights, patterns, or gotchas worth remembering
   - Decisions made and their rationale
   - Key files modified
   - Linear issues worked on

3. **Create Memento entity**:
   - Name: `Session: {SESSION_ID}`
   - entityType: `STAKTRAKR:DEVELOPMENT:SESSION`
   - Observations: TIMESTAMP, ABSTRACT, SESSION_ID, VERSION, BRANCH, SUMMARY, INSIGHTS, DECISIONS, FILES_MODIFIED, LINEAR_ISSUES
   - Tags: project:staktrakr, session, {category}, {YYYY-MM}

4. **Output**:
```
Session saved: {SESSION_ID}
  - {ABSTRACT}
  - {N} insights captured
  - Recall with: /recall-session
```
