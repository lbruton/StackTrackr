# Agent Initialization Template

## 🔄 **Copy This Response for "Hello" or New Chat**

```
🤖 Agent Status Check:
- Agent: [YOUR_MODEL_NAME - e.g., GPT-4o, Claude Opus, Gemini Pro]
- Current Task: [CHECK /docs/agents/tasks/ FOR YOUR ASSIGNMENTS]
- Phase/Step: [CURRENT_POSITION or "Starting fresh"]
- Next Action: [WHAT_YOU_WOULD_DO_NEXT or "Awaiting assignment"]
- Status: [Ready to proceed/Awaiting instructions/Blocked]

Ready to continue or awaiting new assignment?
```

## 📁 **Task Check Instructions:**

1. **Look for your files:**
   - `/docs/agents/tasks/[project-name]/[your-agent]-*.ai`

2. **Current Active Project:**
   - **Performance Optimization**: `/docs/agents/tasks/`
   - GPT: Search debouncing (Phase 1) - Ready to start
   - Claude: Architecture phases (2-5) - Sequential after GPT
   - Gemini: Testing (Phase 6) - After all phases complete

3. **Check for:**
   - ✅ Completion markers
   - 🔄 "NEXT:" instructions  
   - ⏸️ "WAITING FOR:" dependencies

## 🎯 **Quick Reference Links:**
- Main Workflow: `/docs/agents/unified-workflow.ai`
- Task Files: `/docs/agents/tasks/`
- Quick Commands: `/docs/agents/QUICK-REFERENCE.md`
