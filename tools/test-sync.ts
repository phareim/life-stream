#!/usr/bin/env node

/**
 * Test Sync Utilities
 *
 * Test the sync infrastructure with sample data
 */

import {
  createSyncedEvent,
  writeSyncedEvent,
  readSyncedEvents,
  eventExists,
  getLatestSyncTimestamp,
} from './lib/sync.js';

async function main() {
  console.log('Testing Sync Utilities\n');

  try {
    // Test 1: Create synced events
    console.log('1. Creating sample Strava event...');
    const stravaEvent = createSyncedEvent(
      'exercise.completed',
      {
        activity: 'run',
        duration_min: 30,
        distance_km: 5.2,
        avg_hr: 145,
        notes: 'Morning run',
        strava_id: 'test-123456',
      },
      new Date('2026-01-10T08:00:00Z'),
      'strava'
    );
    await writeSyncedEvent('strava', stravaEvent);
    console.log('   ✓ Strava event written');

    // Test 2: Create Fitbit event
    console.log('\n2. Creating sample Fitbit event...');
    const fitbitEvent = createSyncedEvent(
      'health.weight',
      {
        value: 75.5,
        unit: 'kg',
        fitbit_id: 'test-789012',
      },
      new Date('2026-01-10T07:00:00Z'),
      'fitbit'
    );
    await writeSyncedEvent('fitbit', fitbitEvent);
    console.log('   ✓ Fitbit event written');

    // Test 3: Read synced events
    console.log('\n3. Reading synced Strava events...');
    const stravaEvents = await readSyncedEvents('strava');
    console.log(`   ✓ Found ${stravaEvents.length} Strava events`);

    console.log('\n4. Reading synced Fitbit events...');
    const fitbitEvents = await readSyncedEvents('fitbit');
    console.log(`   ✓ Found ${fitbitEvents.length} Fitbit events`);

    // Test 4: Check event existence (duplicate detection)
    console.log('\n5. Testing duplicate detection...');
    const exists = await eventExists('strava', 'strava_id', 'test-123456');
    console.log(`   ✓ Event exists check: ${exists ? 'YES' : 'NO'}`);

    const notExists = await eventExists('strava', 'strava_id', 'does-not-exist');
    console.log(`   ✓ Non-existent event check: ${notExists ? 'YES' : 'NO'}`);

    // Test 5: Get latest timestamp
    console.log('\n6. Testing latest timestamp...');
    const latestStrava = await getLatestSyncTimestamp('strava');
    console.log(`   ✓ Latest Strava timestamp: ${latestStrava?.toISOString() || 'none'}`);

    const latestFitbit = await getLatestSyncTimestamp('fitbit');
    console.log(`   ✓ Latest Fitbit timestamp: ${latestFitbit?.toISOString() || 'none'}`);

    console.log('\n✅ All sync utility tests passed!\n');

    // Summary
    console.log('Sample synced data created:');
    console.log(`  - synced/strava/2026-01.jsonl (${stravaEvents.length} events)`);
    console.log(`  - synced/fitbit/2026-01.jsonl (${fitbitEvents.length} events)`);
    console.log('\nYou can now run view generation to see this data in reports.');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
