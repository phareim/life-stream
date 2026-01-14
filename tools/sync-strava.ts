#!/usr/bin/env node

/**
 * Strava Sync
 *
 * Sync activities from Strava API to the event stream
 */

import { eventExists, createSyncedEvent, writeSyncedEvents, getLatestSyncTimestamp } from './lib/sync.js';
import type { BaseEvent } from './lib/types.js';

interface StravaActivity {
  id: number;
  name: string;
  type: string;
  start_date: string;
  moving_time: number;
  distance: number;
  average_heartrate?: number;
}

interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

/**
 * Check required environment variables
 */
function checkEnv(): { clientId: string; clientSecret: string; refreshToken: string } {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  const refreshToken = process.env.STRAVA_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    console.error('❌ Missing Strava credentials in environment variables.');
    console.error('\nRequired:');
    console.error('  - STRAVA_CLIENT_ID');
    console.error('  - STRAVA_CLIENT_SECRET');
    console.error('  - STRAVA_REFRESH_TOKEN');
    console.error('\nSee PHASE4.md for setup instructions.');
    process.exit(1);
  }

  return { clientId, clientSecret, refreshToken };
}

/**
 * Get a fresh access token using refresh token
 */
async function getAccessToken(clientId: string, clientSecret: string, refreshToken: string): Promise<string> {
  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to refresh Strava token: ${response.statusText}`);
  }

  const data = await response.json() as StravaTokenResponse;
  return data.access_token;
}

/**
 * Fetch activities from Strava API
 */
async function fetchActivities(accessToken: string, after?: number): Promise<StravaActivity[]> {
  const params = new URLSearchParams({
    per_page: '200',
  });

  if (after) {
    params.set('after', String(Math.floor(after / 1000)));
  }

  const response = await fetch(`https://www.strava.com/api/v3/athlete/activities?${params}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Strava activities: ${response.statusText}`);
  }

  return response.json() as Promise<StravaActivity[]>;
}

/**
 * Map Strava activity type to our activity type
 */
function mapActivityType(stravaType: string): string {
  const mapping: Record<string, string> = {
    'Run': 'run',
    'Ride': 'cycle',
    'Swim': 'swim',
    'Walk': 'walk',
    'Hike': 'walk',
    'WeightTraining': 'strength',
    'Workout': 'strength',
    'NordicSki': 'ski',
    'AlpineSki': 'ski',
    'BackcountrySki': 'ski',
  };

  return mapping[stravaType] || 'other';
}

/**
 * Convert Strava activity to event
 */
function activityToEvent(activity: StravaActivity): BaseEvent {
  const activityType = mapActivityType(activity.type);

  return createSyncedEvent(
    'exercise.completed',
    {
      activity: activityType,
      duration_min: Math.round(activity.moving_time / 60),
      distance_km: Number((activity.distance / 1000).toFixed(2)),
      avg_hr: activity.average_heartrate ? Math.round(activity.average_heartrate) : undefined,
      notes: activity.name,
      strava_id: String(activity.id),
    },
    activity.start_date,
    'strava'
  );
}

/**
 * Main sync function
 */
async function main() {
  console.log('Syncing Strava activities...\n');

  // Check environment variables
  const { clientId, clientSecret, refreshToken } = checkEnv();

  try {
    // Get fresh access token
    console.log('🔑 Refreshing access token...');
    const accessToken = await getAccessToken(clientId, clientSecret, refreshToken);

    // Get the latest synced timestamp for incremental sync
    const latestSync = await getLatestSyncTimestamp('strava');
    const after = latestSync ? latestSync.getTime() : undefined;

    if (latestSync) {
      console.log(`📅 Syncing activities after ${latestSync.toISOString()}`);
    } else {
      console.log('📅 First sync - fetching all activities');
    }

    // Fetch activities
    console.log('📥 Fetching activities from Strava...');
    const activities = await fetchActivities(accessToken, after);

    if (activities.length === 0) {
      console.log('✅ No new activities to sync');
      return;
    }

    console.log(`📊 Found ${activities.length} activities`);

    // Filter out activities that already exist
    const newActivities: StravaActivity[] = [];
    for (const activity of activities) {
      const exists = await eventExists('strava', 'strava_id', String(activity.id));
      if (!exists) {
        newActivities.push(activity);
      }
    }

    if (newActivities.length === 0) {
      console.log('✅ All activities already synced');
      return;
    }

    console.log(`💾 Syncing ${newActivities.length} new activities...`);

    // Convert to events
    const events = newActivities.map(activityToEvent);

    // Write to synced directory
    const count = await writeSyncedEvents('strava', events);

    console.log(`\n✅ Successfully synced ${count} activities from Strava`);

    // Show summary
    const types: Record<string, number> = {};
    for (const event of events) {
      const type = event.data.activity;
      types[type] = (types[type] || 0) + 1;
    }

    console.log('\nBreakdown:');
    for (const [type, count] of Object.entries(types).sort((a, b) => b[1] - a[1])) {
      console.log(`  - ${type}: ${count}`);
    }

  } catch (error: any) {
    console.error('\n❌ Sync failed:', error.message);
    process.exit(1);
  }
}

main();
