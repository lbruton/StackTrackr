# Agent Task Assignment Prompts
**Project**: StackTrackr Performance Optimization  
**Location**: `/docs/agents/tasks/`  

---

## 🤖 GPT-4 TASK PROMPT

```
Hi GPT-4! 

You have a performance optimization task waiting for you in the StackTrackr project.

📁 **Your Task File**: `/docs/agents/tasks/gpt-task-search-storage.ai`

🎯 **Your Assignment**: 
- Phase 1: Search debouncing (15 min) - START HERE FIRST
- Phase 3: LocalStorage batching (10 min) - After Phase 1 is tested

⚡ **Priority**: HIGH - Phase 1 is the critical path that unblocks other agents

Please review your task file and begin with Phase 1 (search debouncing). This is the safest change with the highest user impact.

Update the checklist at `/docs/agents/tasks/checklist.md` as you progress.
```

---

## 🔍 GEMINI TASK PROMPT

```
Hi Gemini!

You have a performance optimization task waiting for you in the StackTrackr project.

📁 **Your Task File**: `/docs/agents/tasks/gemini-task-charts-testing.ai`

🎯 **Your Assignment**:
- Phase 5: Chart cleanup (10 min) - You can start this anytime
- Phase 6: Testing & validation (15 min) - Wait for all phases to complete

⚡ **Priority**: MEDIUM - You can start Phase 5 independently while others work

Please review your task file and begin with Phase 5 (Chart.js cleanup). This doesn't depend on other phases.

Update the checklist at `/docs/agents/tasks/checklist.md` as you progress.
```

---

## 🧠 CLAUDE TASK PROMPT

```
Hi Claude!

You have a performance optimization task waiting for you in the StackTrackr project.

📁 **Your Task File**: `/docs/agents/tasks/claude-task-events-dom.ai`

🎯 **Your Assignment**:
- Phase 2: Event delegation (20 min) - Wait for GPT Phase 1
- Phase 4: DOM fragment optimization (30 min) - Most complex, wait for all previous phases

⚡ **Priority**: HIGH - These are the most complex architectural changes

Please review your task file. Start Phase 2 after GPT completes search debouncing. Phase 4 should wait until Phases 1-3 are tested and working.

Update the checklist at `/docs/agents/tasks/checklist.md` as you progress.
```

---

## 📋 HUMAN COORDINATOR GUIDE

### **To Start the Process:**
1. Copy the GPT-4 prompt above and assign Phase 1 to GPT
2. Copy the Gemini prompt above and assign Phase 5 to Gemini
3. Wait for GPT to complete Phase 1 before assigning Phase 2 to Claude

### **To Check Progress:**
- Review `/docs/agents/tasks/checklist.md`
- Look for ✅ COMPLETE checkmarks
- Check the status and notes sections

### **To Handle Issues:**
- Check the "ISSUES & NOTES" section in checklist.md
- Each agent should document problems they encounter
- Use the rollback procedures in each task file if needed

### **Coordination Order:**
1. **Start**: GPT Phase 1 + Gemini Phase 5 (parallel)
2. **After GPT Phase 1**: Claude Phase 2 + GPT Phase 3 (parallel)  
3. **After Phases 1-3**: Claude Phase 4
4. **After All Phases**: Gemini Phase 6 (testing)

---

## 🎯 QUICK REFERENCE

**Task Files Location**: `/docs/agents/tasks/`
- `gpt-task-search-storage.ai` - GPT's assignments
- `gemini-task-charts-testing.ai` - Gemini's assignments  
- `claude-task-events-dom.ai` - Claude's assignments
- `checklist.md` - Progress tracking
- `task-coordination.ai` - Master coordination guide

**Expected Total Time**: ~100 minutes  
**Risk Level**: Low  
**Impact**: High user experience improvements
