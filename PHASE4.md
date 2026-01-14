# Phase 4: External Integrations ✅

Phase 4 is complete! You can now sync data from Strava and Fitbit into your event stream.

## What's Implemented

### Sync Infrastructure (`tools/lib/sync.ts`)

Core utilities for external service integration:

**Functions:**
- `readSyncedEvents(source)` - Read all events from a sync source
- `writeSyncedEvent(source, event)` - Write a single synced event
- `writeSyncedEvents(source, events)` - Batch write events
- `eventExists(source, field, id)` - Check for duplicates
- `getLatestSyncTimestamp(source)` - Get last sync time (for incremental sync)
- `createSyncedEvent(type, data, timestamp, source)` - Create a synced event object

### Strava Sync (`tools/sync-strava.ts`)

Syncs exercise activities from Strava API.

**Features:**
- OAuth token refresh (no need to manually refresh)
- Incremental sync (only fetch new activities)
- Duplicate detection (idempotent - safe to run multiple times)
- Activity type mapping (Run → run, Ride → cycle, etc.)
- Stores to `synced/strava/YYYY-MM.jsonl`

**Data synced:**
- Activity type (run, cycle, swim, walk, ski, strength, other)
- Duration in minutes
- Distance in kilometers
- Average heart rate
- Activity name (as notes)
- Strava activity ID (for deduplication)

**Event type:** `exercise.completed`

**Example output:**
```
Syncing Strava activities...

🔑 Refreshing access token...
📅 Syncing activities after 2026-01-10T08:00:00.000Z
📥 Fetching activities from Strava...
📊 Found 12 activities
💾 Syncing 12 new activities...

✅ Successfully synced 12 activities from Strava

Breakdown:
  - run: 8
  - cycle: 3
  - walk: 1
```

### Fitbit Sync (`tools/sync-fitbit.ts`)

Syncs health data (weight and sleep) from Fitbit API.

**Features:**
- OAuth token refresh
- Incremental sync (default: last 30 days if never synced)
- Duplicate detection (idempotent)
- Stores to `synced/fitbit/YYYY-MM.jsonl`

**Data synced:**

**Weight measurements:**
- Value in kg
- Timestamp
- Fitbit log ID (for deduplication)

**Sleep sessions:**
- Duration in minutes
- Sleep efficiency (quality score)
- Deep sleep minutes
- REM sleep minutes
- Fitbit log ID (for deduplication)

**Event types:** `health.weight`, `health.sleep`

**Example output:**
```
Syncing Fitbit health data...

🔑 Refreshing access token...
📅 Syncing data from 2025-12-15 to 2026-01-14
⚖️  Fetching weight logs...
   Found 8 weight logs (8 new)
😴 Fetching sleep logs...
   Found 25 sleep logs (25 new)

💾 Syncing 33 new events...

✅ Successfully synced 33 health records from Fitbit

Breakdown:
  - Weight logs: 8
  - Sleep logs: 25
```

## File Structure

```
synced/
├── strava/
│   └── YYYY-MM.jsonl       # Strava activities by month
└── fitbit/
    └── YYYY-MM.jsonl       # Fitbit health data by month

tools/
├── sync-strava.ts          # Strava sync script
├── sync-fitbit.ts          # Fitbit sync script
└── lib/
    └── sync.ts             # Sync utilities

.env                        # API credentials (not committed)
.env.example                # Template for credentials
```

## Setup Instructions

### 1. Get API Credentials

#### Strava

