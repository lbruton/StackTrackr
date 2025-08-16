# Agent Escalation Protocol

## Overview

This document establishes a systematic approach for AI agents to recognize their limitations and escalate tasks to higher-capability models, specifically Claude Sonnet 4, when they reach the boundaries of their abilities.

## Cost-Efficient Escalation Strategy

### Primary Principle
**Start Cheap, Escalate Smart** - Begin with the most cost-effective model capable of the task, but have clear triggers for escalation to prevent wasted time and resources.

## Escalation Tiers

### Tier 1: Claude 3 Haiku (Entry Level)
**Cost**: $0.25-0.50 per task  
**Capabilities**: Basic automation, simple documentation, screenshots

**Escalation Triggers for Haiku:**
```
IF task involves:
- Complex code analysis
- Multi-file debugging
- Architecture decisions
- Advanced reasoning
- Integration between systems
THEN escalate to → GPT-4o-mini or Claude Sonnet 4
```

### Tier 2: GPT-4o-mini (Code Specialist)
**Cost**: $0.50-1.00 per task  
**Capabilities**: Code completion, simple debugging, unit tests

**Escalation Triggers for GPT-4o-mini:**
```
IF encountering:
- Complex system architecture questions
- Multi-layered debugging requiring deep analysis
- Cross-system integration issues
- Advanced algorithm design
- Critical business logic decisions
THEN escalate to → Claude Sonnet 4
```

### Tier 3: Claude Sonnet 4 (Senior Architect)
**Cost**: $2.00-4.00 per task  
**Capabilities**: Complex reasoning, system architecture, advanced debugging

**Final Escalation Authority** - Handles all complex tasks that lower tiers cannot resolve.

## Escalation Protocol Implementation

### 1. Recognition Phrases for Lower-Tier Models

#### Haiku Escalation Signals:
```
"This task requires complex analysis beyond my capabilities. 
Escalating to Claude Sonnet 4 for advanced reasoning and system architecture expertise."

"I've identified this as a multi-system integration issue. 
Transferring to Claude Sonnet 4 for comprehensive analysis."
```

#### GPT-4o-mini Escalation Signals:
```
"This debugging session requires deeper system analysis than I can provide. 
Escalating to Claude Sonnet 4 for advanced problem-solving capabilities."

"The complexity of this architectural decision exceeds my scope. 
Transferring to Claude Sonnet 4 for strategic technical guidance."
```

### 2. Context Handoff Template

When escalating, the lower-tier model should provide:

```markdown
## ESCALATION HANDOFF

**From**: [Model Name]
**To**: Claude Sonnet 4
**Reason**: [Specific limitation encountered]

### Context Summary:
- **Task**: [Brief description]
- **Attempted Solutions**: [What was tried]
- **Current State**: [Where we left off]
- **Specific Challenge**: [What exceeded capabilities]
- **Files Involved**: [Relevant file paths]
- **Error Messages**: [Any error outputs]

### Recommendation:
[Lower-tier model's assessment of what Sonnet 4 should focus on]
```

## Escalation Criteria Matrix

| **Scenario** | **Haiku** | **GPT-4o-mini** | **Sonnet 4** |
|--------------|-----------|------------------|---------------|
| Screenshots | ✅ Handle | Escalate | Escalate |
| Simple Bug Fix | Escalate | ✅ Handle | Escalate |
| Complex Debugging | Escalate | Attempt → Escalate | ✅ Handle |
| Architecture Design | Escalate | Escalate | ✅ Handle |
| System Integration | Escalate | Attempt → Escalate | ✅ Handle |
| Code Review | Basic only | ✅ Handle | Deep analysis |
| Performance Analysis | Escalate | Attempt → Escalate | ✅ Handle |

## Implementation in VS Code

### Method 1: Prompt Engineering
Include escalation instructions in initial prompts:

```
You are [Model Name]. If this task involves [escalation triggers], 
immediately escalate to Claude Sonnet 4 using the handoff template.
```

### Method 2: Multi-Agent Workflow
1. Start with appropriate tier model
2. Monitor for escalation signals
3. Switch to Claude Sonnet 4 when triggered
4. Preserve full context during handoff

### Method 3: Conditional Routing
```
IF task_complexity > model_capabilities:
    escalate_to_sonnet4()
ELSE:
    proceed_with_current_model()
```

## Escalation Triggers by Domain

### JavaScript/Web Development
- **Haiku → GPT-4o-mini**: Any code analysis
- **GPT-4o-mini → Sonnet 4**: Cross-browser compatibility, complex DOM manipulation, performance optimization

### System Architecture
- **Any Model → Sonnet 4**: Database design, API architecture, scalability planning

### Debugging
- **Haiku → GPT-4o-mini**: Any debugging task
- **GPT-4o-mini → Sonnet 4**: Multi-file bugs, race conditions, memory leaks

### Documentation
- **Haiku**: Simple docs ✅
- **Sonnet 4**: Technical specifications, API documentation

## Cost-Benefit Analysis

### Efficient Escalation Saves Money:
- ✅ **Early escalation** prevents wasted time on impossible tasks
- ✅ **Appropriate tier usage** maximizes cost efficiency
- ✅ **Context preservation** prevents duplicate work

### Escalation Decision Framework:
```
IF (time_spent > 10_minutes AND no_progress):
    escalate()
IF (task_requires_deep_reasoning):
    escalate_immediately()
IF (business_critical):
    start_with_sonnet4()
```

## Training Examples

### Good Escalation (GPT-4o-mini):
```
"I've attempted to debug this CSV import issue for 10 minutes. 
The problem involves complex data flow analysis between localStorage, 
CSV parsing, and DOM rendering - requiring system-level architecture 
understanding. Escalating to Claude Sonnet 4."
```

### Poor Escalation (GPT-4o-mini):
```
"This is hard. Claude Sonnet 4 should do it."
```

## Monitoring & Optimization

### Track Escalation Metrics:
- Escalation frequency by model
- Task completion success rates
- Cost savings from appropriate tier usage
- Time saved through efficient handoffs

### Continuous Improvement:
- Refine escalation triggers based on success patterns
- Update capability matrices as models improve
- Optimize handoff templates for better context preservation

## Emergency Escalation

For critical issues, bypass normal escalation chain:

```
CRITICAL ESCALATION TO CLAUDE SONNET 4
- Production system down
- Security vulnerability discovered
- Data integrity compromise
- Mission-critical deadline

Immediate handoff with full context required.
```

---

**Last Updated**: August 15, 2025  
**Protocol Version**: 1.0  
**Tested With**: Claude Haiku, GPT-4o-mini, Claude Sonnet 4
