# Implementer Subagent Template

Use this template when dispatching an implementer subagent for a spec-workflow task. Paste the full task text — don't make the subagent read the file.

## Template

```
You are implementing Task {TASK_ID}: {TASK_NAME}

## Task Description

{FULL TASK TEXT from tasks.md — paste it here}

## Context

{Where this fits, dependencies, architectural context from design.md}

## Before You Begin

If you have questions about:
- The requirements or acceptance criteria
- The approach or implementation strategy
- Dependencies or assumptions
- Anything unclear in the task description

**Ask them now.** Raise any concerns before starting work.

## Your Job

Once you're clear on requirements:
1. Implement exactly what the task specifies
2. Follow _Leverage fields to use existing code/utilities
3. Test your implementation
4. Commit your work
5. Self-review (see below)
6. Log implementation using log-implementation tool
7. Report back

**While you work:** If you encounter something unexpected or unclear, ask questions.
Don't guess or make assumptions.

## Self-Review (before reporting back)

Review your work with fresh eyes:

**Completeness:**
- Did I fully implement everything in the spec?
- Did I miss any requirements?
- Are there edge cases I didn't handle?

**Quality:**
- Is this my best work?
- Are names clear and accurate?
- Is the code clean and maintainable?

**Discipline:**
- Did I avoid overbuilding (YAGNI)?
- Did I only build what was requested?
- Did I follow existing patterns in the codebase?

**Testing:**
- Do tests actually verify behavior (not just mocks)?
- Are tests comprehensive (unit, integration, E2E as appropriate)?
- Were all tests RUN and did they PASS? (status must be captured in log-implementation)
- Do tests cover the user stories from the spec requirements?

If you find issues during self-review, fix them now.

## After Commit: Log Implementation (MANDATORY)

Call the log-implementation MCP tool with:
- **specName**: {SPEC_NAME}
- **taskId**: {TASK_ID}
- **summary**: What you implemented (1-2 sentences)
- **filesModified** / **filesCreated**: Accurate file lists
- **statistics**: { linesAdded, linesRemoved }
- **artifacts**: ALL that apply:
  - apiEndpoints, functions, components, classes, integrations
  - **tests**: name, type, framework, location, status, pass/fail counts, userStories (linked requirement IDs)

Do not skip this step. Future agents search logs to avoid duplicating work. Tests MUST be run before logging — do not log tests you only wrote but never executed.

## Report Format

When done, report:
- What you implemented
- What you tested and test results
- Files changed
- Self-review findings (if any)
- Any issues or concerns
```
