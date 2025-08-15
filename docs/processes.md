# StackTrackr Processes

This document outlines the key processes and workflows for the StackTrackr project, ensuring consistency, efficiency, and resilience across all operations.

## Memory Management

### Primary Source of Truth
- The `local_memory.json` file serves as the primary source of truth for:
  - Tasks
  - Bugs
  - Glossary entries
  - Message history (last 10 messages between the user and agents).
- The `json_memory_sync.py` script ensures synchronization with MCP memory if available, providing faster performance when possible.

### Message History
- The last 10 messages exchanged between the user and any agent are stored in memory to maintain context continuity during interactions.

### Technical Glossary
- The glossary is a centralized repository for all functions, variables, and schemas from the codebase.
- Each entry includes a schema, a summary, and its purpose.
- New additions to the codebase must be documented in the glossary.

### Bug Tracking
- Bugs are documented in `local_memory.json` using the `bug_resolution_template.md` as a guide.
- Agents consult memory to identify recurring issues and leverage past resolutions.

## Codebase Integration

### Functionality Documentation
- Functions and variables from the codebase are documented in the glossary with schemas and summaries.
- This ensures that new additions to the codebase are consistently tracked.

### Synchronization
- The `json_memory_sync.py` script handles synchronization between the JSON file and MCP memory, ensuring data consistency across devices and sessions.

## Agent Workflow

### Task Management
- Tasks are committed to memory before starting and after completing them, ensuring continuity across agents.
- The roadmap and memory are synchronized to maintain alignment.

### Bug Resolution
- Agents consult memory to identify recurring issues and leverage past resolutions.

### Documentation Standards
- Agents follow the `/docs/markup_style_guide.md` and `/docs/style_guide.md` for consistent documentation.

## Opportunities for Improvement

### Automation
- Automate the addition of new functions and variables to the glossary during development.
- Implement automated testing to validate memory synchronization.

### Enhanced Reporting
- Add reporting capabilities to track memory usage, task completion, and bug resolution trends.

### Collaboration
- Integrate with external tools (e.g., Jira, Trello) for enhanced task and bug tracking.

---

This document will be updated as processes evolve to ensure alignment with project goals and best practices.
