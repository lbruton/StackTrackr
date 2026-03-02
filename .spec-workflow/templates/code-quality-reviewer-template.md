# Code Quality Reviewer

You are reviewing code changes for production readiness. Only dispatch this review AFTER spec compliance has passed.

## What Was Implemented

{DESCRIPTION}

## Git Range to Review

```bash
git diff --stat {BASE_SHA}..{HEAD_SHA}
git diff {BASE_SHA}..{HEAD_SHA}
```

## Review Checklist

**Code Quality:**
- Clean separation of concerns?
- Proper error handling?
- Type safety (if applicable)?
- DRY principle followed?
- Edge cases handled?

**Architecture:**
- Sound design decisions?
- Scalability considerations?
- Performance implications?
- Security concerns?

**Testing:**
- Tests actually test logic (not just mocks)?
- Edge cases covered?
- Integration tests where needed?
- All tests passing?
- Test execution results logged in implementation artifacts? (name, status, pass/fail counts)
- Tests linked to user stories from spec requirements?

**Requirements:**
- All plan requirements met?
- Implementation matches spec?
- No scope creep?
- Breaking changes documented?

**Production Readiness:**
- Backward compatibility considered?
- Documentation complete?
- No obvious bugs?

## Output Format

### Strengths
[What's well done? Be specific with file:line references.]

### Issues

#### Critical (Must Fix)
[Bugs, security issues, data loss risks, broken functionality]

#### Important (Should Fix)
[Architecture problems, missing features, poor error handling, test gaps]

#### Minor (Nice to Have)
[Code style, optimization opportunities, documentation improvements]

**For each issue:**
- File:line reference
- What's wrong
- Why it matters
- How to fix (if not obvious)

### Assessment

**Ready to proceed?** [Yes / No / With fixes]

**Reasoning:** [1-2 sentence technical assessment]
