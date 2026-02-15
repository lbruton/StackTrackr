---
name: linear-workspace
description: Linear workspace structure, team IDs, issue routing rules, and label conventions for StakTrakr. Use when creating, updating, or querying Linear issues.
user-invocable: false
---

# Linear Workspace — StakTrakr

Reference guide for routing issues to the correct team, using the right labels, and avoiding unnecessary API calls.

## Teams

| Team | ID | Prefix | Visibility | Purpose |
|------|----|--------|------------|---------|
| **StakTrakr** | `f876864d-ff80-4231-ae6c-a8e5cb69aca4` | STAK- | Public | All user-facing features, bugs, and improvements |
| **Developers** | `38d57c9f-388c-41ec-9cd2-259a21a5df1c` | DEVS- | Private | Internal strategy, research, architecture notes, sensitive roadmap items |

**Always use the team ID directly** — never call `list_teams` to look it up. This avoids the "too much data" error and saves an API round-trip.

## Issue Routing Rules

### Goes on StakTrakr (public)

- User-facing features and enhancements
- Bug fixes
- UI/UX improvements
- Performance optimizations
- New module proposals (once ready to announce)
- Integration work (APIs, exports, imports)
- Documentation and changelog items

### Goes on Developers (private)

- Internal strategy and business planning
- Revenue model and subscription design
- Unannounced feature verticals (e.g., future asset modules)
- Security-sensitive architecture decisions
- Competitive analysis
- Anything the user explicitly asks to keep private
- Research spikes and prototyping notes

**When in doubt, ask the user** which team an issue should go on. Default to StakTrakr unless the content is sensitive or strategic.

## Labels

Use existing labels. Common ones:

| Label | When to use |
|-------|-------------|
| `Feature` | New functionality |
| `Improvement` | Enhancement to existing functionality |
| `Bug` | Something broken |

Do not create new labels without asking the user.

## Priority Scale

| Value | Name | When to use |
|-------|------|-------------|
| 1 | Urgent | Blocking users, data loss risk |
| 2 | High | Important, next sprint |
| 3 | Normal/Medium | Standard backlog item |
| 4 | Low | Nice-to-have, long-term |

## Issue States

| State | Meaning |
|-------|---------|
| Backlog | Planned but not scheduled |
| Todo | Queued for next sprint |
| In Progress | Actively being worked on |
| Done | Shipped and merged |
| Canceled | Won't do |

### State Transition Rules

- Set to **In Progress** when starting work on an issue
- **Do NOT mark Done until the PR is merged** and Codacy approved
- Linear-GitHub sync is active — marking Done auto-closes linked GitHub issues
- Do NOT manually close GitHub issues after updating Linear

## Common API Patterns

### Listing issues (avoid loading too much)

Always filter by team ID to avoid loading the entire workspace:

```
mcp__linear-server__list_issues
  team: "f876864d-ff80-4231-ae6c-a8e5cb69aca4"  # StakTrakr
  state: "In Progress"                            # Filter by state
  limit: 10                                       # Keep results small
```

### Creating issues

Always include:
- `team` (use ID, not name)
- `title`
- `description` (detailed markdown)
- `priority` (1-4)
- `labels` (array)
- `state` (usually "Backlog" for new issues)

### Reading a specific issue

Use the identifier directly:
```
mcp__linear-server__get_issue
  id: "STAK-73"
```

## Cross-References

- **ROADMAP.md** is the public quick-reference index — update it when creating/completing significant issues
- **Commit messages** reference STAK-XX identifiers
- **CHANGELOG.md** entries reference STAK-XX in parentheses
- **GitHub issues** are auto-synced — only create GitHub issues manually for public-facing bugs (use `gh issue create` with the `bug` label)

## Assignee

Default assignee for StakTrakr issues: **Lonnie B.** (ID: `ba9478fe-2f7b-4d51-9460-a2e2031e2ea8`). Only set assignee when explicitly asked.
