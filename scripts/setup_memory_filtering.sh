#!/bin/bash

# Memory Context Filter for rAgents
# Filters and prioritizes memory based on project configuration

echo "🧠 rAgents Memory Context Filter"
echo "==============================="

# Load project configuration
if [ ! -f ".ragents" ]; then
    echo "❌ .ragents file not found. Run from project root."
    exit 1
fi

PROJECT_NAME=$(grep '"name":' .ragents | cut -d'"' -f4)
PRIMARY_PROJECT=$(grep '"primary":' .ragents | cut -d'"' -f4)
RELEVANCE_THRESHOLD=$(grep '"relevanceThreshold":' .ragents | cut -d'"' -f4)

echo "📁 Project: $PROJECT_NAME"
echo "🎯 Primary Focus: $PRIMARY_PROJECT"
echo "📊 Relevance Threshold: $RELEVANCE_THRESHOLD"

# Create filtered memory directory
mkdir -p "memory/filtered"
mkdir -p "docs/filtered"

# Create memory priority guide for agents
cat > "docs/MEMORY_PRIORITY_GUIDE.md" << EOF
# Memory Priority Guide for $PROJECT_NAME

## Memory Ranking System

### Priority Levels
1. **Local (1.0)** - Current project memory and documentation
2. **Universal (0.8-0.9)** - Cross-project patterns and frameworks  
3. **Cross-Project (0.6-0.8)** - Relevant context from other projects

### Context Filtering

#### Primary Focus: $(grep '"projectFocus":' .ragents | cut -d'"' -f4)

#### Priority Keywords
$(grep '"priorityKeywords":' .ragents | sed 's/.*\[\(.*\)\].*/\1/' | sed 's/"//g' | sed 's/,/\n/g' | sed 's/^/- /')

#### Exclude Keywords  
$(grep '"excludeKeywords":' .ragents | sed 's/.*\[\(.*\)\].*/\1/' | sed 's/"//g' | sed 's/,/\n/g' | sed 's/^/- /')

#### Relevance Threshold: $RELEVANCE_THRESHOLD
- Memory items below this threshold should be deprioritized
- Focus on highly relevant context to avoid confusion

## Agent Guidelines

### When Processing Shared Memory
1. **Start with local project context** (memory/\${PROJECT_NAME,,}/)
2. **Filter cross-project memory** by relevance keywords
3. **Apply ranking weights** when considering context
4. **Exclude irrelevant domains** using exclude keywords

### Memory Access Priority
\`\`\`
1. memory/\${PROJECT_NAME,,}/latest.json (Primary - 1.0)
2. memory/shared/global/ (Universal - 0.8-0.9) 
3. memory/shared/other_projects/ (Cross-project - 0.6-0.8)
\`\`\`

### Context Confusion Prevention
- **Domain separation**: Don't mix precious metals context with vulnerability tracking
- **Keyword filtering**: Use priority/exclude keywords to filter relevant context
- **Relevance scoring**: Weight memories based on project focus
- **Threshold filtering**: Ignore low-relevance cross-project context

## Implementation

### For AI Agents
When accessing shared memory, always:
1. Read this priority guide first
2. Apply relevance filtering based on project focus
3. Weight context by memory ranking values
4. Prioritize local project documentation

### Example Context Filtering
\`\`\`bash
# High relevance for $PROJECT_NAME
✅ Local project bugs, features, roadmap
✅ Universal development patterns
✅ Framework architecture decisions

# Low relevance for $PROJECT_NAME  
❌ Other project-specific implementation details
❌ Domain-specific context outside project focus
❌ Historical decisions not applicable to current project
\`\`\`
EOF

echo "✅ Memory priority guide created: docs/MEMORY_PRIORITY_GUIDE.md"

# Create filtered memory index
cat > "memory/filtered/README.md" << EOF
# Filtered Memory for $PROJECT_NAME

This directory contains memory filtered and ranked according to the project's relevance criteria.

## Filtering Criteria
- Primary project: $PRIMARY_PROJECT
- Relevance threshold: $RELEVANCE_THRESHOLD
- Project focus: $(grep '"projectFocus":' .ragents | cut -d'"' -f4)

## Memory Ranking
- Local memory: 1.0 weight
- Universal patterns: 0.8-0.9 weight  
- Cross-project context: 0.6-0.8 weight

## Usage
Agents should prioritize filtered memory over raw shared memory to avoid context confusion.
EOF

echo "✅ Filtered memory structure created"
echo ""
echo "🎯 Benefits:"
echo "   - Prevents cross-project context confusion"
echo "   - Prioritizes relevant memory based on project focus"
echo "   - Filters out irrelevant domain-specific details"
echo "   - Provides clear guidance for AI agents"
echo ""
echo "📖 See docs/MEMORY_PRIORITY_GUIDE.md for detailed agent guidelines"
