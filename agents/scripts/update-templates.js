#!/usr/bin/env node

/**
 * Template replacement script for StackrTrackr documentation
 * Replaces {{VARIABLE}} placeholders with current version information
 * 
 * Usage: node scripts/update-templates.js
 */

const fs = require('fs');
const path = require('path');

// Read current version from constants.js
function getAppVersion() {
  const constantsPath = path.join(__dirname, '../js/constants.js');
  const constantsContent = fs.readFileSync(constantsPath, 'utf8');
  const versionMatch = constantsContent.match(/const APP_VERSION = ["']([^"']+)["']/);
  
  if (!versionMatch) {
    throw new Error('Could not find APP_VERSION in constants.js');
  }
  
  return versionMatch[1];
}

// Template variable functions
function getTemplateVariables() {
  const version = getAppVersion();
  return {
    VERSION: version,
    VERSION_WITH_V: `v${version}`,
    VERSION_TITLE: `StackrTrackr v${version}`,
    VERSION_BRANCH: version.split('.').slice(0, 2).join('.') + '.x',
    BRANDING_NAME: 'StackrTrackr'
  };
}

// Replace template variables in text
function replaceTemplateVariables(text) {
  const variables = getTemplateVariables();
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] || match;
  });
}

// Files to process (relative to project root)
const filesToProcess = [
  'README.md',
  'docs/announcements.md',
  'docs/functionstable.md',
  'docs/human_workflow.md', 
  'docs/implementation_summary.md',
  'docs/migration_roadmap.md',
  'docs/MULTI_AGENT_WORKFLOW.md',
  'docs/roadmap.md',
  'docs/status.md',
  'docs/structure.md',
  'docs/ui_style_guide.md',
  'docs/versioning.md',
  'docs/agents/agents.ai',
  'docs/agents/multi_agent_workflow.md',
  'docs/agents/prompt.md',
  'docs/archive/PATCH_NOTES.md',
  'docs/archive/REPAIR_CHECKLIST.md',
  'docs/archive/structure-v3.03.08n.md',
  'docs/notes/Feature_Implementation_Checklist.md',
  'docs/notes/fuzzy-autocomplete-implementation-plan.md',
  'docs/notes/openai-task-1a-prompt.md'
];

// Process each file
function processFiles() {
  const projectRoot = path.join(__dirname, '..');
  const variables = getTemplateVariables();
  
  console.log('Template Variables:');
  Object.entries(variables).forEach(([key, value]) => {
    console.log(`  {{${key}}} → ${value}`);
  });
  console.log('');
  
  let processedCount = 0;
  let updatedCount = 0;
  
  filesToProcess.forEach(relativePath => {
    const fullPath = path.join(projectRoot, relativePath);
    
    try {
      if (fs.existsSync(fullPath)) {
        const originalContent = fs.readFileSync(fullPath, 'utf8');
        const updatedContent = replaceTemplateVariables(originalContent);
        
        if (originalContent !== updatedContent) {
          fs.writeFileSync(fullPath, updatedContent, 'utf8');
          console.log(`✅ Updated: ${relativePath}`);
          updatedCount++;
        } else {
          console.log(`⏭️  No changes: ${relativePath}`);
        }
        processedCount++;
      } else {
        console.log(`⚠️  Not found: ${relativePath}`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${relativePath}:`, error.message);
    }
  });
  
  console.log(`\n📊 Summary: ${updatedCount}/${processedCount} files updated`);
}

// Main execution
if (require.main === module) {
  try {
    console.log('🔄 Processing StackrTrackr documentation templates...\n');
    processFiles();
    console.log('\n✨ Template processing complete!');
  } catch (error) {
    console.error('❌ Template processing failed:', error.message);
    process.exit(1);
  }
}

module.exports = { getTemplateVariables, replaceTemplateVariables };
