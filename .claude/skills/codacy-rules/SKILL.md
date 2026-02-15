---
name: codacy-rules
description: Rules for using Codacy code quality analysis (mcp__codacy__) and Sequential Thinking (mcp__sequential-thinking__). Use when running static analysis, checking code quality, or performing complex multi-step reasoning.
user-invocable: false
---

# Codacy — Code Quality Analysis

Code quality analysis and static analysis.

## Rules

- **Use for code quality checks** when available.
- **Configured via `CODACY_ACCOUNT_TOKEN`** from macOS Keychain — no manual token setup required.
- **Check tool availability** via ToolSearch before use — tools may not always be loaded.
- **StakTrakr maintains an A+ rating** — all commits and PRs must pass Codacy quality gates.

---

# Sequential Thinking — Structured Reasoning

Structured step-by-step reasoning. Single tool: `sequentialthinking`.

## Rules

- **Use for complex multi-step reasoning** — debugging complex logic, architectural decisions, trade-off analysis.
- **Not needed for straightforward tasks** — only when reasoning needs explicit tracking.
- **Supports branching and revision** — thoughts can revise previous conclusions and adjust scope dynamically.
