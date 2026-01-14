#!/usr/bin/env node

/**
 * Fitbit Sync
 *
 * Sync health data (weight, sleep) from Fitbit API to the event stream
 */

import { eventExists, createSyncedEvent, writeSyncedEvents, getLatestSyncTimestamp } from './lib/sync.js';
import type { BaseEvent } from './lib/types.js';

interface FitbitWeight {
  date: string;
  weight: number;
  time: string;
  logId: number;
}

interface FitbitSleep {
  dateOfSleep: string;
  duration: number;
  efficiency: number;
  startTime: string;
  endTime: string;
  logId: number;
  levels?: {
    summary?: {
      deep?: { minutes: number };
      rem?: { minutes: number };
    };
  };
}

interface FitbitTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

/**
 * Check required environment variables
 */
function checkEnv(): { clientId: string; clientSecret: string; refreshToken: string } {
  const clientId = process.env.FITBIT_CLIENT_ID;
  const clientSecret = process.env.FITBIT_CLIENT_SECRET;
  const refreshToken = process.env.FITBIT_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    console.error('❌ Missing Fitbit credentials in environment variables.');
    console.error('\nRequired:');
    console.error('  - FITBIT_CLIENT_ID');
    console.error('  - FITBIT_CLIENT_SECRET');
    console.error('  - FITBIT_REFRESH_TOKEN');
    console.error('\nSee PHASE4.md for setup instructions.');
    process.exit(1);
  }

  return { clientId, clientSecret, refreshToken };
}

/**
 * Get a fresh access token using refresh token
 */
async function getAccessToken(clientId: string, clientSecret: string, refreshToken: string): Promise<string> {
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch('https://api.fitbit.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to refresh Fitbit token: ${response.statusText}`);
  }

  const data = await response.json() as FitbitTokenResponse;
  return data.access_token;
}

/**
 * Fetch weight logs from Fitbit API
 */
async function fetchWeightLogs(accessToken: string, startDate: string, endDate: string): Promise<FitbitWeight[]> {
  const response = await fetch(
    `https://api.fitbit.com/1/user/-/body/log/weight/date/${startDate}/${endDate}.json`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch Fitbit weight: ${response.statusText}`);
  }

  const data = await response.json() as { weight?: FitbitWeight[] };
  return data.weight || [];
}

/**
 * Fetch sleep logs from Fitbit API
 */
async function fetchSleepLogs(accessToken: string, startDate: string, endDate: string): Promise<FitbitSleep[]> {
  const response = await fetch(
    `https://api.fitbit.com/1.2/user/-/sleep/date/${startDate}/${endDate}.json`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch Fitbit sleep: ${response.statusText}`);
  }

  const data = await response.json() as { sleep?: FitbitSleep[] };
  return data.sleep || [];
}

/**
 * Convert weight log to event
 */
function weightToEvent(weight: FitbitWeight): BaseEvent {
  const timestamp = `${weight.date}T${weight.time}`;

  return createSyncedEvent(
    'health.weight',
    {
      value: weight.weight,
      unit: 'kg',
      fitbit_id: String(weight.logId),
    },
    timestamp,
    'fitbit'
  );
}

/**
 * Convert sleep log to event
 */
function sleepToEvent(sleep: FitbitSleep): BaseEvent {
  const durationMin = Math.round(sleep.duration / 1000 / 60);
  const deepMin = sleep.levels?.summary?.deep?.minutes;
  const remMin = sleep.levels?.summary?.rem?.minutes;

  return createSyncedEvent(
    'health.sleep',
    {
      duration_min: durationMin,
      quality: sleep.efficiency,
      deep_min: deepMin,
      rem_min: remMin,
      fitbit_id: String(sleep.logId),
    },
    sleep.startTime,
    'fitbit'
  );
}

/**
 * Format date for Fitbit API (YYYY-MM-DD)
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Main sync function
 */
async function main() {
  console.log('Syncing Fitbit health data...\n');

  // Check environment variables
  const { clientId, clientSecret, refreshToken } = checkEnv();

  try {
    // Get fresh access token
    console.log('🔑 Refreshing access token...');
    const accessToken = await getAccessToken(clientId, clientSecret, refreshToken);

    // Determine date range
    const latestSync = await getLatestSyncTimestamp('fitbit');
    const startDate = latestSync ? new Date(latestSync) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const endDate = new Date();

    console.log(`📅 Syncing data from ${formatDate(startDate)} to ${formatDate(endDate)}`);

    const events: BaseEvent[] = [];

    // Fetch weight logs
    console.log('⚖️  Fetching weight logs...');
    const weightLogs = await fetchWeightLogs(accessToken, formatDate(startDate), formatDate(endDate));

    for (const weight of weightLogs) {
      const exists = await eventExists('fitbit', 'fitbit_id', String(weight.logId));
      if (!exists) {
        events.push(weightToEvent(weight));
      }
    }

    console.log(`   Found ${weightLogs.length} weight logs (${events.length} new)`);

    // Fetch sleep logs
    console.log('😴 Fetching sleep logs...');
    const sleepLogs = await fetchSleepLogs(accessToken, formatDate(startDate), formatDate(endDate));

    const sleepCount = events.length;
    for (const sleep of sleepLogs) {
      const exists = await eventExists('fitbit', 'fitbit_id', String(sleep.logId));
      if (!exists) {
        events.push(sleepToEvent(sleep));
      }
    }

    console.log(`   Found ${sleepLogs.length} sleep logs (${events.length - sleepCount} new)`);

    if (events.length === 0) {
      console.log('\n✅ No new data to sync');
      return;
    }

    // Write to synced directory
    console.log(`\n💾 Syncing ${events.length} new events...`);
    const count = await writeSyncedEvents('fitbit', events);

    console.log(`\n✅ Successfully synced ${count} health records from Fitbit`);

    // Show summary
    const weightEvents = events.filter(e => e.type === 'health.weight').length;
    const sleepEvents = events.filter(e => e.type === 'health.sleep').length;

    console.log('\nBreakdown:');
    if (weightEvents > 0) console.log(`  - Weight logs: ${weightEvents}`);
    if (sleepEvents > 0) console.log(`  - Sleep logs: ${sleepEvents}`);

  } catch (error: any) {
    console.error('\n❌ Sync failed:', error.message);
    process.exit(1);
  }
}

main();
