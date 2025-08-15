// Task Delegator Script
// This script integrates with the AI Model Selector to delegate tasks to the most appropriate AI model.

import { selectAIModel } from './aiModelSelector.js';

/**
 * Delegates a task to the best AI model.
 * @param {string} taskDescription - A brief description of the task.
 * @param {string} complexity - The complexity of the task ('low', 'medium', 'high').
 * @returns {string} A message indicating the assigned model.
 */
export function delegateTask(taskDescription, complexity) {
  try {
    const selectedModel = selectAIModel(complexity);
    return `Task: "${taskDescription}" has been assigned to ${selectedModel}.`;
  } catch (error) {
    return `Error delegating task: ${error.message}`;
  }
}

/**
 * Example usage
 */
// console.log(delegateTask('Implement fuzzy search algorithm', 'low'));
