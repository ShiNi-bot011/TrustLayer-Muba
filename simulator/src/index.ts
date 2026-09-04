/**
 * index.ts — Simulator entry point and programmatic API
 */

export * from './types.ts';
export * from './generators.ts';
export * from './scoring.ts';
export * from './scenarios.ts';
export * from './suiTransaction.ts';

import {
  seedHealthyHistory,
  triggerTrueFitnessScenario,
  trigger1FitScenario,
} from './scenarios.ts';

function runCliDemo() {
  const merchantId = '0x_DEMO_MERCHANT_B';
  console.log('=== SME Trust Layer Simulator Demo ===\n');

  console.log('1. Seed Healthy History:');
  console.log(JSON.stringify(seedHealthyHistory(merchantId), null, 2));

  console.log('\n2. True Fitness Scenario:');
  console.log(JSON.stringify(triggerTrueFitnessScenario(merchantId), null, 2));

  console.log('\n3. 1Fit Scenario:');
  console.log(JSON.stringify(trigger1FitScenario(merchantId), null, 2));
}

if (process.argv[1]?.endsWith('index.ts') || process.argv[1]?.endsWith('index.js')) {
  runCliDemo();
}
