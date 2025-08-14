#!/usr/bin/env node

/**
 * Simple test for template replacement
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

// Test with docs/status.md
const testFile = path.join(__dirname, '../docs/status.md');

console.log('🔄 Testing template replacement...\n');

try {
  const variables = getTemplateVariables();
  console.log('Template Variables:');
  Object.entries(variables).forEach(([key, value]) => {
    console.log(`  {{${key}}} → ${value}`);
  });
  console.log('');
  
  // Read and process the file
  const originalContent = fs.readFileSync(testFile, 'utf8');
  const updatedContent = replaceTemplateVariables(originalContent);
  
  // Show first few lines of transformation
  const originalLines = originalContent.split('\n').slice(0, 10);
  const updatedLines = updatedContent.split('\n').slice(0, 10);
  
  console.log('📋 First 10 lines transformation:');
  console.log('\nBEFORE:');
  originalLines.forEach((line, i) => {
    if (line.includes('{{')) {
      console.log(`${i+1}: ${line}`);
    }
  });
  
  console.log('\nAFTER:');
  updatedLines.forEach((line, i) => {
    if (originalLines[i] !== line) {
      console.log(`${i+1}: ${line}`);
    }
  });
  
  // Count replacements
  const templateCount = (originalContent.match(/\{\{\w+\}\}/g) || []).length;
  const remainingCount = (updatedContent.match(/\{\{\w+\}\}/g) || []).length;
  
  console.log(`\n📊 Replacements: ${templateCount - remainingCount}/${templateCount} template variables processed`);
  
  if (remainingCount > 0) {
    console.log('\n⚠️  Remaining templates:', updatedContent.match(/\{\{\w+\}\}/g));
  }
  
  console.log('\n✅ Template replacement test successful!');

} catch (error) {
  console.error('❌ Test failed:', error.message);
}
