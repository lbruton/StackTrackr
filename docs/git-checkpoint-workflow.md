# Multi-Agent Git Checkpoint Workflow

This workflow ensures a safe rollback point before any agent or major change:

## Step 1: Create a Git Checkpoint
Before starting any agent-driven or major change, run:

    git add -A
    git commit -m "Checkpoint before [describe change or agent]"

## Step 2: Make Your Change
Proceed with the agent or manual change.

## Step 3: Commit the Change
If successful, commit with a descriptive message:

    git add -A
    git commit -m "[Describe change]"

## Step 4: Roll Back if Needed
If the change breaks anything, roll back to the previous checkpoint:

    git reset --hard HEAD~1

Or use VS Code Source Control panel to revert.

---

**Tip:**
- Always checkpoint before any automated or multi-agent edit.
- You can automate this with a shell script or VS Code task if desired.

---

This file documents the workflow for all contributors and agents.
