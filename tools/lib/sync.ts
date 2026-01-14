/**
 * Sync utilities for external service integrations
 */

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import type { BaseEvent } from './types.js';

/**
 * Get the base directory for synced data
 */
function getSyncedDir(): string {
  return process.env.LIFE_DIR
    ? join(process.env.LIFE_DIR, 'synced')
    : join(process.cwd(), 'synced');
}

/**
 * Get all events from a specific sync source
 */
export async function readSyncedEvents(source: string): Promise<BaseEvent[]> {
  const syncDir = join(getSyncedDir(), source);
  const events: BaseEvent[] = [];

  try {
    const files = await readdir(syncDir);
    const jsonlFiles = files.filter(f => f.endsWith('.jsonl')).sort();

    for (const file of jsonlFiles) {
      const content = await readFile(join(syncDir, file), 'utf-8');
      const lines = content.trim().split('\n').filter(line => line.length > 0);

      for (const line of lines) {
        try {
          const event = JSON.parse(line);
          events.push(event);
        } catch (err) {
          console.warn(`Warning: Failed to parse line in ${file}:`, line);
        }
      }
    }
  } catch (err: any) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
    // Directory doesn't exist yet - that's fine
  }

  return events;
}

/**
 * Check if an event with a specific external ID already exists
 */
export async function eventExists(source: string, externalIdField: string, externalId: string): Promise<boolean> {
  const events = await readSyncedEvents(source);
  return events.some(e => e.data[externalIdField] === externalId);
}

/**
 * Write a synced event to the appropriate monthly file
 */
export async function writeSyncedEvent(source: string, event: BaseEvent): Promise<void> {
  const syncDir = join(getSyncedDir(), source);

  // Ensure directory exists
  await mkdir(syncDir, { recursive: true });

  // Determine filename from event timestamp
  const date = new Date(event.ts);
  const filename = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}.jsonl`;
  const filepath = join(syncDir, filename);

  // Append event as JSON line
  const line = JSON.stringify(event) + '\n';
  await writeFile(filepath, line, { flag: 'a', encoding: 'utf-8' });
}

/**
 * Batch write multiple synced events
 */
export async function writeSyncedEvents(source: string, events: BaseEvent[]): Promise<number> {
  let count = 0;

  for (const event of events) {
    await writeSyncedEvent(source, event);
    count++;
  }

  return count;
}

/**
 * Get the latest timestamp from synced events (for incremental sync)
 */
export async function getLatestSyncTimestamp(source: string): Promise<Date | null> {
  const events = await readSyncedEvents(source);

  if (events.length === 0) {
    return null;
  }

  // Find the most recent timestamp
  const timestamps = events.map(e => new Date(e.ts).getTime());
  const latest = Math.max(...timestamps);

  return new Date(latest);
}

/**
 * Create a synced event object
 */
export function createSyncedEvent(
  type: string,
  data: Record<string, any>,
  timestamp: string | Date,
  source: string
): BaseEvent {
  return {
    ts: timestamp instanceof Date ? timestamp.toISOString() : timestamp,
    type,
    source,
    data,
  };
}
