// AI Model Selector Script
// This script determines the most appropriate AI model for a given task based on complexity, cost, and quota.

import { AI_MODELS } from '../../js/constants.js';

/**
 * Selects the best AI model for a task.
 * @param {string} complexity - The complexity of the task ('low', 'medium', 'high').
 * @returns {string} The name of the selected AI model.
 */
export function selectAIModel(complexity) {
  const availableModels = Object.values(AI_MODELS).filter(model => model.quota > 0);

  // Sort models by cost (ascending) and filter by complexity
  const suitableModels = availableModels
    .filter(model => model.complexity === complexity)
    .sort((a, b) => a.cost - b.cost);

  if (suitableModels.length > 0) {
    return suitableModels[0].name; // Return the most cost-effective model
  }

  throw new Error(`No suitable AI model found for complexity: ${complexity}`);
}

/**
 * Example usage
 */
// console.log(selectAIModel('low'));
