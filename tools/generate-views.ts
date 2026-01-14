#!/usr/bin/env node

/**
 * Generate Views CLI
 *
 * Regenerate all markdown views from the event stream
 */

import { generateAllViews } from './lib/views.js';

async function main() {
  console.log('Generating views from event stream...\n');

  try {
    await generateAllViews();

    console.log('✅ Views generated successfully:');
    console.log('   - views/open-tasks.md');
    console.log('   - views/goals-status.md');
    console.log('   - views/weekly-review.md');
    console.log('\nViews are up to date!');
  } catch (error) {
    console.error('❌ Error generating views:', error);
    process.exit(1);
  }
}

main();
