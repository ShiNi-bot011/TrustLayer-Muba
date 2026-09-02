/**
 * index.ts — Simulator entry point and programmatic API
 */

export * from './types.js';
export * from './generators.js';
export * from './scoring.js';
export * from './scenarios.js';

import { seedHealthyHistory, triggerTrueFitnessScenario, trigger1FitScenario } from './scenarios.js';

function runCliDemo() {
  const merchantId = '0x_DEMO_MERCHANT_B';
  console.log('=== SME Trust Layer Simulator Demo ===\n');

  console.log('1. Testing Seed Healthy History:');
  const healthy = seedHealthyHistory(merchantId);
  console.log(JSON.stringify(healthy, null, 2));

  console.log('\n2. Testing True Fitness Scenario:');
  const trueFitness = triggerTrueFitnessScenario(merchantId);
  console.log(JSON.stringify(trueFitness, null, 2));

  console.log('\n3. Testing 1Fit Scenario:');
  const oneFit = trigger1FitScenario(merchantId);
  console.log(JSON.stringify(oneFit, null, 2));
}

if (process.argv[1]?.endsWith('index.ts') || process.argv[1]?.endsWith('index.js')) {
  runCliDemo();
}
