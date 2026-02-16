Create a development handoff package in Memento: $ARGUMENTS

Follow the `session-management` skill for all rules, naming, and tag conventions.

A handoff is a **superset of a session save** — use it when handing off to a different Claude instance, ending a long break, or when the next session needs rich context to continue. If you're just wrapping up a normal session, use `/save-session` instead.

## Steps

1. **Generate Handoff ID**: `STAKTRAKR-{THEME}-{YYYYMMDD}-{HHMMSS}` (UTC). Derive THEME from the work focus, or use $ARGUMENTS if provided.

2. **Gather context** (parallel where possible):
   - `git log --oneline -5` — recent commits
   - `git status --short` — uncommitted work
   - `git branch --show-current` — current branch
   - Check Linear for In Progress / Todo issues
   - Review chat history for accomplishments, decisions, insights

3. **Create Memento entity**:
   - Name: `Handoff: {HANDOFF_ID}`
   - entityType: `STAKTRAKR:DEVELOPMENT:HANDOFF`
   - Observations (in order):
     - TIMESTAMP, ABSTRACT, HANDOFF_ID, VERSION, BRANCH
     - SUMMARY (what was accomplished, 3-5 bullets)
     - INSIGHTS (technical discoveries, gotchas)
     - DECISIONS (choices made and rationale)
     - FILES_MODIFIED (key files with brief descriptions)
     - NEXT_STEPS (specific, actionable — most critical field)
     - ACTIVE_LINEAR_PROJ (current project name)
     - LINEAR_PROJ_ISSUES (issues with status)
     - BLOCKERS (if any)
     - CONTEXT (state a fresh session needs to know)
   - Tags: project:staktrakr, handoff, {category}, {YYYY-MM}

4. **Output**:
```
Handoff saved: {HANDOFF_ID}
  - {ABSTRACT}
  - Next steps: {NEXT_STEPS summary}
  - Recall with: /recall-handoff
```