1. Go to https://www.strava.com/settings/api
2. Create an application (use http://localhost as callback URL)
3. Note your **Client ID** and **Client Secret**
4. Get a refresh token:
   - Use the OAuth Playground or manual OAuth flow
   - Grant all required permissions (activity:read)
   - Exchange authorization code for refresh token

#### Fitbit

1. Go to https://dev.fitbit.com/apps
2. Register a new application
   - OAuth 2.0 Application Type: **Personal**
   - Callback URL: http://localhost
3. Note your **Client ID** and **Client Secret**
4. Get a refresh token:
   - Use the OAuth 2.0 tutorial on Fitbit's dev site
   - Grant permissions: weight, sleep, activity
   - Exchange authorization code for refresh token

### 2. Configure Environment Variables

```bash
# Copy the example file
cp .env.example .env

# Edit .env with your credentials
nano .env
```

Fill in your actual credentials:

```bash
# Strava
STRAVA_CLIENT_ID=your_actual_client_id
STRAVA_CLIENT_SECRET=your_actual_client_secret
STRAVA_REFRESH_TOKEN=your_actual_refresh_token

# Fitbit
FITBIT_CLIENT_ID=your_actual_client_id
FITBIT_CLIENT_SECRET=your_actual_client_secret
FITBIT_REFRESH_TOKEN=your_actual_refresh_token
```

### 3. Load Environment Variables

For one-time sync:
```bash
source .env
npm run sync:strava
```

Or use a tool like `dotenv`:
```bash
npm install -g dotenv-cli
dotenv npm run sync
```

## Usage

### Sync All Services

```bash
npm run sync
```

This runs both Strava and Fitbit syncs in sequence.

### Sync Individually

```bash
# Strava only
npm run sync:strava

# Fitbit only
npm run sync:fitbit
```

### Test Sync Infrastructure

```bash
# Test with sample data (no credentials needed)
npm run test-sync
```

## How It Works

### Idempotent Sync

All sync scripts are **idempotent** - you can run them multiple times without creating duplicates.

**How it works:**
1. Each external event has a unique ID field (`strava_id`, `fitbit_id`)
2. Before writing, the script checks if an event with that ID already exists
3. Only new events are written

**This means:**
- Safe to run on a schedule (daily cron job)
- Safe to re-run if sync fails partway through
- Safe to experiment with different date ranges

### Incremental Sync

Syncs are **incremental** by default:

**Strava:**
- Gets the latest event timestamp from `synced/strava/`
- Only fetches activities after that timestamp
- First sync fetches all activities (up to API limits)

**Fitbit:**
- Gets the latest event timestamp from `synced/fitbit/`
- Fetches last 30 days if never synced
- Otherwise fetches from last sync to today

### Event Storage

Synced events are stored separately from manual events:

- **Manual events:** `events/YYYY-MM.jsonl`
- **Synced events:** `synced/{service}/YYYY-MM.jsonl`

When querying, the system reads from **both** directories for a complete view.

## Automation

### Daily Sync (Recommended)

Set up a cron job to sync daily:

```bash
# Edit crontab
crontab -e

# Add this line (runs at 6 AM daily)
0 6 * * * cd /path/to/life-stream && source .env && npm run sync >> sync.log 2>&1
```

### Git Automation

Auto-commit synced data:

```bash
#!/bin/bash
# sync-and-commit.sh

cd /path/to/life-stream
source .env

# Run syncs
npm run sync

# Regenerate views
npm run views

# Commit if there are changes
if [[ -n $(git status -s synced/ views/) ]]; then
  git add synced/ views/
  git commit -m "Auto-sync: $(date '+%Y-%m-%d')"
fi
```

Make it executable and add to cron:
```bash
chmod +x sync-and-commit.sh
# Add to crontab: 0 6 * * * /path/to/sync-and-commit.sh
```

## Data Privacy

**Important considerations:**

- All credentials stored in `.env` (gitignored)
- All data stored locally (no cloud services)
- Syncs are **pull-only** (never push to Strava/Fitbit)
- You control when and how often to sync
- Data in plain text - easy to review and delete

## Troubleshooting

### "Missing credentials" error

Make sure:
1. `.env` file exists and has all required variables
2. You've loaded the environment: `source .env`
3. Variables don't have quotes around them

### "Failed to refresh token" error

Your refresh token may have expired:
1. Go through OAuth flow again
2. Get a new refresh token
3. Update `.env` file

### No new activities synced

Check:
1. Do you have new activities since last sync?
2. Check last sync timestamp in logs
3. Manually verify on Strava/Fitbit website

### Duplicate events

This shouldn't happen (sync is idempotent), but if it does:
1. Delete the synced file: `rm synced/strava/YYYY-MM.jsonl`
2. Re-run sync: `npm run sync:strava`

## API Rate Limits

**Strava:**
- 100 requests per 15 minutes
- 1,000 requests per day
- Our sync uses 1 request (well within limits for daily sync)

**Fitbit:**
- 150 requests per hour
- Our sync uses 2 requests (weight + sleep)

Both services are well within limits for daily syncing.

## Integration with Views

Synced data automatically appears in views:

**Weekly Review:**
- Exercise sessions from Strava appear in the exercise section
- Combined with manually-logged exercises
- Shows totals across all sources

**Example:**
```markdown
## 🏃 Exercise

- **run**: 30 min, 5.2 km *(Jan 10, 2026)* [from Strava]
- **run**: 35 min, 6.2 km *(Jan 12, 2026)* [manually logged]
- **cycle**: 60 min, 20 km *(Jan 14, 2026)* [from Strava]

**Total:** 125 min, 31.4 km
```

## Future Enhancements

Potential additions:

- **More services:** Google Calendar, Toggl, GitHub, bank APIs
- **Bi-directional sync:** Push manually-logged exercises to Strava
- **Conflict resolution:** Handle edits on external services
- **Sync status dashboard:** Track last sync times, errors
- **Webhook support:** Real-time sync instead of polling
- **Historical backfill:** Fetch all-time data from services

## Development

When extending sync functionality:

```bash
# Watch mode
npm run dev

# Make changes to tools/sync-*.ts or tools/lib/sync.ts

# Test with sample data
npm run test-sync

# Test with real API (requires credentials)
source .env
npm run sync:strava
```

## Key Principles

✅ **Idempotent** - Safe to run multiple times
✅ **Incremental** - Only fetch new data
✅ **Source tracking** - All synced events tagged with source
✅ **Duplicate prevention** - External IDs prevent duplicates
✅ **Privacy-first** - All data stored locally
✅ **Git-friendly** - Monthly JSON Lines files

## Next Steps

Your life stream is now complete! You can:

1. **Use daily** - Log events via Claude MCP, sync external data
2. **Automate** - Set up daily cron jobs
3. **Track history** - Commit to git, see your life evolve
4. **Analyze** - Generate views, query patterns
5. **Extend** - Add new event types, integrate more services

The system is ready for daily use! 🎉
